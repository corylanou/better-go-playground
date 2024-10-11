package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

const (
	serverAddr      = ":8080"
	playgroundURL   = "https://play.golang.org/compile"
	shareURL        = "https://play.golang.org/share"
	userAgentHeader = "learn.gopherguides.com/1.0"
	publicShareURL  = "https://go.dev/play/p"
)

func main() {
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Get("/", serveIndex)
	r.Post("/compile", handleCode)
	r.Post("/share", handleShare)
	fmt.Printf("Starting server at %s\n", serverAddr)
	if err := http.ListenAndServe(serverAddr, r); err != nil {
		fmt.Printf("Server failed to start: %v\n", err)
		os.Exit(1)
	}
}

func serveIndex(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "index.html")
}

func handleCode(w http.ResponseWriter, r *http.Request) {
	req, err := http.NewRequest(http.MethodPost, playgroundURL, r.Body)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", userAgentHeader)
	req.Header.Set("Content-Type", "text/plain")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to send code to the Go Playground", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	w.Header().Set("Content-Type", "text/plain")
	if _, err := io.Copy(w, resp.Body); err != nil {
		http.Error(w, "Failed to send response", http.StatusInternalServerError)
	}
}

func handleShare(w http.ResponseWriter, r *http.Request) {
	req, err := http.NewRequest(http.MethodPost, shareURL, r.Body)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", userAgentHeader)
	req.Header.Set("Content-Type", "text/plain")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, `{"error": "Failed to send code to the Go Playground"}`, http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// the response that comes back is just a string for the url
	// just read it out of the response body, but always use an io.LimitReader
	b, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		http.Error(w, `{"error": "Failed to read response"}`, http.StatusInternalServerError)
		return
	}
	// we need to add the fully qualified URL to the response
	sharedURL := string(b)
	if sharedURL != "" {
		sharedURL = publicShareURL + "/" + sharedURL
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"shareURL": sharedURL})
}
