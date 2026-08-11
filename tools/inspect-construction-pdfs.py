from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

from pypdf import PdfReader


def safe_stem(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-.")
    return value or "image"


def inspect_pdf(pdf_path: Path, output_dir: Path) -> dict:
    reader = PdfReader(pdf_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    text_dir = output_dir / "text"
    image_dir = output_dir / "embedded"
    text_dir.mkdir(exist_ok=True)
    image_dir.mkdir(exist_ok=True)

    inventory: dict = {
        "source": str(pdf_path),
        "pages": len(reader.pages),
        "pageItems": [],
    }
    combined_text: list[str] = []

    for page_index, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        (text_dir / f"page-{page_index:02d}.txt").write_text(text, encoding="utf-8")
        combined_text.append(f"\n===== PAGE {page_index} =====\n{text}")

        page_record = {
            "page": page_index,
            "width": float(page.mediabox.width),
            "height": float(page.mediabox.height),
            "textCharacters": len(text),
            "images": [],
        }

        try:
            images = list(page.images)
        except Exception as error:  # malformed image objects should not stop inspection
            page_record["imageError"] = str(error)
            images = []

        for image_index, image_file in enumerate(images, start=1):
            original_name = Path(image_file.name or "image.bin")
            stem = safe_stem(original_name.stem)
            suffix = original_name.suffix.lower() or ".bin"
            target_name = f"page-{page_index:02d}-image-{image_index:03d}-{stem}{suffix}"
            target = image_dir / target_name
            try:
                target.write_bytes(image_file.data)
                record = {
                    "file": target_name,
                    "bytes": target.stat().st_size,
                }
                try:
                    pil_image = image_file.image
                    record.update(
                        {
                            "width": pil_image.width,
                            "height": pil_image.height,
                            "mode": pil_image.mode,
                            "format": pil_image.format,
                        }
                    )
                except Exception as error:
                    record["metadataError"] = str(error)
                page_record["images"].append(record)
            except Exception as error:
                page_record["images"].append(
                    {"file": target_name, "extractionError": str(error)}
                )

        inventory["pageItems"].append(page_record)

    (output_dir / "text.txt").write_text("".join(combined_text), encoding="utf-8")
    (output_dir / "inventory.json").write_text(
        json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return inventory


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("pdfs", nargs="+", type=Path)
    args = parser.parse_args()

    summaries = []
    for pdf_path in args.pdfs:
        output_dir = args.output_dir / pdf_path.stem
        inventory = inspect_pdf(pdf_path, output_dir)
        summaries.append(
            {
                "source": str(pdf_path),
                "pages": inventory["pages"],
                "images": sum(
                    len(page["images"]) for page in inventory["pageItems"]
                ),
                "textCharacters": sum(
                    page["textCharacters"] for page in inventory["pageItems"]
                ),
            }
        )

    print(json.dumps(summaries, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
