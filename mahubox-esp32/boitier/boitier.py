"""Boitier 3D de la Mahu Box (ESP32 + lecteur NFC PN532), au format carte.

Deux pieces a imprimer : le socle et le couvercle (emplacement de la carte au-
dessus du lecteur). Deux hauteurs : "fin" (fils soudes directement) et
"sans-soudure" (fils Dupont sur les broches de l'ESP32).

Mesures de reference (a verifier au pied a coulisse avant d'imprimer) :
  ESP32 DevKit V1 30 broches : 52 x 28,5 mm, prise micro-USB au bout
  PN532 (module rouge)       : 43 x 41 mm
  Carte Mahu                 : 85,6 x 54 x 0,76 mm
Usage : python boitier.py   (ecrit les STL dans ce dossier)
"""
import os
import trimesh
from trimesh.creation import box, cylinder

HERE = os.path.dirname(os.path.abspath(__file__))

WALL = 2.0          # epaisseur des parois
FLOOR = 1.6         # fond du socle
LID = 2.2           # epaisseur du couvercle
RECESS = 1.0        # profondeur de l'emplacement de la carte
CLEAR = 0.3         # jeu d'emboitement
ESP_L, ESP_W = 52.0, 28.5
PN_L, PN_W = 43.0, 41.0
GAP = 3.0
CARD_L, CARD_W = 85.6 + 1.0, 54.0 + 1.0   # carte + jeu

IN_L = ESP_L + GAP + PN_L + 2.0
IN_W = 58.0
OUT_L, OUT_W = IN_L + 2 * WALL, IN_W + 2 * WALL


def at(mesh, x, y, z):
    """Place un maillage cree centre a l'origine, par son coin bas (x, y, z)."""
    lo = mesh.bounds[0]
    mesh.apply_translation([x - lo[0], y - lo[1], z - lo[2]])
    return mesh


def cube(lx, ly, lz, x, y, z):
    return at(box([lx, ly, lz]), x, y, z)


def socle(in_h):
    h = FLOOR + in_h
    shell = cube(OUT_L, OUT_W, h, 0, 0, 0)
    cavity = cube(IN_L, IN_W, in_h + 1, WALL, WALL, FLOOR)
    body = shell.difference(cavity)
    # ouverture micro-USB au bout de l'ESP32 (cote x = 0)
    esp_y = WALL + (IN_W - ESP_W) / 2
    usb_z = FLOOR + (in_h * 0.35)
    body = body.difference(cube(WALL + 2, 13, 8, -1, esp_y + ESP_W / 2 - 6.5, usb_z))
    # butees de l'ESP32 (le maintiennent en place)
    for dy in (-1.2, ESP_W + 0.2):
        body = body.union(cube(ESP_L, 1.0, 3.0, WALL + 0.5, esp_y + dy, FLOOR))
    # piliers du PN532 : antenne juste sous le couvercle
    px = WALL + ESP_L + GAP
    py = WALL + (IN_W - PN_W) / 2
    post_h = in_h - 1.6 - 0.4
    for cx, cy in ((px + 3, py + 3), (px + PN_L - 3, py + 3), (px + 3, py + PN_W - 3), (px + PN_L - 3, py + PN_W - 3)):
        body = body.union(at(cylinder(radius=2.5, height=post_h, sections=32), cx - 2.5, cy - 2.5, FLOOR))
    return body


def couvercle():
    plate = cube(OUT_L, OUT_W, LID, 0, 0, 0)
    lip = cube(IN_L - 2 * CLEAR, IN_W - 2 * CLEAR, 2.0, WALL + CLEAR, WALL + CLEAR, -2.0)
    lip = lip.difference(cube(IN_L - 2 * CLEAR - 3.2, IN_W - 2 * CLEAR - 3.2, 3.0, WALL + CLEAR + 1.6, WALL + CLEAR + 1.6, -2.5))
    lid = plate.union(lip)
    # emplacement de la carte, cale sur le bout du lecteur NFC
    lid = lid.difference(cube(CARD_L, CARD_W, RECESS + 1, OUT_L - WALL - CARD_L, (OUT_W - CARD_W) / 2, LID - RECESS))
    # fenetre de la LED de l'ESP32 (pres de la prise USB)
    lid = lid.difference(at(cylinder(radius=1.6, height=LID + 4, sections=24), WALL + 8, OUT_W / 2 - 1.6, -2))
    # le couvercle s'imprime a l'envers : face du dessus sur le plateau
    lid.apply_transform(trimesh.transformations.rotation_matrix(3.14159265, [1, 0, 0]))
    return lid


for name, in_h in (("fin", 8.5), ("sans-soudure", 18.0)):
    s = socle(in_h)
    s.export(os.path.join(HERE, f"mahu-box-socle-{name}.stl"))
    print(f"socle {name} : {OUT_L:.1f} x {OUT_W:.1f} x {FLOOR + in_h + LID:.1f} mm au total, etanche={s.is_watertight}")
c = couvercle()
c.export(os.path.join(HERE, "mahu-box-couvercle.stl"))
print("couvercle etanche :", c.is_watertight)
