package main

import (
	"log"
	"os"

	"github.com/AthangWankhade/sync-relay/internal/ws"
	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize the WebSocket Hub
	hub := ws.NewHub()
	go hub.Run()

	// Initialize Gin Router
	r := gin.Default()

	// Health Check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "active",
			"role":   "Blind Relay Node",
		})
	})

	// WebSocket Endpoint
	r.GET("/ws", func(c *gin.Context) {
		ws.ServeWs(hub, c.Writer, c.Request)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Println("⚡ Sync Relay Node C starting on port " + port + "...")
	if err := r.Run("0.0.0.0:" + port); err != nil {
		log.Fatal("Server start error: ", err)
	}
}
