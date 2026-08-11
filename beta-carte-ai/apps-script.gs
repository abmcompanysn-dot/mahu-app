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
// 1. Creez une nouvelle Google Sheet (peut rester vide, le script initialise
//    la ligne d'en-tete tout seul au premier appel).
// 2. Dans la Sheet : Extensions > Apps Script, collez ce fichier entier.
// 3. Deployer > Nouveau deploiement > type "Application Web" :
//      - Executer en tant que : Moi
//      - Qui a acces : Tout le monde
// 4. Copiez l'URL /exec generee, collez-la dans script.js (APPS_SCRIPT_URL).
// ============================================================================

const MAX_PER_COUNTRY = 10
const ADMIN_EMAIL = "abmcompanysn@gmail.com"
const HEADERS = ["Date", "Nom", "Email", "Telephone", "Adresse", "Pays"]

// Recupere la feuille active et s'assure que la ligne d'en-tete existe -
// evite d'avoir a la creer manuellement avant le premier deploiement.
function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS)
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold")
  }
  return sheet
}

function doGet(e) {
  if (e.parameter.action === "count") {
    const sheet = getSheet()
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

    const sheet = getSheet()
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
    const subject = `Votre demande pour la beta de la carte Mahu IA - ${name}`
    const htmlBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #eeeeee; box-shadow: 0 5px 15px rgba(0,0,0,0.05);">
        <div style="background-color: #06070b; padding: 34px 20px; text-align: center;">
          <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 0.08em;">AI MAHU</span>
        </div>
        <div style="padding: 40px 32px; color: #1a1a1a; line-height: 1.8; font-size: 16px;">
          <h2 style="color: #000000; margin-top: 0; font-weight: 300; letter-spacing: 1px; text-transform: uppercase; font-size: 22px; text-align: center; margin-bottom: 8px;">Demande bien recue</h2>
          <p style="text-align: center; color: #555; margin-top: 0; margin-bottom: 30px;">Merci, ${name} 👋</p>
          <p>Votre demande de participation a la beta de la carte Mahu avec intelligence artificielle a bien ete enregistree pour <strong>${country}</strong>.</p>
          <div style="background-color: #f9f9f9; padding: 20px 22px; border-left: 4px solid #007aff; margin: 28px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; font-size: 14px; color: #444;">C'est une <strong>beta payante</strong>, a places limitees (10 par pays). Notre equipe vous contactera personnellement pour la suite : confirmation, paiement, puis expedition de votre carte.</p>
          </div>
          <div style="text-align: center; margin: 36px 0 8px;">
            <a href="mailto:contact@mahu.cards" style="background-color: #000000; color: #ffffff; padding: 15px 30px; text-decoration: none; font-weight: 500; font-size: 14px; display: inline-block; letter-spacing: 1px; text-transform: uppercase; border-radius: 4px;">Nous contacter</a>
          </div>
          <p style="text-align: center; font-size: 13px; color: #999;">contact@mahu.cards</p>
          <p style="margin-top: 30px;">A tres bientot,<br>L'equipe Mahu</p>
        </div>
        <div style="background-color: #fcfcfc; padding: 20px; text-align: center; font-size: 11px; color: #999999; border-top: 1px solid #eeeeee;">
          MAHU DIGITAL SYSTEM - Medina Rue 13 Angle 12, Dakar, Senegal<br>
          NINEA 012834182 | RCCM SN.DKR.2026.A.6465
        </div>
      </div>`
    GmailApp.sendEmail(email, subject, "Merci pour votre inscription a la beta Mahu IA. Notre equipe vous contactera bientot.", { htmlBody, name: "MAHU DIGITAL SYSTEM" })
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
