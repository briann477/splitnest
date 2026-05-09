# SplitNest

SplitNest is a shared expense manager that helps groups track shared bills, split expenses fairly, and calculate who owes whom.

This project was built as a full-stack portfolio project using Go, MySQL, React, TypeScript, and Tailwind CSS.

## Overview

Managing shared expenses can be messy, especially during trips, house sharing, small events, or group activities. People often forget who paid first, how much each person should pay, and whether a payment has already been settled.

SplitNest solves this problem by providing a simple dashboard to record expenses, split bills automatically, and show balance calculations clearly.

## Features

- Group management
- Member management
- Add shared expenses
- Equal split bill calculation
- Automatic balance calculation
- Settlement suggestions
- Modern dashboard UI
- React frontend connected to Go REST API

## Tech Stack

### Backend

- Go
- Chi Router
- MySQL
- REST API

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons

## Project Structure

```text
splitnest/
├── backend/
│   ├── internal/
│   │   ├── config/
│   │   ├── database/
│   │   ├── handlers/
│   │   ├── models/
│   │   └── routes/
│   ├── main.go
│   └── go.mod
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
│
└── README.md
```
