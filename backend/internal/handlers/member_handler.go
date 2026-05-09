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

type MemberHandler struct {
	DB *sql.DB
}

func NewMemberHandler(db *sql.DB) *MemberHandler {
	return &MemberHandler{DB: db}
}

func (h *MemberHandler) GetMembersByGroupID(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	rows, err := h.DB.Query(`
		SELECT id, group_id, name, email, created_at
		FROM members
		WHERE group_id = ?
		ORDER BY id DESC
	`, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get members")
		return
	}
	defer rows.Close()

	members := []models.Member{}

	for rows.Next() {
		var member models.Member

		err := rows.Scan(
			&member.ID,
			&member.GroupID,
			&member.Name,
			&member.Email,
			&member.CreatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan member")
			return
		}

		members = append(members, member)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   members,
	})
}

func (h *MemberHandler) CreateMember(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	var request models.CreateMemberRequest

	err = json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	request.Name = strings.TrimSpace(request.Name)

	if request.Name == "" {
		writeError(w, http.StatusBadRequest, "Member name is required")
		return
	}

	groupExists, err := h.checkGroupExists(groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check group")
		return
	}

	if !groupExists {
		writeError(w, http.StatusNotFound, "Group not found")
		return
	}

	result, err := h.DB.Exec(`
		INSERT INTO members (group_id, name, email)
		VALUES (?, ?, ?)
	`, groupID, request.Name, request.Email)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create member")
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get created member ID")
		return
	}

	var member models.Member

	err = h.DB.QueryRow(`
		SELECT id, group_id, name, email, created_at
		FROM members
		WHERE id = ?
	`, id).Scan(
		&member.ID,
		&member.GroupID,
		&member.Name,
		&member.Email,
		&member.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get created member")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"status":  "success",
		"message": "Member created successfully",
		"data":    member,
	})
}

func (h *MemberHandler) GetMemberByID(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid member ID")
		return
	}

	var member models.Member

	err = h.DB.QueryRow(`
		SELECT id, group_id, name, email, created_at
		FROM members
		WHERE id = ?
	`, id).Scan(
		&member.ID,
		&member.GroupID,
		&member.Name,
		&member.Email,
		&member.CreatedAt,
	)

	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "Member not found")
		return
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get member")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   member,
	})
}

func (h *MemberHandler) UpdateMember(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid member ID")
		return
	}

	var request models.UpdateMemberRequest

	err = json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	request.Name = strings.TrimSpace(request.Name)

	if request.Name == "" {
		writeError(w, http.StatusBadRequest, "Member name is required")
		return
	}

	result, err := h.DB.Exec(`
		UPDATE members
		SET name = ?, email = ?
		WHERE id = ?
	`, request.Name, request.Email, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to update member")
		return
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check updated member")
		return
	}

	if affectedRows == 0 {
		writeError(w, http.StatusNotFound, "Member not found")
		return
	}

	var member models.Member

	err = h.DB.QueryRow(`
		SELECT id, group_id, name, email, created_at
		FROM members
		WHERE id = ?
	`, id).Scan(
		&member.ID,
		&member.GroupID,
		&member.Name,
		&member.Email,
		&member.CreatedAt,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get updated member")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"message": "Member updated successfully",
		"data":    member,
	})
}

func (h *MemberHandler) DeleteMember(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid member ID")
		return
	}

	result, err := h.DB.Exec(`
		DELETE FROM members
		WHERE id = ?
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete member")
		return
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check deleted member")
		return
	}

	if affectedRows == 0 {
		writeError(w, http.StatusNotFound, "Member not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"message": "Member deleted successfully",
	})
}

func (h *MemberHandler) checkGroupExists(groupID int64) (bool, error) {
	var exists bool

	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM expense_groups
			WHERE id = ?
		)
	`, groupID).Scan(&exists)

	return exists, err
}