#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CONTROLLED FOLDER ISOLATION SCRIPT
Move unused/temporary/backup folders to _archive
"""

import os
import shutil
from datetime import datetime

PROJECT_ROOT = "c:\\SS6\\Git"
ARCHIVE_FOLDER = os.path.join(PROJECT_ROOT, '_archive')

# Folders to move (ONLY these)
FOLDERS_TO_MOVE = [
    'OLD',
    'Old2',
    '__pycache__',
    'company-rebuild',
    '_quarantine',
    'tools',
    'encoding_corrupted',
    'backup',
    'staging-build',
    'source',
    'ui-rebuild'
]

# Folders to NEVER touch (production)
PRODUCTION_FOLDERS = [
    'assets',
    'objects',
    'output',
    'lands',
    'newbuilds',
    'images',
    'seo',
    'team',
    'ui-blocks'
]

def get_all_html_files():
    """Get all HTML files in project"""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        if '.git' in root or '_archive' in root:
            continue
        for f in filenames:
            if f.endswith('.html'):
                files.append(os.path.join(root, f))
    return files

def get_all_css_files():
    """Get all CSS files in project"""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        if '.git' in root or '_archive' in root:
            continue
        for f in filenames:
            if f.endswith('.css'):
                files.append(os.path.join(root, f))
    return files

def get_all_js_files():
    """Get all JS files in project"""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        if '.git' in root or '_archive' in root:
            continue
        for f in filenames:
            if f.endswith('.js'):
                files.append(os.path.join(root, f))
    return files

def load_file(filepath):
    """Load file content"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except:
        return None

def check_references_after_move(moved_folders):
    """Check if any references are broken after moving folders"""
    broken_references = []
    
    # Get all code files
    html_files = get_all_html_files()
    css_files = get_all_css_files()
    js_files = get_all_js_files()
    
    all_code_files = html_files + css_files + js_files
    
    # Check each moved folder
    for folder_name in moved_folders:
        # Search for references to this folder
        for code_file in all_code_files:
            content = load_file(code_file)
            if content:
                # Check if folder is referenced
                if folder_name in content or f'/{folder_name}' in content or f'\\{folder_name}' in content:
                    # Check if it's a critical reference (CSS, JS, images)
                    rel_path = os.path.relpath(code_file, PROJECT_ROOT)
                    broken_references.append({
                        'folder': folder_name,
                        'file': rel_path,
                        'type': 'potential_broken_reference'
                    })
    
    return broken_references

def count_files_in_folders(folders):
    """Count total files in folders"""
    total = 0
    for folder_name in folders:
        folder_path = os.path.join(PROJECT_ROOT, folder_name)
        if os.path.exists(folder_path):
            for root, dirs, files in os.walk(folder_path):
                total += len(files)
    return total

# ============================================================
# MAIN ISOLATION PROCESS
# ============================================================

print("CONTROLLED FOLDER ISOLATION")
print("=" * 60)

# STEP 1: Create archive folder
print("\nSTEP 1: Creating archive folder...")
if not os.path.exists(ARCHIVE_FOLDER):
    os.makedirs(ARCHIVE_FOLDER)
    print(f"  Created: {ARCHIVE_FOLDER}")
else:
    print(f"  Already exists: {ARCHIVE_FOLDER}")

# STEP 2: Move folders
print("\nSTEP 2: Moving folders to archive...")

folders_moved = []
folders_skipped = []
folders_not_found = []

