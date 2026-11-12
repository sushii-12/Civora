# Civora
### Digital Waste Management & Accountability Platform

**Cleaner Cities. Smarter Communities.**

Civora is a software-based waste management and accountability platform designed to connect citizens, municipal administrators, and waste collection workers.

The platform aims to improve waste disposal tracking, collection management, and reporting of improper waste disposal.

## Sustainable Development Goals

- **SDG 11:** Sustainable Cities and Communities
- **SDG 12:** Responsible Consumption and Production

## Core Features

### Citizen
- User registration and authentication.
- View active waste collection points.
- Record wet and dry waste deposits.
- View personal waste deposit history.
- Report improper dumping.
- Report waste that has not been collected.
- Track submitted reports.

### Administrator
- Manage waste collection points.
- View waste deposit records.
- Create and manage collection requests.
- Assign collection tasks to workers.
- View and manage citizen reports.

### Worker
- View assigned collection tasks.
- Start assigned collection tasks.
- Mark collection tasks as completed.
- View personal assignment history.

## Technology Stack

### Backend
- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- Pydantic
- Alembic
- JWT Authentication
- Argon2 Password Hashing

### API Documentation
- Swagger UI
- OpenAPI

## Project Structure

```text
Civora/
│
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── security.py
│   │   └── main.py
│   │
│   ├── migrations/
│   ├── .env.example
│   ├── alembic.ini
│   ├── requirements.txt
│   └── test_schemas.py
│
├── .gitignore
└── README.md
```

## Backend Setup

### Prerequisites

Install the following:

- Python 3.11 or later
- PostgreSQL
- Git

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd Civora
```

### 2. Navigate to the backend

```bash
cd backend
```

### 3. Create a virtual environment

```bash
python -m venv .venv
```

### 4. Activate the virtual environment

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 5. Install dependencies

```bash
pip install -r requirements.txt
```

### 6. Configure environment variables

Create a local `.env` file using the example:

```powershell
Copy-Item .env.example .env
```

Open `.env` and configure your own values:

```env
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@localhost:5432/civora_db
JWT_SECRET_KEY=YOUR_SECRET_KEY
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Generate a secure JWT secret key locally. Never commit your `.env` file or share its secrets.

If your PostgreSQL password contains special characters, URL-encode them in the database connection URL.

### 7. Create the PostgreSQL database

Create a PostgreSQL database named:

```text
civora_db
```

Ensure that the database credentials in `.env` match your local PostgreSQL configuration.

### 8. Apply database migrations

From the backend directory:

```bash
alembic upgrade head
```

This creates or updates the database schema using the project's Alembic migrations.

### 9. Start the backend server

```bash
python -m uvicorn app.main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

## API Documentation

Once the backend is running:

| Resource | URL |
|---|---|
| Swagger UI | http://127.0.0.1:8000/docs |
| OpenAPI JSON | http://127.0.0.1:8000/openapi.json |
| Health Check | http://127.0.0.1:8000/health |

Use Swagger UI to explore and test the available API endpoints.

## Main API Modules

| Module | Base Route |
|---|---|
| Authentication | `/auth` |
| Collection Points | `/collection-points` |
| Waste Deposits | `/waste-deposits` |
| Collection Requests | `/collection-requests` |
| Worker Assignments | `/worker-assignments` |
| Dumping Reports | `/dumping-reports` |

## Authentication and Authorization

Civora uses JWT-based authentication with role-based access control.

Supported roles:

- `citizen`
- `admin`
- `worker`

Protected endpoints require a Bearer access token.

In Swagger UI, use the **Authorize** option and provide the access token.

New registrations receive the citizen role by default. Administrator and worker accounts must be provisioned with the appropriate roles.

## Frontend Integration

The backend exposes REST APIs for integration with the Civora frontend.

Local backend URL:

```text
http://127.0.0.1:8000
```

The backend CORS configuration currently allows these local development origins:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

If the frontend runs on another origin, update the CORS configuration in `backend/app/main.py`.

## Important Notes

- Waste deposit records represent citizen-declared disposal.
- Collection point fill levels represent estimated waste load, not sensor measurements.
- Collection completion is recorded through the worker workflow; it is not independent physical verification.
- Each developer must configure their own local environment variables and PostgreSQL database.

## Project Scope

Civora is designed as a software-first waste management platform. It does not require dedicated IoT hardware or machine learning infrastructure.

---

**Civora — Cleaner Cities. Smarter Communities.**
