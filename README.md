# MyPayBoard

MyPayBoard is a household budgeting app for planning which bills get paid from each paycheck.

## What It Solves

MyPayBoard is built around paycheck allocation: what needs to be paid, when it is due, and which pay date should cover it. It replaces spreadsheet-style monthly budgeting with shared pay boards, reusable templates, and lightweight household collaboration.

## Core Features

- **Pay Date Modules**: paycheck cards with bills, due dates, paid state, muted items, notes, and drag-and-drop organization.
- **Bills & Income**: source-of-truth management for recurring expenses, bills, income sources, categories, and default amounts.
- **Templates**: reusable board blueprints for creating new monthly pay boards.
- **Debt Tracker**: tracked debt view sourced from selected Bills & Income records.
- **Archive**: restore or delete archived bills, income sources, and boards.
- **Collaboration and notes**: shared boards with per-card notes and user-aware read state.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS v4
- Lucide icons
- `@dnd-kit`
- `localStorage`

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Status

This project is in active development and private beta.
