#!/bin/sh
# Run from the repo root on the K8s host (miadtalen-vps). Builds the backend
# and web images locally and imports them straight into k3s's containerd -
# single-node cluster, no registry needed. Secrets are created from the
# existing backend/.env and .env files (never committed to git, never
# embedded in these manifests) - copy them onto this box first.
set -eu

cd "$(dirname "$0")/.."

echo "== building images =="
docker build -t mahu-backend:latest ./backend
docker build -t mahu-web:latest .

echo "== importing into k3s containerd =="
docker save mahu-backend:latest | k3s ctr images import -
docker save mahu-web:latest | k3s ctr images import -

echo "== namespace =="
kubectl apply -f k8s/00-namespace.yaml

echo "== secrets (recreated each run so env changes take effect) =="
kubectl create secret generic mahu-backend-env -n mahu \
  --from-env-file=backend/.env --dry-run=client -o yaml | kubectl apply -f -

# Root .env (docker-compose style) has both the web-only vars (BACKEND_URL,
# BACKEND_API_KEY, NEXT_PUBLIC_FIREBASE_*) and the datastore root creds
# (MONGO_ROOT_USER/PASSWORD, REDIS_PASSWORD) - same file feeds both secrets,
# each pod just ignores the keys it doesn't need.
kubectl create secret generic mahu-web-env -n mahu \
  --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic mahu-datastore-creds -n mahu \
  --from-env-file=.env --dry-run=client -o yaml | kubectl apply -f -

echo "== litellm config =="
kubectl create configmap litellm-config -n mahu \
  --from-file=config.yaml=litellm/config.yaml --dry-run=client -o yaml | kubectl apply -f -

echo "== deployments/services/ingress =="
kubectl apply -f k8s/10-mongo.yaml
kubectl apply -f k8s/11-redis.yaml
kubectl apply -f k8s/12-litellm.yaml
kubectl apply -f k8s/13-backend.yaml
kubectl apply -f k8s/14-web.yaml
kubectl apply -f k8s/15-ingress.yaml

echo "== waiting for rollout =="
kubectl rollout status deployment/backend -n mahu --timeout=120s
kubectl rollout status deployment/web -n mahu --timeout=120s

echo "done - kubectl get pods -n mahu"
