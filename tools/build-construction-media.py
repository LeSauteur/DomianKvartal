from __future__ import annotations

import io
import re
import urllib.request
from pathlib import Path

import pdfplumber
from PIL import Image, ImageChops, ImageOps
from pypdf import PdfReader
from pypdf.generic import IndirectObject
from pypdf.generic._image_xobject import _xobj_to_image


ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / "tmp" / "pdfs" / "construction-work"
OUTPUT = ROOT / "assets" / "images" / "construction"


DOMANSTROY_MEDIA = {
    "domanstroy-ds-80": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1771581170354-450766883.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1771579809811-751121550.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773143441906-79028328.png",
    },
    "domanstroy-ds-85-5": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1771580097391-535034652.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1771580158381-238009338.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773926893037-492035228.png",
    },
    "domanstroy-ds-85": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1771582050841-853957493.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1771582086508-294313003.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773006595288-615406210.webp",
    },
    "domanstroy-ds-115": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1771592707768-366462321.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1771592747974-666611698.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773145602798-748138287.webp",
    },
    "domanstroy-ds-116": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1771594812377-695982697.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1771594847616-799206916.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773090948750-592953503.png",
    },
    "domanstroy-ds-128": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1771595056755-584821058.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1771595086623-841534878.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773234468078-150272172.webp",
    },
    "domanstroy-ds-130": {
        "facades": [
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-0-1784112520774-747312918.png",
            "https://s3.domanstroy.ru/domanstroy/uploads/house-gallery-1-1784112520864-557883113.png",
        ],
        "plan": "https://s3.domanstroy.ru/domanstroy/uploads/floor-plan-1773007483114-394260880.webp",
    },
}


SOYUZ_PROJECTS = {
    "soyuz-69-9": {"plan_top": 2487.6, "facade_top": 3306.0},
    "soyuz-75": {"plan_top": 4086.0, "facade_top": 4878.0},
    "soyuz-83-8": {"plan_top": 5686.0, "facade_top": 6507.0},
    "soyuz-84": {"plan_crop": (20, 7240, 850, 8070), "facade_top": 8167.2, "facade_name": "X45", "facade_plain": True, "facade2_top": 8482.7, "facade2_name": "X46"},
    "soyuz-85": {"plan_top": 9071.9, "facade_top": 9889.4},
    "soyuz-90": {"plan_crop": (20, 10530, 850, 11390), "facade_top": 11515.0},
    "soyuz-99": {"plan_top": 12339.0, "facade_top": 13157.0},
    "soyuz-105": {"plan_top": 13980.6, "facade_top": 14799.0},
    "soyuz-107": {"plan_top": 15619.0, "facade_top": 16435.0},
    "soyuz-109": {"plan_top": 17248.0, "facade_top": 18059.0},
    "soyuz-111-1": {"plan_crop": (20, 18840, 850, 19610), "facade_top": 19727.0, "facade_name": "X34", "facade_plain": True, "facade2_top": 20064.9, "facade2_name": "X35"},
    "soyuz-114-2": {"plan_crop": (20, 20420, 850, 21250), "facade_top": 21378.7, "facade_name": "X2", "facade_plain": True, "facade2_top": 21692.8, "facade2_name": "X3"},
    "soyuz-124": {"plan_top": 22132.0, "facade_top": 22946.0},
    "soyuz-137": {"plan_crop": (20, 23680, 850, 24470), "facade_top": 24539.6},
    "soyuz-142-2": {"plan_crop": (20, 25300, 850, 26080), "facade_top": 26199.0, "facade_name": "X5", "facade_plain": True, "facade2_top": 26538.0, "facade2_name": "X6"},
}


EQVITA_CROPS = {
    "eqvita-01": {
        "source": "page-05-image-001-Image41.jpg",
        "facades": [(420, 35, 1185, 505), (420, 515, 800, 840)],
        "plan": (20, 205, 410, 845),
    },
    "eqvita-02": {
        "source": "page-07-image-001-Image49.jpg",
        "facades": [(555, 35, 1190, 455), (760, 480, 1185, 835)],
        "plan": (20, 20, 690, 835),
    },
    "eqvita-03": {
        "source": "page-09-image-001-Image63.jpg",
        "facades": [(520, 45, 1175, 300), (40, 125, 505, 470)],
        "plan": (510, 290, 955, 835),
    },
    "eqvita-04": {
        "source": "page-11-image-001-Image70.jpg",
        "facades": [(495, 55, 1185, 360), (495, 370, 1185, 665)],
        "plan": (35, 80, 450, 390),
    },
}


