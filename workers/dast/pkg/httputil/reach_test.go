package httputil_test

import (
	"context"
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/shingeki/dast-worker/pkg/httputil"
)

func TestCheckReachableAcceptsHTTPStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
	}))
	defer server.Close()

	if err := httputil.CheckReachable(context.Background(), server.URL); err != nil {
		t.Fatalf("expected reachable target, got %v", err)
	}
}

func TestCheckReachableConnectionRefused(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := ln.Addr().String()
	_ = ln.Close()

	err = httputil.CheckReachable(context.Background(), "http://"+addr+"/")
	if err == nil {
		t.Fatal("expected unreachable target")
	}
	if !strings.Contains(err.Error(), "target unreachable") {
		t.Fatalf("error=%v", err)
	}
}
