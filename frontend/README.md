# Civora Admin

The administrator frontend for the Civora FastAPI service. It uses React, Vite, TypeScript, Tailwind CSS, React Router, Axios, Lucide React, and Recharts.

## Run locally

Start the supplied backend using the setup in the [repository README](../README.md). Confirm the API responds at `http://127.0.0.1:8000/health`. A provisioned, active administrator account is required.

From this directory, with Node.js 22.12 or later and npm:

```sh
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. Set `VITE_API_BASE_URL` in `.env` when connecting to a different instance. The frontend origin must be in the API's CORS allowlist. For a production build run `npm run build`. The build is written to `dist/`. A static host should serve `index.html` for client-side routes so deep links work. Run `npm run preview` to check the build locally.

## Administrator workflows

- **Dashboard** shows five operational counts, current distributions, and recent activity calculated from available API records. An assignment is active while its linked request is assigned or in progress.
- **Collection points** supports creating points and editing their details, waste acceptance, capacity, estimated fill and active status. Capacity and fill are expressed in kilograms.
- **Waste deposits** shows read-only citizen declarations with search, sorting, filtering and pagination.
- **Collection requests** supports requesting pickup at an active point, viewing request details, and editing or clearing notes.
- **Worker assignments** lists existing work and creates assignments for pending, unassigned requests. Enter a known worker ID and the backend validates its eligibility.
- **Reports management** shows citizen reports, filters by status, type and point, and lets administrators confirm permitted transitions and link or unlink matching collection requests on open reports.

Authentication uses the profile returned by `/auth/me`. The bearer token is kept in the current tab's session storage and is cleared on expiry or logout.

## API limitations

- The supplied OpenAPI specification has no worker-directory endpoint. The assignment form needs a known worker ID. A directory of eligible active workers would enable a searchable picker.
- Deposit, assignment and report responses provide person IDs. Collection point names are joined from the collection-points endpoint, with IDs as a fallback.
- The list endpoints return complete record arrays. Search, sorting, summaries and pagination run in the frontend. Charts show distributions calculated from those arrays.

## Source layout

```text
frontend/
├── public/fonts/       Inter Latin variable font and license
├── src/
│   ├── api/            Request client, API methods and response types
│   ├── auth/           Sign-in, session and access control
│   ├── components/    Layout, controls, tables and feedback
│   ├── features/      Dashboard and five management sections
│   ├── lib/           Formatting, workflow rules and request state
│   ├── main.tsx       Application routes
│   └── styles.css    Civora styles and responsive layouts
├── .env.example
├── index.html
├── package-lock.json
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Verification

The production build passed with a clean npm install. Chromium checks used the supplied FastAPI app and Alembic migrations with a disposable PostgreSQL-compatible PGlite database. They covered administrator access, wrong credentials, expired and invalid tokens, all six sections, point validation, deposit filters and pagination, request note updates, worker eligibility errors, report linking and status changes, API connection recovery, and mobile navigation at 390 px.
