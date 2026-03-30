import os
import json
import re

BASE_DIR = r"C:\SS6\Git"

DATA_FOLDERS = [
    "objects",
    "lands",
    "newbuilds",
    os.path.join("output", "houses")
]

def read_json_safe(path):

    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    except:
        return None


def is_bad_address(addr):

    if not addr:
        return True

    addr = addr.lower()

    bad_words = [
        "звоните",
        "возможен",
        "торг",
        "дом",
        "квартира",
        "этаж"
    ]

    if len(addr) < 6:
        return True

    for w in bad_words:
        if w in addr:
            return True

    return False


def extract_price(text):

    if not text:
        return None

    match = re.search(r"\d[\d\s]{3,}", text)

    if match:
        price = match.group().replace(" ", "")

        try:
            return int(price)
        except:
            return None

    return None


def count_images(folder_path):

    if not os.path.exists(folder_path):
        return 0

    count = 0

    for f in os.listdir(folder_path):

        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            count += 1

    return count


def process_folder(folder_name):

    results = []

    folder_path = os.path.join(BASE_DIR, folder_name)

    if not os.path.exists(folder_path):
        return results

    for item in os.listdir(folder_path):

        item_path = os.path.join(folder_path, item)

        if not os.path.isdir(item_path):
            continue

        data_json = os.path.join(item_path, "data.json")

        data = read_json_safe(data_json)

        title = ""
        description = ""
        address = ""

        if data:

            title = data.get("title", "")
            description = data.get("description", "")
            address = data.get("address", "")

        problems = []

        # TITLE

        if not title or len(title) < 5:
            problems.append("BAD_TITLE")

        # DESCRIPTION

        if not description:
            problems.append("NO_DESCRIPTION")

        if description and len(description) < 50:
            problems.append("SHORT_DESCRIPTION")

        # ADDRESS

        if is_bad_address(address):
            problems.append("BAD_ADDRESS")

        # PRICE

        price = extract_price(description)

        if not price:
            problems.append("NO_PRICE")

        else:

            if price < 100000:
                problems.append("PRICE_TOO_LOW")

            if price > 100000000:
                problems.append("PRICE_TOO_HIGH")

        # IMAGES

        img_count = count_images(item_path)

        if img_count == 0:
            problems.append("NO_IMAGES")

        results.append({
            "folder": folder_name,
            "object_id": item,
            "title": title,
            "problems": problems
        })

    return results


def main():

    all_results = []

    for folder in DATA_FOLDERS:

        print("Checking:", folder)

        res = process_folder(folder)

        all_results.extend(res)

    output_file = os.path.join(BASE_DIR, "audit_report.txt")

    with open(output_file, "w", encoding="utf-8") as f:

        total = len(all_results)

        bad = 0

        for r in all_results:

            if r["problems"]:

                bad += 1

                f.write("ID: " + r["object_id"] + "\n")
                f.write("TYPE: " + r["folder"] + "\n")
                f.write("TITLE: " + r["title"] + "\n")
                f.write("PROBLEMS: " + ", ".join(r["problems"]) + "\n")
                f.write("\n")

        f.write("TOTAL OBJECTS: " + str(total) + "\n")
        f.write("OBJECTS WITH PROBLEMS: " + str(bad) + "\n")

    print()
    print("DONE")
    print(output_file)


if __name__ == "__main__":
    main()