#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SEO CONTENT DISCOVERY AND INVENTORY
Full scan of all SEO-related content in the project
"""

import os
import re
import json
from datetime import datetime

PROJECT_ROOT = "c:\\SS6\\Git"

def get_all_files(extension):
    """Get list of all files by extension"""
    files = []
    for root, dirs, filenames in os.walk(PROJECT_ROOT):
        if 'node_modules' in root or '.git' in root:
            continue
        for f in filenames:
            if f.endswith(extension):
                files.append(os.path.join(root, f))
    return files

def get_relative_path(filepath):
    """Get relative path from project root"""
    return os.path.relpath(filepath, PROJECT_ROOT)

def load_file(filepath):
    """Load file content"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()
    except:
        return None

def is_seo_page(content):
    """Check if page is SEO page"""
    if not content:
        return False
    
    seo_keywords = [
        'аксай', 'квартиры', 'дома', 'район', 'жк', 'недвижимость', 
        'купить', 'жильё', 'участки', 'новостройки', 'ростов', 
        'центр', 'левобережный', 'вересаево', 'солнечный', 'щепкин',
        'ольгинская', 'рассвет', 'большой лог', 'камышеваха', 'январный'
    ]
    
    has_meta_title = bool(re.search(r'<meta[^>]*title[^>]*>', content, re.IGNORECASE)) or bool(re.search(r'<title[^>]*>[^<]+</title>', content, re.IGNORECASE))
    has_meta_desc = bool(re.search(r'<meta[^>]*description[^>]*>', content, re.IGNORECASE))
    has_h1_location = bool(re.search(r'<h1[^>]*>.*(?:аксай|ростов|район|жк|ул\\.|проспект).*</h1>', content, re.IGNORECASE))
    has_large_text = len(content) > 5000
    has_keywords = any(kw in content.lower() for kw in seo_keywords)
    
    return has_meta_title or has_meta_desc or has_h1_location or (has_large_text and has_keywords)

def get_folder_path(filepath):
    """Get folder path from file path"""
    rel_path = get_relative_path(filepath)
    if '/' in rel_path:
        return rel_path.rsplit('/', 1)[0]
    elif '\\' in rel_path:
        return rel_path.rsplit('\\', 1)[0]
    return '/'

def count_words(content):
    """Estimate word count"""
    if not content:
        return 0
    # Remove HTML tags
    text = re.sub(r'<[^>]+>', ' ', content)
    # Count words
    words = text.split()
    return len(words)

def check_sitemap_seo_pages(sitemap_path, seo_pages):
    """Check which SEO pages are in sitemap"""
    if not os.path.exists(sitemap_path):
        return {'in_sitemap': 0, 'not_in_sitemap': len(seo_pages)}
    
    content = load_file(sitemap_path)
    if not content:
        return {'in_sitemap': 0, 'not_in_sitemap': len(seo_pages)}
    
    # Extract URLs from sitemap
    urls = re.findall(r'<loc>[^<]+</loc>', content)
    sitemap_urls = [u.replace('<loc>', '').replace('</loc>', '').replace('https://domian-161.ru/', '') for u in urls]
    
    in_sitemap = 0
    not_in_sitemap = 0
    
    for page in seo_pages:
        if page['path'] in sitemap_urls:
            in_sitemap += 1
        else:
            not_in_sitemap += 1
    
    return {'in_sitemap': in_sitemap, 'not_in_sitemap': not_in_sitemap}

def check_if_linked(filepath, all_html_files):
    """Check if page is linked from other pages"""
    rel_path = get_relative_path(filepath)
    file_name = os.path.basename(filepath)
    
    for hf in all_html_files:
        if hf == filepath:
            continue
        content = load_file(hf)
        if content:
            # Check if this file is linked
            if file_name in content or rel_path in content:
                return True
    
    return False

def check_in_menu(filepath, all_html_files):
    """Check if page is in main menu"""
    for hf in all_html_files:
        content = load_file(hf)
        if content:
            # Check nav section
            nav_match = re.search(r'<nav[^>]*>(.*?)</nav>', content, re.IGNORECASE | re.DOTALL)
            if nav_match:
                nav_content = nav_match.group(1)
                file_name = os.path.basename(filepath)
                if file_name in nav_content:
                    return True
    return False

# ============================================================
# MAIN DISCOVERY SCAN
# ============================================================

print("SEO CONTENT DISCOVERY SCAN")
print("=" * 60)

# 1. ALL HTML FILES
print("\n1. ALL HTML FILES...")

html_files = get_all_files('.html')
all_html_info = []

for hf in html_files:
    all_html_info.append({
        'path': get_relative_path(hf),
        'file': os.path.basename(hf),
        'folder': get_folder_path(hf)
    })

