"""Affiches reseaux sociaux - "l'ordinateur le plus fin au monde" (precommande).
Cinq concepts, chacun en story 1080x1920 et carre 1080x1080, rendus par Chrome
headless. Jamais un mot sur la technologie : seulement le fait.
Usage : python gen.py"""
import os, shutil, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.dirname(HERE)
CHROME = next(p for p in [r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                          r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"] if os.path.exists(p))
for f in ["Montserrat-Black.ttf", "Montserrat-Bold.ttf", "Montserrat-Medium.ttf"]:
    if not os.path.exists(os.path.join(HERE, f)):
        shutil.copy(os.path.join(r"C:\Windows\Fonts", f), HERE)

BASE_CSS = """
@font-face { font-family: M; src: url(Montserrat-Black.ttf); font-weight: 900; }
@font-face { font-family: M; src: url(Montserrat-Bold.ttf); font-weight: 700; }
@font-face { font-family: M; src: url(Montserrat-Medium.ttf); font-weight: 500; }
* { margin: 0; box-sizing: border-box; }
body { width: var(--w); height: var(--h); overflow: hidden; background: #000; font-family: M; color: #fff; position: relative; }
.glow { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(0,122,255,.40) 0%, rgba(0,122,255,.10) 40%, transparent 68%); filter: blur(24px); }
.card { position: relative; border-radius: 5.5% / 8.7%; background: linear-gradient(135deg, #1b2233 0%, #0b0f18 45%, #121a2b 100%);
  box-shadow: 0 0 0 1px rgba(255,255,255,.15), 0 50px 110px rgba(0,0,0,.9), 0 0 90px rgba(0,122,255,.28); }
.card .brand { position: absolute; left: 9%; top: 14%; font-weight: 900; letter-spacing: .08em; }
.card .chip { position: absolute; left: 9%; bottom: 16%; width: 12%; height: 14%; border-radius: 8px; background: linear-gradient(135deg,#2b3550,#161d2e); box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
.card .shine { position: absolute; inset: 0; border-radius: inherit; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.10) 45%, transparent 60%); }
h1 { font-weight: 900; letter-spacing: -.035em; line-height: 1; }
.blue { background: linear-gradient(90deg, #ffffff, #8fd3ff); -webkit-background-clip: text; color: transparent; }
.foot { position: absolute; left: 0; right: 0; text-align: center; font-weight: 700; color: rgba(255,255,255,.55); letter-spacing: .02em; }
.foot b { color: #fff; }
.pill { display: inline-block; border-radius: 999px; background: #007AFF; color: #fff; font-weight: 800; }
"""


def card(width, brand_size, extra_style=""):
    return (f'<div class="card" style="width:{width}px;height:{round(width / 1.586)}px;{extra_style}">'
            f'<div class="brand" style="font-size:{brand_size}px">MAHU</div><div class="chip"></div><div class="shine"></div></div>')


def foot(story):
    y = 90 if story else 52
    return f'<div class="foot" style="bottom:{y}px;font-size:{30 if story else 26}px">Précommande · <b>call.mahu.cards</b></div>'


# ---- 1. Les dimensions -------------------------------------------------------
def dimensions(w, h):
    s = h > w
    cw = 680 if s else 600
    ch = round(cw / 1.586)
    top = 560 if s else 230
    left = (w - cw) // 2 - (40 if s else 0)
    return f"""
<div class="glow" style="width:{cw*1.5}px;height:{cw*1.5}px;left:{w/2-cw*.75}px;top:{top+ch/2-cw*.75}px"></div>
<div style="position:absolute;left:{left}px;top:{top}px">{card(cw, cw*.075)}
  <div style="position:absolute;left:0;top:{ch+34}px;width:{cw}px;height:2px;background:#5ac8fa"></div>
  <div style="position:absolute;left:0;top:{ch+24}px;width:2px;height:22px;background:#5ac8fa"></div>
  <div style="position:absolute;left:{cw-2}px;top:{ch+24}px;width:2px;height:22px;background:#5ac8fa"></div>
  <div style="position:absolute;left:0;top:{ch+48}px;width:{cw}px;text-align:center;font-weight:800;font-size:{34 if s else 28}px;color:#8fd3ff">85,6 mm</div>
  <div style="position:absolute;left:{cw+30}px;top:0;width:2px;height:{ch}px;background:#5ac8fa"></div>
  <div style="position:absolute;left:{cw+20}px;top:0;width:22px;height:2px;background:#5ac8fa"></div>
  <div style="position:absolute;left:{cw+20}px;top:{ch-2}px;width:22px;height:2px;background:#5ac8fa"></div>
  <div style="position:absolute;left:{cw+46}px;top:{ch/2-20}px;font-weight:800;font-size:{34 if s else 28}px;color:#8fd3ff;white-space:nowrap">54 mm</div>
</div>
<div style="position:absolute;left:0;right:0;top:{top+ch+(190 if s else 130)}px;text-align:center">
  <div style="font-size:{150 if s else 104}px;font-weight:900;letter-spacing:-.04em">0,76 mm</div>
  <div style="margin-top:14px;font-size:{40 if s else 32}px;font-weight:700;color:rgba(255,255,255,.7)">d'épaisseur. Tout l'ordinateur.</div>
</div>
<div style="position:absolute;left:0;right:0;top:{150 if s else 70}px;text-align:center">
  <h1 style="font-size:{92 if s else 70}px">L'ordinateur<br><span class="blue">le plus fin.</span></h1>
</div>
{foot(s)}"""


# ---- 2. Le plus leger --------------------------------------------------------
def leger(w, h):
    s = h > w
    lw = 560 if s else 420
    return f"""
<div class="glow" style="width:900px;height:900px;left:{w/2-450}px;top:{h*.5-450}px"></div>
<div style="position:absolute;left:0;right:0;top:{150 if s else 60}px;text-align:center">
  <h1 style="font-size:{120 if s else 86}px">Le plus <span class="blue">léger.</span></h1>
</div>
<div style="position:absolute;left:0;right:0;top:{470 if s else 250}px;display:flex;{'flex-direction:column;' if s else ''}align-items:center;justify-content:center;gap:{80 if s else 70}px">
  <div style="text-align:center;opacity:.55">
    <div style="width:{lw*.8}px;height:{lw*.5}px;margin:0 auto;border-radius:16px 16px 0 0;border:3px solid rgba(255,255,255,.5);border-bottom:none"></div>
    <div style="width:{lw}px;height:18px;margin:0 auto;border-radius:0 0 18px 18px;background:rgba(255,255,255,.35)"></div>
    <div style="margin-top:26px;font-size:{64 if s else 50}px;font-weight:900">1,5 kg</div>
    <div style="font-size:{28 if s else 24}px;font-weight:700;color:rgba(255,255,255,.7)">un ordinateur portable</div>
  </div>
  <div style="text-align:center">
    {card(lw*.8, lw*.06, 'margin:0 auto')}
    <div style="margin-top:30px;font-size:{88 if s else 64}px;font-weight:900;color:#8fd3ff">5 g</div>
    <div style="font-size:{28 if s else 24}px;font-weight:700;color:rgba(255,255,255,.8)">ta carte Mahu. Tout l'ordinateur.</div>
  </div>
</div>
{foot(s)}"""


# ---- 3. Travaille partout ----------------------------------------------------
def partout(w, h):
    s = h > w
    cw = 600 if s else 460
    places = ["Au bureau", "En cours", "Au café", "En voyage", "Chez toi", "Chez un client"]
    chips = "".join(f'<span class="pill" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);padding:{18 if s else 14}px {34 if s else 26}px;font-size:{36 if s else 28}px;margin:10px">{p}</span>' for p in places)
    return f"""
<div class="glow" style="width:{cw*1.6}px;height:{cw*1.6}px;left:{w/2-cw*.8}px;top:{(560 if s else 330)-cw*.8}px"></div>
<div style="position:absolute;left:0;right:0;top:{150 if s else 60}px;text-align:center">
  <h1 style="font-size:{120 if s else 86}px">Travaille<br><span class="blue">partout.</span></h1>
</div>
<div style="position:absolute;left:{(w-cw)/2}px;top:{560 if s else 300}px;transform:rotate(-8deg)">{card(cw, cw*.075)}</div>
<div style="position:absolute;left:60px;right:60px;top:{1060 if s else 650}px;text-align:center">{chips}</div>
<div style="position:absolute;left:0;right:0;top:{1420 if s else 900}px;text-align:center;font-size:{40 if s else 30}px;font-weight:700;color:rgba(255,255,255,.75)">{'Une carte. Ton ordinateur, sur n&#39;importe quel écran.' if s else ''}</div>
{foot(s)}"""


# ---- 4. Le plus simple a transporter -----------------------------------------
def poche(w, h):
    s = h > w
    ww = 640 if s else 500
    return f"""
<div class="glow" style="width:{ww*1.6}px;height:{ww*1.6}px;left:{w/2-ww*.8}px;top:{(960 if s else 470)-ww*.8}px"></div>
<div style="position:absolute;left:0;right:0;top:{230 if s else 60}px;text-align:center">
  <h1 style="font-size:{104 if s else 76}px">Le plus simple<br>à <span class="blue">transporter.</span></h1>
</div>
<div style="position:absolute;left:{(w-ww)/2}px;top:{720 if s else 330}px;width:{ww}px;height:{ww*.62}px">
  <!-- carte qui sort du portefeuille -->
  <div style="position:absolute;left:{ww*.12}px;top:{-ww*.17}px;transform:rotate(-6deg)">{card(ww*.76, ww*.055)}</div>
  <div style="position:absolute;inset:0;border-radius:28px;background:linear-gradient(160deg,#3b2a1e,#1d140e);box-shadow:0 40px 90px rgba(0,0,0,.8), inset 0 2px 0 rgba(255,255,255,.08)"></div>
  <div style="position:absolute;left:0;right:0;top:{ww*.20}px;height:2px;border-top:2px dashed rgba(255,255,255,.18)"></div>
</div>
<div style="position:absolute;left:0;right:0;top:{1300 if s else 720}px;text-align:center">
  <div style="font-size:{56 if s else 40}px;font-weight:900">Il tient dans ton portefeuille.</div>
  <div style="margin-top:16px;font-size:{36 if s else 28}px;font-weight:700;color:rgba(255,255,255,.7)">Pas de sac. Pas de chargeur. Pas de poids.</div>
</div>
{foot(s)}"""


# ---- 5. Les trois modeles ----------------------------------------------------
def modeles(w, h):
    s = h > w
    models = [("Essentiel", "200 000", "4 cœurs · 8 Go · 100 Go"), ("Pro", "300 000", "6 cœurs · 16 Go · 250 Go"), ("Max", "500 000", "8 cœurs · 32 Go · 500 Go")]
    rows = ""
    for i, (n, p, sp) in enumerate(models):
        hl = i == 1
        rows += f"""<div style="display:flex;align-items:center;justify-content:space-between;padding:{34 if s else 24}px {44 if s else 34}px;margin-bottom:{26 if s else 16}px;border-radius:28px;
          border:2px solid {'#007AFF' if hl else 'rgba(255,255,255,.12)'};background:{'rgba(0,122,255,.14)' if hl else 'rgba(255,255,255,.04)'}">
          <div><div style="font-size:{50 if s else 38}px;font-weight:900">{n}</div><div style="margin-top:6px;font-size:{28 if s else 22}px;font-weight:700;color:rgba(255,255,255,.65)">{sp}</div></div>
          <div style="text-align:right"><div style="font-size:{52 if s else 40}px;font-weight:900;color:#8fd3ff">{p}</div><div style="font-size:{24 if s else 20}px;font-weight:700;color:rgba(255,255,255,.55)">FCFA / an</div></div></div>"""
    return f"""
<div class="glow" style="width:1000px;height:1000px;left:{w/2-500}px;top:{h*.45-500}px"></div>
<div style="position:absolute;left:0;right:0;top:{150 if s else 56}px;text-align:center">
  <span class="pill" style="padding:12px 30px;font-size:{30 if s else 24}px">Précommande ouverte</span>
  <h1 style="margin-top:{36 if s else 22}px;font-size:{100 if s else 70}px">Choisis ton<br><span class="blue">ordinateur.</span></h1>
</div>
<div style="position:absolute;left:{90 if s else 110}px;right:{90 if s else 110}px;top:{720 if s else 380}px">{rows}</div>
<div style="position:absolute;left:0;right:0;top:{1500 if s else 0}px;text-align:center;font-size:32px;font-weight:700;color:rgba(255,255,255,.7);{'' if s else 'display:none'}">Places limitées pour le lancement.</div>
{foot(s)}"""


CONCEPTS = [("01-le-plus-fin", dimensions), ("02-le-plus-leger", leger), ("03-travaille-partout", partout),
            ("04-simple-a-transporter", poche), ("05-trois-modeles", modeles)]

for name, fn in CONCEPTS:
    for fmt, w, h in [("story-1080x1920", 1080, 1920), ("carre-1080x1080", 1080, 1080)]:
        html = os.path.join(HERE, f"{name}-{fmt}.html")
        open(html, "w", encoding="utf-8").write(
            f'<!doctype html><html><head><meta charset="utf-8"><style>:root{{--w:{w}px;--h:{h}px}}{BASE_CSS}</style></head><body>{fn(w, h)}</body></html>')
        out = os.path.join(OUT, f"{name}-{fmt}.png")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        f"--window-size={w},{h}", f"--screenshot={out}", "file:///" + html.replace("\\", "/")],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(out)
