// ============================================================================
// Backend de la liste d'attente "Carte Mahu IA - Beta", en Google Apps Script.
//
// - Enregistre chaque inscription (Nom, Email, Telephone, Adresse, Pays).
// - Limite a 10 places par pays (MAX_PER_COUNTRY) - au-dela, l'inscription
//   est refusee avec un message "beta complete pour ce pays".
// - Envoie un email de confirmation automatique a l'inscrit, et une
//   notification a l'admin.
// - Expose un compteur total (GET ?action=count) pour la page publique.
//
// Installation :
// 1. Creez une nouvelle Google Sheet, et ajoutez une ligne d'en-tete sur la
//    premiere feuille : Date | Nom | Email | Telephone | Adresse | Pays
// 2. Dans la Sheet : Extensions > Apps Script, collez ce fichier entier.
// 3. Deployer > Nouveau deploiement > type "Application Web" :
//      - Executer en tant que : Moi
//      - Qui a acces : Tout le monde
// 4. Copiez l'URL /exec generee, collez-la dans script.js (APPS_SCRIPT_URL).
// ============================================================================

const MAX_PER_COUNTRY = 10
const ADMIN_EMAIL = "abmcompanysn@gmail.com"

function doGet(e) {
  if (e.parameter.action === "count") {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
    const count = Math.max(sheet.getLastRow() - 1, 0)
    return jsonResponse({ success: true, count: count })
  }
  return jsonResponse({ success: true, message: "API beta Mahu en ligne" })
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents)
    const name = String(data.name || "").trim()
    const email = String(data.email || "").trim()
    const phone = String(data.phone || "").trim()
    const address = String(data.address || "").trim()
    const country = String(data.country || "").trim()

    if (!name || !email || !phone || !address || !country) {
      return jsonResponse({ success: false, error: "Champs manquants" })
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
    const rows = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues() : []
    const countryCount = rows.filter((row) => String(row[5]).trim().toLowerCase() === country.toLowerCase()).length

    if (countryCount >= MAX_PER_COUNTRY) {
      return jsonResponse({
        success: false,
        error: `Les ${MAX_PER_COUNTRY} places pour ${country} sont deja prises. Merci de votre interet !`,
      })
    }

    sheet.appendRow([new Date(), name, email, phone, address, country])

    if (email.indexOf("@") !== -1) {
      sendConfirmationEmail(name, email, country)
    }
    notifyAdmin(name, email, phone, address, country, countryCount + 1)

    return jsonResponse({ success: true })
  } catch (error) {
    return jsonResponse({ success: false, error: String(error) })
  }
}

function sendConfirmationEmail(name, email, country) {
  try {
    const subject = "Votre demande pour la beta de la carte Mahu IA"
    const htmlBody = `
      <div style="font-family: Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee;">
        <div style="background: #06070b; padding: 30px; text-align: center;">
          <span style="color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.05em;">AI MAHU</span>
        </div>
        <div style="padding: 32px 28px; color: #1a1a1a; line-height: 1.7; font-size: 15px;">
          <h2 style="margin-top: 0; color: #000;">Merci, ${name} !</h2>
          <p>Votre demande de participation a la beta de la carte Mahu avec intelligence artificielle a bien ete enregistree pour <strong>${country}</strong>.</p>
          <p>C'est une beta payante et a places limitees : notre equipe vous contactera personnellement pour la suite (paiement, expedition de la carte, et acces a l'application).</p>
          <p>A tres bientot,<br>L'equipe Mahu</p>
        </div>
        <div style="background: #f9f9f9; padding: 18px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee;">
          MAHU DIGITAL SYSTEM - Medina Rue 13 Angle 12, Dakar, Senegal<br>
          NINEA 012834182 | RCCM SN.DKR.2026.A.6465
        </div>
      </div>`
    GmailApp.sendEmail(email, subject, "Merci pour votre inscription a la beta Mahu IA.", { htmlBody, name: "MAHU DIGITAL SYSTEM" })
  } catch (error) {
    Logger.log("Erreur email confirmation: " + error)
  }
}

function notifyAdmin(name, email, phone, address, country, rankInCountry) {
  try {
    const subject = `Nouvelle inscription beta carte IA (${rankInCountry}/${MAX_PER_COUNTRY} - ${country})`
    const body = `${name}\nEmail: ${email}\nTelephone: ${phone}\nAdresse: ${address}\nPays: ${country}\nPlace: ${rankInCountry}/${MAX_PER_COUNTRY}`
    GmailApp.sendEmail(ADMIN_EMAIL, subject, body)
  } catch (error) {
    Logger.log("Erreur email admin: " + error)
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
