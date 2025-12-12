# Karta - Node.js Migration

This project has been migrated from Classic ASP to Node.js with Express.

## Prerequisites

- Node.js (v14 or higher)
- SQL Server Express with the `map` database
- Windows Authentication enabled for SQL Server

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Edit `.env` file if you need to change database connection settings
   - By default, it uses Windows Authentication to connect to `.\SQLEXPRESS` database `map`

## Running the Server

Start the server:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

The following endpoints replace the old ASP files:

- `GET /api/comments` - Replaces `back/comments-get.asp`
- `GET /api/users` - Replaces `back/users-get.asp`
- `GET /api/points/:id?table=X` - Replaces `back/test4.asp`
- `POST /api/search` - Replaces `back/test5.asp`

## Frontend

The frontend files (`karta.html`, `comments/index.html`) have been updated to use the new API endpoints.

## Migration Notes

- The Node.js server serves static files from the project root
- All ASP logic has been replicated in `server.js`
- Database connection is handled via `db.js` using the `mssql` package
- SQL injection protection is implemented using parameterized queries