print(f"   Total HTML files: {len(html_files)}")

# 2. SEO PAGES DETECTED
print("\n2. SEO PAGES DETECTED...")

seo_pages = []
for hf in html_files:
    content = load_file(hf)
    rel_path = get_relative_path(hf)
    
    # Skip main system pages
    skip_files = ['index.html', 'apartments.html', 'houses.html', 'lands.html', 'newbuilds.html', 
                  'details.html', 'privacy.html', 'offer.html', 'thanks.html']
    if any(s in rel_path for s in skip_files):
        continue
    
    if is_seo_page(content):
        seo_pages.append({
            'path': rel_path,
            'file': os.path.basename(hf),
            'folder': get_folder_path(hf),
            'content': content
        })

print(f"   SEO pages detected: {len(seo_pages)}")

# 3. SEO PAGES LOCATION
print("\n3. SEO PAGES LOCATION...")

folders = {}
for page in seo_pages:
    folder = page['folder']
    if folder not in folders:
        folders[folder] = []
    folders[folder].append(page['path'])

# 4. HIDDEN OR UNLINKED PAGES
print("\n4. HIDDEN OR UNLINKED PAGES...")

unlinked_pages = []
for page in seo_pages:
    hf_path = os.path.join(PROJECT_ROOT, page['path'])
    if not check_if_linked(hf_path, html_files):
        unlinked_pages.append(page['path'])

print(f"   Unlinked pages: {len(unlinked_pages)}")

# 5. PAGES IN QUARANTINE
print("\n5. PAGES IN QUARANTINE...")

quarantine_html = []
quarantine_path = os.path.join(PROJECT_ROOT, '_quarantine')
if os.path.exists(quarantine_path):
    quarantine_html = get_all_files('.html')
    quarantine_html = [f for f in quarantine_html if '_quarantine' in f]

print(f"   SEO pages in quarantine: {len(quarantine_html)}")

# 6. PAGES WITHOUT MENU LINK
print("\n6. PAGES WITHOUT MENU LINK...")

pages_without_menu = []
for page in seo_pages:
    hf_path = os.path.join(PROJECT_ROOT, page['path'])
    if not check_in_menu(hf_path, html_files):
        pages_without_menu.append(page['path'])

print(f"   Pages not in menu: {len(pages_without_menu)}")

# 7. DUPLICATE SEO PAGES
print("\n7. DUPLICATE SEO PAGES...")

# Group by similar names
from collections import defaultdict
name_groups = defaultdict(list)
for page in seo_pages:
    # Extract base name without extension
    base_name = os.path.splitext(page['file'])[0].lower()
    # Normalize
    normalized = re.sub(r'[-_]', '', base_name)
    name_groups[normalized].append(page['path'])

duplicate_groups = {k: v for k, v in name_groups.items() if len(v) > 1}

print(f"   Duplicate groups: {len(duplicate_groups)}")

# 8. SEO CONTENT BLOCKS
print("\n8. SEO CONTENT BLOCKS...")

content_blocks = []
for page in seo_pages:
    content = page.get('content')
    if content:
        word_count = count_words(content)
        if word_count > 100:
            content_blocks.append({
                'path': page['path'],
                'word_count': word_count
            })

print(f"   Pages with content blocks: {len(content_blocks)}")

# 9. META TAG ANALYSIS
print("\n9. META TAG ANALYSIS...")

meta_analysis = []
for page in seo_pages:
    content = page.get('content')
    if content:
        meta_analysis.append({
            'path': page['path'],
            'has_title': bool(re.search(r'<title[^>]*>', content, re.IGNORECASE)),
            'has_meta_desc': bool(re.search(r'<meta[^>]*description[^>]*>', content, re.IGNORECASE)),
            'has_h1': bool(re.search(r'<h1[^>]*>', content, re.IGNORECASE)),
            'has_canonical': bool(re.search(r'<link[^>]*canonical[^>]*>', content, re.IGNORECASE)),
            'has_viewport': bool(re.search(r'<meta[^>]*viewport[^>]*>', content, re.IGNORECASE)),
        })

# 10. IMAGE ANALYSIS
print("\n10. IMAGE ANALYSIS...")

image_analysis = []
for page in seo_pages:
    content = page.get('content')
    if content:
        images = re.findall(r'<img[^>]*>', content, re.IGNORECASE)
        alt_tags = re.findall(r'alt="[^"]*"', content, re.IGNORECASE)
        image_analysis.append({
            'path': page['path'],
            'total_images': len(images),
            'has_alt': len(alt_tags) > 0
        })

# 11. SITEMAP VERIFICATION
print("\n11. SITEMAP VERIFICATION...")

