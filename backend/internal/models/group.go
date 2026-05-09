package models

import "time"

type Group struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateGroupRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}

type UpdateGroupRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description"`
}
