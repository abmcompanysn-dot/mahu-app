// Cloudinary sert l'image a la taille affichee et au format le plus leger
// (WebP/AVIF) : une photo de 3-4 Mo devient ~30 Ko. Les autres URL sont
// renvoyees telles quelles.
export function optimizedImage(url: string, width: number) {
  if (!url || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url
  return url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`)
}
