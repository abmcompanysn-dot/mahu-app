package cloudinaryutil

import "testing"

// Exemple de la documentation Cloudinary (« Generating authentication signatures »).
func TestSign(t *testing.T) {
	got := Sign(map[string]string{
		"eager":     "w_400,h_300,c_pad|w_260,h_200,c_crop",
		"public_id": "sample_image",
		"timestamp": "1315060510",
	}, "abcd")
	if got != "bfd09f95f331f558cbd1320e67aa8d488770583e" {
		t.Fatalf("signature inattendue: %s", got)
	}
}
