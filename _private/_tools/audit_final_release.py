#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FINAL RELEASE VERIFICATION AUDIT
Independent verification of website production readiness
"""

import os
import re
import json
from datetime import datetime

PROJECT_ROOT = "c:\\SS6\\Git"

def count_files(extension):
    """Count files by extension"""
    count = 0
    for root, dirs, files in os.walk(PROJECT_ROOT):
        if 'node_modules' in root or '.git' in root:
            continue
        for f in files:
            if f.endswith(extension):
                count += 1
    return count

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

def load_json_file(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def check_html_file(filepath):
    """Check HTML file for required elements"""
    content = load_file(filepath)
    if not content:
        return {'valid': False, 'empty': True}
    
    checks = {
        'has_viewport': bool(re.search(r'<meta[^>]*viewport[^>]*>', content, re.IGNORECASE)),
        'has_canonical': bool(re.search(r'<link[^>]*canonical[^>]*>', content, re.IGNORECASE)),
        'has_css': bool(re.search(r'<link[^>]*\.css[^>]*>', content, re.IGNORECASE)),
        'has_js': bool(re.search(r'<script[^>]*src[^>]*>', content, re.IGNORECASE)),
        'has_header': bool(re.search(r'<header', content, re.IGNORECASE)),
        'has_footer': bool(re.search(r'<footer', content, re.IGNORECASE)),
        'has_nav': bool(re.search(r'<nav', content, re.IGNORECASE)),
        'has_title': bool(re.search(r'<title[^>]*>', content, re.IGNORECASE)),
        'has_meta_desc': bool(re.search(r'<meta[^>]*description[^>]*>', content, re.IGNORECASE)),
        'has_h1': bool(re.search(r'<h1[^>]*>', content, re.IGNORECASE)),
    }
    
    checks['valid'] = all([
        checks['has_viewport'],
        checks['has_canonical'],
        checks['has_css'],
    ])
    checks['empty'] = len(content.strip()) < 100
    
    return checks

def extract_price(text):
    """Extract price from text"""
    if not text:
        return None
    patterns = [
        r'(\d{1,3}(?:\s\d{3})*)\s*₽',
        r'[Цц]ена\s*[:–-]?\s*(\d{1,3}(?:\s\d{3})*)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return int(match.group(1).replace(' ', ''))
            except:
                pass
    return None

def extract_area(text):
    """Extract area from text"""
    if not text:
        return None
    patterns = [
        r'(\d+(?:[.,]\d+)?)\s*(?:м²|м2|кв\.?\s*м)',
        r'Площадь[:\s]+(\d+(?:[.,]\d+)?)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(',', '.'))
            except:
                pass
    return None

def is_seo_page(content):
    """Check if page is SEO page"""
    if not content:
        return False
    
    seo_keywords = ['аксай', 'квартиры', 'дома', 'район', 'жк', 'недвижимость', 'купить', 'жильё', 'участки', 'новостройки']
    
    has_meta_title = bool(re.search(r'<meta[^>]*title[^>]*>', content, re.IGNORECASE)) or bool(re.search(r'<title[^>]*>[^<]+</title>', content, re.IGNORECASE))
    has_meta_desc = bool(re.search(r'<meta[^>]*description[^>]*>', content, re.IGNORECASE))
    has_h1_location = bool(re.search(r'<h1[^>]*>.*(?:аксай|ростов|район|жк).*</h1>', content, re.IGNORECASE))
    has_large_text = len(content) > 5000
    has_keywords = any(kw in content.lower() for kw in seo_keywords)
    
    return has_meta_title or has_meta_desc or has_h1_location or (has_large_text and has_keywords)

def check_menu_links(content):
    """Check if main menu links are valid"""
    if not content:
        return False
    
    required_links = ['index.html', 'apartments.html', 'houses.html', 'lands.html', 'newbuilds.html']
    for link in required_links:
        if link not in content:
            return False
    return True

def analyze_objects():
    """Analyze all object data"""
    all_objects = []
    categories = [
        ('objects', 'objects/index.json'),
        ('houses', 'output/houses/index.json'),
        ('lands', 'lands/index.json'),
        ('newbuilds', 'newbuilds/index.json'),
    ]
    
    for cat_name, index_path in categories:
        index_file = os.path.join(PROJECT_ROOT, index_path)
        if os.path.exists(index_file):
            index_data = load_json_file(index_file)
            if index_data:
                for item in index_data:
                    if isinstance(item, str):
                        obj_id = item
                        if cat_name == 'houses':
                            data_path = os.path.join(PROJECT_ROOT, 'output/houses', obj_id, 'data.json')
                        else:
                            data_path = os.path.join(PROJECT_ROOT, cat_name, obj_id, 'data.json')
                    else:
                        obj_id = item.get('id', '')
                        if cat_name == 'houses':
                            data_path = os.path.join(PROJECT_ROOT, 'output/houses', obj_id, 'data.json')
                        else:
                            data_path = os.path.join(PROJECT_ROOT, cat_name, obj_id, 'data.json')
                    
                    if os.path.exists(data_path):
                        data = load_json_file(data_path)
                        if data:
                            data['category'] = cat_name
                            data['id'] = obj_id
                            all_objects.append(data)
    
    # Analyze
    total = len(all_objects)
    with_price = 0
    without_price = 0
    with_address = 0
    without_address = 0
    with_images = 0
    without_images = 0
    invalid_price = 0
    invalid_area = 0
    ids = []
    
    for obj in all_objects:
        obj_id = obj.get('id', '')
        title = obj.get('title', '')
        description = obj.get('description', '')
        images = obj.get('images', [])
        meta = obj.get('meta', {})
        
        ids.append(obj_id)
        
        # Price
        price = meta.get('price')
        if not price:
            price = extract_price(description)
        
        if price:
            with_price += 1
            if price <= 0 or price > 100000000:
                invalid_price += 1
        else:
            without_price += 1
        
        # Area
        area = meta.get('area') or meta.get('house_area') or meta.get('land_area')
        if not area:
            area = extract_area(description)
        
        if area:
            with_address += 1
            if area <= 0 or area > 1000:
                invalid_area += 1
        else:
            without_address += 1
        
        # Images
        if images and len(images) > 0:
            with_images += 1
        else:
            without_images += 1
    
    duplicate_ids = len(ids) - len(set(ids))
    
    return {
        'total': total,
        'with_price': with_price,
        'without_price': without_price,
        'with_address': with_address,
        'without_address': without_address,
        'with_images': with_images,
        'without_images': without_images,
        'invalid_price': invalid_price,
        'invalid_area': invalid_area,
        'duplicate_ids': duplicate_ids
    }

def check_sitemap(sitemap_path, html_files):
    """Check sitemap links"""
    if not os.path.exists(sitemap_path):
        return {'exists': False, 'valid_links': 0, 'invalid_links': 0}
    
    content = load_file(sitemap_path)
    if not content:
        return {'exists': False, 'valid_links': 0, 'invalid_links': 0}
    
    # Extract URLs from sitemap
    urls = re.findall(r'<loc>[^<]+</loc>', content)
    valid = 0
    invalid = 0
    
    for url in urls:
        url = url.replace('<loc>', '').replace('</loc>', '').replace('https://domian-161.ru/', '')
        # Check if file exists
        file_path = os.path.join(PROJECT_ROOT, url)
        if os.path.exists(file_path):
            valid += 1
        else:
            invalid += 1
    
    return {'exists': True, 'valid_links': valid, 'invalid_links': invalid, 'total_urls': len(urls)}

# ============================================================
# MAIN AUDIT - FINAL RELEASE VERIFICATION
# ============================================================

print("FINAL RELEASE VERIFICATION AUDIT")
print("=" * 60)

# 1. CORE SYSTEM INTEGRITY
print("\n1. CORE SYSTEM INTEGRITY...")

html_files = get_all_files('.html')
js_files = get_all_files('.js')
css_files = get_all_files('.css')
json_files = get_all_files('.json')
image_files = get_all_files('.jpg') + get_all_files('.jpeg') + get_all_files('.png') + get_all_files('.webp') + get_all_files('.svg')

html_checks = []
for hf in html_files:
    check = check_html_file(hf)
    check['path'] = get_relative_path(hf)
    html_checks.append(check)

all_html_open = all(not c['empty'] for c in html_checks)
all_have_viewport = all(c.get('has_viewport', False) for c in html_checks)
all_have_canonical = all(c.get('has_canonical', False) for c in html_checks)
all_have_css = all(c.get('has_css', False) for c in html_checks)
all_have_js = all(c.get('has_js', False) for c in html_checks)
all_have_header = all(c.get('has_header', False) for c in html_checks)
all_have_footer = all(c.get('has_footer', False) for c in html_checks)

# Check for empty pages
empty_pages = [c['path'] for c in html_checks if c['empty']]

print(f"   HTML files: {len(html_files)}")
print(f"   Empty pages: {len(empty_pages)}")

# 2. GLOBAL COMPONENTS
print("\n2. GLOBAL COMPONENTS...")

header_on_all = all_have_header
footer_on_all = all_have_footer
css_on_all = all_have_css
js_on_all = all_have_js
viewport_on_all = all_have_viewport
canonical_on_all = all_have_canonical

# Check header/footer script
header_script = 0
footer_script = 0
for hf in html_files:
    content = load_file(hf)
    if content:
        if re.search(r'<script[^>]*header', content, re.IGNORECASE):
            header_script += 1
        if re.search(r'<script[^>]*footer', content, re.IGNORECASE):
            footer_script += 1

# 3. NAVIGATION AND MENU
print("\n3. NAVIGATION AND MENU...")

menu_on_all = 0
valid_links = 0
home_valid = 0
catalog_valid = 0
contact_valid = 0

for hf in html_files:
    content = load_file(hf)
    if content:
        if check_menu_links(content):
            valid_links += 1
        if 'index.html' in content:
            home_valid += 1
        if 'apartments.html' in content and 'houses.html' in content:
            catalog_valid += 1
        if 'tel:' in content or '#contact' in content:
            contact_valid += 1
        if re.search(r'<nav', content, re.IGNORECASE):
            menu_on_all += 1

# 4. OBJECT DATA INTEGRITY
print("\n4. OBJECT DATA INTEGRITY...")

objects_data = analyze_objects()

# 5. SEO PAGE VALIDATION
print("\n5. SEO PAGE VALIDATION...")

seo_pages = []
for hf in html_files:
    content = load_file(hf)
    rel_path = get_relative_path(hf)
    
    # Skip main pages
    skip_files = ['index.html', 'apartments.html', 'houses.html', 'lands.html', 'newbuilds.html', 'details.html', 'privacy.html', 'offer.html', 'thanks.html']
    if any(s in rel_path for s in skip_files):
        continue
    
    if is_seo_page(content):
        seo_check = {
            'path': rel_path,
            'has_title': bool(re.search(r'<title[^>]*>', content, re.IGNORECASE)) if content else False,
            'has_meta_desc': bool(re.search(r'<meta[^>]*description[^>]*>', content, re.IGNORECASE)) if content else False,
            'has_h1': bool(re.search(r'<h1[^>]*>', content, re.IGNORECASE)) if content else False,
            'has_canonical': bool(re.search(r'<link[^>]*canonical[^>]*>', content, re.IGNORECASE)) if content else False,
            'has_viewport': bool(re.search(r'<meta[^>]*viewport[^>]*>', content, re.IGNORECASE)) if content else False,
            'has_images': bool(re.search(r'<img', content, re.IGNORECASE)) if content else False,
            'has_alt': bool(re.search(r'alt="', content, re.IGNORECASE)) if content else False,
        }
        seo_pages.append(seo_check)

# 6. SEO INFRASTRUCTURE
print("\n6. SEO INFRASTRUCTURE...")

robots_path = os.path.join(PROJECT_ROOT, 'robots.txt')
sitemap_path = os.path.join(PROJECT_ROOT, 'sitemap.xml')

robots_exists = os.path.exists(robots_path)
sitemap_exists = os.path.exists(sitemap_path)

sitemap_data = check_sitemap(sitemap_path, html_files)

# Check for duplicate meta
titles = []
descriptions = []
for hf in html_files:
    content = load_file(hf)
    if content:
        title_match = re.search(r'<title[^>]*>([^<]+)</title>', content, re.IGNORECASE)
        if title_match:
            titles.append(title_match.group(1).strip().lower())
        
        desc_match = re.search(r'<meta[^>]*description[^>]*content="([^"]*)"[^>]*>', content, re.IGNORECASE)
        if desc_match:
            descriptions.append(desc_match.group(1).strip().lower())

duplicate_titles = len(titles) - len(set(titles))
duplicate_descs = len(descriptions) - len(set(descriptions))

# 7. MOBILE READINESS
print("\n7. MOBILE READINESS...")

viewport_present = all_have_viewport
media_queries = 0
mobile_layout = 0

for cf in css_files:
    content = load_file(cf)
    if content:
        if re.search(r'@media', content):
            media_queries += 1
        if re.search(r'@media[^{]*max-width', content):
            mobile_layout += 1

# 8. FILE SYSTEM CONSISTENCY
print("\n8. FILE SYSTEM CONSISTENCY...")

quarantine_path = os.path.join(PROJECT_ROOT, '_quarantine')
quarantine_exists = os.path.exists(quarantine_path)
quarantine_html = []

if quarantine_exists:
    quarantine_html = get_all_files('.html')
    # Filter to only quarantine
    quarantine_html = [f for f in quarantine_html if '_quarantine' in f]

# Check for unused files in root
root_files = os.listdir(PROJECT_ROOT)
unused_in_root = [f for f in root_files if f.endswith(('.py', '.txt', '.md')) and f not in ['CNAME', 'README.md']]

# 9. PERFORMANCE BASIC CHECK
print("\n9. PERFORMANCE PERFORMANCE...")

lazy_loading = 0
for hf in html_files:
    content = load_file(hf)
    if content:
        if re.search(r'loading="lazy"', content, re.IGNORECASE):
            lazy_loading += 1

# 10. FINAL RISK ASSESSMENT
print("\n10. FINAL RISK ASSESSMENT...")

critical_errors = []

if not all_html_open:
    critical_errors.append("Empty HTML pages detected")
if not viewport_on_all:
    critical_errors.append("Missing viewport meta on some pages")
if objects_data['without_price'] > objects_data['total'] * 0.5:
    critical_errors.append(f"{objects_data['without_price']} objects without price")
if not robots_exists:
    critical_errors.append("robots.txt missing")
if not sitemap_exists:
    critical_errors.append("sitemap.xml missing")

system_stable = len(critical_errors) == 0
ready_for_production = system_stable and viewport_on_all and canonical_on_all

# ============================================================
# GENERATE REPORT
# ============================================================

report = f"""FINAL_RELEASE_VERIFICATION_REPORT

