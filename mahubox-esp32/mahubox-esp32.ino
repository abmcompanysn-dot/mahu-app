/*
  Mahu Box (ESP32) - le lecteur de carte qui ouvre ton ordinateur Mahu.

  L'ESP32 se presente en Bluetooth comme un CLAVIER ("Mahu Box"). Carte posee
  sur le lecteur NFC : il lit l'adresse ecrite dans la carte
  (https://call.mahu.cards/c/CODE) et la "tape" dans l'appareil appaire
  (ouverture du navigateur + adresse + Entree). Carte retiree : il ferme
  l'onglet (Ctrl+W) -> l'ordinateur se verrouille, rien ne reste a l'ecran.

  Materiel : ESP32 (classique, S3 ou C3 - pas S2) + module PN532 en I2C.
    PN532 VCC -> 3V3   GND -> GND   SDA -> GPIO 21   SCL -> GPIO 22
    PN532 IRQ -> GPIO 4   RSTO -> GPIO 5
    Interrupteurs du PN532 : mode I2C (SEL0 = ON, SEL1 = OFF).
  LED : celle de la carte ESP32 (GPIO 2). Bouton : BOOT (GPIO 0).

  Bouton BOOT :
    appui court  -> appareil suivant : Windows -> Android -> Mac (1, 2 ou 3 clignotements)
    appui long   -> clavier AZERTY <-> QWERTY (clignotement long = AZERTY)

  Arduino IDE : carte "ESP32 Dev Module" (paquet esp32 version 2.0.17),
  bibliotheques "Adafruit PN532" et "ESP32 BLE Keyboard" (T-vK).
*/

#include <Wire.h>
#include <Adafruit_PN532.h>
#include <BleKeyboard.h>
#include <Preferences.h>

#define PIN_SDA 21
#define PIN_SCL 22
#define PIN_IRQ 4
#define PIN_RST 5
#define PIN_LED 2
#define PIN_BTN 0

Adafruit_PN532 nfc(PIN_IRQ, PIN_RST);
BleKeyboard keyboard("Mahu Box", "Mahu", 100);
Preferences prefs;

enum Host { WINDOWS = 0, ANDROID = 1, MAC = 2 };
int host = WINDOWS;
bool azerty = true;

bool cardPresent = false;
int misses = 0;
unsigned long btnDown = 0;

// ---------------------------------------------------------------- LED

void blink(int n, int on = 120, int off = 160) {
  for (int i = 0; i < n; i++) {
    digitalWrite(PIN_LED, HIGH); delay(on);
    digitalWrite(PIN_LED, LOW); delay(off);
  }
}

// ---------------------------------------------------------------- frappe

// Le clavier Bluetooth envoie des touches "americaines". Sur un ordinateur
// AZERTY, la meme touche donne un autre caractere : on envoie donc la touche
// QWERTY qui, en AZERTY, produit le caractere voulu.
char azertyKey(char c) {
  switch (c) {
    case 'a': return 'q'; case 'q': return 'a'; case 'z': return 'w'; case 'w': return 'z';
    case 'A': return 'Q'; case 'Q': return 'A'; case 'Z': return 'W'; case 'W': return 'Z';
    case 'm': return ';'; case 'M': return ':';
    case '0': return ')'; case '1': return '!'; case '2': return '@'; case '3': return '#'; case '4': return '$';
    case '5': return '%'; case '6': return '^'; case '7': return '&'; case '8': return '*'; case '9': return '(';
    case '.': return '<'; case '/': return '>'; case ':': return '.'; case '?': return 'M';
    case '-': return '6'; case '_': return '8'; case '=': return '=';
    default: return c;
  }
}

void typeText(const String &s) {
  for (size_t i = 0; i < s.length(); i++) {
    char c = azerty ? azertyKey(s[i]) : s[i];
    keyboard.write((uint8_t)c);
    delay(12);
  }
}

void combo(uint8_t mod, uint8_t key) {
  keyboard.press(mod);
  keyboard.press(key);
  delay(60);
  keyboard.releaseAll();
}

// Lettre a presser avec un modificateur : position de la touche selon le clavier.
uint8_t letter(char c) { return azerty ? (uint8_t)azertyKey(c) : (uint8_t)c; }

void openUrl(const String &url) {
  switch (host) {
    case WINDOWS:
      combo(KEY_LEFT_GUI, letter('r'));      // Executer
      delay(600);
      typeText(url);
      break;
    case ANDROID:
      combo(KEY_LEFT_GUI, letter('b'));      // navigateur
      delay(1500);
      combo(KEY_LEFT_CTRL, letter('l'));     // barre d'adresse
      delay(300);
      typeText(url);
      break;
    case MAC:
      combo(KEY_LEFT_GUI, ' ');              // Spotlight
      delay(600);
      typeText(url);
      break;
  }
  delay(150);
  keyboard.write(KEY_RETURN);
}

