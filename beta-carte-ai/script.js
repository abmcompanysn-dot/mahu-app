// Remplacez cette URL par celle de votre deploiement Google Apps Script
// (voir apps-script.gs - Deployer > Nouveau deploiement > Application Web,
// puis collez l'URL qui se termine par /exec ici).
const APPS_SCRIPT_URL = "COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT"

const form = document.getElementById("beta-form")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("form-message")
const counterEl = document.getElementById("signup-counter")

async function loadCounter() {
  if (APPS_SCRIPT_URL === "COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT") return
  try {
    const response = await fetch(`${APPS_SCRIPT_URL}?action=count`)
    const result = await response.json()
    if (result.success) {
      counterEl.innerHTML = `<strong>${result.count}</strong> personne${result.count > 1 ? "s" : ""} deja inscrite${result.count > 1 ? "s" : ""} a la beta`
    }
  } catch (error) {
    // Silencieux - le compteur est un bonus, pas critique pour le formulaire.
  }
}

loadCounter()

form.addEventListener("submit", async (event) => {
  event.preventDefault()

  if (APPS_SCRIPT_URL === "COLLEZ_ICI_VOTRE_URL_APPS_SCRIPT") {
    messageEl.textContent = "Le formulaire n'est pas encore connecte (URL Apps Script manquante)."
    messageEl.className = "form-message error"
    return
  }

  const data = {
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    address: document.getElementById("address").value.trim(),
    country: document.getElementById("country").value,
  }

  if (!data.name || !data.email || !data.phone || !data.address || !data.country) {
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
      loadCounter()
    } else {
      // Message serveur affiche tel quel (ex: quota atteint pour ce pays) -
      // reessayer ne changerait rien, donc on ne le masque pas derriere un
      // message generique.
      messageEl.textContent = result.error || "Erreur inconnue"
      messageEl.className = "form-message error"
      submitBtn.disabled = false
      submitBtn.textContent = "Je veux participer a la beta"
    }
  } catch (error) {
    messageEl.textContent = "Erreur d'envoi, merci de reessayer dans un instant."
    messageEl.className = "form-message error"
    submitBtn.disabled = false
    submitBtn.textContent = "Je veux participer a la beta"
  }
})
