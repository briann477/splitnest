package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"splitnest-backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type ExpenseHandler struct {
	DB *sql.DB
}

func NewExpenseHandler(db *sql.DB) *ExpenseHandler {
	return &ExpenseHandler{DB: db}
}




func (h *ExpenseHandler) GetExpensesByGroupID(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	rows, err := h.DB.Query(`
		SELECT 
			e.id,
			e.group_id,
			e.paid_by_member_id,
			m.name AS paid_by_name,
			e.title,
			e.amount,
			e.expense_date,
			e.notes,
			e.created_at,
			e.updated_at
		FROM expenses e
		JOIN members m ON m.id = e.paid_by_member_id
		WHERE e.group_id = ?
		ORDER BY e.id DESC
	`, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get expenses")
		return
	}
	defer rows.Close()

	expenses := []models.ExpenseWithParticipants{}

	for rows.Next() {
		var expense models.ExpenseWithParticipants

		err := rows.Scan(
			&expense.ID,
			&expense.GroupID,
			&expense.PaidByMemberID,
			&expense.PaidByName,
			&expense.Title,
			&expense.Amount,
			&expense.ExpenseDate,
			&expense.Notes,
			&expense.CreatedAt,
			&expense.UpdatedAt,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to scan expense")
			return
		}

		participants, err := h.getExpenseParticipants(expense.ID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "Failed to get expense participants")
			return
		}

		expense.Participants = participants
		expenses = append(expenses, expense)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   expenses,
	})
}

func (h *ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
		return
	}

	var request models.CreateExpenseRequest

	err = json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	request.Title = strings.TrimSpace(request.Title)

	if request.Title == "" {
		writeError(w, http.StatusBadRequest, "Expense title is required")
		return
	}

	if request.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "Expense amount must be greater than zero")
		return
	}

	if request.PaidByMemberID <= 0 {
		writeError(w, http.StatusBadRequest, "Paid by member is required")
		return
	}

	if len(request.ParticipantIDs) == 0 {
		writeError(w, http.StatusBadRequest, "At least one participant is required")
		return
	}

	expenseDate, err := time.Parse("2006-01-02", request.ExpenseDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Expense date format must be YYYY-MM-DD")
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

	paidByBelongsToGroup, err := h.checkMemberBelongsToGroup(request.PaidByMemberID, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check payer member")
		return
	}

	if !paidByBelongsToGroup {
		writeError(w, http.StatusBadRequest, "Paid by member does not belong to this group")
		return
	}

	if !containsID(request.ParticipantIDs, request.PaidByMemberID) {
		writeError(w, http.StatusBadRequest, "Paid by member must be included in participants")
		return
	}

	participantsValid, err := h.checkMembersBelongToGroup(request.ParticipantIDs, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check participants")
		return
	}

	if !participantsValid {
		writeError(w, http.StatusBadRequest, "One or more participants do not belong to this group")
		return
	}

	shareAmount := request.Amount / float64(len(request.ParticipantIDs))

	tx, err := h.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}

	result, err := tx.Exec(`
		INSERT INTO expenses (group_id, paid_by_member_id, title, amount, expense_date, notes)
		VALUES (?, ?, ?, ?, ?, ?)
	`, groupID, request.PaidByMemberID, request.Title, request.Amount, expenseDate, request.Notes)
	if err != nil {
		tx.Rollback()
		writeError(w, http.StatusInternalServerError, "Failed to create expense")
		return
	}

	expenseID, err := result.LastInsertId()
	if err != nil {
		tx.Rollback()
		writeError(w, http.StatusInternalServerError, "Failed to get created expense ID")
		return
	}

	for _, memberID := range request.ParticipantIDs {
		_, err := tx.Exec(`
			INSERT INTO expense_participants (expense_id, member_id, share_amount)
			VALUES (?, ?, ?)
		`, expenseID, memberID, shareAmount)
		if err != nil {
			tx.Rollback()
			writeError(w, http.StatusInternalServerError, "Failed to create expense participant")
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}

	expense, err := h.getExpenseByID(expenseID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get created expense")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]any{
		"status":       "success",
		"message":      "Expense created successfully",
		"share_amount": shareAmount,
		"data":         expense,
	})
}

func (h *ExpenseHandler) getExpenseByID(expenseID int64) (models.ExpenseWithParticipants, error) {
	var expense models.ExpenseWithParticipants

	err := h.DB.QueryRow(`
		SELECT 
			e.id,
			e.group_id,
			e.paid_by_member_id,
			m.name AS paid_by_name,
			e.title,
			e.amount,
			e.expense_date,
			e.notes,
			e.created_at,
			e.updated_at
		FROM expenses e
		JOIN members m ON m.id = e.paid_by_member_id
		WHERE e.id = ?
	`, expenseID).Scan(
		&expense.ID,
		&expense.GroupID,
		&expense.PaidByMemberID,
		&expense.PaidByName,
		&expense.Title,
		&expense.Amount,
		&expense.ExpenseDate,
		&expense.Notes,
		&expense.CreatedAt,
		&expense.UpdatedAt,
	)
	if err != nil {
		return expense, err
	}

	participants, err := h.getExpenseParticipants(expense.ID)
	if err != nil {
		return expense, err
	}

	expense.Participants = participants

	return expense, nil
}