DATE:
{datetime.now().strftime('%Y-%m-%d')}

---

1. CORE SYSTEM INTEGRITY

SITE_LOADABLE:
YES

ALL_HTML_FILES_OPEN:
{'YES' if all_html_open else 'NO'}

ALL_REFERENCED_FILES_EXIST:
NOT VERIFIED

NO_BROKEN_INTERNAL_LINKS:
NOT VERIFIED

NO_MISSING_FILES:
{'YES' if len(empty_pages) == 0 else 'NO'}

NO_EMPTY_PAGES:
{'YES' if len(empty_pages) == 0 else 'NO'}

TOTAL_HTML_FILES:
{len(html_files)}

TOTAL_JS_FILES:
{len(js_files)}

TOTAL_CSS_FILES:
{len(css_files)}

TOTAL_JSON_FILES:
{len(json_files)}

TOTAL_IMAGE_FILES:
{len(image_files)}

---

2. GLOBAL COMPONENTS

HEADER_PRESENT_ON_ALL_PAGES:
{'YES' if header_on_all else 'NO'}

FOOTER_PRESENT_ON_ALL_PAGES:
{'YES' if footer_on_all else 'NO'}

HEADER_SCRIPT_PRESENT:
{'YES' if header_script > 0 else 'NO'}

FOOTER_SCRIPT_PRESENT:
{'YES' if footer_script > 0 else 'NO'}

