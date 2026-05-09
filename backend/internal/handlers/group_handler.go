package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"splitnest-backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type GroupHandler struct {
	DB *sql.DB
}

func NewGroupHandler(db *sql.DB) *GroupHandler {
	return &GroupHandler{DB: db}
}

func (h *GroupHandler) GetGroups(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(`
		SELECT id, name, description, created_at, updated_at
		FROM expense_groups
		ORDER BY id DESC
	`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get groups")
		return
	}
	defer rows.Close()

	groups := []models.Group{}

	for rows.Next() {
		var group models.Group

		err := rows.Scan(
			&group.ID,
			&group.Name,
			&group.Description,
			&group.CreatedAt,
			&group.UpdatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan group")
			return
		}

		groups = append(groups, group)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   groups,
	})
}

func (h *GroupHandler) CreateGroup(w http.ResponseWriter, r *http.Request) {
	var request models.CreateGroupRequest

	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	request.Name = strings.TrimSpace(request.Name)

	if request.Name == "" {
		writeError(w, http.StatusBadRequest, "Group name is required")
		return
	}

	result, err := h.DB.Exec(`
		INSERT INTO expense_groups (name, description)
		VALUES (?, ?)
	`, request.Name, request.Description)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create group")
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get created group ID")
		return
	}

	var group models.Group

	err = h.DB.QueryRow(`
		SELECT id, name, description, created_at, updated_at
		FROM expense_groups
		WHERE id = ?
	`, id).Scan(
		&group.ID,
		&group.Name,
		&group.Description,
		&group.CreatedAt,
		&group.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get created group")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"status":  "success",
		"message": "Group created successfully",
		"data":    group,
	})
}

func (h *GroupHandler) GetGroupByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	var group models.Group

	err = h.DB.QueryRow(`
		SELECT id, name, description, created_at, updated_at
		FROM expense_groups
		WHERE id = ?
	`, id).Scan(
		&group.ID,
		&group.Name,
		&group.Description,
		&group.CreatedAt,
		&group.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "Group not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get group")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   group,
	})
}

func (h *GroupHandler) UpdateGroup(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	var request models.UpdateGroupRequest

	err = json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	request.Name = strings.TrimSpace(request.Name)

	if request.Name == "" {
		writeError(w, http.StatusBadRequest, "Group name is required")
		return
	}

	result, err := h.DB.Exec(`
		UPDATE expense_groups
		SET name = ?, description = ?
		WHERE id = ?
	`, request.Name, request.Description, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update group")
		return
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check updated group")
		return
	}

	if affectedRows == 0 {
		writeError(w, http.StatusNotFound, "Group not found")
		return
	}

	var group models.Group

	err = h.DB.QueryRow(`
		SELECT id, name, description, created_at, updated_at
		FROM expense_groups
		WHERE id = ?
	`, id).Scan(
		&group.ID,
		&group.Name,
		&group.Description,
		&group.CreatedAt,
		&group.UpdatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get updated group")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"message": "Group updated successfully",
		"data":    group,
	})
}

func (h *GroupHandler) DeleteGroup(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	result, err := h.DB.Exec(`
		DELETE FROM expense_groups
		WHERE id = ?
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete group")
		return
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check deleted group")
		return
	}

	if affectedRows == 0 {
		writeError(w, http.StatusNotFound, "Group not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"message": "Group deleted successfully",
	})
}

func writeJSON(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]any{
		"status":  "error",
		"message": message,
	})
}
