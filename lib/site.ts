// Adresse publique des profils et des cartes (Smart Call Cards) : tous les
// liens partages, QR codes et apercus pointent ici, quel que soit le domaine
// sur lequel l'utilisateur edite son profil. Un seul endroit a changer si
// l'adresse change un jour (ou NEXT_PUBLIC_PROFILE_URL au build).
export const PUBLIC_PROFILE_URL = (process.env.NEXT_PUBLIC_PROFILE_URL || "https://call.mahu.cards").replace(/\/$/, "")

export const PUBLIC_PROFILE_HOST = PUBLIC_PROFILE_URL.replace(/^https?:\/\//, "")