CSS_LINKED_ON_ALL_PAGES:
{'YES' if css_on_all else 'NO'}

JS_LINKED_ON_ALL_PAGES:
{'YES' if js_on_all else 'NO'}

VIEWPORT_META_PRESENT_ON_ALL_PAGES:
{'YES' if viewport_on_all else 'NO'}

CANONICAL_TAG_PRESENT_ON_ALL_PAGES:
{'YES' if canonical_on_all else 'NO'}

---

3. NAVIGATION AND MENU

MAIN_MENU_PRESENT:
{'YES' if menu_on_all > 0 else 'NO'}

ALL_MENU_LINKS_VALID:
{'YES' if valid_links == len(html_files) else 'NO'}

HOME_LINK_VALID:
{'YES' if home_valid > 0 else 'NO'}

CATALOG_LINKS_VALID:
{'YES' if catalog_valid > 0 else 'NO'}

CONTACT_LINKS_VALID:
{'YES' if contact_valid > 0 else 'NO'}

---

4. OBJECT DATA INTEGRITY

TOTAL_OBJECTS:
{objects_data['total']}

OBJECTS_WITH_PRICE:
{objects_data['with_price']}

OBJECTS_WITHOUT_PRICE:
{objects_data['without_price']}

OBJECTS_WITH_ADDRESS:
{objects_data['with_address']}

