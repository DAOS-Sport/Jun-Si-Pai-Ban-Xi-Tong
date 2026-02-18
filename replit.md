# PT 排班管理系統 (PT Scheduling System)

## Overview
A workforce scheduling management system for PT (personal training) staff across multiple venues and regions. Features smart spreadsheet-like scheduling, Taiwan labor law compliance engine, employee/venue management, and attendance tracking.

## Recent Changes
- 2026-02-18: Initial MVP build with regional grouping, smart scheduler, labor law validation, employee/venue CRUD, seed data

## Architecture
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + PostgreSQL + Drizzle ORM
- **Routing**: wouter (frontend), Express (backend API)
- **State**: TanStack React Query for server state

## Project Structure
```
client/src/
  pages/          - Dashboard, Schedule, Employees, Venues, Attendance
  components/     - AppSidebar, RegionTabs, ShiftCellEditor, VacancyFooter, ThemeToggle
  lib/            - queryClient, theme-provider, region-context, labor-law
server/
  index.ts        - Express server entry
  routes.ts       - API endpoints
  storage.ts      - Database storage layer (IStorage interface)
  db.ts           - Database connection
  seed.ts         - Seed data
  labor-validation.ts - Server-side labor law validation
shared/
  schema.ts       - Drizzle schema definitions
```

## Key Features
- **Regional Tabs**: 3 regions (三蘆戰區/松山區/新竹區) with tab-based switching
- **Smart Scheduler**: Spreadsheet-like weekly grid with cell editing
- **Labor Law Engine (HR Eye)**: 7-day rest, 12h daily limit, 11h rest gap
- **Dispatch Mode**: Orange-highlighted cells for outsourced staff
- **Vacancy Footer**: Real-time shortage monitoring

## API Routes
- GET /api/employees/:regionCode
- POST /api/employees
- PATCH /api/employees/:id
- GET /api/venues/:regionCode
- POST /api/venues
- PATCH /api/venues/:id
- GET /api/shifts/:regionCode/:startDate/:endDate
- POST /api/shifts (with labor law validation)
- PATCH /api/shifts/:id
- DELETE /api/shifts/:id
- GET /api/venue-requirements/:regionCode
