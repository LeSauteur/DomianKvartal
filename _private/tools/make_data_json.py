import os
import json

BASE_DIR = "objects"

for folder in sorted(os.listdir(BASE_DIR)):
    obj_path = os.path.join(BASE_DIR, folder)

    if not os.path.isdir(obj_path):
        continue

    desc_file = os.path.join(obj_path, "description.txt")
    if not os.path.exists(desc_file):
        print(f"⚠ Нет description.txt в {folder}")
        continue

    # --- читаем описание ---
    with open(desc_file, encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    if not lines:
        print(f"⚠ Пустое описание в {folder}")
        continue

    title = lines[0]
    description = "\n".join(lines[1:])

    # --- собираем изображения ---
    images = sorted([
        file for file in os.listdir(obj_path)
        if file.lower().startswith("img_")
        and file.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ])

    if not images:
        print(f"⚠ Нет изображений в {folder}")
        continue

    data = {
        "title": title,
        "description": description,
        "images": images
    }

    # --- сохраняем data.json ---
    with open(os.path.join(obj_path, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✔ {folder}: data.json создан")

print("ГОТОВО.")
