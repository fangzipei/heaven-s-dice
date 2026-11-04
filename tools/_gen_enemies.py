"""Generate the enemy four-state portrait set through mcode-tools (Matrix generate_image).

Phase 1 (idle)  : the graypaw idle PNG is passed as a STYLE reference, so every
                  enemy lands in the same hand-drawn origami-paper look.
Phase 2 (states): each enemy passes its OWN idle render as an identity reference,
                  so attack/hit/critical keep the same design.

Usage:
    python tools/_gen_enemies.py idle    --slugs judge,rotfang [--backdrop grey|transparent]
    python tools/_gen_enemies.py states  --slug judge
    python tools/_gen_enemies.py all
"""
from __future__ import annotations

import json
import ssl
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(r"D:\vs_workspace\Heaven's Dice")
STAGE = ROOT / "vibe_images" / "enemies"
GRAYPAW = ROOT / "vibe_images" / "graypaw" / "idle" / "graypaw-idle_1200x1600.png"
STATE_FILE = STAGE / "_gen_state.json"
NODE_FILE = STAGE / "_gen_nodes.json"

sys.path.insert(0, str(STAGE))
sys.path.insert(0, str(Path(__file__).parent))
import pipeline as P  # noqa: E402
import _keying  # noqa: E402  (reuses the stored prompt library)

CHARS = P.CHARS
BY_SLUG = P.BY_SLUG
STATES = P.STATES

TOOL = "connector__matrix__generate_image"

# graypaw is the in-game `rat` minion and doubles as the style reference.
REF_SLUG = "rat"
REF_LOCAL = {s: ROOT / "vibe_images" / "graypaw" / s / f"graypaw-{s}_1200x1600.png" for s in STATES}

STYLE_REF_LINE = (
    "Image 1 is a different character used ONLY as a rendering style reference: match its "
    "hand-drawn origami paper-puppet technique, crumpled paper texture with visible fibers and "
    "creases, colored-pencil and charcoal linework, aged parchment and ink palette, warm rim "
    "lighting and torn frayed paper edges. Do not copy its character design, silhouette, costume, "
    "props or colors."
)
IDENTITY_REF_LINE = (
    "Image 1 is this same character standing in the idle pose. Keep exactly this character "
    "design, proportions, costume, props, colors and rendering style; change only the pose and "
    "the state."
)
COMPACT_STYLE_CORE = (
    "full-body hand-drawn origami paper puppet, folded paper texture with visible fibers and "
    "creases, colored-pencil and charcoal linework, aged parchment and ink palette, dramatic rim "
    "light, sharp silhouette, centered, facing the viewer directly, front view, eye level, "
    "head-to-toe full body visible, "
)
STYLE_GREY = COMPACT_STYLE_CORE + "plain flat light grey studio backdrop, high detail"
STYLE_TRANSPARENT = COMPACT_STYLE_CORE + (
    "isolated on a fully transparent background, PNG alpha, no scenery, no floor, no cast "
    "shadow, no border, no text, high detail"
)
GREY_BACKDROP = (
    "plain flat light grey studio backdrop, evenly lit, no scenery, no floor, no cast shadow"
)
TRANSPARENT_BACKDROP = (
    "isolated on a fully transparent background, PNG alpha, no scenery, no floor, no cast shadow"
)


# --------------------------------------------------------------------------- #
# prompt building
# --------------------------------------------------------------------------- #
def split_parts(slug: str, state: str) -> tuple[str, str]:
    """Return (hierarchy, character+state text) from the stored library prompt."""
    text = BY_SLUG[slug]["states"][state]
    hierarchy = ""
    for marker in ("boss version", "minion version"):
        i = text.find(marker)
        if i >= 0:
            hierarchy = text[i:]
            text = text[:i]
            break
    if text.startswith(P.LONG_STYLE_LEAD):
        text = text[len(P.LONG_STYLE_LEAD):]
    text = text.replace(", " + P.STUDIO, "").replace(P.STUDIO, "").strip(" ,")
    return hierarchy, text


def build_prompt(slug: str, state: str, backdrop: str, ref_kind: str) -> str:
    hierarchy, text = split_parts(slug, state)
    style = STYLE_GREY if backdrop == "grey" else STYLE_TRANSPARENT
    parts = [style, hierarchy, text]
    accent = BY_SLUG[slug].get("accent")
    if accent:
        parts.append(f"Primary accent color: {accent}.")
    if ref_kind == "style":
        parts.append(STYLE_REF_LINE)
    else:
        parts.append(IDENTITY_REF_LINE)
    if backdrop == "grey":
        parts.append(GREY_BACKDROP)
    else:
        parts.append(TRANSPARENT_BACKDROP)
    parts.append(P.SHORT_NEGATIVE)
    prompt = " ".join(x for x in parts if x)
    if len(prompt) > 1500:
        prompt = prompt[:1500].rsplit(",", 1)[0]
    return prompt


