# Nutrition Assistant

A full-stack wellness management system that helps users and dietitians create, manage, and track personalized nutrition plans. Built with the MERN stack (MongoDB, Express.js, React, Node.js), with role-based access control, JWT authentication, and live progress/adherence tracking.

## Features

- **Role-based access** — three distinct roles (User, Dietitian, Admin), each with a scoped view enforced server-side
- **Client profile management** — track age, weight, height, dietary restrictions, health conditions, and goals
- **Meal plan creation** — dietitians build meal plans with per-meal calorie and macro breakdowns
- **Progress monitoring** — daily/weekly intake logs with adherence percentage tracking
- **Admin panel** — manage all users, approve/reject pending dietitians, view platform-wide stats

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, React Router, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT, bcrypt |

## Project Structure

```
nutrition-assistant/
├── backend/
│   ├── config/        # DB connection
│   ├── controllers/    # Route logic
│   ├── middleware/     # Auth, validation, error handling
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API endpoints
│   ├── utils/           # Helpers (logger, response shape, access control)
│   └── seed.js          # Seeds sample admin/dietitian/user + data
└── frontend/
    └── src/
        ├── components/  # Layout, protected route wrapper
        ├── context/      # Auth state
        ├── pages/        # Dashboard, Clients, Meal Plans, Progress, Admin
        └── services/     # Axios API client
```

## Setup

### Prerequisites
- Node.js v16+
- MongoDB (local or Atlas)

### 1. Clone the repo
```bash
git clone https://github.com/Pavan-8684/nutrition-assistant.git
cd nutrition-assistant
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
```
Edit `.env` with your own values:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

Seed the database with sample accounts and data:
```bash
node seed.js
```

Start the backend:
```bash
npm start
```
Backend runs on `http://localhost:5000`.

### 3. Frontend setup
```bash
cd ../frontend
npm install
cp .env.example .env
```

Start the frontend:
```bash
npm start
```
Frontend runs on `http://localhost:3000`.

## Test Credentials

After running `node seed.js`, these accounts are available for testing each role:

| Role | Email | Password |
|---|---|---|
| Admin | admin@example.com | AdminPass123! |
| Dietitian | dietitian@example.com | DietitianPass123! |
| User | user@example.com | UserPass123! |

The seed script also creates a sample client profile, a meal plan with full macro breakdowns, and progress logs, so all three roles have real data to review immediately.

## Notes

- This app is for demonstration and educational purposes. It does not replace professional medical or dietary advice.
- Protected routes are secured with JWT verification and role-based middleware on the backend, not just hidden in the UI.
