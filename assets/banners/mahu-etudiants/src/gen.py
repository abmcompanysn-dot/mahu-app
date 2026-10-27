"""Affiches de l'offre Portfolio etudiant (3 500 FCFA). Usage : python gen.py"""
import os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

def page(w, h):
    s = h > w
    phone_w = 340 if s else 250
    phones = "".join(f'''<div class="phone" style="width:{phone_w}px;height:{phone_w*2.05}px;transform:{t}"><div class="screen" style="background-image:url({img})"></div></div>'''
                     for img, t in (("eclat.png", "rotate(-9deg) translateY(40px)"), ("nuit.png", "translateY(-10px) scale(1.06)"), ("campus.png", "rotate(9deg) translateY(40px)")))
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face {{ font-family: M; src: url(Montserrat-Black.ttf); font-weight: 900; }}
@font-face {{ font-family: M; src: url(Montserrat-Bold.ttf); font-weight: 700; }}
* {{ margin:0; box-sizing:border-box; }}
body {{ width:{w}px; height:{h}px; overflow:hidden; font-family:M; color:#fff;
  background: radial-gradient(ellipse at 50% {50 if s else 60}%, rgba(212,175,55,.22), transparent 60%), #07090f; }}
.top {{ text-align:center; padding-top:{110 if s else 54}px; }}
.pill {{ display:inline-block; border:2px solid rgba(212,175,55,.6); color:#e9cf7a; border-radius:999px; padding:10px 26px; font-size:{28 if s else 22}px; font-weight:700; }}
h1 {{ font-weight:900; font-size:{72 if s else 64}px; line-height:1.05; letter-spacing:-.035em; margin-top:{34 if s else 22}px; }}
h1 span {{ color:#d4af37; }}
.phones {{ display:flex; justify-content:center; gap:{22 if s else 18}px; margin-top:{110 if s else 36}px; }}
.phone {{ border-radius:38px; background:#111; padding:10px; box-shadow:0 40px 90px rgba(0,0,0,.7), 0 0 0 2px rgba(255,255,255,.12); }}
.screen {{ width:100%; height:100%; border-radius:30px; background-size:cover; background-position:top center; }}
.bottom {{ position:absolute; left:0; right:0; bottom:{230 if s else 46}px; text-align:center; }}
.price {{ display:inline-block; background:#d4af37; color:#000; border-radius:999px; padding:{20 if s else 14}px {50 if s else 36}px; font-weight:900; font-size:{58 if s else 40}px; }}
.sub {{ margin-top:{24 if s else 14}px; font-size:{32 if s else 24}px; font-weight:700; color:rgba(255,255,255,.75); }}
.url {{ margin-top:{18 if s else 10}px; font-size:{30 if s else 22}px; font-weight:700; color:#fff; }}
</style></head><body>
<div class="top"><span class="pill">Réservé aux étudiants</span>
<h1>Ton portfolio en ligne<br><span>+ ta carte digitale pro</span></h1></div>
<div class="phones">{phones}</div>
<div class="bottom"><span class="price">3 500 FCFA</span><div class="sub">4 modèles au choix · valable 1 an</div><div class="url">call.mahu.cards/etudiants</div></div>
</body></html>"""

for name, w, h in (("portfolio-etudiant-story-1080x1920", 1080, 1920), ("portfolio-etudiant-carre-1080x1080", 1080, 1080)):
    html = os.path.join(HERE, name + ".html"); open(html, "w", encoding="utf-8").write(page(w, h))
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", f"--window-size={w},{h}",
                    f"--screenshot={os.path.join(OUT, name + '.png')}", "file:///" + html.replace("\\", "/")], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    os.remove(html); print(name)
