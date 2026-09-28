#!/bin/sh
# Deploie le backend Go sur diarra-vps (k3s, namespace mahu) depuis ce poste,
# sans passer par k8s/deploy.sh : celui-ci recree tout le secret depuis le
# .env du serveur, ce qui a deja casse FIREBASE_PRIVATE_KEY (guillemets).
#
# 1. sauvegarde /opt/mahu/backend sur le serveur
# 2. envoie le code (SANS backend/.env : le .env du serveur reste la reference)
# 3. met a jour uniquement les variables PAYDUNYA_* (serveur + secret k8s),
#    lues dans le backend/.env local - jamais affichees
# 4. reconstruit l'image, l'importe dans k3s, redemarre le backend
#
# Usage (Git Bash, a la racine du depot) : sh scripts/deploy-backend.sh
set -eu

cd "$(dirname "$0")/.."
HOST=diarra-vps
ARCHIVE=/tmp/mahu-backend.tgz

echo "== archive du code (sans .env ni binaires) =="
tar --exclude='backend/.env' --exclude='*.exe' --exclude='backend/dist' -czf "$ARCHIVE" backend

echo "== envoi =="
scp "$ARCHIVE" "$HOST:/tmp/mahu-backend.tgz"

echo "== sauvegarde + extraction sur le serveur =="
ssh "$HOST" 'set -e
cd /opt/mahu
BACKUP=/opt/mahu-backend-backup-$(date +%Y%m%d-%H%M%S)
cp -a backend "$BACKUP"
echo "sauvegarde: $BACKUP"
tar -xzf /tmp/mahu-backend.tgz
find backend -name "*.go" -exec sed -i "s/\r$//" {} +
rm /tmp/mahu-backend.tgz'

echo "== variables PayDunya (valeurs non affichees) =="
grep -E '^PAYDUNYA_[A-Z_]+=' backend/.env | tr -d '\r' | ssh "$HOST" 'set -e
cd /opt/mahu/backend
PATCH=""
while IFS= read -r line; do
  key=${line%%=*}
  # remplace la ligne existante dans le .env du serveur, ou l ajoute
  grep -v "^$key=" .env > .env.tmp || true
  printf "%s\n" "$line" >> .env.tmp
  mv .env.tmp .env
  val=$(printf "%s" "${line#*=}" | base64 -w0)
  PATCH="$PATCH\"$key\":\"$val\","
  echo "  $key mis a jour"
done
chmod 600 .env
kubectl patch secret mahu-backend-env -n mahu --type merge -p "{\"data\":{${PATCH%,}}}"'

echo "== build de l image + import k3s + redemarrage =="
ssh "$HOST" 'set -e
cd /opt/mahu
docker build -t mahu-backend:latest ./backend
docker save mahu-backend:latest | k3s ctr images import -
kubectl rollout restart deployment/backend -n mahu
kubectl rollout status deployment/backend -n mahu --timeout=180s
kubectl logs deployment/backend -n mahu --tail=15'

echo "== verification publique =="
curl -s -o /dev/null -w "health: %{http_code}\n" https://ai-api.mahu.cards/health
echo "termine."