void closeScreen() {
  // En plein ecran, la page capture le clavier : Echap maintenu 2,5 s fait
  // sortir du plein ecran (regle du navigateur), puis on ferme l'onglet.
  keyboard.press(KEY_ESC);
  delay(2500);
  keyboard.releaseAll();
  delay(400);
  uint8_t mod = host == MAC ? KEY_LEFT_GUI : KEY_LEFT_CTRL;
  combo(mod, letter('w'));                   // fermer l'onglet
}

// ---------------------------------------------------------------- carte

// Lit l'adresse NDEF (enregistrement URI) d'une carte NTAG / Ultralight.
String readCardUrl() {
  static const char *prefixes[] = {"", "http://www.", "https://www.", "http://", "https://"};
  uint8_t mem[160];
  int n = 0;
  for (uint8_t page = 4; page < 44 && n + 4 <= (int)sizeof(mem); page++) {
    uint8_t buf[4];
    if (!nfc.ntag2xx_ReadPage(page, buf)) break;
    memcpy(mem + n, buf, 4);
    n += 4;
  }
  int i = 0;
  while (i < n) {
    uint8_t t = mem[i];
    if (t == 0x00) { i++; continue; }
    if (t == 0xFE || i + 1 >= n) break;
    int len = mem[i + 1], start = i + 2;
    if (len == 0xFF) { if (i + 3 >= n) break; len = (mem[i + 2] << 8) | mem[i + 3]; start = i + 4; }
    if (t == 0x03) {
      if (start + 3 > n) break;
      uint8_t hdr = mem[start];
      uint8_t typeLen = mem[start + 1];
      if (!(hdr & 0x10)) break;                // enregistrement court attendu
      int payLen = mem[start + 2];
      int p = start + 3 + ((hdr & 0x08) ? 1 : 0);
      if (typeLen != 1 || p >= n || mem[p] != 'U' || payLen < 1) break;
      p += 1;
      uint8_t pre = mem[p];
      String url = pre < 5 ? prefixes[pre] : "";
      for (int k = 1; k < payLen && p + k < n; k++) url += (char)mem[p + k];
      return url;
    }
    i = start + len;
  }
  return "";
}

// Extrait le code de "https://call.mahu.cards/c/CODE".
String cardCode(const String &url) {
  int at = url.indexOf("/c/");
  if (at < 0) return "";
  String code = url.substring(at + 3);
  int end = 0;
  while (end < (int)code.length() && (isalnum(code[end]) || code[end] == '-' || code[end] == '_')) end++;
  return code.substring(0, end);
}

// ---------------------------------------------------------------- programme

void setup() {
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BTN, INPUT_PULLUP);
  Serial.begin(115200);

  prefs.begin("mahubox", false);
  host = prefs.getInt("host", WINDOWS);
  azerty = prefs.getBool("azerty", true);

  Wire.begin(PIN_SDA, PIN_SCL);
  nfc.begin();
  if (!nfc.getFirmwareVersion()) {
    Serial.println("PN532 introuvable : verifier le cablage et le mode I2C");
    while (true) blink(1, 60, 60);          // clignotement rapide = lecteur absent
  }
  nfc.SAMConfig();
  keyboard.begin();
  Serial.println("Mahu Box prete");
  blink(host + 1);
}

void handleButton() {
  bool down = digitalRead(PIN_BTN) == LOW;
  if (down && btnDown == 0) btnDown = millis();
  if (!down && btnDown != 0) {
    unsigned long held = millis() - btnDown;
    btnDown = 0;
    if (held > 1200) {
      azerty = !azerty;
      prefs.putBool("azerty", azerty);
      blink(1, azerty ? 900 : 200);
    } else if (held > 40) {
      host = (host + 1) % 3;
      prefs.putInt("host", host);
      blink(host + 1);
    }
  }
}

void loop() {
  handleButton();

  uint8_t uid[7];
  uint8_t uidLen = 0;
  bool seen = nfc.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLen, 120);

  if (seen) {
    misses = 0;
    if (!cardPresent) {
      cardPresent = true;
      digitalWrite(PIN_LED, HIGH);
      String code = cardCode(readCardUrl());
      if (code.length() == 0) {
        Serial.println("Carte sans adresse Mahu");
        blink(3, 60, 60);
      } else if (!keyboard.isConnected()) {
        Serial.println("Pas d'appareil appaire en Bluetooth");
        blink(5, 60, 60);
      } else {
        Serial.println("Ouverture de l'ordinateur " + code);
        openUrl("https://call.mahu.cards/c/" + code);
      }
    }
  } else if (cardPresent && ++misses >= 4) {   // ~0,5 s sans carte = retiree
    cardPresent = false;
    digitalWrite(PIN_LED, LOW);
    if (keyboard.isConnected()) closeScreen();
    Serial.println("Carte retiree : ecran ferme");
  }
  delay(30);
}
