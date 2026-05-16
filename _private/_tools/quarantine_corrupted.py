#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Move corrupted files to quarantine
"""

import os
import shutil
from datetime import datetime

PROJECT_ROOT = "c:\\SS6\\Git"
QUARANTINE_ROOT = os.path.join(PROJECT_ROOT, '_quarantine', 'encoding_corrupted')

# Create quarantine folder
os.makedirs(QUARANTINE_ROOT, exist_ok=True)

# Corrupted files (irrecoverable - text replaced with ???)
corrupted_files = [
    'seo/doma-bolshoy-log.html',
    'seo/doma-v-aksay-kom.html',
    'seo/kvartiry-muhina-balka.html',
    'seo/kvartiry-v-centre-aksaya.html'
]

moved_files = []

for ef in corrupted_files:
    src_path = os.path.join(PROJECT_ROOT, ef)
    if os.path.exists(src_path):
        # Create subfolder structure in quarantine
        dst_path = os.path.join(QUARANTINE_ROOT, ef.replace('/', os.sep).replace('\\', os.sep))
        os.makedirs(os.path.dirname(dst_path), exist_ok=True)
        
        # Move file
        shutil.move(src_path, dst_path)
        moved_files.append({
            'from': ef,
            'to': os.path.relpath(dst_path, PROJECT_ROOT)
        })
        print(f"MOVED: {ef} -> {os.path.relpath(dst_path, PROJECT_ROOT)}")
    else:
        print(f"NOT FOUND: {ef}")

# Generate report
report = f"""ENCODING_CORRUPTED_FILES_REPORT

DATE:
{datetime.now().strftime('%Y-%m-%d')}

---

STATUS:
IRRECOVERABLE

The following files contain text that has been permanently corrupted.
Cyrillic characters were replaced with '?' characters.
Original text cannot be recovered through encoding conversion.

---

FILES_MOVED_TO_QUARANTINE:

"""

for f in moved_files:
    report += f"FROM: {f['from']}\n"
    report += f"TO:   {f['to']}\n\n"

report += f"""
---

TOTAL_FILES_MOVED:
{len(moved_files)}

---

RECOMMENDATION:

These files need to be recreated with proper content.
The original text data is permanently lost.

---

END OF REPORT
"""

# Save report
output_file = os.path.join(PROJECT_ROOT, 'output', 'encoding_corrupted_files.txt')
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(report)

print(f"\nReport saved: {output_file}")
