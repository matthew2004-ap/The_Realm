# The Realm — Campus Operations Platform

A full-stack web app for managing student goods arrivals, pickups, hostel delivery, lost & found, and hostel maintenance — built from the **FIRST PROJECT** brief.

## Features

| Module | Students | Student Council |
|--------|----------|-----------------|
| **Arrivals** | Register incoming goods with ETA, pickup or paid delivery | View all arrivals, mark arrived → ready → collected/delivered |
| **Gate Dates** | View official gate intake windows | Add and remove approved gate schedules |
| **Lost & Found** | Report missing items, search board, verify ownership to claim | Mark items as found, remove entries |
| **Hostel Watch** | Log carpentry, electrical, water, registration issues | Prioritize queue, start work, mark resolved |

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** JSON file store (no native build tools required)
- **Auth:** JWT with bcrypt password hashing

## Quick Start

```bash
npm install
npm run seed
npm start
```

Open **http://localhost:3000**

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Council | `council@therealm.edu` | `council123` |
| Student | `student@therealm.edu` | `student123` |

## Development

```bash
npm run dev
```

Runs the server with auto-reload on file changes.

## API Endpoints

- `POST /api/auth/register` — Create student account
- `POST /api/auth/login` — Sign in
- `GET /api/auth/me` — Current user
- `GET/POST /api/arrivals` — List and create arrivals
- `PATCH /api/arrivals/:id/status` — Update arrival status (council)
- `GET/POST /api/gate-dates` — Gate schedule
- `GET/POST /api/lost` — Lost & found board
- `PATCH /api/lost/:id/found` — Mark found (council)
- `PATCH /api/lost/:id/claim` — Verify ownership
- `GET/POST /api/maintenance` — Hostel issues
- `PATCH /api/maintenance/:id/status` — Update issue status (council)
- `GET /api/stats` — Dashboard summary

## Project Structure

```
The_Realm/
├── public/          # Frontend (HTML, CSS, JS)
├── server/          # Express API, routes, database
├── data/            # JSON database (created on first run)
├── package.json
└── FIRST PROJECT.md # Original project brief
```