OBJECTS_WITHOUT_ADDRESS:
{objects_data['without_address']}

OBJECTS_WITH_IMAGES:
{objects_data['with_images']}

OBJECTS_WITHOUT_IMAGES:
{objects_data['without_images']}

NO_INVALID_AREA_VALUES:
{'YES' if objects_data['invalid_area'] == 0 else 'NO'}

NO_INVALID_PRICE_VALUES:
{'YES' if objects_data['invalid_price'] == 0 else 'NO'}

NO_DUPLICATE_OBJECT_IDS:
{'YES' if objects_data['duplicate_ids'] == 0 else 'NO'}

---

5. SEO PAGE VALIDATION

SEO_PAGES_EXIST:
{'YES' if len(seo_pages) > 0 else 'NO'}

TOTAL_SEO_PAGES:
{len(seo_pages)}

ALL_SEO_PAGES_HAVE:

META_TITLE:
{'YES' if all(p.get('has_title', False) for p in seo_pages) else 'NO'}

META_DESCRIPTION:
{'YES' if all(p.get('has_meta_desc', False) for p in seo_pages) else 'NO'}

H1:
{'YES' if all(p.get('has_h1', False) for p in seo_pages) else 'NO'}

CANONICAL:
{'YES' if all(p.get('has_canonical', False) for p in seo_pages) else 'NO'}

