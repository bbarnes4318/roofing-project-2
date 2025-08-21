Authentication Setup and Usage

Overview

This project now supports a robust authentication flow with a development fallback so you can register and log in even when the database is not available. In production, Prisma/PostgreSQL is used; in development, a lightweight file-based store is used automatically if the DB is not connected.

Key Features

- Password hashing with bcrypt
- JWT-based sessions with configurable expiry
- Input validation and rate limiting on auth endpoints
- Graceful network/server error messaging in the frontend
- Dev-only file-based user store (JSON) when the DB is unavailable

Backend

Environment variables (server):

- PORT: default 8080
- JWT_SECRET: required in production; dev fallback is used if unset
- DATABASE_URL: required for PostgreSQL in production

Quick start (dev fallback):

1) Install deps
   - From repo root: npm ci
   - From server/: npm ci
2) Start backend (dev): PORT=8080 JWT_SECRET=dev NODE_ENV=development node server/server.js
   - If DATABASE_URL is not set, the server starts without DB and enables the dev user store
3) Start frontend (separate terminal): npm start

Auth Endpoints

- POST /api/auth/register: { firstName, lastName, email, password }
- POST /api/auth/login: { email, password }
- GET /api/auth/me: Bearer token required

Dev Fallback

- When the DB is unavailable (global.__DB_CONNECTED__ === false), register/login route handlers transparently use server/data/dev-users.json with bcrypt-hashed passwords.

Frontend Configuration

- API base URL resolves automatically:
  - REACT_APP_API_URL / NEXT_PUBLIC_API_URL / API_URL if provided
  - Otherwise http://localhost:8080/api in development

Testing

- Register: curl -X POST http://localhost:8080/api/auth/register -H 'Content-Type: application/json' -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"secret123"}'
- Login (valid): curl -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' -d '{"email":"test@example.com","password":"secret123"}'
- Login (invalid): same as above with wrong password; expect 401 with message "Invalid credentials"
- Network handling: Stop backend; frontend shows a precise error: "Network error: Cannot reach http://localhost:8080/api ..."

Production Notes

- Set DATABASE_URL and JWT_SECRET
- Ensure HTTPS termination and secure cookie/storage policies as per your deployment


