package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"splitnest-backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type SettlementHandler struct {
	DB *sql.DB
}

func NewSettlementHandler(db *sql.DB) *SettlementHandler {
	return &SettlementHandler{DB: db}
}

func (h *SettlementHandler) GetSettlementsByGroupID(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	rows, err := h.DB.Query(`
		SELECT 
			s.id,
			s.group_id,
			s.from_member_id,
			from_member.name AS from_member_name,
			s.to_member_id,
			to_member.name AS to_member_name,
			s.amount,
			s.status,
			s.settled_at,
			s.created_at
		FROM settlements s
		JOIN members from_member ON from_member.id = s.from_member_id
		JOIN members to_member ON to_member.id = s.to_member_id
		WHERE s.group_id = ?
		ORDER BY s.id DESC
	`, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get settlements")
		return
	}
	defer rows.Close()

	settlements := []models.Settlement{}

	for rows.Next() {
		var settlement models.Settlement

		err := rows.Scan(
			&settlement.ID,
			&settlement.GroupID,
			&settlement.FromMemberID,
			&settlement.FromMemberName,
			&settlement.ToMemberID,
			&settlement.ToMemberName,
			&settlement.Amount,
			&settlement.Status,
			&settlement.SettledAt,
			&settlement.CreatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan settlement")
			return
		}

		settlements = append(settlements, settlement)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   settlements,
	})
}

func (h *SettlementHandler) CreateSettlement(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	var request models.CreateSettlementRequest

	err = json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if request.FromMemberID <= 0 {
		writeError(w, http.StatusBadRequest, "From member is required")
		return
	}

	if request.ToMemberID <= 0 {
		writeError(w, http.StatusBadRequest, "To member is required")
		return
	}

	if request.FromMemberID == request.ToMemberID {
		writeError(w, http.StatusBadRequest, "From member and to member cannot be the same")
		return
	}

	if request.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "Settlement amount must be greater than zero")
		return
	}

	fromMemberValid, err := h.checkMemberBelongsToGroup(request.FromMemberID, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check from member")
		return
	}

	if !fromMemberValid {
		writeError(w, http.StatusBadRequest, "From member does not belong to this group")
		return
	}

	toMemberValid, err := h.checkMemberBelongsToGroup(request.ToMemberID, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check to member")
		return
	}

	if !toMemberValid {
		writeError(w, http.StatusBadRequest, "To member does not belong to this group")
		return
	}

	result, err := h.DB.Exec(`
		INSERT INTO settlements (
			group_id,
			from_member_id,
			to_member_id,
			amount,
			status,
			settled_at
		)
		VALUES (?, ?, ?, ?, 'settled', NOW())
	`, groupID, request.FromMemberID, request.ToMemberID, request.Amount)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to create settlement")
		return
	}

	id, err := result.LastInsertId()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get settlement ID")
		return
	}

	settlement, err := h.getSettlementByID(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get created settlement")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"status":  "success",
		"message": "Settlement marked as settled",
		"data":    settlement,
	})
}

func (h *SettlementHandler) getSettlementByID(id int64) (models.Settlement, error) {
	var settlement models.Settlement

	err := h.DB.QueryRow(`
		SELECT 
			s.id,
			s.group_id,
			s.from_member_id,
			from_member.name AS from_member_name,
			s.to_member_id,
			to_member.name AS to_member_name,
			s.amount,
			s.status,
			s.settled_at,
			s.created_at
		FROM settlements s
		JOIN members from_member ON from_member.id = s.from_member_id
		JOIN members to_member ON to_member.id = s.to_member_id
		WHERE s.id = ?
	`, id).Scan(
		&settlement.ID,
		&settlement.GroupID,
		&settlement.FromMemberID,
		&settlement.FromMemberName,
		&settlement.ToMemberID,
		&settlement.ToMemberName,
		&settlement.Amount,
		&settlement.Status,
		&settlement.SettledAt,
		&settlement.CreatedAt,
	)

	return settlement, err
}

func (h *SettlementHandler) checkMemberBelongsToGroup(memberID int64, groupID int64) (bool, error) {
	var exists bool

	err := h.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1
			FROM members
			WHERE id = ? AND group_id = ?
		)
	`, memberID, groupID).Scan(&exists)

	return exists, err
}
