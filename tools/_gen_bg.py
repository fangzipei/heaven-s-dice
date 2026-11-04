"""Generate the Act room plates in the graypaw paper-craft style.

Uses the graypaw idle render as a STYLE reference so the environment art sits
in the same handmade paper-puppet language as the enemy portraits.

Every plate shares one composition, because the game crops the room art to a
window whose far edge has to land under the dealer's portrait:

    first-person, seated at the table, table height;
    the table's far edge runs horizontally across the middle of the frame;
    below it the bare tabletop fills the lower half;
    above it the room behind, where the dealer will be pasted.

Usage:
    python tools/_gen_bg.py act1 --out vibe_images/act1
    python tools/_gen_bg.py --keys act1,act2,act3,act4,act5 --out vibe_images
"""
from __future__ import annotations

import json
import ssl
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
GRAYPAW = ROOT / "vibe_images" / "graypaw" / "idle" / "graypaw-idle_1200x1600.png"
MCODE = r"C:\Users\jblz\.minimax\bin\mcode-tools.cmd"
TOOL = "connector__matrix__generate_image"

STYLE = (
    "full scene, hand-drawn origami paper puppet diorama, folded paper texture with visible "
    "fibers and creases, colored-pencil and charcoal linework, aged parchment and ink palette, "
    "dramatic warm rim light, sharp silhouettes, hand-cut paper edges, "
)
STYLE_REF = (
    "Image 1 is a different subject used ONLY as a rendering style reference: match its "
    "hand-drawn origami paper-puppet technique, crumpled paper texture with visible fibers and "
    "creases, colored-pencil and charcoal linework, aged parchment and ink palette, warm rim "
    "lighting on the shapes. Do not copy its character design. The picture has no border, no "
    "frame and no torn paper margin: the scene fills the whole canvas from edge to edge. "
)
NEGATIVE = (
    "Avoid: photorealistic, 3D render, plastic, glossy, clay, anime, chibi, cute mascot, "
    "blurry, low contrast, gore, horror, demons, skulls, fire, smoke, crowds of realistic "
    "people, legible text, letters, logo, watermark, modern objects, plastic chairs, "
    "tablecloth, cloth runner, rag, sheet of paper on the table, tea cup, teapot, candlestick, "
    "plate, books on the table, scattered trinkets, objects on the table, picture frame, "
    "white border, torn paper margin"
)

# The geometry every plate has to honour. The desk material changes with the
# act - oak, bluestone, black iron, gold, crystal - so the table gets more
# grand as the run goes on instead of staying the same plank slab throughout.
DESK = {
    "act1": (
        "a plain solid wooden desk of rough oak planks",
        "the bare solid oak tabletop",
        "warmly lit",
        "The tabletop is plain bare oak: only the grain of its planks and the warm light "
        "falling across them, absolutely nothing on it, no cloth, no runner, no sheet of "
        "paper, no props, no objects.",
    ),
    "act2": (
        "a single slab of pale grey-blue bluestone, cut from one block, with a chiselled "
        "bevelled edge and faint cool veining",
        "the whole bare bluestone surface",
        "lit cool, picking up the warm lamp as a soft amber sheen",
        "The tabletop is plain bare bluestone: only the stone's own veining and the light "
        "falling across it, absolutely nothing on it, no cloth, no runner, no sheet of paper, "
        "no props, no objects.",
    ),
    "act3": (
        "a heavy plate of black iron, hammered into shallow facets, the surface dark gunmetal "
        "grey catching the furnace as warm ember reflections",
        "the whole bare iron surface",
        "lit by warm ember light, with dull reflections across the hammered facets",
        "The tabletop is plain bare iron: only the metal's own hammered texture and the light "
        "falling across it, absolutely nothing on it, no cloth, no runner, no sheet of paper, "
        "no props, no objects.",
    ),
    "act4": (
        "a solid slab of polished gold, the surface gilded gold leaf with a bevelled edge",
        "the whole bare gold surface",
        "bright and warm, throwing a soft golden sheen back onto the wall",
        "The tabletop is plain bare gold: only the metal's own sheen and the light falling "
        "across it, absolutely nothing on it, no cloth, no runner, no sheet of paper, no "
        "props, no objects.",
    ),
    "act5": (
        "a slab of cut crystal, pale ice-white and blue, its surface faceted like cut glass "
        "so cold light breaks across it in shards and the edges are translucent",
        "the whole bare crystal surface",
        "lit cold, with blue-white light breaking across the facets",
        "The tabletop is plain bare crystal: only the crystal's own facets and the light "
        "falling across it, absolutely nothing on it, no cloth, no runner, no sheet of paper, "
        "no props, no objects.",
    ),
}


