# /// script
# requires-python = ">=3.10"
# dependencies = ["Pillow>=10.0"]
# ///
"""Deterministic Python + Pillow + FFmpeg renderer for JSON-specified screen walkthroughs.

Streams raw RGB24 frames directly into FFmpeg with BT.709 matrix conversion and stream tags,
and automatically emits a sidecar .srt, poster.png, qa/chapter-NN.png stills, and a
3x3 qa/storyboard.png contact sheet.

Usage:
  uv run tools/render/workbook-render.py /abs/spec.json [--preview]
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

if "-h" not in sys.argv and "--help" not in sys.argv:
    from PIL import Image, ImageDraw, ImageFont


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1.0 - (1.0 - x) ** 3


def timestamp(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("spec", type=Path, help="Path to walkthrough JSON specification")
    parser.add_argument("--preview", action="store_true", help="Only render chapter stills, poster and storyboard")
    args = parser.parse_args()

    specpath = args.spec.resolve()
    cfg = json.loads(specpath.read_text())
    base = specpath.parent
    W = int(cfg.get("width", 1440))
    H = int(cfg.get("height", 1080))
    FPS = int(cfg.get("fps", 30))
    DURATION = float(cfg["scenes"][-1]["end"])
    OUT = Path(cfg["output"]).resolve()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    QA = OUT.parent / "qa"
    QA.mkdir(exist_ok=True)

    C = cfg["colors"]
    fontpaths = cfg["fonts"]
    fonts: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}
    assets: dict[str, Image.Image] = {}
    resized: dict[tuple, Image.Image] = {}

    def F(role: str, size: int) -> ImageFont.FreeTypeFont:
        k = (role, size)
        if k not in fonts:
            fonts[k] = ImageFont.truetype(str(base / fontpaths[role]), size)
        return fonts[k]

    def img(key: str) -> Image.Image:
        if key not in assets:
            assets[key] = Image.open(base / cfg["assets"][key]).convert("RGB")
        return assets[key]

    def txt(d: ImageDraw.ImageDraw, xy, s: str, size: int = 32, color=None, role: str = "body", anchor=None):
        d.text(xy, s, font=F(role, size), fill=color or C["ink"], spacing=int(size * 0.16), anchor=anchor)

    def wrap(s: str, size: int, maxw: int, role: str = "body") -> list[str]:
        out = []
        for line in s.split("\n"):
            words = line.split()
            a = ""
            for word in words:
                test = (a + " " + word).strip()
                if F(role, size).getlength(test) > maxw and a:
                    out.append(a)
                    a = word
                else:
                    a = test
            out.append(a)
        return out

    def lines(d: ImageDraw.ImageDraw, xy, s: str, size: int = 32, color=None, role: str = "body",
              width: int = 1200, leading=None) -> int:
        y = xy[1]
        for line in wrap(s, size, width, role):
            txt(d, (xy[0], y), line, size, color, role)
            y += leading or int(size * 1.23)
        return y

    def card(im: Image.Image, box, fill: str = "white", radius: int = 20):
        d = ImageDraw.Draw(im)
        x, y, w, h = box
        d.rounded_rectangle((x + 2, y + 8, x + w + 2, y + h + 8), radius, fill="#D8CDD1")
        d.rounded_rectangle((x, y, x + w, y + h), radius, fill=fill)

    def media(im: Image.Image, key: str, box, crop=None, zoom: float = 1.0, focus=(0.5, 0.5), contain: bool = True):
        x, y, w, h = map(int, box)
        a = img(key)
        if crop:
            a = a.crop(crop)
        ratio = (min(w / a.width, h / a.height) if contain else max(w / a.width, h / a.height)) * zoom
        size = (max(1, int(a.width * ratio)), max(1, int(a.height * ratio)))
        k = (key, crop, size)
        if k not in resized:
            if len(resized) > 90:
                resized.clear()
            resized[k] = a.resize(size, Image.Resampling.LANCZOS)
        a = resized[k]
        layer = Image.new("RGB", (w, h), "white")
        px = int((w - a.width) * focus[0])
        py = int((h - a.height) * focus[1])
        layer.paste(a, (px, py))
        im.paste(layer, (x, y))

    def pill(d: ImageDraw.ImageDraw, x: int, y: int, label: str, active: bool = False) -> int:
        w = int(F("bold", 23).getlength(label)) + 40
        d.rounded_rectangle((x, y, x + w, y + 42), 21,
                            fill=C["dark"] if active else "white",
                            outline=None if active else C["rule"])
        txt(d, (x + 20, y + 7), label, 23, "white" if active else C["dark"], "bold")
        return w

    def pointer(im: Image.Image, x: float, y: float, scale: float = 1.0):
        d = ImageDraw.Draw(im)
        p = [(x, y), (x + 1, y + 43 * scale), (x + 12 * scale, y + 32 * scale),
             (x + 22 * scale, y + 51 * scale), (x + 31 * scale, y + 46 * scale),
             (x + 22 * scale, y + 28 * scale), (x + 40 * scale, y + 25 * scale)]
        d.polygon([(a + 2, b + 2) for a, b in p], fill="#B9ADB5")
        d.polygon(p, fill=C["dark"], outline="white")

    def baseframe(sc: dict):
        im = Image.new("RGB", (W, H), C["background"])
        d = ImageDraw.Draw(im)
        d.ellipse((1150, -290, 1670, 230), outline=C["rule"], width=2)
        txt(d, (72, 36), cfg["brand"], 23, C["dark"], "bold")
        txt(d, (W - 72, 36), cfg["stamp"], 23, C["dark"], anchor="ra")
        if sc["kind"] not in ["intro", "outro"]:
            txt(d, (72, 101), sc["title"], 70, C["coral"], "display")
            x = 72
            for name in ([] if sc.get("hide_tabs") else cfg.get("tabs", [])):
                x += pill(d, x, 188, name, name == sc.get("tab")) + 12
        return im

    def caption(im: Image.Image, sc: dict, t: float):
        d = ImageDraw.Draw(im)
        d.rectangle((0, 869, W, H), fill=C["dark"])
        d.rectangle((0, 869, W, 873), fill=C["lavender"])
        cap = wrap(sc["caption"], 42, W - 144)
        assert len(cap) <= 2, (sc["title"], cap)
        for n, line in enumerate(cap):
            txt(d, (72, 908 + n * 53), line, 42, "white")
        txt(d, (72, 1035), cfg["footer"], 20, C["light"])
        txt(d, (W - 72, 1035), f"{int(t):02d} / {int(DURATION):02d}", 20, C["light"], anchor="ra")
        d.rectangle((0, H - 12, int(W * t / DURATION), H), fill=C["coral"])

    def render_scene(sc: dict, local: float, t: float) -> Image.Image:
        p = local / (sc["end"] - sc["start"])
        e = ease(local / 0.65)
        im = baseframe(sc)
        d = ImageDraw.Draw(im)
        kind = sc["kind"]
        y = int(245 + (1 - e) * 25)
        if kind == "intro":
            lines(d, (72, 126), sc["title"], 116, C["dark"], "display", 1250, 118)
            txt(d, (74, 388), sc["sub"], 34, C["dark"])
            for j, key in enumerate(sc["images"]):
                x = 72 + j * 666
                txt(d, (x, 460), sc["labels"][j], 24, C["dark"], "bold")
                card(im, (x, 504, 630, 310))
                media(im, key, (x + 14, 518, 602, 282))
        elif kind == "before":
            card(im, (72, y, 914, 575))
            media(im, sc["image"], (86, y + 16, 886, 543), zoom=1.02 + 0.02 * p)
            for j, item in enumerate(sc["stats"]):
                yy = 270 + j * 253
                txt(d, (1040, yy), item["label"], 24, C["dark"], "bold")
                txt(d, (1036, yy + 36), item["value"], 86, C["dark"], "serif")
                lines(d, (1040, yy + 145), item["note"], 25, C["dark"], width=320)
            txt(d, (72, 829), sc["note"], 21, C["muted"])
        elif kind == "screen":
            card(im, (72, y, 1296, 575))
            media(im, sc["image"], (90, y + 17, 1260, 541),
                  crop=tuple(sc["crop"]) if sc.get("crop") else None,
                  zoom=1 + 0.025 * p, focus=(0.5, 0.25))
            if "highlight" in sc:
                x, yy, w, hh = sc["highlight"]
                phase = ease((local - 1.4) / 0.7)
                if phase > 0:
                    d.rounded_rectangle((x, yy, x + w, yy + hh), 12, outline=C["plum"], width=4)
                    pointer(im, x + w - 20 + (1 - phase) * 120, yy + hh - 20)
            txt(d, (72, 830), sc["note"], 21, C["muted"])
        elif kind == "edit":
            changed = local >= 2.8
            key = sc["after"] if changed else sc["before"]
            pill(d, 72, 188, sc["badge"], True)
            card(im, (72, y, 1296, 334))
            media(im, key, (90, y + 16, 1260, 302))
            hx, hy, hw, hh = sc.get("edit_highlight", [966, 333, 129, 59])
            d.rounded_rectangle((hx, hy, hx + hw, hy + hh), 10, outline=C["plum"], width=4)
            pointer(im, hx + hw - 24, hy + hh - 15)
            for j in range(2):
                x = 72 + j * 666
                card(im, (x, 612, 630, 195), fill=C["sky"] if j == 0 else C["blush"])
                txt(d, (x + 26, 632), sc["labels"][j], 25, C["dark"], "bold")
                media(im, sc["counters"][j], (x + 24, 675, 582, 116),
                      crop=tuple(sc["counter_crop"]) if sc.get("counter_crop") else None)
                if j == 1 and not changed:
                    d.rounded_rectangle((x + 18, 671, x + 612, 797), 9, fill=C["blush"])
                    txt(d, (x + 28, 697), sc["pending"], 31, C["dark"])
            txt(d, (72, 829), sc["note"], 21, C["muted"])
        elif kind == "client":
            card(im, (72, y, 810, 575))
            media(im, sc["image"], (89, y + 16, 776, 543))
            txt(d, (942, 270), sc["focus_title"], 37, C["dark"], "bold")
            txt(d, (936, 333), sc["focus_value"], 111, C["dark"], "serif")
            lines(d, (942, 490), sc["focus_note"], 32, C["dark"], width=395)
            lines(d, (942, 663), sc["disclaimer"], 23, C["muted"], width=390)
            txt(d, (72, 829), sc["note"], 21, C["muted"])
        elif kind == "report":
            key = sc["image"] if local < 2.7 else sc["report"]
            card(im, (72, y, 876, 575))
            crop = tuple(sc["report_crop"]) if local >= 2.7 and sc.get("report_crop") else None
            media(im, key, (88, y + 16, 844, 543), crop=crop)
            for j, label in enumerate(sc["labels"]):
                yy = 302 + j * 143
                d.ellipse((996, yy + 9, 1010, yy + 23), fill=C["coral"])
                lines(d, (1035, yy), label, 34, C["dark"], "bold", 320)
            txt(d, (72, 829), sc["note"], 21, C["muted"])
        elif kind == "outro":
            lines(d, (72, 128), sc["title"], 110, C["dark"], "display", 1260, 116)
            for j, item in enumerate(sc["items"]):
                yy = 390 + j * 134
                card(im, (72, yy, 1296, 110), fill=[C["sky"], C["blush"], C["peach"]][j % 3])
                txt(d, (101, yy + 24), item["label"], 27, C["dark"], "bold")
                txt(d, (500, yy + 25), item["value"], 32, C["dark"])
            txt(d, (72, 829), sc["note"], 23, C["dark"], "bold")
        caption(im, sc, t)
        return im

    def at(t: float) -> Image.Image:
        sc = next((s for s in cfg["scenes"] if s["start"] <= t < s["end"]), cfg["scenes"][-1])
        a = render_scene(sc, t - sc["start"], t)
        idx = cfg["scenes"].index(sc)
        if idx and t - sc["start"] < 0.3:
            prev = cfg["scenes"][idx - 1]
            b = render_scene(prev, prev["end"] - prev["start"] - 0.02, t)
            return Image.blend(b, a, (t - sc["start"]) / 0.3)
        return a

    srt = []
    for i, sc in enumerate(cfg["scenes"]):
        srt.extend([str(i + 1), f"{timestamp(sc['start'])} --> {timestamp(sc['end'])}", sc["caption"], ""])
    (OUT.parent / (OUT.stem + ".srt")).write_text("\n".join(srt))

    shots = []
    for i, sc in enumerate(cfg["scenes"]):
        t = sc["start"] + (sc["end"] - sc["start"]) * 0.65
        frame = at(t)
        frame.save(QA / f"chapter-{i + 1:02}.png")
        shots.append(frame.copy())

    thumb = Image.new("RGB", (W, H), "#F7F0F3")
    tw, th = W // 3, H // 3
    for i, frame in enumerate(shots[:9]):
        thumb.paste(frame.resize((tw, th), Image.Resampling.LANCZOS), ((i % 3) * tw, (i // 3) * th))
    thumb.save(QA / "storyboard.png")
    shots[0].save(OUT.parent / "poster.png")

    if args.preview:
        print("Preview complete", flush=True)
        return 0

    ffmpeg_bin = shutil.which("ffmpeg") or "ffmpeg"
    cmd = [
        ffmpeg_bin, "-hide_banner", "-loglevel", "warning", "-y",
        "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", f"{W}x{H}", "-framerate", str(FPS),
        "-i", "-", "-an",
        "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-threads", "2",
        "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
        "-movflags", "+faststart",
        "-metadata", "title=" + cfg.get("video_title", OUT.stem),
        "-metadata", "comment=" + cfg.get("video_comment", ""),
        str(OUT),
    ]
    start = time.time()
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        assert proc.stdin is not None
        for f in range(int(round(DURATION * FPS))):
            t = f / FPS
            proc.stdin.write(at(t).tobytes())
            if f % (FPS * 5) == 0:
                print(f"Rendered {t:.0f}/{DURATION}s ({time.time() - start:.0f}s elapsed)", flush=True)
        proc.stdin.close()
        code = proc.wait()
        if code:
            raise RuntimeError(f"ffmpeg exited {code}")
    except BaseException:
        if proc.poll() is None:
            proc.terminate()
            proc.wait()
        raise
    print(json.dumps({
        "output": str(OUT), "duration": DURATION, "fps": FPS,
        "width": W, "height": H, "bytes": OUT.stat().st_size,
        "elapsed_seconds": round(time.time() - start),
    }), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
