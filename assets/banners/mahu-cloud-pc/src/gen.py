"""Affiche teaser Mahu Cloud PC : "La carte Mahu. L'ordinateur le plus fin de
2026." Volontairement sans details. Genere story + carre via Chrome headless.
Usage : python gen.py"""
import os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
CHROME = next(p for p in [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                          r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"] if os.path.exists(p))


def page(w, h):
    story = h > w
    card_w = 760 if story else 600
    title = 150 if story else 112
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: M; src: url(Montserrat-Black.ttf); font-weight: 900; }}
@font-face {{ font-family: M; src: url(Montserrat-Bold.ttf); font-weight: 700; }}
@font-face {{ font-family: M; src: url(Montserrat-Medium.ttf); font-weight: 500; }}
* {{ margin: 0; box-sizing: border-box; }}
body {{ width: {w}px; height: {h}px; overflow: hidden; background: #000; font-family: M; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center; }}
.glow {{ position: absolute; width: {card_w * 1.6}px; height: {card_w * 1.6}px; border-radius: 50%;
  top: {h * (0.36 if story else 0.40) - card_w * 0.8}px; left: {w / 2 - card_w * 0.8}px;
  background: radial-gradient(circle, rgba(0,122,255,.38) 0%, rgba(0,122,255,.10) 38%, transparent 66%); filter: blur(20px); }}
.stage {{ perspective: 1800px; position: relative; margin-top: {-60 if story else -10}px; }}
.card {{ width: {card_w}px; height: {card_w / 1.586}px; border-radius: {card_w * 0.055}px; position: relative;
  transform: rotateX(58deg) rotateZ(-24deg); transform-style: preserve-3d;
  background: linear-gradient(135deg, #1b2233 0%, #0b0f18 45%, #121a2b 100%);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14), 0 60px 120px rgba(0,0,0,.9), 0 0 90px rgba(0,122,255,.25); }}
/* tranche lumineuse : la finesse */
.card::after {{ content: ""; position: absolute; left: 0; right: 0; bottom: -4px; height: 4px; border-radius: 0 0 4px 4px;
  background: linear-gradient(90deg, transparent, #5ac8fa 25%, #ffffff 50%, #5ac8fa 75%, transparent);
  transform: rotateX(-90deg); transform-origin: top; box-shadow: 0 0 24px 6px rgba(90,200,250,.8); }}
.card::before {{ content: ""; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.10) 45%, transparent 60%); }}
.brand {{ position: absolute; left: 9%; top: 14%; font-weight: 900; font-size: {card_w * 0.075}px; letter-spacing: .08em; }}
.logo {{ position: absolute; right: 8%; bottom: 13%; width: {card_w * 0.13}px; height: {card_w * 0.13}px; border-radius: 22%; }}
.chip {{ position: absolute; left: 9%; bottom: 16%; width: {card_w * 0.12}px; height: {card_w * 0.09}px; border-radius: 8px;
  background: linear-gradient(135deg, #2b3550, #161d2e); box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }}
.text {{ position: relative; text-align: center; margin-top: {150 if story else 70}px; padding: 0 70px; }}
h1 {{ font-weight: 900; font-size: {title}px; line-height: 1; letter-spacing: -.035em; }}
h2 {{ margin-top: {34 if story else 22}px; font-weight: 700; font-size: {title * 0.40}px; line-height: 1.2; letter-spacing: -.01em;
  background: linear-gradient(90deg, #ffffff, #8fd3ff); -webkit-background-clip: text; color: transparent; }}
.year {{ position: absolute; bottom: {110 if story else 60}px; font-weight: 500; font-size: 30px; letter-spacing: .5em; color: rgba(255,255,255,.45); padding-left: .5em; }}
</style></head><body>
<div class="glow"></div>
<div class="stage"><div class="card"><div class="brand">MAHU</div><div class="chip"></div><img class="logo" src="logo.png"></div></div>
<div class="text"><h1>La carte Mahu.</h1><h2>L'ordinateur le plus fin<br>de 2026.</h2></div>
<div class="year">BIENTÔT</div>
</body></html>"""


for name, w, h in [("teaser-story-1080x1920", 1080, 1920), ("teaser-carre-1080x1080", 1080, 1080)]:
    html = os.path.join(HERE, name + ".html")
    open(html, "w", encoding="utf-8").write(page(w, h))
    out = os.path.join(OUT, name + ".png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    f"--window-size={w},{h}", f"--screenshot={out}", "file:///" + html.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(out)
