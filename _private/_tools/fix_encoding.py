#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ENCODING NORMALIZATION SCRIPT
Fix text encoding issues in all HTML files
"""

import os
import re
from datetime import datetime

PROJECT_ROOT = "c:\\SS6\\Git"

def detect_encoding_issues(content):
    """Detect if content has encoding issues"""
    if not content:
        return False
    
    # Check for replacement characters
    if '' in content:
        return True
    
    # Check for sequences of question marks that might indicate encoding issues
    # (but not legitimate uses like ??? in text)
    if re.search(r'\?{3,}', content):
        return True
    
    # Check for mojibake patterns (common UTF-8 interpreted as Windows-1251)
    mojibake_patterns = [
        r'Р°', r'Рѕ', r'Рµ', r'Рё', r'РЅ',  # Common Cyrillic letters as mojibake
        r'Рў', r'Рљ', r'Рњ', r'Рќ',
    ]
    
    # Check if content looks like it has mojibake
    # Valid Cyrillic should be in range \u0400-\u04FF
    has_valid_cyrillic = bool(re.search(r'[\u0400-\u04FF]', content))
    has_mojibake = any(p in content for p in mojibake_patterns)
    
    # If has mojibake but no valid Cyrillic, likely encoding issue
    if has_mojibake and not has_valid_cyrillic:
        return True
    
    return False

def try_decode_file(filepath):
    """Try to decode file with different encodings"""
    encodings_to_try = ['utf-8', 'windows-1251', 'koi8-r', 'iso-8859-5', 'utf-8-sig']
    
    for encoding in encodings_to_try:
        try:
            with open(filepath, 'r', encoding=encoding) as f:
                content = f.read()
            
            # Check if decoded content has valid Cyrillic
            if re.search(r'[\u0400-\u04FF]', content):
                return content, encoding
        except:
            continue
    
    return None, None

def ensure_meta_charset(content):
    """Ensure <meta charset="UTF-8"> is present in head"""
    if not content:
        return content, False
    
    # Check if already has charset meta
    if re.search(r'<meta[^>]*charset\s*=\s*["\']?utf-8["\']?', content, re.IGNORECASE):
        return content, False
    
    # Check for existing meta tags in head
    head_match = re.search(r'<head[^>]*>', content, re.IGNORECASE)
    if not head_match:
        return content, False
    
    head_pos = head_match.end()
    
    # Insert meta charset after <head>
    meta_tag = '\n    <meta charset="UTF-8">'
    new_content = content[:head_pos] + meta_tag + content[head_pos:]
    
    return new_content, True

def fix_file_encoding(filepath):
    """Fix encoding for a single file"""
    # First, read as binary to check original encoding
    try:
        with open(filepath, 'rb') as f:
            raw_content = f.read()
    except Exception as e:
        return False, f"Cannot read file: {e}"
    
    # Try to decode with different encodings
    content, detected_encoding = try_decode_file(filepath)
    
    if content is None:
        return False, "Could not decode file"
    
    # Check if encoding issues exist
    has_issues = detect_encoding_issues(content)
    
    # Ensure meta charset is present
    new_content, meta_added = ensure_meta_charset(content)
    
    # Write back as UTF-8
    try:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, f"Fixed (was {detected_encoding}, meta added: {meta_added})"
    except Exception as e:
        return False, f"Cannot write file: {e}"

def get_all_html_files():
    """Get all HTML files in project"""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        # Skip node_modules, .git, and quarantine
        if 'node_modules' in root or '.git' in root or '_quarantine' in root:
            continue
        for f in filenames:
            if f.endswith('.html'):
                files.append(os.path.join(root, f))
    return files

# ============================================================
# MAIN ENCODING FIX
# ============================================================

print("ENCODING NORMALIZATION")
print("=" * 60)

html_files = get_all_html_files()
print(f"\nTotal HTML files to check: {len(html_files)}")

files_fixed = []
files_already_ok = []
files_with_errors = []

for i, filepath in enumerate(html_files, 1):
    rel_path = os.path.relpath(filepath, PROJECT_ROOT)
    
    # Check current encoding status
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        has_issues = detect_encoding_issues(content)
        has_meta_charset = bool(re.search(r'<meta[^>]*charset\s*=\s*["\']?utf-8["\']?', content, re.IGNORECASE))
        
        if has_issues or not has_meta_charset:
            # Need to fix
            success, message = fix_file_encoding(filepath)
            if success:
                files_fixed.append({
                    'path': rel_path,
                    'reason': message
                })
                print(f"  [{i}/{len(html_files)}] FIXED: {rel_path}")
            else:
                files_with_errors.append({
                    'path': rel_path,
                    'error': message
                })
                print(f"  [{i}/{len(html_files)}] ERROR: {rel_path} - {message}")
        else:
            files_already_ok.append(rel_path)
            
    except UnicodeDecodeError:
        # File has encoding issues
        success, message = fix_file_encoding(filepath)
        if success:
            files_fixed.append({
                'path': rel_path,
                'reason': message
            })
            print(f"  [{i}/{len(html_files)}] FIXED: {rel_path}")
        else:
            files_with_errors.append({
                'path': rel_path,
                'error': message
            })
            print(f"  [{i}/{len(html_files)}] ERROR: {rel_path} - {message}")
    except Exception as e:
        files_with_errors.append({
            'path': rel_path,
            'error': str(e)
        })
        print(f"  [{i}/{len(html_files)}] ERROR: {rel_path} - {e}")

# ============================================================
# GENERATE REPORT
# ============================================================

report = f"""ENCODING_FIX_REPORT

DATE:
{datetime.now().strftime('%Y-%m-%d')}

---

FILES_FIXED:

"""

for f in files_fixed:
    report += f"{f['path']} ({f['reason']})\n"

if not files_fixed:
    report += "None\n"

report += f"""
---

FILES_ALREADY_OK:

"""

for f in files_already_ok[:50]:  # Limit to first 50
    report += f"{f}\n"

if len(files_already_ok) > 50:
    report += f"... and {len(files_already_ok) - 50} more\n"

if not files_already_ok:
    report += "None\n"

report += f"""
---

TOTAL_FILES_FIXED:
{len(files_fixed)}

---

STATUS

ALL_FILES_UTF8:
{'YES' if len(files_with_errors) == 0 else 'NO'}

---

FILES_WITH_ERRORS:

"""

for f in files_with_errors:
    report += f"{f['path']}: {f['error']}\n"

if not files_with_errors:
    report += "None\n"

report += """
---

END OF REPORT
"""

# Save report
output_file = os.path.join(PROJECT_ROOT, 'output', 'encoding_fix_report.txt')
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(report)

print("\n" + "=" * 60)
print(f"Report saved: {output_file}")
print(f"\nSummary:")
print(f"  Files fixed: {len(files_fixed)}")
print(f"  Files already OK: {len(files_already_ok)}")
print(f"  Files with errors: {len(files_with_errors)}")
