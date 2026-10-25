"""从保留的 JPG/PNG 原图生成网站用 WebP；需要 Pillow。"""

from pathlib import Path
from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
PROJECTS = ("lecai-ai", "ai-agent", "caiyun")
LOSSLESS = (
    "hero-video-poster.png",
    "about-portrait-id-badge.png",
    "about-career-abstract.png",
    "about-tools-stars.png",
    "backgrounds/lingma-content-desktop.png",
    "backgrounds/lingma-content-mobile.png",
    "backgrounds/lingma-footer-glow-desktop.png",
    "backgrounds/lingma-footer-glow-mobile.png",
)


def convert(source: Path, destination: Path, *, lossless: bool = False) -> None:
    with Image.open(source) as opened:
        image = ImageOps.exif_transpose(opened)
        options = {"format": "WEBP", "method": 4, "lossless": lossless}
        if not lossless:
            options["quality"] = 95
        if profile := opened.info.get("icc_profile"):
            options["icc_profile"] = profile
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, **options)
        print(f"{source.relative_to(ROOT)} → {destination.relative_to(ROOT)}", flush=True)


for relative in LOSSLESS:
    source = ASSETS / relative
    convert(source, source.with_suffix(".webp"), lossless=True)

source = ASSETS / "about-advantage-space.jpg"
convert(source, source.with_suffix(".webp"))

for project in PROJECTS:
    originals = ASSETS / "project-images" / project
    previews = ASSETS / "project-previews" / project
    for source in sorted(originals.glob("*.jpg")):
        convert(source, source.with_suffix(".webp"))
        preview = previews / source.name
        if preview.is_file():
            convert(preview, preview.with_suffix(".webp"))