for folder_name in FOLDERS_TO_MOVE:
    src_path = os.path.join(PROJECT_ROOT, folder_name)
    dst_path = os.path.join(ARCHIVE_FOLDER, folder_name)
    
    # Check if it's a production folder (should never happen, but safety check)
    if folder_name in PRODUCTION_FOLDERS:
        print(f"  SKIPPED (production): {folder_name}")
        folders_skipped.append(folder_name)
        continue
    
    if os.path.exists(src_path):
        # Check if already in archive
        if os.path.exists(dst_path):
            print(f"  SKIPPED (already archived): {folder_name}")
            folders_skipped.append(folder_name)
            continue
        
        # Move folder
        try:
            shutil.move(src_path, dst_path)
            folders_moved.append(folder_name)
            print(f"  MOVED: {folder_name} -> _archive/{folder_name}")
        except Exception as e:
            print(f"  ERROR moving {folder_name}: {e}")
            folders_skipped.append(folder_name)
    else:
        print(f"  NOT FOUND: {folder_name}")
        folders_not_found.append(folder_name)

# STEP 3: Verify production folders untouched
print("\nSTEP 3: Verifying production folders...")
production_intact = True
for folder_name in PRODUCTION_FOLDERS:
    folder_path = os.path.join(PROJECT_ROOT, folder_name)
    if os.path.exists(folder_path):
        print(f"  INTACT: {folder_name}")
    else:
        print(f"  MISSING: {folder_name}")
        production_intact = False

# STEP 4: Check references
print("\nSTEP 4: Checking references...")
broken_refs = check_references_after_move(folders_moved)

if broken_refs:
    print(f"  WARNING: {len(broken_refs)} potential broken references found")
    for ref in broken_refs[:10]:  # Show first 10
        print(f"    - {ref['folder']} referenced in {ref['file']}")
    if len(broken_refs) > 10:
        print(f"    ... and {len(broken_refs) - 10} more")
else:
    print("  OK: No broken references found")

# STEP 5: Generate report
print("\nSTEP 5: Generating report...")

files_moved_count = count_files_in_folders(folders_moved)

system_stable = production_intact and len(broken_refs) == 0
safe_to_publish = system_stable

report = f"""ARCHIVE_ISOLATION_REPORT

DATE:
{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

---

FOLDERS_MOVED:

"""

for f in folders_moved:
    report += f"- {f}\n"

if not folders_moved:
    report += "None\n"

report += f"""
---

FOLDERS_SKIPPED:

"""

for f in folders_skipped:
    report += f"- {f}\n"

if not folders_skipped:
    report += "None\n"

report += f"""
---

FOLDERS_NOT_FOUND:

"""

for f in folders_not_found:
    report += f"- {f}\n"

if not folders_not_found:
    report += "None\n"

report += f"""
---

PRODUCTION_FOLDERS_VERIFIED:

"""

for f in PRODUCTION_FOLDERS:
    folder_path = os.path.join(PROJECT_ROOT, f)
    status = "INTACT" if os.path.exists(folder_path) else "MISSING"
    report += f"- {f}: {status}\n"

report += f"""
---

FILES_MOVED_COUNT:
{files_moved_count}

---

BROKEN_REFERENCES_FOUND:
{'YES' if len(broken_refs) > 0 else 'NO'}

"""

if broken_refs:
    report += """
BROKEN_REFERENCE_DETAILS:

"""
    for ref in broken_refs:
        report += f"- {ref['folder']} referenced in {ref['file']}\n"

report += f"""
---

SYSTEM_STABLE:
{'YES' if system_stable else 'NO'}

SAFE_TO_PUBLISH:
{'YES' if safe_to_publish else 'NO'}

---

END OF REPORT
"""

# Save report
output_file = os.path.join(PROJECT_ROOT, 'output', 'archive_isolation_report.txt')
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(report)

print("\n" + "=" * 60)
print(f"Report saved: {output_file}")
print(f"\nSummary:")
print(f"  Folders moved: {len(folders_moved)}")
print(f"  Folders skipped: {len(folders_skipped)}")
print(f"  Folders not found: {len(folders_not_found)}")
print(f"  Files moved: {files_moved_count}")
print(f"  Broken references: {len(broken_refs)}")
print(f"  System stable: {'YES' if system_stable else 'NO'}")
print(f"  Safe to publish: {'YES' if safe_to_publish else 'NO'}")
