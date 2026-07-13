import io
import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(__file__).resolve().parent / "newbuilds-media-selection.json"
OUTPUT_ROOT = ROOT / "assets" / "images" / "newbuilds"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"


def download(url: str, referer: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Referer": referer})
    with urllib.request.urlopen(request, timeout=20) as response:
        return response.read(20 * 1024 * 1024)


def main() -> None:
    projects = json.loads(MANIFEST.read_text(encoding="utf-8"))
    force = "--force" in sys.argv[1:]
    requested = {argument for argument in sys.argv[1:] if not argument.startswith("--")}
    written = 0
    for project in projects:
        if requested and project["slug"] not in requested:
            continue
        target_dir = OUTPUT_ROOT / project["slug"]
        target_dir.mkdir(parents=True, exist_ok=True)
        for item in project["images"] + project.get("floorplans", []):
            target = target_dir / item["name"]
            if not force and target.exists() and target.stat().st_size > 0:
                print(f"skip {target.relative_to(ROOT)}", flush=True)
                continue
            data = download(item["url"], project["official_url"])
            image = Image.open(io.BytesIO(data)).convert("RGB")
            if max(image.size) > 1920:
                image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)
            image.save(target, "WEBP", quality=84, method=6)
            written += 1
            print(f"{target.relative_to(ROOT)} {image.width}x{image.height}", flush=True)
    print(f"written={written}", flush=True)


if __name__ == "__main__":
    main()
