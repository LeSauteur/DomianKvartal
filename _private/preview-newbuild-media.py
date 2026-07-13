import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = ROOT / "tmp" / "newbuilds-rebuild" / "media-candidates.json"
OUTPUT = ROOT / "tmp" / "newbuilds-rebuild" / "contact-sheets"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"
CELL_W, CELL_H = 360, 250
IMAGE_H = 205
COLS = 4
LIMIT = 20


def fetch_image(url: str, referer: str) -> Image.Image:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Referer": referer})
    with urllib.request.urlopen(request, timeout=15) as response:
        data = response.read(18 * 1024 * 1024)
    return Image.open(io.BytesIO(data)).convert("RGB")


def main() -> None:
    requested = set(sys.argv[1:])
    projects = json.loads(CANDIDATES.read_text(encoding="utf-8"))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    font = ImageFont.load_default()

    for project in projects:
        if requested and project["slug"] not in requested:
            continue
        images = project.get("images", [])[:LIMIT]
        rows = max(1, (len(images) + COLS - 1) // COLS)
        sheet = Image.new("RGB", (COLS * CELL_W, rows * CELL_H), "white")
        draw = ImageDraw.Draw(sheet)

        for index, item in enumerate(images):
            x = (index % COLS) * CELL_W
            y = (index // COLS) * CELL_H
            try:
                image = fetch_image(item["url"], project["page_url"])
                thumb = ImageOps.fit(image, (CELL_W - 12, IMAGE_H - 8), method=Image.Resampling.LANCZOS)
                sheet.paste(thumb, (x + 6, y + 4))
                label = f"{index:02d}  {item['width']}x{item['height']}  {item['format']}"
            except Exception as error:
                label = f"{index:02d}  ERROR {type(error).__name__}"
            draw.text((x + 8, y + IMAGE_H + 7), label, fill="#281a15", font=font)

        target = OUTPUT / f"{project['slug']}.jpg"
        sheet.save(target, "JPEG", quality=88, optimize=True)
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()
