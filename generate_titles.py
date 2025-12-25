import os
import json
import re

OBJECTS_DIR = "objects"

def make_title(description, city):
    desc = description.lower()

    rooms = "Квартира"
    if "1-комнат" in desc:
        rooms = "1-комнатная квартира"
    elif "2-комнат" in desc:
        rooms = "2-комнатная квартира"
    elif "3-комнат" in desc:
        rooms = "3-комнатная квартира"
    elif "студ" in desc:
        rooms = "Студия"

    area = ""
    m = re.search(r"(\d{2,3})\s*м", desc)
    if m:
        area = f"{m.group(1)} м²"

    return f"{rooms} · {city} · {area}".strip(" ·")

for folder in os.listdir(OBJECTS_DIR):
    path = os.path.join(OBJECTS_DIR, folder, "data.json")
    if not os.path.isfile(path):
        continue

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    city = data.get("city", "Ростовская область")
    title = data.get("title", "").strip()

    if title == "" or title.lower() == "без названия":
        data["title"] = make_title(data.get("description", ""), city)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"✔ {folder} → {data['title']}")

print("ГОТОВО 🚀")
