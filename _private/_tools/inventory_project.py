#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FULL PROJECT INVENTORY ANALYSIS
Complete scan of project directory structure
"""

import os
import re
from datetime import datetime, timedelta

PROJECT_ROOT = "c:\\SS6\\Git"

def get_folder_size(folder_path):
    """Calculate total size of folder in MB"""
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(folder_path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            try:
                total_size += os.path.getsize(fp)
            except:
                pass
    return total_size / (1024 * 1024)  # Convert to MB

def get_last_modified(folder_path):
    """Get last modification date of folder"""
    last_mod = None
    for dirpath, dirnames, filenames in os.walk(folder_path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            try:
                mtime = os.path.getmtime(fp)
                if last_mod is None or mtime > last_mod:
                    last_mod = mtime
            except:
                pass
    return datetime.fromtimestamp(last_mod) if last_mod else None

def count_file_types(folder_path):
    """Count file types in folder"""
    counts = {
        'html': 0,
        'css': 0,
        'js': 0,
        'json': 0,
        'images': 0,
        'other': 0
    }
    
    image_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico']
    
    for dirpath, dirnames, filenames in os.walk(folder_path):
        for f in filenames:
            ext = os.path.splitext(f)[1].lower()
            if ext == '.html':
                counts['html'] += 1
            elif ext == '.css':
                counts['css'] += 1
            elif ext == '.js':
                counts['js'] += 1
            elif ext == '.json':
                counts['json'] += 1
            elif ext in image_extensions:
                counts['images'] += 1
            else:
                counts['other'] += 1
    
    return counts

def get_all_folders():
    """Get all folders in project"""
    folders = []
    for root, dirs, files in os.walk(PROJECT_ROOT):
        # Skip .git and node_modules
        if '.git' in root or 'node_modules' in root:
            continue
        
        for d in dirs:
            folder_path = os.path.join(root, d)
            rel_path = os.path.relpath(folder_path, PROJECT_ROOT)
            
            # Skip .git and node_modules
            if d.startswith('.'):
                continue
            
            folders.append({
                'name': d,
                'path': folder_path,
                'rel_path': rel_path,
                'size_mb': get_folder_size(folder_path),
                'last_modified': get_last_modified(folder_path),
                'file_counts': count_file_types(folder_path)
            })
    
    return folders

def check_folder_usage(folder_path, all_html, all_css, all_js):
    """Check if folder is referenced by code files"""
    folder_name = os.path.basename(folder_path)
    rel_path = os.path.relpath(folder_path, PROJECT_ROOT)
    
    # Patterns to search for
    search_patterns = [
        folder_name,
        rel_path.replace('\\', '/'),
        rel_path.replace('\\', '\\\\'),
    ]
    
    # Check HTML files
    for hf in all_html:
        content = load_file(hf)
        if content:
            for pattern in search_patterns:
                if pattern in content:
                    return 'REFERENCED'
    
    # Check CSS files
    for cf in all_css:
        content = load_file(cf)
        if content:
            for pattern in search_patterns:
                if pattern in content:
                    return 'REFERENCED'
    
    # Check JS files
    for jf in all_js:
        content = load_file(jf)
        if content:
            for pattern in search_patterns:
                if pattern in content:
                    return 'REFERENCED'
    
    return 'NOT_REFERENCED'

def load_file(filepath):
    """Load file content"""
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            return f.read()
    except:
        return None

def get_all_files_by_type(extension):
    """Get all files by extension"""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        if '.git' in root or 'node_modules' in root or '_quarantine' in root:
            continue
        for f in filenames:
            if f.endswith(extension):
                files.append(os.path.join(root, f))
    return files

def is_candidate_unused(folder):
    """Check if folder is candidate for removal"""
    folder_name = folder['name'].lower()
    rel_path = folder['rel_path'].lower()
    
    # Check for unused folder names
    unused_keywords = [
        'backup', 'old', 'temp', 'test', 'draft', 'copy', 'archive',
        'company-rebuild', '_quarantine', 'staging-build', 'source',
        'ui-rebuild', 'ui_blocks', '__pycache__'
    ]
    
    for keyword in unused_keywords:
        if keyword in folder_name or keyword in rel_path:
            return True
    
    # Check if older than 30 days
    if folder['last_modified']:
        days_old = (datetime.now() - folder['last_modified']).days
        if days_old > 30:
            return True
    
    return False

# ============================================================
# MAIN INVENTORY SCAN
# ============================================================

print("PROJECT INVENTORY ANALYSIS")
print("=" * 60)

# Get all folders
print("\nScanning folders...")
all_folders = get_all_folders()
print(f"Found {len(all_folders)} folders")

# Get all files for usage check
print("\nScanning files for usage check...")
all_html = get_all_files_by_type('.html')
all_css = get_all_files_by_type('.css')
all_js = get_all_files_by_type('.js')

print(f"  HTML: {len(all_html)}")
print(f"  CSS: {len(all_css)}")
print(f"  JS: {len(all_js)}")

# Check usage for each folder
print("\nChecking folder usage...")
for folder in all_folders:
    folder['usage'] = check_folder_usage(folder['path'], all_html, all_css, all_js)
    folder['is_candidate_unused'] = is_candidate_unused(folder)

# Calculate totals
total_files = sum(
    f['file_counts']['html'] + f['file_counts']['css'] + f['file_counts']['js'] +
    f['file_counts']['json'] + f['file_counts']['images'] + f['file_counts']['other']
    for f in all_folders
)

total_html = sum(f['file_counts']['html'] for f in all_folders)
total_css = sum(f['file_counts']['css'] for f in all_folders)
total_js = sum(f['file_counts']['js'] for f in all_folders)
total_json = sum(f['file_counts']['json'] for f in all_folders)
total_images = sum(f['file_counts']['images'] for f in all_folders)

# Candidate unused folders
candidate_unused = [f for f in all_folders if f['is_candidate_unused']]

# ============================================================
# GENERATE REPORT
# ============================================================

report = f"""PROJECT_INVENTORY_REPORT

