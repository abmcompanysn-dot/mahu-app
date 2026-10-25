"""Boitier "galet ovale" de la Mahu Box (ESP32 + PN532), finition doree.

Trois pieces :
  mahu-ovale-dessus.stl       coque en forme de galet, emplacement de la carte
                              (s'imprime a l'envers, dessus sur le plateau)
  mahu-ovale-socle.stl        fond plat avec glissieres de l'ESP32 et piliers du PN532
  mahu-ovale-lisere-dore.stl  liseré autour de la carte, a imprimer en PLA dore
                              (se clipse dans la rainure du dessus)

Contour : "super-ellipse" (ovale aux flancs tendus), bords du dessus arrondis.
Version fine : fils soudes directement sur l'ESP32 (hauteur interieure 11,5 mm).
Usage : python boitier_ovale.py
"""
import os
import numpy as np
import trimesh

HERE = os.path.dirname(os.path.abspath(__file__))

A, B, N = 60.0, 38.0, 4.0      # demi-axes exterieurs (mm) et "tension" de l'ovale
H = 17.0                       # hauteur totale
R_TOP, R_BOT = 5.0, 1.5        # arrondis du dessus et du dessous
WALL, ROOF = 3.0, 2.5          # epaisseur des flancs et du dessus
SPLIT = 3.0                    # hauteur du socle
CARD_A, CARD_B = 43.3 + 0.5, 27.0 + 0.5   # demi-dimensions de la carte + jeu
RECESS = 1.0
GROOVE_IN, GROOVE_OUT, GROOVE_D = 1.5, 3.5, 1.2


def superellipse(a, b, n, m=180):
    t = np.linspace(0, 2 * np.pi, m, endpoint=False)
    c, s = np.cos(t), np.sin(t)
    return np.c_[a * np.sign(c) * np.abs(c) ** (2 / n), b * np.sign(s) * np.abs(s) ** (2 / n)]


def loft(rings):
    """Solide ferme a partir d'anneaux [(z, ax, by, n)] du bas vers le haut."""
    m = 180
    verts, faces = [], []
    for z, a, b, n in rings:
        pts = superellipse(a, b, n, m)
        verts.extend(np.c_[pts, np.full(m, z)])
    k = len(rings)
    for i in range(k - 1):
        for j in range(m):
            a0, a1 = i * m + j, i * m + (j + 1) % m
            b0, b1 = a0 + m, a1 + m
            faces += [[a0, a1, b1], [a0, b1, b0]]
    bot, top = len(verts), len(verts) + 1
    verts += [[0, 0, rings[0][0]], [0, 0, rings[-1][0]]]
    for j in range(m):
        faces.append([bot, (j + 1) % m, j])
        faces.append([top, (k - 1) * m + j, (k - 1) * m + (j + 1) % m])
    mesh = trimesh.Trimesh(np.array(verts), np.array(faces), process=True)
    mesh.fix_normals()
    return mesh


def prism(a, b, n, z0, z1):
    return loft([(z0, a, b, n), (z1, a, b, n)])


def pebble():
    rings = []
    for th in np.linspace(0, np.pi / 2, 7):              # arrondi du dessous
        inset = R_BOT * (1 - np.sin(th))
        rings.append((R_BOT * (1 - np.cos(th)), A - inset, B - inset, N))
    for th in np.linspace(np.pi / 2, 0, 12):             # arrondi du dessus
        inset = R_TOP * (1 - np.sin(th))
        rings.append((H - R_TOP * (1 - np.cos(th)), A - inset, B - inset, N))
    return loft(rings)


def box(lx, ly, lz, cx, cy, z0):
    m = trimesh.creation.box([lx, ly, lz])
    m.apply_translation([cx, cy, z0 + lz / 2])
    return m


def cylinder(r, h, cx, cy, z0):
    m = trimesh.creation.cylinder(radius=r, height=h, sections=32)
    m.apply_translation([cx, cy, z0 + h / 2])
    return m


