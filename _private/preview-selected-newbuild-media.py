import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(__file__).resolve().parent / "newbuilds-media-selection.json"
TARGET = ROOT / "tmp" / "newbuilds-rebuild" / "selected-media.jpg"
CELL_W, CELL_H, IMAGE_H, COLS = 360, 245, 195, 4


def main() -> None:
    projects = json.loads(MANIFEST.read_text(encoding="utf-8"))
    items = []
    for project in projects:
        for item in project["images"] + project.get("floorplans", []):
            items.append((project["slug"], item))

    rows = max(1, (len(items) + COLS - 1) // COLS)
    sheet = Image.new("RGB", (COLS * CELL_W, rows * CELL_H), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, (slug, item) in enumerate(items):
        path = ROOT / "assets" / "images" / "newbuilds" / slug / item["name"]
        x = (index % COLS) * CELL_W
        y = (index // COLS) * CELL_H
        image = Image.open(path).convert("RGB")
        thumb = ImageOps.fit(image, (CELL_W - 12, IMAGE_H - 8), method=Image.Resampling.LANCZOS)
        sheet.paste(thumb, (x + 6, y + 4))
        draw.text((x + 8, y + IMAGE_H + 5), f"{slug} / {item['name']}", fill="#281a15", font=font)
        draw.text((x + 8, y + IMAGE_H + 21), f"{image.width}x{image.height} / {item['type']}", fill="#7a4537", font=font)

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(TARGET, "JPEG", quality=90, optimize=True)
    print(TARGET.relative_to(ROOT))


if __name__ == "__main__":
    main()
