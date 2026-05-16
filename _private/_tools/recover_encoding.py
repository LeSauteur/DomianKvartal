#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Try to recover corrupted encoding files
"""

import os
import codecs

PROJECT_ROOT = "c:\\SS6\\Git"

# Files with encoding issues
error_files = [
    'seo/doma-bolshoy-log.html',
    'seo/doma-v-aksay-kom.html',
    'seo/kvartiry-muhina-balka.html',
    'seo/kvartiry-v-centre-aksaya.html'
]

encodings_to_try = [
    'utf-8',
    'windows-1251',
    'koi8-r',
    'iso-8859-5',
    'utf-8-sig',
    'utf-16',
    'utf-16-le',
    'utf-16-be',
    'cp866',
    'mac-cyrillic',
]

for ef in error_files:
    filepath = os.path.join(PROJECT_ROOT, ef)
    if not os.path.exists(filepath):
        print(f"{ef}: FILE NOT FOUND")
        continue
    
    print(f"\n{'='*60}")
    print(f"Trying to decode: {ef}")
    print(f"{'='*60}")
    
    # Read raw bytes
    with open(filepath, 'rb') as f:
        raw = f.read()
    
    print(f"File size: {len(raw)} bytes")
    
    # Try each encoding
    for enc in encodings_to_try:
        try:
            content = raw.decode(enc)
            # Check if we got valid Cyrillic
            import re
            cyrillic_chars = len(re.findall(r'[\u0400-\u04FF]', content))
            question_marks = content.count('?')
            
            print(f"\n  {enc}:")
            print(f"    Cyrillic chars: {cyrillic_chars}")
            print(f"    Question marks: {question_marks}")
            
            if cyrillic_chars > 10 and question_marks < 20:
                print(f"    >>> POTENTIAL MATCH! <<<")
                # Show first 200 chars
                print(f"    Preview: {content[:200]}")
                
        except Exception as e:
            print(f"  {enc}: FAILED - {e}")