sitemap_path = os.path.join(PROJECT_ROOT, 'sitemap.xml')
sitemap_data = check_sitemap_seo_pages(sitemap_path, seo_pages)

print(f"   SEO pages in sitemap: {sitemap_data['in_sitemap']}")
print(f"   SEO pages not in sitemap: {sitemap_data['not_in_sitemap']}")

# 12. FINAL SUMMARY
print("\n12. FINAL SUMMARY...")

# ============================================================
# GENERATE REPORT
# ============================================================

report = f"""SEO_CONTENT_DISCOVERY_REPORT

DATE:
{datetime.now().strftime('%Y-%m-%d')}

---

1. ALL HTML FILES

"""

for info in all_html_info:
    report += f"{info['path']}\n"

report += f"""
---

TOTAL_HTML_FILES:
{len(html_files)}

---

2. SEO PAGES DETECTED

"""

for page in seo_pages:
    report += f"{page['path']}\n"

report += f"""
---

TOTAL_SEO_PAGES:
{len(seo_pages)}

---

3. SEO PAGES LOCATION

"""

for folder, pages in folders.items():
    report += f"{folder}:\n"
    for p in pages:
        report += f"  - {p}\n"
    report += "\n"

report += f"""
---

4. HIDDEN OR UNLINKED PAGES

"""

for page in unlinked_pages:
    report += f"{page}\n"

report += f"""
---

TOTAL_UNLINKED_PAGES:
{len(unlinked_pages)}

---

5. PAGES IN QUARANTINE

"""

for page in quarantine_html:
    report += f"{get_relative_path(page)}\n"

report += f"""
---

TOTAL_SEO_PAGES_IN_QUARANTINE:
{len(quarantine_html)}

---

6. PAGES WITHOUT MENU LINK

"""

for page in pages_without_menu:
    report += f"{page}\n"

report += f"""
---

7. DUPLICATE SEO PAGES

"""

for name, pages in duplicate_groups.items():
    report += f"Group '{name}':\n"
    for p in pages:
        report += f"  - {p}\n"

report += f"""
---

8. SEO CONTENT BLOCKS

"""

for block in content_blocks[:20]:  # Show first 20
    report += f"{block['path']} - {block['word_count']} words\n"

if len(content_blocks) > 20:
    report += f"... and {len(content_blocks) - 20} more\n"

report += f"""
---

9. META TAG ANALYSIS

"""

for meta in meta_analysis:
    report += f"{meta['path']}:\n"
    report += f"  META_TITLE_PRESENT: {'YES' if meta['has_title'] else 'NO'}\n"
    report += f"  META_DESCRIPTION_PRESENT: {'YES' if meta['has_meta_desc'] else 'NO'}\n"
    report += f"  H1_PRESENT: {'YES' if meta['has_h1'] else 'NO'}\n"
    report += f"  CANONICAL_PRESENT: {'YES' if meta['has_canonical'] else 'NO'}\n"
    report += f"  VIEWPORT_PRESENT: {'YES' if meta['has_viewport'] else 'NO'}\n"

report += f"""
---

10. IMAGE ANALYSIS

"""

for img in image_analysis:
    report += f"{img['path']}:\n"
    report += f"  IMAGES_PRESENT: {'YES' if img['total_images'] > 0 else 'NO'}\n"
    report += f"  TOTAL_IMAGES: {img['total_images']}\n"
    report += f"  ALT_TAGS_PRESENT: {'YES' if img['has_alt'] else 'NO'}\n"

report += f"""
---

11. SITEMAP VERIFICATION

SEO_PAGES_IN_SITEMAP:
{sitemap_data['in_sitemap']}

SEO_PAGES_NOT_IN_SITEMAP:
{sitemap_data['not_in_sitemap']}

---

12. FINAL SUMMARY

TOTAL_HTML_FILES:
{len(html_files)}

TOTAL_SEO_PAGES:
{len(seo_pages)}

TOTAL_UNLINKED_PAGES:
{len(unlinked_pages)}

TOTAL_SEO_PAGES_IN_QUARANTINE:
{len(quarantine_html)}

TOTAL_SEO_PAGES_NOT_IN_SITEMAP:
{sitemap_data['not_in_sitemap']}

---

END OF REPORT
"""

# Save report
output_file = os.path.join(PROJECT_ROOT, 'output', 'seo_content_discovery.txt')
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(report)

print("\n" + "=" * 60)
print(f"Report saved: {output_file}")
print(f"\nSummary:")
print(f"  Total HTML files: {len(html_files)}")
print(f"  SEO pages detected: {len(seo_pages)}")
print(f"  Unlinked pages: {len(unlinked_pages)}")
print(f"  Pages in quarantine: {len(quarantine_html)}")
print(f"  Pages not in sitemap: {sitemap_data['not_in_sitemap']}")
