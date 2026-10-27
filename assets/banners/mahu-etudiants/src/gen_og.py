"""Images d'apercu (Open Graph, 1200 x 630) des liens etudiants : public/og-etudiants.png
et public/og-portfolio.png. Usage : python gen_og.py"""
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", ".."))
PUBLIC = os.path.join(ROOT, "public")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SHOTS = "file:///" + os.path.join(PUBLIC, "portfolio", "shots").replace("\\", "/")

STYLE = """
@font-face { font-family: M; src: url(Montserrat-Black.ttf); font-weight: 900; }
@font-face { font-family: M; src: url(Montserrat-Bold.ttf); font-weight: 700; }
* { margin:0; box-sizing:border-box; }
body { position:relative; width:1200px; height:630px; overflow:hidden; font-family:M; color:#fff;
  background: radial-gradient(ellipse at 78% 50%, rgba(212,175,55,.25), transparent 55%), radial-gradient(ellipse at 0% 0%, rgba(0,122,255,.18), transparent 45%), #07090f; }
.left { position:absolute; left:70px; top:0; bottom:0; width:600px; display:flex; flex-direction:column; justify-content:center; }
.pill { align-self:flex-start; border:2px solid rgba(212,175,55,.6); color:#e9cf7a; border-radius:999px; padding:8px 20px; font-size:20px; font-weight:700; }
h1 { margin-top:22px; font-weight:900; font-size:58px; line-height:1.04; letter-spacing:-.03em; }
h1 span { color:#d4af37; }
.sub { margin-top:18px; font-size:24px; font-weight:700; color:rgba(255,255,255,.75); line-height:1.3; }
.row { margin-top:26px; display:flex; gap:12px; align-items:center; }
.price { white-space:nowrap; background:#d4af37; color:#000; border-radius:999px; padding:12px 26px; font-weight:900; font-size:30px; }
.gift { white-space:nowrap; border:2px solid rgba(255,255,255,.2); border-radius:999px; padding:12px 20px; font-weight:700; font-size:20px; }
.url { position:absolute; left:70px; bottom:34px; font-size:20px; font-weight:700; color:rgba(255,255,255,.55); }
.phone { position:absolute; width:210px; height:440px; border-radius:34px; background:#151922; padding:8px; box-shadow:0 30px 70px rgba(0,0,0,.7), 0 0 0 2px rgba(255,255,255,.12); }
.screen { width:100%; height:100%; border-radius:27px; background-size:100% auto; background-position:top center; }
.card { position:absolute; width:300px; aspect-ratio:1.586; border-radius:16px; overflow:hidden; box-shadow:0 30px 70px rgba(0,0,0,.7), 0 0 0 2px rgba(255,255,255,.14); }
.card img { width:100%; height:100%; object-fit:cover; display:block; }
"""


def phones(items):
    return "".join(f'<div class="phone" style="{pos}"><div class="screen" style="background-image:url({SHOTS}/{t}.webp)"></div></div>' for t, pos in items)


PAGES = {
    "og-etudiants.png": f"""<div class="left">
  <span class="pill">Offre étudiants · Mahu</span>
  <h1>Ton portfolio + CV<br>en ligne.<br><span>Smart Card offerte.</span></h1>
  <div class="row"><span class="price">3 500 FCFA</span><span class="gift">aux 100 premiers inscrits</span></div>
</div>
<p class="url">call.mahu.cards/etudiants</p>
{phones([("nuit", "left:760px;top:70px;transform:rotate(-6deg)"), ("plan", "left:930px;top:110px;transform:rotate(5deg)")])}
<div class="card" style="left:690px;top:400px;transform:rotate(-10deg)"><img src="sc3.svg"></div>""",
    "og-portfolio.png": f"""<div class="left">
  <span class="pill">Portfolio étudiant · Mahu</span>
  <h1>Projets, vidéos,<br>compétences <span>et CV</span><br>sur une seule page.</h1>
  <p class="sub">Crée le tien : portfolio + CV en ligne, 3 500 FCFA pour 1 an.</p>
</div>
<p class="url">call.mahu.cards/etudiants</p>
{phones([("eclat", "left:700px;top:95px;transform:rotate(-8deg)"), ("campus", "left:850px;top:55px;z-index:2"), ("atelier", "left:990px;top:110px;transform:rotate(8deg)")])}""",
}

for name, body in PAGES.items():
    html = os.path.join(HERE, "og-tmp.html")
    open(html, "w", encoding="utf-8").write(f"<!doctype html><html><head><meta charset='utf-8'><style>{STYLE}</style></head><body>{body}</body></html>")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", "--window-size=1200,630",
                    "--allow-file-access-from-files", f"--screenshot={os.path.join(PUBLIC, name)}", "file:///" + html.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(html)
    print(name)