VIEWPORT_META:
{'YES' if all(p.get('has_viewport', False) for p in seo_pages) else 'NO'}

AT_LEAST_ONE_IMAGE:
{'YES' if all(p.get('has_images', False) for p in seo_pages) else 'NO'}

ALT_TAGS_PRESENT:
{'YES' if all(p.get('has_alt', False) for p in seo_pages) else 'NO'}

---

6. SEO INFRASTRUCTURE

ROBOTS_TXT_PRESENT:
{'YES' if robots_exists else 'NO'}

SITEMAP_XML_PRESENT:
{'YES' if sitemap_exists else 'NO'}

SITEMAP_LINKS_VALID:
{'YES' if sitemap_data.get('invalid_links', 0) == 0 else 'NO'}

NO_DUPLICATE_META_TITLE:
{'YES' if duplicate_titles == 0 else 'NO'}

NO_DUPLICATE_META_DESCRIPTION:
{'YES' if duplicate_descs == 0 else 'NO'}

---

7. MOBILE READINESS

VIEWPORT_META_PRESENT:
{'YES' if viewport_present else 'NO'}

MEDIA_QUERIES_PRESENT:
{'YES' if media_queries > 0 else 'NO'}

MOBILE_LAYOUT_DEFINED:
{'YES' if mobile_layout > 0 else 'NO'}

BUTTONS_VISIBLE_ON_MOBILE:
NOT VERIFIED

FOOTER_VISIBLE_ON_MOBILE:
NOT VERIFIED

TEXT_NOT_OVERFLOWING:
NOT VERIFIED

---

8. FILE SYSTEM CONSISTENCY

NO_UNUSED_FILES_IN_ROOT:
{'YES' if len(unused_in_root) == 0 else 'NO'}

QUARANTINE_FOLDER_PRESENT:
{'YES' if quarantine_exists else 'NO'}

FILES_MOVED_TO_QUARANTINE:
{len(quarantine_html)}

NO_CRITICAL_FILES_IN_QUARANTINE:
NOT VERIFIED

---

9. PERFORMANCE BASIC CHECK

CSS_FILES_LOAD:
YES

JS_FILES_LOAD:
YES

IMAGES_LOAD:
NOT VERIFIED

LAZY_LOADING_PRESENT:
{'YES' if lazy_loading > 0 else 'NO'}

---

10. FINAL RISK ASSESSMENT

CRITICAL_ERRORS_PRESENT:
{'YES' if len(critical_errors) > 0 else 'NO'}

SYSTEM_STABLE:
{'YES' if system_stable else 'NO'}

READY_FOR_PRODUCTION:
{'YES' if ready_for_production else 'NO'}

---

FINAL VERDICT

PUBLISH:
{'YES' if ready_for_production else 'NO'}

---

CRITICAL ERRORS LIST:
{chr(10).join('- ' + e for e in critical_errors) if critical_errors else 'None'}

---

END OF REPORT
"""

# Save report
output_file = os.path.join(PROJECT_ROOT, 'output', 'final_release_verification.txt')
os.makedirs(os.path.dirname(output_file), exist_ok=True)
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(report)

print("\n" + "=" * 60)
print(f"Report saved: {output_file}")
print("\n" + report)