# --------------------------------------------------------------------------- #
# mcode-tools plumbing
# --------------------------------------------------------------------------- #
MCODE = r"C:\Users\jblz\.minimax\bin\mcode-tools.cmd"


def mcode(*args: str, timeout: int = 1200) -> str:
    """Run the mcode-tools launcher.

    It is a .cmd chain, which CreateProcess cannot exec directly, so the call
    goes through the shell with every argument quoted.
    """
    cmdline = " ".join(f'"{a}"' for a in (MCODE, *args))
    proc = subprocess.run(
        cmdline,
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"{cmdline} -> rc={proc.returncode}\n{proc.stderr or proc.stdout}")
    return proc.stdout


def call_tool(tool: str, payload: dict) -> dict:
    args_file = STAGE / "_mcode_args.json"
    args_file.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    raw = mcode("connector", "call", tool, "--args-file", str(args_file))
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError(f"unparsable tool output: {raw[:800]}")


def upload(path: Path) -> str:
    out = json.loads(mcode("upload_temp_url", str(path)))
    return out["temp_url"]


def asset_url(node_id: str) -> str:
    out = json.loads(mcode("get_asset_url", node_id))
    return out["download_url"]


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
    # normalise to PNG so the cutout step always opens a predictable file
    tmp.write_bytes(data)
    try:
        Image.open(tmp).convert("RGBA").save(dest)
    finally:
        tmp.unlink(missing_ok=True)
    return dest


# --------------------------------------------------------------------------- #
# state bookkeeping
# --------------------------------------------------------------------------- #
def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    return {}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, ensure_ascii=False, indent=1), encoding="utf-8")


def load_nodes() -> dict:
    if NODE_FILE.exists():
        return json.loads(NODE_FILE.read_text(encoding="utf-8"))
    return {}


def save_nodes(nodes: dict) -> None:
    NODE_FILE.write_text(json.dumps(nodes, ensure_ascii=False, indent=1), encoding="utf-8")


def fetch_missing() -> None:
    """Download every node that was generated but never saved locally."""
    nodes = load_nodes()
    for key, node_id in nodes.items():
        slug, state = key.split("/")
        dest = STAGE / slug / f"raw_{state}.png"
        if dest.exists():
            continue
        try:
            download(asset_url(node_id), dest)
            print(f"  recovered {key} -> {dest.name}")
        except Exception as exc:  # noqa: BLE001
            print(f"  FAILED recover {key}: {exc}")


def items_from_result(result: dict) -> list[dict]:
    """Normalise the generate_image result into a list of {node_id, file_name}."""
    if isinstance(result, dict):
        for key in ("success_items", "successItems", "items", "results", "data"):
            if key in result and isinstance(result[key], list):
                return result[key]
    if isinstance(result, list):
        return result
    raise RuntimeError(f"unexpected generate_image result: {json.dumps(result)[:800]}")


# --------------------------------------------------------------------------- #
# generation
# --------------------------------------------------------------------------- #
def backdrop_ok(path: Path) -> bool:
    """True when the render sits on a bright, uniform studio card.

    The generator honours "transparent background" most of the time, but
    sometimes paints a grey or dark card instead.  Those frames cannot be
    keyed reliably, so they get retried.
    """
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float64)
    lum = a.mean(axis=2)
    border = np.concatenate([lum[0], lum[-1], lum[:, 0], lum[:, -1]])
    return float(np.median(border)) > 232.0


def render_ok(path: Path) -> bool:
    """True when the render can be keyed to a believable cut-out.

    The border median alone is not enough: the generator sometimes paints a
    gradient or tinted card whose edges still read bright.  Keying it and
    measuring the subject area is the honest test.
    """
    if not backdrop_ok(path):
        return False
    try:
        im = _keying.key(path)
        alpha = np.asarray(im.getchannel("A"))
        coverage = float((alpha > 0).mean())
    except Exception:  # noqa: BLE001
        return False
    return 0.08 < coverage < 0.62