outer = pebble()
cavity = prism(A - WALL, B - WALL, N, -1, H - ROOF)
usb = box(10, 13, 8, -A + 2, -0.0, SPLIT - 0.5)          # prise micro-USB au bout de l'ESP32

# ---- dessus : coque au-dessus du plan de coupe
cover = outer.difference(cavity)
cover = cover.difference(box(2 * A + 10, 2 * B + 10, SPLIT, 0, 0, -0.01))
cover = cover.difference(prism(CARD_A, CARD_B, 10, H - RECESS, H + 1))
groove = prism(CARD_A + GROOVE_OUT, CARD_B + GROOVE_OUT, 10, H - RECESS - GROOVE_D, H + 1) \
    .difference(prism(CARD_A + GROOVE_IN, CARD_B + GROOVE_IN, 10, H - RECESS - GROOVE_D - 1, H + 2))
cover = cover.difference(groove)
cover = cover.difference(cylinder(1.6, 10, -A + 9, 0, H - ROOF - 2))   # fenetre de la LED
cover = cover.difference(usb)

# ---- socle : fond plat + rebord d'emboitement + supports des modules
base = outer.intersection(box(2 * A + 10, 2 * B + 10, SPLIT, 0, 0, 0))
lip = prism(A - WALL - 0.3, B - WALL - 0.3, N, SPLIT, SPLIT + 3).difference(
    prism(A - WALL - 1.8, B - WALL - 1.8, N, SPLIT - 1, SPLIT + 4))
base = base.union(lip)
esp_x0, esp_l, esp_w = -A + WALL + 1.0, 52.0, 28.5       # ESP32 cote USB
for dy in (-esp_w / 2 - 0.8, esp_w / 2 + 0.8):
    base = base.union(box(esp_l - 4, 1.0, 2.5, esp_x0 + esp_l / 2, dy, SPLIT))
pn_x0, pn_l, pn_w = esp_x0 + esp_l + 3.0, 43.0, 41.0     # PN532 sous la carte
post_h = (H - ROOF) - SPLIT - 1.6 - 0.3
for cx in (pn_x0 + 3, pn_x0 + pn_l - 3):
    for cy in (-pn_w / 2 + 3, pn_w / 2 - 3):
        base = base.union(cylinder(2.5, post_h, cx, cy, SPLIT))
base = base.difference(usb)

# ---- liseré doré (clipse dans la rainure, depasse de 0,4 mm)
rim = prism(CARD_A + GROOVE_OUT - 0.15, CARD_B + GROOVE_OUT - 0.15, 10, 0, GROOVE_D + 0.4) \
    .difference(prism(CARD_A + GROOVE_IN + 0.15, CARD_B + GROOVE_IN + 0.15, 10, -1, GROOVE_D + 1))

cover_print = cover.copy()
cover_print.apply_transform(trimesh.transformations.rotation_matrix(np.pi, [1, 0, 0]))
cover_print.apply_translation([0, 0, -cover_print.bounds[0][2]])

for name, mesh in (("dessus", cover_print), ("socle", base), ("lisere-dore", rim)):
    path = os.path.join(HERE, f"mahu-ovale-{name}.stl")
    mesh.export(path)
    ext = mesh.bounds[1] - mesh.bounds[0]
    print(f"{name:12s} {ext[0]:.1f} x {ext[1]:.1f} x {ext[2]:.1f} mm  etanche={mesh.is_watertight}")
# pour l'apercu 3D : pieces dans leur position montee
cover.export(os.path.join(HERE, "apercu-ovale-dessus.stl"))
rim_view = rim.copy(); rim_view.apply_translation([0, 0, H - RECESS - GROOVE_D])
rim_view.export(os.path.join(HERE, "apercu-ovale-lisere.stl"))
print(f"total monte : {2 * A:.0f} x {2 * B:.0f} x {H:.0f} mm")
