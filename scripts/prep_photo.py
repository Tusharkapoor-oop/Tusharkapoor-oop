# prep_photo.py
# -------------------------
# Prepares a portrait photo for the ASCII conversion. A flatly-lit face
# converts to a dark unreadable blob, so three fixes are applied:
#   1. remove the background (rembg) — isolates the subject
#   2. boost local contrast (OpenCV CLAHE) — real highlights and shadows
#   3. composite onto pure white — background maps to the blank end of
#      the ASCII ramp (white → spaces)
#
# Run once per photo:   python scripts/prep_photo.py source-photo.jpg
# Writes:               source-prepped.png (next to the input)

import os
import sys

from PIL import Image
import numpy as np


def fail(msg: str) -> None:
    print(f"[prep] {msg}", file=sys.stderr)
    sys.exit(1)


def load_rembg():
    try:
        from rembg import remove, new_session
        return remove, new_session()
    except ImportError:
        fail("rembg is not installed — run: pip install rembg onnxruntime")


def load_cv2():
    try:
        import cv2
        return cv2
    except ImportError:
        fail("opencv-python is not installed — run: pip install opencv-python numpy")


def main() -> None:
    if len(sys.argv) < 2:
        fail("usage: python scripts/prep_photo.py <source-photo.jpg>")

    src = sys.argv[1]
    if not os.path.exists(src):
        fail(f"input not found: {src}")

    out_path = os.path.join(os.path.dirname(src), "source-prepped.png")

    # 1 ── background removal
    remove = None
    try:
        from rembg import remove as _remove
        remove = _remove
    except ImportError:
        print("[prep] rembg missing — continuing WITH background "
              "(fine if the photo already has a clean/white backdrop)")

    if remove:
        print("[prep] 1/3 · removing background (first run downloads a ~170MB model)")
        with open(src, "rb") as f:
            cut = remove(f.read())
        import io
        img = Image.open(io.BytesIO(cut)).convert("RGBA")
    else:
        img = Image.open(src).convert("RGBA")

    # 2 ── CLAHE local contrast on the luma channel
    cv2 = load_cv2()
    print("[prep] 2/3 · CLAHE local contrast")
    gray = np.array(img.convert("L"))
    lab = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    # keep color? — final use is grayscale ASCII, so a single boosted luma is enough
    # preserve alpha so cut-out shape survives
    alpha = np.array(img)[:, :, 3]
    boosted = lab.apply(gray)
    h, w = gray.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[:, :, 0] = rgba[:, :, 1] = rgba[:, :, 2] = boosted
    rgba[:, :, 3] = alpha
    img = Image.fromarray(rgba, "RGBA")

    # 3 ── composite onto pure white
    print("[prep] 3/3 · compositing onto white")
    canvas = Image.new("RGBA", img.size, (255, 255, 255, 255))
    canvas.alpha_composite(img)
    canvas.convert("L").save(out_path)

    print(f"[prep] wrote {out_path}")


if __name__ == "__main__":
    main()
