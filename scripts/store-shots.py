# Composes the Chrome Web Store screenshots (1280x800) from the raw images of e2e/store-shots.spec.ts.
#   STORE=1 npx playwright test e2e/store-shots.spec.ts && python scripts/store-shots.py
import os
from PIL import Image, ImageDraw, ImageFont

RAW, OUT = "test-results/store", "store"
W, H = 1280, 800
BG, TEXT, MUTED, ACCENT = (11, 13, 18), (236, 238, 243), (145, 152, 170), (61, 220, 151)


def font(size, bold=False):
    for name in (["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def fit(img, max_w, max_h):
    scale = min(max_w / img.width, max_h / img.height, 1)
    return img.resize((int(img.width * scale), int(img.height * scale)), Image.LANCZOS)


def caption(draw, title, sub, x, y):
    draw.text((x, y), title, font=font(40, True), fill=TEXT)
    draw.text((x, y + 56), sub, font=font(22), fill=MUTED)


def panel_slide(name, title, sub):
    canvas = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([64, 300, 72, 420], fill=ACCENT)
    y = 300
    for line in title.split("\n"):
        draw.text((96, y), line, font=font(40, True), fill=TEXT)
        y += 54
    y += 10
    for line in sub.split("\n"):
        draw.text((96, y), line, font=font(22), fill=MUTED)
        y += 32
    panel = fit(Image.open(f"{RAW}/{name}.png"), 440, 740)
    canvas.paste(panel, (W - panel.width - 96, (H - panel.height) // 2))
    canvas.save(f"{OUT}/screenshot-{name}.png")


os.makedirs(OUT, exist_ok=True)

# 1. Form + panel side by side.
canvas = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(canvas)
caption(draw, "Fills the application. You press Submit.", "Your facts typed in, sensitive questions left for you, nothing sent without you.", 48, 28)
page = fit(Image.open(f"{RAW}/fill-page.png"), 790, 650)
panel = fit(Image.open(f"{RAW}/fill-panel.png"), 400, 650)
canvas.paste(page, (48, 130))
canvas.paste(panel, (W - panel.width - 48, 130))
canvas.save(f"{OUT}/screenshot-fill.png")

panel_slide("queue", "Several applications,\nhuman-paced", "Up to 5 at once on company career sites.\nNever on LinkedIn, Naukri or Indeed.")
panel_slide("answers", "Answer once,\nreused everywhere", "Notice period, work permit, salary:\nsaved on your computer, never uploaded.")
panel_slide("tracker", "Applied means\nconfirmed", "Recorded only when the employer's site\nconfirms your application.")
print("store/: " + ", ".join(sorted(os.listdir(OUT))))
