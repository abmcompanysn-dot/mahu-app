package handlers

import (
	"log"
	"net/http"
	"time"

	"mahu-backend/internal/httpx"
	"mahu-backend/internal/kube"
)

// Services du serveur que l'admin peut eteindre pour economiser la memoire du
// VPS et rallumer d'un clic (page /admin/services). Liste fermee : le backend
// ne peut agir que sur ces deploiements (voir k8s/20-cloudpc.yaml et
// k8s/21-admin-services.yaml pour les droits Kubernetes correspondants).
type managedService struct {
	ID          string
	Label       string
	Description string
	Namespace   string
	Deployments []string
}

func (d *Deps) managedServices() []managedService {
	return []managedService{
		{
			ID:          "mahu-ai",
			Label:       "MAHU AI (LiteLLM)",
			Description: "Relais vers les modeles d'IA du chat MAHU AI. Eteint, le chat IA ne repond plus.",
			Namespace:   "mahu",
			Deployments: []string{"litellm"},
		},
		{
			ID:          "cloud-pc-ecran",
			Label:       "Ecran MAHU-PC (Guacamole)",
			Description: "Affiche les ordinateurs Cloud PC dans le navigateur. Se rallume tout seul quand un client ouvre son ordinateur.",
			Namespace:   d.Env.CloudPCNamespace,
			Deployments: []string{"guacamole", "guacd"},
		},
	}
}

type deploymentState struct {
	Spec struct {
		Replicas *int `json:"replicas"`
	} `json:"spec"`
	Status struct {
		ReadyReplicas int `json:"readyReplicas"`
	} `json:"status"`
}

func deploymentPath(ns, name string) string {
	return "/apis/apps/v1/namespaces/" + ns + "/deployments/" + name
}

// serviceState renvoie "on", "off", "starting" ou "error".
func serviceState(kc *kube.Client, s managedService) string {
	wanted, ready := 0, 0
	for _, name := range s.Deployments {
		var dep deploymentState
		if err := kc.Get(deploymentPath(s.Namespace, name), &dep); err != nil {
			log.Printf("[services] %s/%s: %v", s.Namespace, name, err)
			return "error"
		}
		if dep.Spec.Replicas != nil && *dep.Spec.Replicas > 0 {
			wanted++
			if dep.Status.ReadyReplicas > 0 {
				ready++
			}
		}
	}
	switch {
	case wanted == 0:
		return "off"
	case ready == len(s.Deployments):
		return "on"
	default:
		return "starting"
	}
}

func scaleService(kc *kube.Client, s managedService, replicas int) error {
	for _, name := range s.Deployments {
		if err := kc.Patch(deploymentPath(s.Namespace, name)+"/scale",
			map[string]any{"spec": map[string]any{"replicas": replicas}}); err != nil {
			return err
		}
	}
	return nil
}

// AdminListServices : GET /api/admin/services
func (d *Deps) AdminListServices(w http.ResponseWriter, r *http.Request) {
	kc, err := d.kubeClient()
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Kubernetes indisponible")
		return
	}
	out := []map[string]any{}
	for _, s := range d.managedServices() {
		out = append(out, map[string]any{
			"id": s.ID, "label": s.Label, "description": s.Description, "state": serviceState(kc, s),
		})
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"services": out})
}

// AdminSetService : POST /api/admin/services/{id}  {"on": true|false}
func (d *Deps) AdminSetService(w http.ResponseWriter, r *http.Request, id string) {
	var in struct {
		On bool `json:"on"`
	}
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, "Requete invalide")
		return
	}
	var svc *managedService
	for _, s := range d.managedServices() {
		if s.ID == id {
			s := s
			svc = &s
		}
	}
	if svc == nil {
		httpx.WriteError(w, http.StatusNotFound, "Service inconnu")
		return
	}
	kc, err := d.kubeClient()
	if err != nil {
		httpx.WriteError(w, http.StatusServiceUnavailable, "Kubernetes indisponible")
		return
	}
	replicas := 0
	if in.On {
		replicas = 1
	}
	if err := scaleService(kc, *svc, replicas); err != nil {
		log.Printf("[services] %s -> %d: %v", svc.ID, replicas, err)
		httpx.WriteError(w, http.StatusInternalServerError, "Impossible de changer l'etat du service")
		return
	}
	log.Printf("[services] %s %s par l'admin", svc.ID, map[bool]string{true: "allume", false: "eteint"}[in.On])
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"success": true, "state": serviceState(kc, *svc)})
}

// ensureCloudPCScreen rallume Guacamole s'il a ete eteint depuis l'admin, et
// attend qu'il soit pret (le client vient d'ouvrir son ordinateur).
func (d *Deps) ensureCloudPCScreen(kc *kube.Client) error {
	for _, s := range d.managedServices() {
		if s.ID != "cloud-pc-ecran" {
			continue
		}
		if serviceState(kc, s) == "on" {
			return nil
		}
		if err := scaleService(kc, s, 1); err != nil {
			return err
		}
		log.Printf("[services] ecran Cloud PC rallume automatiquement")
		deadline := time.Now().Add(cloudPCStartWait)
		for serviceState(kc, s) != "on" && time.Now().Before(deadline) {
			time.Sleep(2 * time.Second)
		}
	}
	return nil
}