def geometry(key: str) -> str:
    material, surface, lighting, bare = DESK[key]
    return (
        "First-person view from a player's seat at the table, seen at table height. The table "
        f"is {material}, whose far edge runs horizontally across the exact middle of the "
        "picture, at half the height of the frame; below that edge " + surface + " fills the "
        f"entire lower half of the picture, receding toward the viewer, {lighting}. {bare} "
        "The surface carries on past the left edge of the frame, past the right edge of the "
        "frame and past the bottom of the frame, so you never see the table's border, its "
        "side, its legs or the floor below it: only the material itself, running out of frame "
        "in every direction. "
    )


# The surface has to run out of frame on every side, otherwise the model draws
# a finite slab with legs and a strip of floor, and the plate stops reading as
# a table seen from a seat.
DESK_NEGATIVE = (
    "table legs, table side panel, furniture leg, chair, visible floor, floorboards, room "
    "floor, table border in frame, edge of the table in frame, table corner in frame, "
)


# Per-act palette pull. The shared style leans warm and parchment; each act
# needs to drag the whole picture its own way, and the negative list has to
# name the things that would fight it.
PALETTE = {
    "act2": "Cool pale grey-blue and stone tones above the desk, warm lamp light on the "
            "counter. ",
    "act3": "Soot-black and gunmetal greys with warm ember orange from the furnace. ",
    "act4": "Warm gold and honey-amber palette, gilded highlights on every moulding and "
            "frame, the whole room lit like a lit gold leaf. ",
    "act5": "Cool blue-white and ice-cyan palette, cold crystalline light, everything above "
            "and on the desk cold and glassy. ",
}

NEGATIVE_EXTRA = {
    "act2": "wooden table, brown table, wood grain, planks, timber, ",
    "act3": "wooden table, brown table, wood grain, planks, timber, polished wood, ",
    "act4": "green wallpaper, damask pattern, green colour, emerald, red velvet, crimson "
            "curtain, silk banner, marble column, marble pilaster, palace, throne, "
            "chandelier, crown, stained glass, candelabra, aristocratic, wooden table, brown "
            "table, wood grain, planks, timber, ",
    "act5": "warm orange glow, fire, flame, furnace, ember, gold leaf, gilded, green "
            "wallpaper, red velvet, candle, warm amber light, wooden panelling, brown "
            "wall, beige room, dusty yellow, wooden table, brown table, wood grain, "
            "planks, ",
}

CLOSING = (
    " Warm, lived-in, a little worn, but not frightening. Nobody stands at the table; the space "
    "behind the far edge is completely empty. The right side of the frame is plain and "
    "uncluttered. "
)

BEHIND = {
    "act1": (
        "Above the far edge, the back wall of a late-night registration hall: dark pine boards, "
        "a tall arched doorway slightly left of centre, faded blank notices pinned in rows, two "
        "paper lanterns casting warm amber light, and a short queue of small folded-paper "
        "figures waiting against the left wall, seen from behind, tiny and anonymous. Drifts of "
        "paper scraps and dust in a shaft of light."
    ),
    "act2": (
        "Above the far edge, the back wall of a small counting office: pale grey stone blocks, a "
        "wide service window with its wooden shutter propped open, a single hanging lamp with a "
        "warm shade, and a wall ledger ruled into columns. Two small folded-paper figures wait "
        "on a side bench at the left, seen from behind, tiny and anonymous."
    ),
    "act3": (
        "Above the far edge, the back wall of a forge back room: soot-darkened brick, a low "
        "furnace mouth glowing a soft warm orange, a brick hearth, a rack of tongs and hammers, "
        "ash and embers drifting. Two small folded-paper figures wait by the hearth at the "
        "left, seen from behind, tiny and anonymous."
    ),
    "act4": (
        "Above the far edge, the back wall of an announcement hall: warm honey-coloured "
        "wooden panelling with thin gold-leaf moulding along the seams, a large gilded notice "
        "board covered in blank gold-leaf announcement sheets pinned in neat rows, a brass "
        "wall lamp with a warm shade, a low wooden bench, warm amber light. Two small "
        "folded-paper figures stand by the board at the left, seen from behind, tiny and "
        "anonymous. Everything is wood, brass and gold leaf: a plain municipal notice room, "
        "cosy and ordinary, nothing grand about it. "
    ),
    "act5": (
        "Above the far edge, the back wall of a high domed hall built of pale blue-white "
        "crystal: faceted translucent crystal panels, a faceted crystal ceiling throwing cold "
        "light, a wide wall of small blank notice cards pinned in neat rows on clear crystal "
        "slates, a tall arched window of frosted crystal, thin shards of ice-blue light "
        "drifting in the air. Two small folded-paper figures wait at the left, seen from "
        "behind, tiny and anonymous. "
    ),
}

