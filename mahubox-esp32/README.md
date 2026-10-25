# Mahu Box (ESP32)

Le lecteur de carte qui ouvre ton ordinateur Mahu sur **n'importe quel écran** :
ordinateur, téléphone Android, TV. Pas de box Android : un ESP32 + un lecteur NFC,
qui se présente en **Bluetooth comme un clavier**.

1. Carte posée → l'ESP32 lit l'adresse de la carte et l'ouvre dans le navigateur.
2. Tu tapes ton code secret → ton ordinateur s'affiche en plein écran.
3. Carte retirée → l'écran se ferme tout seul.

## Matériel (prix indicatifs)

| Pièce | Prix |
|---|---|
| ESP32 DevKit (classique, S3 ou C3 — **pas S2**) | 3 000 – 5 000 FCFA |
| Module NFC **PN532** (rouge, avec IRQ et RSTO) | 3 000 – 5 000 FCFA |
| 6 fils Dupont femelle-femelle (ou fils à souder) | ~500 FCFA |
| Câble micro-USB + chargeur | déjà chez toi |
| Boîtier imprimé en 3D (dossier `boitier/`) | ~2 000 FCFA d'impression |

## Câblage

Voir `schema-cablage.png`. Interrupteurs du PN532 en **I2C** (SEL0 = ON, SEL1 = OFF).

| ESP32 | PN532 |
|---|---|
| 3V3 | VCC |
| GND | GND |
| GPIO 21 | SDA |
| GPIO 22 | SCL |
| GPIO 4 | IRQ |
| GPIO 5 | RSTO |

## Programmer l'ESP32 (une fois)

1. Installe **Arduino IDE**.
2. Fichier → Préférences → URL de gestionnaire de cartes :
   `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
3. Outils → Carte → Gestionnaire de cartes : installe **esp32** en version **2.0.17**.
4. Croquis → Bibliothèques : installe **Adafruit PN532**.
   Puis **ESP32 BLE Keyboard** (T-vK) : télécharge le ZIP sur
   `github.com/T-vK/ESP32-BLE-Keyboard` et Croquis → Inclure une bibliothèque → Ajouter .ZIP.
5. Ouvre `mahubox-esp32.ino`, carte **ESP32 Dev Module**, choisis le port, **Téléverser**.

## Première utilisation

1. Branche la box. Sur l'ordinateur / le téléphone / la TV : Bluetooth → appairer **« Mahu Box »**.
2. Choisis le type d'appareil avec le bouton **BOOT** (appui court) :
   1 clignotement = **Windows**, 2 = **Android**, 3 = **Mac**.
3. Clavier de l'appareil : **AZERTY** par défaut. Appui long sur BOOT pour passer en QWERTY
   (clignotement long = AZERTY).
4. Programme ta carte avec l'adresse `https://call.mahu.cards/c/TON-CODE` (appli NFC Tools).
5. Pose la carte : ton ordinateur s'ouvre.

Signaux de la LED : allumée = carte posée · 3 clignotements rapides = carte non Mahu ·
5 clignotements rapides = rien d'appairé en Bluetooth · clignotement continu = lecteur NFC mal branché.

## Boîtier 3D

Dossier `boitier/` : `mahu-box-socle-fin.stl` (12 mm, fils soudés) ou
`mahu-box-socle-sans-soudure.stl` (22 mm, fils Dupont) + `mahu-box-couvercle.stl`.
PLA, 0,2 mm, 20 % de remplissage, sans support (le couvercle s'imprime à l'envers).
Mesure tes modules avant d'imprimer : les cotes se règlent en haut de `boitier.py`.

## À savoir

- Windows est le plus sûr. Android et Mac : raccourcis à valider sur ton appareil.
- Ce code n'a pas encore été testé sur du vrai matériel : premier essai à faire ensemble.