DATE:
{datetime.now().strftime('%Y-%m-%d')}

---

TOTAL_FOLDERS:
{len(all_folders)}

TOTAL_FILES:
{total_files}

---

FILE_TYPES

HTML:
{total_html}

CSS:
{total_css}

JS:
{total_js}

JSON:
{total_json}

IMAGES:
{total_images}

---

FOLDER_STRUCTURE

"""

for folder in sorted(all_folders, key=lambda x: x['rel_path']):
    last_mod_str = folder['last_modified'].strftime('%Y-%m-%d') if folder['last_modified'] else 'UNKNOWN'
    report += f"Folder: {folder['name']}\n"
    report += f"  Path: {folder['rel_path']}\n"
    report += f"  Size: {folder['size_mb']:.2f} MB\n"
    report += f"  Last Modified: {last_mod_str}\n"
    report += f"  Usage: {folder['usage']}\n"
    report += f"  Files: HTML={folder['file_counts']['html']}, CSS={folder['file_counts']['css']}, JS={folder['file_counts']['js']}, JSON={folder['file_counts']['json']}, Images={folder['file_counts']['images']}\n"
    report += "\n"

report += f"""
---

CANDIDATE_UNUSED_FOLDERS

"""

for folder in sorted(candidate_unused, key=lambda x: x['rel_path']):
    last_mod_str = folder['last_modified'].strftime('%Y-%m-%d') if folder['last_modified'] else 'UNKNOWN'
    report += f"Folder: {folder['rel_path']}\n"
    report += f"  Size: {folder['size_mb']:.2f} MB\n"
    report += f"  Last Modified: {last_mod_str}\n"
    report += f"  Usage: {folder['usage']}\n"
    report += f"  Reason: "
    
    reasons = []
    folder_name = folder['name'].lower()
    if any(kw in folder_name for kw in ['backup', 'old', 'temp', 'test', 'draft', 'copy', 'archive', 'quarantine', 'rebuild', 'source', 'pycache']):
        reasons.append("unused folder name")
    if folder['usage'] == 'NOT_REFERENCED':
        reasons.append("not referenced by code")
    if folder['last_modified']:
        days_old = (datetime.now() - folder['last_modified']).days
        if days_old > 30:
            reasons.append(f"older than 30 days ({days_old} days)")
    
    report += ", ".join(reasons)
    report += "\n\n"

report += f"""
---

PROJECT_READY_FOR_CLEANUP:
{'YES' if len(candidate_unused) > 0 else 'NO'}

---

END OF REPORT
"""

# Save report
output_file = os.path.join(PROJECT_ROOT, 'output', 'project_inventory_report.txt')
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(report)

print("\n" + "=" * 60)
print(f"Report saved: {output_file}")
print(f"\nSummary:")
print(f"  Total folders: {len(all_folders)}")
print(f"  Total files: {total_files}")
print(f"  Candidate unused folders: {len(candidate_unused)}")
