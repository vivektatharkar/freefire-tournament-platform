# FreeFire Tournament Platform (Scaffold)

This is a starter scaffold for a FreeFire Tournament Platform with a Node.js backend and React frontend.

## Quick start (local)

1. Copy `.env` values into `backend/.env` and edit as needed.
2. Start MySQL locally or use docker compose in `devops/`.
3. From the root you can run backend directly (requires npm install inside backend):
   - cd backend
   - npm install
   - npm run dev
4. Run frontend (requires npm install inside frontend):
   - cd frontend
   - npm install
   - npm start

Or run via Docker (from `devops/`):
   docker compose up --build

Frontend will be available at http://localhost:3000 and backend at http://localhost:5000
Updated on <today>