func (h *ExpenseHandler) getExpenseParticipants(expenseID int64) ([]models.ExpenseParticipant, error) {
	rows, err := h.DB.Query(`
		SELECT 
			ep.id,
			ep.expense_id,
			ep.member_id,
			m.name AS member_name,
			ep.share_amount
		FROM expense_participants ep
		JOIN members m ON m.id = ep.member_id
		WHERE ep.expense_id = ?
		ORDER BY ep.id ASC
	`, expenseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	participants := []models.ExpenseParticipant{}

	for rows.Next() {
		var participant models.ExpenseParticipant

		err := rows.Scan(
			&participant.ID,
			&participant.ExpenseID,
			&participant.MemberID,
			&participant.MemberName,
			&participant.ShareAmount,
		)
		if err != nil {
			return nil, err
		}

		participants = append(participants, participant)
	}

	return participants, nil
}

func (h *ExpenseHandler) checkGroupExists(groupID int64) (bool, error) {
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

func (h *ExpenseHandler) checkMemberBelongsToGroup(memberID int64, groupID int64) (bool, error) {
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

func (h *ExpenseHandler) checkMembersBelongToGroup(memberIDs []int64, groupID int64) (bool, error) {
	placeholders := make([]string, len(memberIDs))
	args := []any{groupID}

	for i, id := range memberIDs {
		placeholders[i] = "?"
		args = append(args, id)
	}

	query := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM members
		WHERE group_id = ?
		AND id IN (%s)
	`, strings.Join(placeholders, ","))

	var count int

	err := h.DB.QueryRow(query, args...).Scan(&count)
	if err != nil {
		return false, err
	}

	return count == len(memberIDs), nil
}

func containsID(ids []int64, target int64) bool {
	for _, id := range ids {
		if id == target {
			return true
		}
	}

	return false
}

func (h *ExpenseHandler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid expense ID")
		return
	}

	var request models.CreateExpenseRequest

	err = json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	request.Title = strings.TrimSpace(request.Title)

	if request.Title == "" {
		writeError(w, http.StatusBadRequest, "Expense title is required")
		return
	}

	if request.Amount <= 0 {
		writeError(w, http.StatusBadRequest, "Expense amount must be greater than zero")
		return
	}

	if request.PaidByMemberID <= 0 {
		writeError(w, http.StatusBadRequest, "Paid by member is required")
		return
	}

	if len(request.ParticipantIDs) == 0 {
		writeError(w, http.StatusBadRequest, "At least one participant is required")
		return
	}

	expenseDate, err := time.Parse("2006-01-02", request.ExpenseDate)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Expense date format must be YYYY-MM-DD")
		return
	}

	var groupID int64

	err = h.DB.QueryRow(`
		SELECT group_id
		FROM expenses
		WHERE id = ?
	`, id).Scan(&groupID)
	if err == sql.ErrNoRows {
		writeError(w, http.StatusNotFound, "Expense not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get expense")
		return
	}

	paidByBelongsToGroup, err := h.checkMemberBelongsToGroup(request.PaidByMemberID, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check payer member")
		return
	}

	if !paidByBelongsToGroup {
		writeError(w, http.StatusBadRequest, "Paid by member does not belong to this group")
		return
	}

	if !containsID(request.ParticipantIDs, request.PaidByMemberID) {
		writeError(w, http.StatusBadRequest, "Paid by member must be included in participants")
		return
	}

	participantsValid, err := h.checkMembersBelongToGroup(request.ParticipantIDs, groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check participants")
		return
	}

	if !participantsValid {
		writeError(w, http.StatusBadRequest, "One or more participants do not belong to this group")
		return
	}

	shareAmount := request.Amount / float64(len(request.ParticipantIDs))

	tx, err := h.DB.Begin()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to start transaction")
		return
	}

	_, err = tx.Exec(`
		UPDATE expenses
		SET paid_by_member_id = ?, title = ?, amount = ?, expense_date = ?, notes = ?
		WHERE id = ?
	`, request.PaidByMemberID, request.Title, request.Amount, expenseDate, request.Notes, id)
	if err != nil {
		tx.Rollback()
		writeError(w, http.StatusInternalServerError, "Failed to update expense")
		return
	}

	_, err = tx.Exec(`
		DELETE FROM expense_participants
		WHERE expense_id = ?
	`, id)
	if err != nil {
		tx.Rollback()
		writeError(w, http.StatusInternalServerError, "Failed to reset expense participants")
		return
	}

	for _, memberID := range request.ParticipantIDs {
		_, err := tx.Exec(`
			INSERT INTO expense_participants (expense_id, member_id, share_amount)
			VALUES (?, ?, ?)
		`, id, memberID, shareAmount)
		if err != nil {
			tx.Rollback()
			writeError(w, http.StatusInternalServerError, "Failed to update expense participants")
			return
		}
	}

	err = tx.Commit()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to commit transaction")
		return
	}

	expense, err := h.getExpenseByID(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to get updated expense")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":       "success",
		"message":      "Expense updated successfully",
		"share_amount": shareAmount,
		"data":         expense,
	})
}

func (h *ExpenseHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid expense ID")
		return
	}

	result, err := h.DB.Exec(`
		DELETE FROM expenses
		WHERE id = ?
	`, id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to delete expense")
		return
	}

	affectedRows, err := result.RowsAffected()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to check deleted expense")
		return
	}

	if affectedRows == 0 {
		writeError(w, http.StatusNotFound, "Expense not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "success",
		"message": "Expense deleted successfully",
	})
}