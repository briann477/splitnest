package models

import "time"

type Expense struct {
	ID             int64     `json:"id"`
	GroupID        int64     `json:"group_id"`
	PaidByMemberID int64     `json:"paid_by_member_id"`
	Title          string    `json:"title"`
	Amount         float64   `json:"amount"`
	ExpenseDate    time.Time `json:"expense_date"`
	Notes          *string   `json:"notes"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type ExpenseParticipant struct {
	ID          int64   `json:"id"`
	ExpenseID   int64   `json:"expense_id"`
	MemberID    int64   `json:"member_id"`
	MemberName  string  `json:"member_name"`
	ShareAmount float64 `json:"share_amount"`
}

type ExpenseWithParticipants struct {
	ID             int64                 `json:"id"`
	GroupID        int64                 `json:"group_id"`
	PaidByMemberID int64                 `json:"paid_by_member_id"`
	PaidByName     string                `json:"paid_by_name"`
	Title          string                `json:"title"`
	Amount         float64               `json:"amount"`
	ExpenseDate    time.Time             `json:"expense_date"`
	Notes          *string               `json:"notes"`
	CreatedAt      time.Time             `json:"created_at"`
	UpdatedAt      time.Time             `json:"updated_at"`
	Participants   []ExpenseParticipant  `json:"participants"`
}

type CreateExpenseRequest struct {
	Title          string  `json:"title"`
	Amount         float64 `json:"amount"`
	ExpenseDate    string  `json:"expense_date"`
	Notes          *string `json:"notes"`
	PaidByMemberID int64   `json:"paid_by_member_id"`
	ParticipantIDs []int64 `json:"participant_ids"`
}