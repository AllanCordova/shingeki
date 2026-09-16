package targeturl

func RESTBasketURL(targetURL, basketID string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	if basketID == "" {
		basketID = "1"
	}
	return origin + "/rest/basket/" + basketID
}

func APIUsersURL(targetURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	return origin + "/api/Users/"
}

func ProductReviewsURL(targetURL, productID string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	if productID == "" {
		productID = "1"
	}
	return origin + "/rest/products/" + productID + "/reviews"
}

func RedirectProbeURL(targetURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	return origin + "/redirect?to="
}

func FTPURL(targetURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	return origin + "/ftp/"
}

func FileUploadURL(targetURL string) string {
	origin := Origin(targetURL)
	if origin == "" {
		return ""
	}
	return origin + "/file-upload"
}
