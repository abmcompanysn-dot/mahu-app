# Mahu on Kubernetes (miadtalen-vps)

Staged migration target - not live yet. See the plan file from the session that
wrote this (`velvety-knitting-island.md`) for full context. Short version:

- Cluster: k3s, single node, already running an unrelated app (`diarra`
  namespace) plus Mailcow and another stack directly in Docker - this only
  touches the new `mahu` namespace.
- Images are built locally on the node and imported straight into k3s's
  containerd (`docker save | k3s ctr images import -`) - no registry needed
  for a single-node cluster.
- Ingress-nginx is already installed, exposed as NodePort `30080`/`30443`
  (ports 80/443 on the host are taken by an existing Caddy instance for
  something else). A new Cloudflare Tunnel on this box points the three
  hostnames at `http://localhost:30080`.

## First-time setup on the node

```sh
git clone https://github.com/abmcompanysn-dot/mahu-app.git
cd mahu-app
# copy backend/.env and .env from the mahu VPS (or recreate them) - never committed
sh k8s/deploy.sh
```

## Redeploying after a code change

```sh
git pull
sh k8s/deploy.sh
```

## Cutover (only once mongo data has been migrated from the mahu VPS)

1. `mongodump` on the mahu VPS, copy the archive here, `mongorestore` into the
   `mongo` pod in the `mahu` namespace.
2. Point the Cloudflare Tunnel's public hostnames (ai.mahu.cards,
   ai-api.mahu.cards, mahu.mahu.cards) here instead of the mahu VPS's tunnel.
3. Decommission the mahu VPS once traffic is confirmed healthy here.
