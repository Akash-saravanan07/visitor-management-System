# Vercel deployment

Create the Vercel project from the repository root (`d:\Shnool llc`), not from `frontend`.
The root `vercel.json` builds the Vite app from `frontend` and routes API requests to the Express function in `api/index.js`.

Add these environment variables in Vercel for every deployed environment:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

The PostgreSQL database must be reachable from Vercel. Leave `VITE_API_URL` unset when the frontend and API use the same Vercel deployment. Set it to the public backend URL only when deploying the backend separately.

For local development, set `VITE_API_URL=http://localhost:5000` in `frontend/.env` and run the frontend and backend separately.

## Docker

Install Docker Desktop, then run `docker compose up --build` from the repository root. Open `http://localhost:8080`. The frontend container proxies `/api/*` and `/admin/*` to the backend container, so no frontend API URL is needed.

Set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` in a root `.env` file before starting Compose when PostgreSQL is running outside Docker. The database must already contain the application's `users` table.