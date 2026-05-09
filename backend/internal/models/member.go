package models

import "time"

type Member struct {
	ID        int64     `json:"id"`
	GroupID   int64     `json:"group_id"`
	Name      string    `json:"name"`
	Email     *string   `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type CreateMemberRequest struct {
	Name  string  `json:"name"`
	Email *string `json:"email"`
}

type UpdateMemberRequest struct {
	Name  string  `json:"name"`
	Email *string `json:"email"`
}