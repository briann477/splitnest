package models

type MemberBalance struct {
	MemberID   int64   `json:"member_id"`
	MemberName string  `json:"member_name"`
	Paid       float64 `json:"paid"`
	Share      float64 `json:"share"`
	Balance    float64 `json:"balance"`
}

type SettlementSuggestion struct {
	FromMemberID   int64   `json:"from_member_id"`
	FromMemberName string  `json:"from_member_name"`
	ToMemberID     int64   `json:"to_member_id"`
	ToMemberName   string  `json:"to_member_name"`
	Amount         float64 `json:"amount"`
}

type BalanceResponse struct {
	Balances    []MemberBalance        `json:"balances"`
	Settlements []SettlementSuggestion `json:"settlements"`
}
