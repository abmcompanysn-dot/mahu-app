"""Images produit des trois modeles d'ordinateur Mahu (catalogue / inscription).
Ecrit public/products/ordinateur-<modele>.png (600x600). Usage : python gen_products.py"""
import os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
OUT = os.path.join(ROOT, "public", "products")
os.makedirs(OUT, exist_ok=True)
CHROME = next(p for p in [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                          r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"] if os.path.exists(p))

MODELS = [
    ("essentiel", "Essentiel", "4 coeurs · 8 Go · 100 Go", "#5ac8fa"),
    ("pro", "Pro", "6 coeurs · 16 Go · 250 Go", "#7c8bff"),
    ("max", "Max", "8 coeurs · 32 Go · 500 Go", "#ffd60a"),
]


def page(name, specs, accent):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: M; src: url(Montserrat-Black.ttf); font-weight: 900; }}
@font-face {{ font-family: M; src: url(Montserrat-Bold.ttf); font-weight: 700; }}
* {{ margin: 0; box-sizing: border-box; }}
body {{ width: 600px; height: 600px; overflow: hidden; background: radial-gradient(circle at 50% 42%, #0d2142 0%, #03060c 62%);
  font-family: M; color: #fff; display: flex; align-items: center; justify-content: center; perspective: 1400px; }}
.card {{ width: 430px; height: 271px; border-radius: 24px; position: relative; transform: rotateX(48deg) rotateZ(-20deg) translateY(-30px);
  background: linear-gradient(135deg, #1b2233, #0b0f18 50%, #141c2e);
  box-shadow: 0 0 0 1px rgba(255,255,255,.14), 0 40px 80px rgba(0,0,0,.85), 0 0 70px {accent}55; }}
.card::after {{ content: ""; position: absolute; left: 0; right: 0; bottom: -3px; height: 3px;
  background: linear-gradient(90deg, transparent, {accent}, #fff, {accent}, transparent); transform: rotateX(-90deg); transform-origin: top;
  box-shadow: 0 0 18px 4px {accent}cc; }}
.brand {{ position: absolute; left: 9%; top: 15%; font-weight: 900; font-size: 30px; letter-spacing: .08em; }}
.model {{ position: absolute; right: 9%; top: 15%; font-weight: 900; font-size: 30px; color: {accent}; }}
.chip {{ position: absolute; left: 9%; bottom: 17%; width: 52px; height: 38px; border-radius: 8px; background: linear-gradient(135deg,#2b3550,#161d2e); }}
.label {{ position: absolute; bottom: 46px; width: 100%; text-align: center; }}
.label b {{ display: block; font-size: 34px; font-weight: 900; }}
.label span {{ display: block; margin-top: 8px; font-size: 21px; font-weight: 700; color: rgba(255,255,255,.7); }}
</style></head><body>
<div class="card"><div class="brand">MAHU</div><div class="model">{name.upper()}</div><div class="chip"></div></div>
<div class="label"><b>Ordinateur Mahu {name}</b><span>{specs}</span></div>
</body></html>"""


for slug, name, specs, accent in MODELS:
    html = os.path.join(HERE, f"product-{slug}.html")
    open(html, "w", encoding="utf-8").write(page(name, specs, accent))
    out = os.path.join(OUT, f"ordinateur-{slug}.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--window-size=600,600", f"--screenshot={out}", "file:///" + html.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(out)
