"""Affiches de l'offre de lancement : 100 cartes de visite numeriques avec puce NFC (Smartcard V2) offertes aux etudiants
qui creent leur portfolio (portfolio 3 500 FCFA, carte gratuite). Usage : python gen_offre.py"""
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def page(w, h):
    s = h > w  # story
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: M; src: url(Montserrat-Black.ttf); font-weight: 900; }}
@font-face {{ font-family: M; src: url(Montserrat-Bold.ttf); font-weight: 700; }}
* {{ margin:0; box-sizing:border-box; }}
body {{ position:relative; width:{w}px; height:{h}px; overflow:hidden; font-family:M; color:#fff;
  background: radial-gradient(ellipse at 50% {44 if s else 52}%, rgba(212,175,55,.26), transparent 58%),
              radial-gradient(ellipse at 100% 0%, rgba(0,122,255,.22), transparent 45%), #07090f; }}
.top {{ text-align:center; padding-top:{96 if s else 44}px; }}
.pill {{ display:inline-block; border:2px solid rgba(212,175,55,.6); color:#e9cf7a; border-radius:999px; padding:{12 if s else 8}px {28 if s else 22}px; font-size:{28 if s else 20}px; font-weight:700; }}
.lead {{ margin-top:{30 if s else 14}px; font-size:{50 if s else 34}px; font-weight:900; letter-spacing:-.02em; }}
.hundred {{ font-weight:900; font-size:{330 if s else 190}px; line-height:.86; letter-spacing:-.06em;
  background:linear-gradient(180deg,#fff1b8,#d4af37 55%,#a07c1a); -webkit-background-clip:text; color:transparent;
  filter:drop-shadow(0 18px 50px rgba(212,175,55,.35)); }}
.what {{ font-size:{62 if s else 42}px; font-weight:900; line-height:1.05; letter-spacing:-.03em; }}
.what span {{ color:#d4af37; }}
/* les trois Smartcards V2 (puce NFC) en eventail */
.visual {{ position:relative; height:{560 if s else 290}px; margin-top:{36 if s else 10}px; }}
.sc {{ position:absolute; left:50%; width:{450 if s else 300}px; aspect-ratio:1.586; border-radius:{24 if s else 14}px; overflow:hidden;
  box-shadow:0 40px 90px rgba(0,0,0,.7), 0 0 0 2px rgba(255,255,255,.14); }}
.sc img {{ width:100%; height:100%; object-fit:cover; display:block; }}
.s1 {{ top:{70 if s else 40}px; transform:translateX(-{108 if s else 118}%) rotate(-14deg); }}
.s2 {{ top:{10 if s else 6}px; transform:translateX(-50%) rotate(0deg); z-index:2; }}
.s3 {{ top:{70 if s else 40}px; transform:translateX({8 if s else 18}%) rotate(14deg); }}
.nfc {{ position:absolute; left:50%; top:{330 if s else 200}px; transform:translateX(-50%); z-index:3; display:flex; align-items:center; gap:{14 if s else 8}px;
  background:#fff; color:#0a0a0a; border-radius:999px; padding:{14 if s else 8}px {28 if s else 16}px; font-size:{28 if s else 17}px; font-weight:900;
  box-shadow:0 20px 50px rgba(0,0,0,.55); white-space:nowrap; }}
.nfc svg {{ width:{34 if s else 20}px; height:{34 if s else 20}px; }}
.free {{ position:absolute; right:{60 if s else 120}px; top:{0 if s else 0}px; z-index:4; transform:rotate(12deg); background:#d4af37; color:#000;
  font-weight:900; font-size:{34 if s else 22}px; padding:{14 if s else 9}px {26 if s else 16}px; border-radius:999px; box-shadow:0 14px 40px rgba(212,175,55,.5); }}
.v2 {{ position:absolute; left:{60 if s else 120}px; top:{0 if s else 0}px; z-index:4; transform:rotate(-10deg); background:#007AFF; color:#fff;
  font-weight:900; font-size:{30 if s else 19}px; padding:{12 if s else 8}px {22 if s else 14}px; border-radius:999px; box-shadow:0 14px 40px rgba(0,122,255,.45); }}
.offer {{ position:absolute; left:{80 if s else 70}px; right:{80 if s else 70}px; bottom:{250 if s else 48}px; }}
.row {{ display:flex; align-items:center; justify-content:space-between; gap:20px; border-radius:{28 if s else 20}px; padding:{26 if s else 16}px {34 if s else 26}px; }}
.row + .row {{ margin-top:{16 if s else 10}px; }}
.r1 {{ background:rgba(255,255,255,.07); border:2px solid rgba(255,255,255,.12); }}
.r2 {{ background:linear-gradient(120deg,#f1d77e,#d4af37 55%,#a8841f); color:#000; }}
.label {{ font-size:{36 if s else 26}px; font-weight:700; }}
.val {{ font-size:{48 if s else 34}px; font-weight:900; white-space:nowrap; }}
.r1 .val s {{ display:none; }}
.note {{ margin-top:{24 if s else 14}px; text-align:center; font-size:{30 if s else 21}px; font-weight:700; color:rgba(255,255,255,.75); }}
.url {{ margin-top:{12 if s else 6}px; text-align:center; font-size:{34 if s else 24}px; font-weight:900; }}
</style></head><body>
<div class="top">
  <span class="pill">Offre de lancement · réservée aux étudiants</span>
  <p class="lead">Mahu offre</p>
  <p class="hundred">100</p>
  <p class="what">cartes de visite numériques<br><span>avec puce NFC</span><br>aux étudiants</p>
</div>
<div class="visual">
  <div class="sc s1"><img src="sc1.svg"></div>
  <div class="sc s3"><img src="sc5.svg"></div>
  <div class="sc s2"><img src="sc3.svg"></div>
  <span class="nfc"><svg viewBox="0 0 24 24" fill="none" stroke="#007AFF" stroke-width="2.4" stroke-linecap="round"><path d="M6 8.5a5 5 0 0 1 0 7"/><path d="M10 6a9 9 0 0 1 0 12"/><path d="M14 3.5a13 13 0 0 1 0 17"/></svg>Puce NFC · un tap, ton contact s'ouvre</span>
  <span class="v2">SMARTCARD V2</span>
  <span class="free">GRATUITE</span>
</div>
<div class="offer">
  <div class="row r1"><span class="label">Ton portfolio en ligne · 1 an</span><span class="val">3 500 FCFA</span></div>
  <div class="row r2"><span class="label">Ta Smartcard V2 (puce NFC)</span><span class="val">OFFERTE</span></div>
  <p class="note">Pour les 100 premiers étudiants qui créent leur portfolio</p>
  <p class="url">call.mahu.cards/etudiants</p>
</div>
</body></html>"""


for name, w, h in (("offre-100-cartes-story-1080x1920", 1080, 1920), ("offre-100-cartes-carre-1080x1080", 1080, 1080)):
    html = os.path.join(HERE, name + ".html")
    open(html, "w", encoding="utf-8").write(page(w, h))
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", f"--window-size={w},{h}",
                    f"--screenshot={os.path.join(OUT, name + '.png')}", "file:///" + html.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(html)
    print(name)