def flatten(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    background = Image.new("RGBA", rgba.size, "white")
    background.alpha_composite(rgba)
    return background.convert("RGB")


def trim_white(image: Image.Image, border: int = 18) -> Image.Image:
    rgb = flatten(image)
    white = Image.new("RGB", rgb.size, "white")
    difference = ImageChops.difference(rgb, white).convert("L")
    difference = difference.point(lambda value: 255 if value > 10 else 0)
    box = difference.getbbox()
    if not box:
        return rgb
    left = max(0, box[0] - border)
    top = max(0, box[1] - border)
    right = min(rgb.width, box[2] + border)
    bottom = min(rgb.height, box[3] + border)
    return rgb.crop((left, top, right, bottom))


def save_variants(image: Image.Image, directory: Path, stem: str, trim: bool = False) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    image = trim_white(image) if trim else flatten(image)
    full = image.copy()
    full.thumbnail((1600, 1400), Image.Resampling.LANCZOS)
    full.save(directory / f"{stem}.webp", "WEBP", quality=84, method=6)

    mobile = image.copy()
    mobile.thumbnail((640, 640), Image.Resampling.LANCZOS)
    mobile.save(directory / f"{stem}-640.webp", "WEBP", quality=82, method=6)


def download_image(url: str) -> Image.Image:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return Image.open(io.BytesIO(response.read())).convert("RGBA")


def build_domanstroy() -> None:
    for slug, sources in DOMANSTROY_MEDIA.items():
        target = OUTPUT / slug
        for index, url in enumerate(sources["facades"], start=1):
            image = download_image(url)
            save_variants(image, target, "facade" if index == 1 else f"facade-{index}")
        save_variants(download_image(sources["plan"]), target, "plan", trim=True)


def nearest_image(items: list[dict], top: float, name: str | None = None) -> dict:
    candidates = items
    if name:
        named = [item for item in items if item.get("name") == name]
        if named:
            candidates = named
    return min(candidates, key=lambda item: abs(float(item["top"]) - top))


def extract_pdf_image(reader: PdfReader, record: dict) -> Image.Image:
    reference = IndirectObject(record["stream"].objid, 0, reader)
    _, _, image = _xobj_to_image(reader.get_object(reference))
    return flatten(image)


def facade_crops(image: Image.Image) -> tuple[Image.Image, Image.Image]:
    width, height = image.size
    right = int(width * 0.67)
    first = image.crop((0, 0, right, int(height * 0.47)))
    second = image.crop((0, int(height * 0.49), right, height))
    return trim_white(first, 8), trim_white(second, 8)


def build_soyuz() -> None:
    pdf_path = WORK / "soyuz.pdf"
    render_path = WORK / "inspection" / "soyuz" / "render" / "page.jpg"
    reader = PdfReader(pdf_path)
    render = Image.open(render_path).convert("RGB")

    with pdfplumber.open(pdf_path) as pdf:
        items = pdf.pages[0].images
        for slug, config in SOYUZ_PROJECTS.items():
            target = OUTPUT / slug

            if "plan_crop" in config:
                plan = render.crop(config["plan_crop"])
            else:
                record = nearest_image(items, config["plan_top"], config.get("plan_name"))
                plan = extract_pdf_image(reader, record)
            save_variants(plan, target, "plan", trim=True)

            facade_record = nearest_image(items, config["facade_top"], config.get("facade_name"))
            facade_source = extract_pdf_image(reader, facade_record)
            if config.get("facade_plain"):
                facade = trim_white(facade_source, 8)
                if slug == "soyuz-84":
                    facade = facade.crop((0, 0, facade.width, int(facade.height * 0.86)))
                save_variants(facade, target, "facade")
                if config.get("facade2_top"):
                    second_record = nearest_image(items, config["facade2_top"], config.get("facade2_name"))
                    save_variants(extract_pdf_image(reader, second_record), target, "facade-2", trim=True)
            else:
                first, second = facade_crops(facade_source)
                save_variants(first, target, "facade")
                save_variants(second, target, "facade-2")


def build_eqvita() -> None:
    embedded = WORK / "inspection" / "eqvita" / "embedded"
    for slug, config in EQVITA_CROPS.items():
        source = Image.open(embedded / config["source"]).convert("RGB")
        target = OUTPUT / slug
        for index, box in enumerate(config["facades"], start=1):
            save_variants(source.crop(box), target, "facade" if index == 1 else f"facade-{index}", trim=True)
        save_variants(source.crop(config["plan"]), target, "plan", trim=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    build_domanstroy()
    build_soyuz()
    build_eqvita()

    files = list(OUTPUT.rglob("*.webp"))
    print(f"Prepared {len(files)} optimized construction media files in {OUTPUT}")


if __name__ == "__main__":
    main()
