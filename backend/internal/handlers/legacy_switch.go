package handlers

import (
	"context"
	"errors"

	"mahu-backend/internal/models"
)

// runLegacyAction is doPost(e)'s switch statement. The first block are
// public actions (no token required); the default branch requires an
// authenticated user, mirroring the previous `if (!user) throw ...` guard
// ahead of the nested authenticated-actions switch.
func (d *Deps) runLegacyAction(ctx context.Context, action string, payload map[string]any, user *models.User) (any, error) {
	switch action {
	case "registerUser":
		return d.legacyRegisterUser(ctx, str(payload, "email"), str(payload, "password"), str(payload, "enterpriseId"))
	case "loginUser":
		return d.legacyLoginUser(ctx, str(payload, "email"), str(payload, "password"))
	case "forgotPassword":
		return d.legacyForgotPassword(ctx, str(payload, "email"))
	case "resetPassword":
		return d.legacyResetPassword(ctx, str(payload, "token"), str(payload, "newPassword"))
	case "trackView":
		return d.legacyTrackView(ctx, str(payload, "profileUrl"), str(payload, "source"))
	case "handleLeadCapture":
		return d.legacyHandleLeadCapture(ctx, payload)
	case "submitWidgetMessage":
		return d.legacySubmitWidgetMessage(ctx, payload)
	case "getProfileData":
		userParam := str(payload, "user")
		return d.legacyGetProfileData(ctx, userParam)
	case "checkCardStatus":
		return d.legacyCheckCardStatus(ctx, payload)
	case "quickRegisterAndActivate":
		return d.legacyQuickRegisterAndActivate(ctx, payload)
	case "saveCustomCardOrder":
		return d.legacySaveCustomCardOrder(ctx, payload)
	case "saveStoreOrder":
		return d.legacySaveStoreOrder(ctx, payload)
	case "contactSupport":
		return d.legacyContactSupport(ctx, payload, user)
	}

	// Every action below requires an authenticated user.
	if user == nil {
		return nil, errors.New("Token d'authentification invalide ou manquant.")
	}

	switch action {
	case "getDashboardData":
		return d.legacyGetDashboardData(ctx, user)
	case "saveProfile":
		return d.legacySaveProfile(ctx, payload, user)
	case "saveProfileImage":
		imageType := str(payload, "imageType")
		return d.legacySaveProfileImage(ctx, imageType, str(payload, "imageUrl"), user)
	case "saveDocument":
		return d.legacySaveDocument(ctx, payload, user)
	case "deleteDocument":
		return d.legacyDeleteDocument(ctx, str(payload, "docId"), user)
	case "updateOnboardingData":
		return d.legacyUpdateOnboardingData(ctx, payload, user)
	case "setModuleState":
		d.legacySetModuleState(ctx, str(payload, "moduleName"), boolField(payload, "isEnabled"), user)
		return map[string]any{"success": true}, nil
	case "getPublicProfileUrl":
		return d.legacyGetPublicProfileUrl(user), nil
	case "logout":
		return map[string]any{"success": true}, nil
	case "syncCart":
		return map[string]any{"success": true}, nil
	case "linkNfcCard":
		return d.legacyLinkNfcCard(ctx, str(payload, "nfcId"), user)
	case "createEmployee":
		return d.legacyCreateEmployee(ctx, payload, user)
	case "saveEnterpriseInfo":
		return d.legacySaveEnterpriseInfo(ctx, payload, user)
	case "adminRegisterClient":
		return d.legacyAdminRegisterClient(ctx, payload, user)
	case "deleteEmployee":
		return d.legacyDeleteEmployee(ctx, payload, user)
	case "activatePhysicalCard":
		return d.legacyActivatePhysicalCard(ctx, payload, user)
	case "adminGetCardsData":
		return d.legacyAdminGetCardsData(ctx, user)
	case "adminGenerateCardCodes":
		return d.legacyAdminGenerateCardCodes(ctx, payload, user)
	case "adminUpdateCardSale":
		return d.legacyAdminUpdateCardSale(ctx, payload, user)
	case "adminAssignCardLot":
		return d.legacyAdminAssignCardLot(ctx, payload, user)
	case "adminCreateReseller":
		return d.legacyAdminCreateReseller(ctx, payload, user)
	case "adminDeactivateCard":
		return d.legacyAdminDeactivateCard(ctx, payload, user)
	case "adminBroadcastMessage":
		return d.legacyAdminBroadcastMessage(ctx, payload, user)
	}

	return map[string]any{"error": "Action POST non reconnue."}, nil
}
