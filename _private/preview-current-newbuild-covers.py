import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "output" / "newbuilds" / "newbuilds-v2-merged.json"
OUTPUT = ROOT / "tmp" / "newbuilds-rebuild" / "current-covers"
COLS, ROWS = 4, 5
CELL_W, CELL_H = 360, 250
IMAGE_H = 195


def main() -> None:
    entries = json.loads(DATA.read_text(encoding="utf-8-sig"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()
    page_size = COLS * ROWS

    for page_index, start in enumerate(range(0, len(entries), page_size), start=1):
        sheet = Image.new("RGB", (COLS * CELL_W, ROWS * CELL_H), "white")
        draw = ImageDraw.Draw(sheet)
        for local_index, item in enumerate(entries[start:start + page_size]):
            index = start + local_index
            x = (local_index % COLS) * CELL_W
            y = (local_index // COLS) * CELL_H
            image_path = ROOT / str(item.get("image", ""))
            try:
                image = Image.open(image_path).convert("RGB")
                thumb = ImageOps.fit(image, (CELL_W - 12, IMAGE_H - 8), method=Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x + 6, y + 4))
            except Exception:
                draw.rectangle((x + 6, y + 4, x + CELL_W - 6, y + IMAGE_H - 4), fill="#dddddd")
            title = str(item.get("title") or "")
            label = f"{index + 1:02d} {title}"[:54]
            draw.text((x + 8, y + IMAGE_H + 5), label, fill="#201713", font=font)
            draw.text((x + 8, y + IMAGE_H + 24), image_path.name[:42], fill="#76584b", font=font)
        target = OUTPUT / f"covers-{page_index}.jpg"
        sheet.save(target, "JPEG", quality=90, optimize=True)
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()
