# NurseRoster — Nursing Staff Scheduling Application

A modern web application for managing nursing staff schedules, shift assignments, departments, and leave requests.

## Features

- **Dashboard** — Overview of today's shifts, staff counts, and pending leave
- **Weekly Roster** — Interactive grid to assign shifts by clicking cells; filter by department
- **Staff Management** — Add, edit, and deactivate nurses (RN, LPN, CNA, Charge Nurse)
- **Shift Templates** — Configure morning, afternoon, night, and off shifts with custom times and colors
- **Departments** — Manage hospital wards and units (Emergency, ICU, etc.)
- **Leave Management** — Submit, approve, or reject leave requests; approved leave shows on the roster

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- React Router
- LocalStorage for data persistence

## Getting Started

```bash
cd nursing-roster
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

## Usage Tips

1. Start on **Staff** to review or add team members
2. Go to **Roster**, pick a week, and click any cell to assign a shift
3. Use **Leave** to record time off — approved leave appears as "On Leave" on the roster
4. All data is saved automatically in your browser's local storage

## Project Structure

```
src/
├── components/   # Layout, Modal
├── context/      # Global state + localStorage
├── data/         # Default seed data
├── pages/        # Dashboard, Roster, Staff, Shifts, Departments, Leave
├── types/        # TypeScript interfaces
└── utils/        # Helper functions
```
