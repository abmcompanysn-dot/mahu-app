// ============================================================================
// Backend de la liste d'attente "Carte Mahu IA - Beta", en Google Apps Script.
//
// Installation :
// 1. Creez une nouvelle Google Sheet (ou reutilisez-en une), et ajoutez une
//    ligne d'en-tete sur la premiere feuille : Date | Nom | Contact | Pays
// 2. Dans la Sheet : Extensions > Apps Script, collez ce fichier entier.
// 3. Deployer > Nouveau deploiement > type "Application Web" :
//      - Executer en tant que : Moi
//      - Qui a acces : Tout le monde
// 4. Copiez l'URL /exec generee, collez-la dans script.js (APPS_SCRIPT_URL).
// ============================================================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const name = String(data.name || "").trim()
    const contact = String(data.contact || "").trim()
    const country = String(data.country || "").trim()

    if (!name || !contact || !country) {
      return jsonResponse({ success: false, error: "Champs manquants" })
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
    sheet.appendRow([new Date(), name, contact, country])

    return jsonResponse({ success: true })
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) })
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
