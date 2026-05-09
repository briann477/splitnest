package models

import "time"

type Settlement struct {
	ID             int64      `json:"id"`
	GroupID        int64      `json:"group_id"`
	FromMemberID   int64      `json:"from_member_id"`
	FromMemberName string     `json:"from_member_name"`
	ToMemberID     int64      `json:"to_member_id"`
	ToMemberName   string     `json:"to_member_name"`
	Amount         float64    `json:"amount"`
	Status         string     `json:"status"`
	SettledAt      *time.Time `json:"settled_at"`
	CreatedAt      time.Time  `json:"created_at"`
}

type CreateSettlementRequest struct {
	FromMemberID int64   `json:"from_member_id"`
	ToMemberID   int64   `json:"to_member_id"`
	Amount       float64 `json:"amount"`
}