PROMPTS = {key: geometry(key) + text + CLOSING for key, text in BEHIND.items()}


def mcode(*args: str, timeout: int = 900) -> str:
    cmdline = " ".join(f'"{a}"' for a in (MCODE, *args))
    proc = subprocess.run(
        cmdline, shell=True, capture_output=True, text=True,
        encoding="utf-8", errors="replace", timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"{cmdline} -> rc={proc.returncode}\n{proc.stderr or proc.stdout}")
    return proc.stdout


def upload(path: Path) -> str:
    return json.loads(mcode("upload_temp_url", str(path)))["temp_url"]


def call(prompt: str, ref_url: str, out_name: str) -> str:
    payload = {
        "requests": [{
            "prompt": prompt,
            "aspect_ratio": "16:9",
            "resolution": "2K",
            "input_urls": [ref_url],
            "output_file": out_name,
        }]
    }
    args_file = ROOT / "vibe_images" / "_bg_args.json"
    args_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    raw = mcode("connector", "call", TOOL, "--args-file", str(args_file))
    return raw


def _ssl_context() -> "ssl.SSLContext":
    """The bundled python has no CA store; fall back to certifi."""
    ctx = ssl.create_default_context()
    try:
        import certifi

        ctx.load_verify_locations(cafile=certifi.where())
    except Exception:  # noqa: BLE001
        pass
    return ctx


def download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".tmp")
    try:
        with urllib.request.urlopen(url, timeout=300, context=_ssl_context()) as resp:
            data = resp.read()
    except Exception:  # noqa: BLE001
        # PowerShell uses the Windows certificate store, which always has the root.
        ps = (
            f"Invoke-WebRequest -Uri '{url}' -OutFile '{tmp}' -UseBasicParsing; "
            f"exit $LASTEXITCODE"
        )
        subprocess.run(
            ps, shell=True, capture_output=True, text=True, encoding="utf-8", errors="replace"
        )
        data = tmp.read_bytes()
    tmp.write_bytes(data)
    try:
        Image.open(tmp).convert("RGB").save(dest)
    finally:
        tmp.unlink(missing_ok=True)
    return dest


def generate(key: str, outdir: Path, count: int, ref: str) -> None:
    outdir.mkdir(parents=True, exist_ok=True)
    prompt = " ".join([
        STYLE,
        PALETTE.get(key, ""),
        STYLE_REF,
        PROMPTS[key],
        NEGATIVE,
        DESK_NEGATIVE,
        NEGATIVE_EXTRA.get(key, ""),
    ])
    for i in range(count):
        raw = call(prompt, ref, f"{key}_cand{i}.png")
        res = json.loads(raw)
        items = res.get("success_items") or res.get("items") or []
        if not items:
            print(f"{key}: no items:", raw[:400])
            return
        node_id = items[0].get("node_id")
        url = json.loads(mcode("get_asset_url", node_id))["download_url"]
        dest = outdir / f"{key}_cand{i}.png"
        download(url, dest)
        im = Image.open(dest)
        print(f"{key} candidate {i}: {im.size} -> {dest}")
        time.sleep(1)


def main() -> None:
    args = sys.argv[1:]
    out_root = ROOT / "vibe_images"
    if "--out" in args:
        out_root = Path(args[args.index("--out") + 1])
        if not out_root.is_absolute():
            out_root = ROOT / out_root
    count = 3
    if "--count" in args:
        count = int(args[args.index("--count") + 1])
    if "--keys" in args:
        keys = args[args.index("--keys") + 1].split(",")
    elif args and not args[0].startswith("--"):
        keys = [args[0]]
    else:
        keys = list(PROMPTS)

    ref = upload(GRAYPAW)
    for key in keys:
        generate(key, out_root / key, count, ref)


if __name__ == "__main__":
    main()
