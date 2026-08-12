const API_BASE = "https://ai-api.mahu.cards/api/beta"

const form = document.getElementById("beta-form")
const submitBtn = document.getElementById("submit-btn")
const messageEl = document.getElementById("form-message")
const counterEl = document.getElementById("signup-counter")

async function loadCounter() {
  try {
    const response = await fetch(`${API_BASE}/count`)
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
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const result = await response.json().catch(() => ({}))

    if (response.ok && result.success) {
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
