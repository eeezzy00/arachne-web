"""Converts public/sprites/spider.gif into a horizontal RGBA sprite sheet.

Usage: python scripts/build_spider_sheet.py
Re-run whenever the source GIF changes; prints the frame size/count
that must match SPIDER_SPRITE in src/data/spiderSprite.ts.
"""

from pathlib import Path

from PIL import Image, ImageSequence

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "sprites" / "spider.gif"
OUT = ROOT / "public" / "sprites" / "spider-sheet.png"


def main() -> None:
    gif = Image.open(SRC)
    w, h = gif.size
    frames = [f.convert("RGBA") for f in ImageSequence.Iterator(gif)]
    sheet = Image.new("RGBA", (w * len(frames), h), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (i * w, 0))
    sheet.save(OUT)
    print(f"{OUT.name}: {len(frames)} frames of {w}x{h}")


if __name__ == "__main__":
    main()
