// Remplacez cette URL par celle de votre deploiement Google Apps Script
// (voir apps-script.gs - Deployer > Nouveau deploiement > Application Web,
// puis collez l'URL qui se termine par /exec ici).
const APPS_SCRIPT_URL = "COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT"

const form = document.getElementById("beta-form")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("form-message")

form.addEventListener("submit", async (event) => {
  event.preventDefault()

  if (APPS_SCRIPT_URL === "COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT") {
    messageEl.textContent = "Le formulaire n'est pas encore connecte (URL Apps Script manquante)."
    messageEl.className = "form-message error"
    return
  }

  const data = {
    name: document.getElementById("name").value.trim(),
    contact: document.getElementById("contact").value.trim(),
    country: document.getElementById("country").value,
  }

  if (!data.name || !data.contact || !data.country) {
    messageEl.textContent = "Merci de remplir tous les champs."
    messageEl.className = "form-message error"
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = "Envoi en cours..."
  messageEl.textContent = ""
  messageEl.className = "form-message"

  try {
    // text/plain evite le preflight CORS (Apps Script Web Apps ne
    // repondent pas correctement aux requetes OPTIONS).
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    })
    const result = await response.json()

    if (result.success) {
      form.reset()
      messageEl.textContent = "Merci ! Votre demande a bien ete enregistree, nous vous contacterons bientot."
      messageEl.className = "form-message success"
      submitBtn.textContent = "Inscription envoyee"
    } else {
      throw new Error(result.error || "Erreur inconnue")
    }
  } catch (error) {
    messageEl.textContent = "Erreur d'envoi, merci de reessayer dans un instant."
    messageEl.className = "form-message error"
    submitBtn.disabled = false
    submitBtn.textContent = "Je veux participer a la beta"
  }
})
