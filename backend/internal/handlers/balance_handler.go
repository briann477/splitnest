package handlers

import (
	"database/sql"
	"math"
	"net/http"
	"sort"
	"strconv"

	"splitnest-backend/internal/models"

	"github.com/go-chi/chi/v5"
)

type BalanceHandler struct {
	DB *sql.DB
}

func NewBalanceHandler(db *sql.DB) *BalanceHandler {
	return &BalanceHandler{DB: db}
}

func (h *BalanceHandler) GetBalancesByGroupID(w http.ResponseWriter, r *http.Request) {
	groupID, err := strconv.ParseInt(chi.URLParam(r, "groupID"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "Invalid group ID")
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

	balances, err := h.calculateMemberBalances(groupID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to calculate balances")
		return
	}

	settlements := calculateSettlementSuggestions(balances)

	response := models.BalanceResponse{
		Balances:    balances,
		Settlements: settlements,
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"status": "success",
		"data":   response,
	})
}

func (h *BalanceHandler) calculateMemberBalances(groupID int64) ([]models.MemberBalance, error) {
	rows, err := h.DB.Query(`
		SELECT
			m.id,
			m.name,
			COALESCE(paid.total_paid, 0) AS paid,
			COALESCE(share.total_share, 0) AS share,
			COALESCE(settlement_paid.total_settlement_paid, 0) AS settlement_paid,
			COALESCE(settlement_received.total_settlement_received, 0) AS settlement_received
		FROM members m
		LEFT JOIN (
			SELECT
				paid_by_member_id,
				SUM(amount) AS total_paid
			FROM expenses
			WHERE group_id = ?
			GROUP BY paid_by_member_id
		) paid ON paid.paid_by_member_id = m.id
		LEFT JOIN (
			SELECT
				ep.member_id,
				SUM(ep.share_amount) AS total_share
			FROM expense_participants ep
			JOIN expenses e ON e.id = ep.expense_id
			WHERE e.group_id = ?
			GROUP BY ep.member_id
		) share ON share.member_id = m.id
		LEFT JOIN (
			SELECT
				from_member_id,
				SUM(amount) AS total_settlement_paid
			FROM settlements
			WHERE group_id = ?
			AND status = 'settled'
			GROUP BY from_member_id
		) settlement_paid ON settlement_paid.from_member_id = m.id
		LEFT JOIN (
			SELECT
				to_member_id,
				SUM(amount) AS total_settlement_received
			FROM settlements
			WHERE group_id = ?
			AND status = 'settled'
			GROUP BY to_member_id
		) settlement_received ON settlement_received.to_member_id = m.id
		WHERE m.group_id = ?
		ORDER BY m.id ASC
	`, groupID, groupID, groupID, groupID, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	balances := []models.MemberBalance{}

	for rows.Next() {
		var balance models.MemberBalance
		var settlementPaid float64
		var settlementReceived float64

		err := rows.Scan(
			&balance.MemberID,
			&balance.MemberName,
			&balance.Paid,
			&balance.Share,
			&settlementPaid,
			&settlementReceived,
		)
		if err != nil {
			return nil, err
		}

		balance.Balance = roundMoney(balance.Paid - balance.Share + settlementPaid - settlementReceived)

		balances = append(balances, balance)
	}

	return balances, nil
}

func calculateSettlementSuggestions(balances []models.MemberBalance) []models.SettlementSuggestion {
	debtors := []models.MemberBalance{}
	creditors := []models.MemberBalance{}

	for _, balance := range balances {
		if balance.Balance < 0 {
			debtors = append(debtors, balance)
		}

		if balance.Balance > 0 {
			creditors = append(creditors, balance)
		}
	}

	sort.Slice(debtors, func(i, j int) bool {
		return debtors[i].Balance < debtors[j].Balance
	})

	sort.Slice(creditors, func(i, j int) bool {
		return creditors[i].Balance > creditors[j].Balance
	})

	settlements := []models.SettlementSuggestion{}

	debtorIndex := 0
	creditorIndex := 0

	for debtorIndex < len(debtors) && creditorIndex < len(creditors) {
		debtor := &debtors[debtorIndex]
		creditor := &creditors[creditorIndex]

		debtAmount := math.Abs(debtor.Balance)
		creditAmount := creditor.Balance

		amount := math.Min(debtAmount, creditAmount)
		amount = roundMoney(amount)

		if amount > 0 {
			settlements = append(settlements, models.SettlementSuggestion{
				FromMemberID:   debtor.MemberID,
				FromMemberName: debtor.MemberName,
				ToMemberID:     creditor.MemberID,
				ToMemberName:   creditor.MemberName,
				Amount:         amount,
			})
		}

		debtor.Balance = roundMoney(debtor.Balance + amount)
		creditor.Balance = roundMoney(creditor.Balance - amount)

		if math.Abs(debtor.Balance) < 0.01 {
			debtorIndex++
		}

		if math.Abs(creditor.Balance) < 0.01 {
			creditorIndex++
		}
	}

	return settlements
}

func roundMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

func (h *BalanceHandler) checkGroupExists(groupID int64) (bool, error) {
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
