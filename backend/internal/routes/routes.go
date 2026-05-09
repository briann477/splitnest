package routes

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"splitnest-backend/internal/handlers"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

type Response struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

func SetupRoutes(db *sql.DB) http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
	}))

	groupHandler := handlers.NewGroupHandler(db)
	memberHandler := handlers.NewMemberHandler(db)
	expenseHandler := handlers.NewExpenseHandler(db)
	balanceHandler := handlers.NewBalanceHandler(db)
	settlementHandler := handlers.NewSettlementHandler(db)

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, Response{
			Status:  "success",
			Message: "Welcome to SplitNest API",
		})
	})

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		err := db.Ping()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, Response{
				Status:  "error",
				Message: "Database connection failed",
			})
			return
		}

		writeJSON(w, http.StatusOK, Response{
			Status:  "success",
			Message: "SplitNest API is running",
		})
	})

	r.Route("/api/groups", func(r chi.Router) {
		r.Get("/", groupHandler.GetGroups)
		r.Post("/", groupHandler.CreateGroup)
		r.Get("/{id}", groupHandler.GetGroupByID)
		r.Put("/{id}", groupHandler.UpdateGroup)
		r.Delete("/{id}", groupHandler.DeleteGroup)
	})

	r.Route("/api/groups/{groupID}/members", func(r chi.Router) {
		r.Get("/", memberHandler.GetMembersByGroupID)
		r.Post("/", memberHandler.CreateMember)
	})

	r.Route("/api/members", func(r chi.Router) {
		r.Get("/{id}", memberHandler.GetMemberByID)
		r.Put("/{id}", memberHandler.UpdateMember)
		r.Delete("/{id}", memberHandler.DeleteMember)
	})

	r.Route("/api/groups/{groupID}/expenses", func(r chi.Router) {
		r.Get("/", expenseHandler.GetExpensesByGroupID)
		r.Post("/", expenseHandler.CreateExpense)
	})


	r.Put("/api/expenses/{id}", expenseHandler.UpdateExpense)
	r.Delete("/api/expenses/{id}", expenseHandler.DeleteExpense)
	r.Delete("/api/expenses/{id}", expenseHandler.DeleteExpense)

	r.Get("/api/groups/{groupID}/balances", balanceHandler.GetBalancesByGroupID)

	r.Route("/api/groups/{groupID}/settlements", func(r chi.Router) {
		r.Get("/", settlementHandler.GetSettlementsByGroupID)
		r.Post("/", settlementHandler.CreateSettlement)
	})

	return r
}

func writeJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}