def generate_batch(items: list[dict], batch_size: int = 5) -> dict[str, str]:
    """items: [{slug, state, prompt, ref_url}] -> {slug_state: local_path}"""
    done: dict[str, str] = {}
    nodes = load_nodes()
    pending = list(items)
    for attempt in range(4):
        if not pending:
            break
        chunk = pending[:batch_size]
        requests = []
        for it in chunk:
            req = {
                "prompt": it["prompt"],
                "aspect_ratio": "3:4",
                "resolution": "2K",
                "output_file": f"{it['slug']}_{it['state']}.png",
            }
            if it.get("ref_url"):
                req["input_urls"] = [it["ref_url"]]
            requests.append(req)
        result = call_tool(TOOL, {"requests": requests})
        got = items_from_result(result)
        if len(got) != len(chunk):
            print(f"  ! returned {len(got)} items for {len(chunk)} requests")
        retry: list[dict] = []
        for it, g in zip(chunk, got):
            key = f"{it['slug']}/{it['state']}"
            node_id = g.get("node_id") or g.get("nodeId")
            if node_id:
                # persist first: a failed download must never cost a generation
                nodes[key] = node_id
                save_nodes(nodes)
            else:
                print(f"  ! no node_id for {key}: {json.dumps(g)[:300]}")
                continue
            dest = STAGE / it["slug"] / f"raw_{it['state']}.png"
            try:
                download(asset_url(node_id), dest)
            except Exception as exc:  # noqa: BLE001
                print(f"  FAILED download {key}: {exc}")
                retry.append(it)
                continue
            if not render_ok(dest):
                print(f"  retry {key} (backdrop not keyable)")
                retry.append(it)
                continue
            done[key] = str(dest)
            print(f"  ok {key} -> {dest.name}")
        pending = retry
        if pending and attempt < 3:
            time.sleep(3)
        sys.stdout.flush()
    if pending:
        print(f"  ! giving up on {[p['slug'] + '/' + p['state'] for p in pending]}")
    return done


def phase_idle(slugs: list[str], backdrop: str, force: bool = False) -> None:
    fetch_missing()
    ref_url = upload(GRAYPAW)
    state = load_state()
    nodes = load_nodes()
    items = []
    for slug in slugs:
        raw = STAGE / slug / "raw_idle.png"
        key = f"{slug}/idle"
        if not force and raw.exists():
            print(f"skip {slug}/idle (exists)")
            continue
        if not force and key in nodes:
            print(f"skip {slug}/idle (already generated)")
            continue
        items.append({
            "slug": slug,
            "state": "idle",
            "prompt": build_prompt(slug, "idle", backdrop, "style"),
            "ref_url": ref_url,
        })
    if not items:
        return
    print(f"generating {len(items)} idle portraits...")
    done = generate_batch(items)
    for k, v in done.items():
        state[k] = v
    save_state(state)


def phase_states(slugs: list[str], backdrop: str, force: bool = False) -> None:
    fetch_missing()
    state = load_state()
    nodes = load_nodes()
    items = []
    for slug in slugs:
        idle_path = Path(state.get(f"{slug}/idle") or (STAGE / slug / "raw_idle.png"))
        if not idle_path.exists():
            print(f"skip {slug} states (no idle)")
            continue
        ref_url = upload(idle_path)
        for st in ("attack", "hit", "critical"):
            raw = STAGE / slug / f"raw_{st}.png"
            key = f"{slug}/{st}"
            if not force and raw.exists():
                print(f"skip {slug}/{st} (exists)")
                continue
            if not force and key in nodes:
                print(f"skip {slug}/{st} (already generated)")
                continue
            items.append({
                "slug": slug,
                "state": st,
                "prompt": build_prompt(slug, st, backdrop, "identity"),
                "ref_url": ref_url,
            })
    if not items:
        return
    print(f"generating {len(items)} state portraits...")
    done = generate_batch(items)
    for k, v in done.items():
        state[k] = v
    save_state(state)


def main() -> None:
    cmd = sys.argv[1]
    backdrop = "grey"
    if "--backdrop" in sys.argv:
        backdrop = sys.argv[sys.argv.index("--backdrop") + 1]
    force = "--force" in sys.argv
    batch = int(sys.argv[sys.argv.index("--batch") + 1]) if "--batch" in sys.argv else 5
    if cmd == "idle":
        slugs = sys.argv[sys.argv.index("--slugs") + 1].split(",")
        phase_idle(slugs, backdrop, force)
    elif cmd == "states":
        slug = sys.argv[sys.argv.index("--slug") + 1]
        phase_states([slug], backdrop, force)
    elif cmd == "all":
        slugs = [c["slug"] for c in CHARS if c["slug"] != REF_SLUG]
        phase_idle(slugs, backdrop, force)
        phase_states(slugs, backdrop, force)
    elif cmd == "fetch":
        fetch_missing()
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
