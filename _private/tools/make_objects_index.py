import os
import json

BASE_DIR = "objects"
index = []

for folder in sorted(os.listdir(BASE_DIR)):
    path = os.path.join(BASE_DIR, folder)
    data_file = os.path.join(path, "data.json")

    if os.path.isdir(path) and folder.startswith("object_") and os.path.exists(data_file):
        index.append(folder)

with open(os.path.join(BASE_DIR, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print(f"ГОТОВО. Найдено объектов: {len(index)}")
