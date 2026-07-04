# MyPayBoard

MyPayBoard is a collaborative household budgeting web app for two users — designed around one question: **"What needs to be paid when we get paid?"**

It replaces spreadsheet-style monthly budgeting with pay date–centric boards, reusable templates, and lightweight household collaboration.

## What It Solves

Traditional budget apps organize around calendar months. MyPayBoard organizes around paychecks — each pay date card holds the bills that need to be covered before the next payday. This mirrors how households actually plan cash flow.

This is **not** a bank integration tool, spending analytics dashboard, or investment tracker. It is a paycheck allocation workspace and collaborative household financial command center.

## Core Features

- **Pay Boards** — pay date card grid with bills, due dates, paid/muted state, per-card notes, drag-and-drop organization, and header color customization
- **Bills & Income** — source-of-truth management for recurring expenses, income sources, categories, and default amounts; grouped and list views with expand-in-place editing; batch "Add multiple" bill entry
- **Debt Tracker** — filtered view of creditors with balance, minimum payment, APR, and credit limit tracking; revolving vs. installment filter
- **Templates** — reusable board blueprints; frozen snapshots built from Bills & Income that populate new monthly pay boards
- **Archive** — restore or permanently delete archived bills, income sources, and boards
- **Organize Lists** — manage bill and income category groups (rename, reorder, add, delete)
- **Per-user preferences** — independent theme, view, and layout state per user stored in `mypayboard-prefs-{userId}`
- **Collaboration** — shared boards with per-card notes and user-aware unread indicators

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.6 | Framework (App Router) |
| `react` / `react-dom` | 19.2.4 | UI library |
| `typescript` | ^5 | Type safety |
| `tailwindcss` | ^4 | Styling |
| `@dnd-kit/core` | ^6.3.1 | Drag-and-drop |
| `@dnd-kit/sortable` | ^10.0.0 | Sortable bill lists |
| `lucide-react` | ^1.14.0 | Icons |
| `radix-ui` | ^1.4.3 | Accessible UI primitives (popover, dropdown, calendar, select) |
| `shadcn` | ^4.7.0 | Component layer on Radix primitives |
| `date-fns` | ^4.4.0 | Date formatting and arithmetic |
| `react-day-picker` | ^10.0.1 | Calendar date picker |
| `class-variance-authority` | ^0.7.1 | Variant-based component styling |
| `clsx` | ^2.1.1 | Conditional classnames |
| `tailwind-merge` | ^3.6.0 | Safe Tailwind class merging |
| `tw-animate-css` | ^1.4.0 | CSS animation utilities |

Storage: `localStorage` for household planning data and per-user preferences. Supabase is planned for multi-device data sync.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Open `http://localhost:3000`. Sign in with Google.

Other scripts:

```bash
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint
```

## Design System

- **Font:** Manrope
- **Themes:** Daylight (light default), Midnight (dark), Business (warm, future)
- **Motion:** ~150–200ms `ease-out` transitions — visual continuity, not animation
- **Inspiration:** Notion / Linear editorial calm — not banking apps or SaaS dashboards

## Status

Active development, private beta. Core planning features are fully functional across desktop and mobile. Supabase migration and multi-device data sync are planned for a future release.
