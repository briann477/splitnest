package main

import (
	"fmt"
	"log"
	"net/http"

	"splitnest-backend/internal/config"
	"splitnest-backend/internal/database"
	"splitnest-backend/internal/routes"
)

func main() {
	cfg := config.LoadConfig()

	db := database.ConnectMySQL(cfg)
	defer db.Close()

	router := routes.SetupRoutes(db)

	serverAddress := fmt.Sprintf(":%s", cfg.AppPort)

	log.Printf("SplitNest API running on http://localhost%s", serverAddress)

	err := http.ListenAndServe(serverAddress, router)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}