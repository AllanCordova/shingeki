package discovery

import (
	"net/http"
	"strings"

	"github.com/shingeki/dast-worker/internal/contracts"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

func AppendSPACoverageVectors(targetURL string, vectors []contracts.AttackVector) []contracts.AttackVector {
	if len(vectors) == 0 {
		return vectors
	}
	hint := false
	for _, vector := range vectors {
		if targeturl.LooksLikeRestAPI(vector.Route) || targeturl.LooksLikeHashRouter(vector.Route) {
			hint = true
			break
		}
	}
	if !hint {
		return vectors
	}
	origin := targeturl.Origin(targetURL)
	if origin == "" {
		return vectors
	}

	hasRedirect, hasFTP, hasUpload := false, false, false
	for _, vector := range vectors {
		lower := strings.ToLower(vector.Route)
		if strings.Contains(lower, "/redirect") && vector.TargetLocation == "QUERY_PARAMETER" {
			hasRedirect = true
		}
		if strings.Contains(lower, "/ftp") && vector.TargetLocation == "URL_PATH" {
			hasFTP = true
		}
		if strings.Contains(lower, "/file-upload") && vector.TargetLocation == "FILE_UPLOAD" {
			hasUpload = true
		}
	}

	if !hasRedirect {
		redirect := contracts.NewAttackVector(targeturl.RedirectProbeURL(origin), http.MethodGet, "QUERY_PARAMETER")
		redirect.Params["to"] = ""
		vectors = append(vectors, redirect)
	}
	if !hasFTP {
		vectors = append(vectors, contracts.NewAttackVector(targeturl.FTPURL(origin), http.MethodGet, "URL_PATH"))
	}
	if !hasUpload {
		upload := contracts.NewAttackVector(targeturl.FileUploadURL(origin), http.MethodPost, "FILE_UPLOAD")
		upload.Params["file"] = ""
		vectors = append(vectors, upload)
	}
	return vectors
}
