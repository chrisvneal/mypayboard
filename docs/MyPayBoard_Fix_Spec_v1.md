# MyPayBoard — Fix Specification
**Version 1.0 | Post User Testing | Internal Use Only**

---

## Overview

This document captures every issue identified during the initial user testing session, organized into discrete committable fix phases. Each phase targets a single area of the application so that development, review, and git commits remain clean and focused.

Issues within each phase are ordered by logical implementation sequence, not severity.

### Issue Type Legend

| Tag | Meaning |
|-----|---------|
| `[Critical Bug]` | Broken core behavior affecting both users |
| `[Bug]` | Broken functionality |
| `[UX Issue]` | Works but behaves unexpectedly or unnaturally |
| `[UX Enhancement]` | Works but interaction could be meaningfully improved |
| `[UI Enhancement]` | Visual/layout improvement |
| `[Text Correction]` | Copy fix |

---

## Phase 1 — Data Layer: Per-User State Separation

**App Area:** `lib/useMyPayBoard.ts` · localStorage  
**Git Commit Scope:** `fix/per-user-state`

This is the most architecturally significant fix in this document. Currently all localStorage state — including UI preferences like collapsed/expanded groups, dark/light mode, and view toggles — is stored in a single shared blob. This means layout actions taken by Nicole are visible to Chris and vice versa, which is unintended.

The fix requires splitting localStorage into two clearly defined buckets:

- **Shared state** (`mypayboard-data`) — board data, bills, notes, recurring Bills & Income records. Both users always see the same financial data. This key does not change.
- **Personal state** (`mypayboard-prefs-{userId}`) — theme preference, collapsed/expanded group state, list vs. grouped view, any layout persistence. Keyed per user ID so Chris and Nicole each maintain their own.

> **Implementation note:** No financial data moves — only the storage key for UI preferences changes. The shared `mypayboard-data` key remains unchanged.

---

### 1-A `[Critical Bug]` — Layout state shared between users

Collapsed/expanded category groups, view mode (list vs. grouped), and any other UI-only state must be stored under a per-user key (e.g. `mypayboard-prefs-chris`) rather than in the shared data blob.

- On login, load that user's prefs
- On logout, leave prefs in place for next login
- Default to sensible defaults (expanded groups, grouped view) if no prefs key exists yet for that user

---

### 1-B `[Critical Bug]` — Dark/light mode shared between users

Theme preference (`mypayboard-theme`) must move into the per-user prefs key. Each user should have their own independent light/dark setting.

- On login, read and apply that user's saved theme
- Default to light mode if no preference is saved yet for that user
- The theme toggle in the topbar writes to that user's prefs key, not a global key

---

## Phase 2 — Pay Board: Pay Date Card Interactions

**App Area:** `components/modules/` · `PayDateEditor` · `ModuleHeader` · `AddBillInline`  
**Git Commit Scope:** `fix/module-interactions`

---

### 2-A `[UX Issue]` — Pay date popover does not close when clicking outside

The `PayDateEditor` popover should close immediately when the user clicks anywhere outside it — including clicking a different module's pay date. Currently the first popover stays open unless the user presses Escape or clicks a neutral area.

- The pre-selected month text in the input is the likely cause — it may be retaining focus and preventing the outside-click handler from firing
- `DueDateEditor` does not have this issue and can be used as a reference implementation
- Only one popover should ever be open at a time across the entire board

---

### 2-B `[UX Enhancement]` — Add bill button should toggle to "✕ Cancel"

When the add bill form is open, the `+ Add bill` trigger should visually transform:

- The `+` icon transitions to an `✕`
- The label reads `✕ Cancel`
- Clicking it again dismisses the form

This addresses two real use cases: (1) user opened the wrong module and wants to cancel immediately, (2) mid-entry cancel without hunting for the inline x on the row. Keep the transition short (~150ms), consistent with the app motion system (`--motion-duration`).

---

### 2-C `[UX Issue]` — Dismissing add bill form flashes "Select a creditor"

When clicking the inline `x` on an add bill row entry, there is a visible flash of the `Select a creditor` placeholder before the form closes.

- This is a timing issue — the input state is being reset before the exit animation completes
- Fix: clear the input value after the close transition finishes, or set it to empty string immediately before triggering the close animation

---

### 2-D `[Bug]` — Creating a one-off bill navigates away to Templates page

After adding a one-off bill (with a category set), the app unexpectedly navigates to the Templates route.

- Likely an accidental `router.push` or stray `href` in the one-off bill creation flow
- Investigate the category dropdown or form submit handler in `AddBillInline.tsx`
- Look for any navigation side effects in the state update path
- Priority: fix this first within Phase 2 as it is the most disruptive issue

---

### 2-E `[Text Correction]` — One-off bill picker label used old copy

Original reported label used old source-list terminology.

Current implementation uses a `Bills` / `Custom` segmented picker in `AddBillInline.tsx`. Treat this item as obsolete unless the old label is reintroduced elsewhere.

---

### 2-F `[Bug]` — Save to Master confirmation message no longer displays

After saving a one-off bill to Bills & Income from a pay date card, the short `Saved` confirmation no longer appears. The save operation itself works correctly.

- Reinstate the confirmation as a brief inline message on the row (~1.5s auto-dismiss)
- Should be consistent with the existing Saved confirmation pattern used elsewhere in the app

---

### 2-G `[UX Enhancement]` — Empty due date cell has no edit affordance

If no due date has been set on a bill, the due date column cell is completely empty with no visual cue that it is editable.

- On hover, the cell should show a subtle light gray background to indicate it is clickable/editable
- This matches the edit affordance pattern already in place for other inline-editable fields in the app
- No change needed for cells that already have a date value

---

### 2-H `[Bug]` — Deleted Bills & Income creditor still appears in pay date cards

When a creditor is deleted from Bills & Income, bills derived from that creditor already placed in a pay date card persist incorrectly.

**Rule:**
- If the creditor is **hard deleted** → remove all linked bill rows from every module
- If the creditor is **archived** → mute linked bill rows in all modules (do not delete), so they can be restored if the creditor is later unarchived

---

## Phase 3 — Pay Board: Card Tabs & Notes Panel

**App Area:** `components/modules/ModuleTabs` · `NotesPanel` · `PayDateModule`  
**Git Commit Scope:** `fix/module-tabs-notes`

---

### 3-A `[UX Enhancement]` — Paid and Notes tabs inherit excessive height from Unpaid tab

When the Unpaid tab has many bills, switching to Paid or Notes results in a large empty area because module height was set by the Unpaid list length.

- Paid and Notes tabs should collapse to an appropriate minimum height when their content is sparse
- The existing tight scroll behavior must not be altered — this only affects idle/empty height of those two tabs
- Unpaid tab behavior remains unchanged

---

### 3-B `[UI Enhancement]` — Unread notes count should be a header-colored pill

The unread count indicator on the Notes tab should render as a small pill/badge:

- Background color matches the module's `headerColor` at a softer opacity (similar to the active tab tint, ~42% mix)
- The pill sits beside the word `Notes`, it does not replace it
- The **Paid** tab count does not get this pill treatment — only Notes, since it functions as a collaborative alert
- The currently active tab already has its own pill surrounding the full label — the notes unread pill is separate and only appears when there are unread notes from the other user

---

### 3-C `[UX Issue]` — Notes thread displays in reverse chronological order

Latest notes currently appear at the top of the thread. They should appear at the bottom.

- Newest content always at the bottom, composer anchored below
- Scrolling up reveals older notes
- This matches the natural reading direction of every chat/comment UI pattern users are familiar with (iMessage, Slack, every comment thread)

---

## Phase 4 — Bills & Income Page

**App Area:** `components/income-expenses/` · `ExpenseRow` · `ExpenseListView` · `IncomeExpensesPage`  
**Git Commit Scope:** `fix/bills-income`

---

### 4-A `[UI Enhancement]` — List view table header row has no visual separation

In list view, the column header row has no background differentiation from the data rows beneath it.

- Apply a soft gray background to the header row only (suggest `#F3F4F6` or the nearest app token equivalent)
- Should be clearly distinct but not heavy — avoid dark grays or anything that competes with row data
- Consistent with how other sortable table headers are treated elsewhere in the app (reference Debt Tracker)

---

### 4-B `[UI Enhancement]` — Action icon column alignment is inconsistent between rows

Rows with 2 action icons (eye + edit) are visually misaligned compared to rows with 3 icons (eye + globe + edit).

- Add a fixed-width placeholder/spacer in the globe icon position for rows that have no URL attached
- All rows should sit on the same icon grid regardless of how many actions are present
- The placeholder should be invisible — no border, no background, just reserved space

---

### 4-C `[UI Enhancement]` — Account last-four digits has no dedicated column

The account last-four (e.g. `•••• 6055`) currently sits inline with the bill name with no consistent alignment across rows.

- Give it a dedicated column with a fixed narrow width
- Position it between the bill name and due date columns
- Width should be wide enough for the masked format (`•••• 0000`) but no wider
- Rows without an account number show an empty cell in that column — no placeholder text needed

---

### 4-D `[Bug]` — No visual feedback when an expense edit is saved

After editing and saving an expense row, there is no confirmation that the save occurred.

- Attempt a brief inline row highlight or short `Saved` text on the row after save (~1–1.5s auto-dismiss)
- If this feels intrusive or proves difficult to implement cleanly without layout disruption, **defer this item** — the user can verify success by seeing updated values immediately
- Do not block the phase on this item

---

## Phase 5 — Debt Tracker Page

**App Area:** `components/debt-overview/` · `DebtTable` · `DebtFilterBar` · `DebtOverviewPage`  
**Git Commit Scope:** `fix/debt-overview`

---

### 5-A `[UI Enhancement]` — No total creditor count displayed on the page

Add a creditor count to the page header area, consistent with how other pages surface item counts.

- When **All** filter is active: `13 accounts`
- When a type filter is active: `Showing 9 of 13 accounts`
- Count should update live when filters are toggled
- Position consistently with the section count pattern used on Bills & Income

---

### 5-B `[UI Enhancement]` — Sortable column headers have no hover affordance

Sortable column headers should communicate that they are clickable before the user clicks them.

- On hover: show a subtle background tint (slightly darker than the default header background)
- This is distinct from the active sort highlight which already exists — the hover state should be lighter and transient
- Applies to all sortable columns: Creditor Name, Type, Balance Owed, Min. Monthly Payment, Available Credit, Credit Limit, APR, Due Date

---

### 5-C `[UX Issue]` — Row height shifts inconsistently when sorting columns

Clicking column headers to change sort order causes noticeable and inconsistent padding/height changes on table rows.

- All rows should maintain a fixed consistent height regardless of sort state
- Investigate whether the active sort column's background tint is causing any padding recalculation or line-height change on cells
- No layout shift should occur at any point during a sort interaction

---

## Full Issue Summary

| ID | Phase | Type | Issue | Status |
|----|-------|------|-------|--------|
| 1-A | Phase 1 — Data Layer | `Critical Bug` | Layout state shared between users | Open |
| 1-B | Phase 1 — Data Layer | `Critical Bug` | Dark/light mode shared between users | Open |
| 2-A | Phase 2 — Module Interactions | `UX Issue` | Pay date popover does not close on outside click | Open |
| 2-B | Phase 2 — Module Interactions | `UX Enhancement` | Add bill button should toggle to ✕ Cancel | Open |
| 2-C | Phase 2 — Module Interactions | `UX Issue` | Add bill dismiss flashes placeholder text | Open |
| 2-D | Phase 2 — Module Interactions | `Bug` | One-off bill creation navigates to Templates | Open |
| 2-E | Phase 2 — Module Interactions | `Text Correction` | One-off bill picker label uses wrong copy | Open |
| 2-F | Phase 2 — Module Interactions | `Bug` | Save to Master confirmation no longer displays | Open |
| 2-G | Phase 2 — Module Interactions | `UX Enhancement` | Empty due date cell has no edit affordance | Open |
| 2-H | Phase 2 — Module Interactions | `Bug` | Deleted creditor persists in pay date modules | Open |
| 3-A | Phase 3 — Tabs & Notes | `UX Enhancement` | Paid/Notes tabs inherit excessive height | Open |
| 3-B | Phase 3 — Tabs & Notes | `UI Enhancement` | Unread notes count should be a header-colored pill | Open |
| 3-C | Phase 3 — Tabs & Notes | `UX Issue` | Notes thread displays in reverse chronological order | Open |
| 4-A | Phase 4 — Bills & Income | `UI Enhancement` | List view table header has no background | Open |
| 4-B | Phase 4 — Bills & Income | `UI Enhancement` | Action icon column alignment inconsistent | Open |
| 4-C | Phase 4 — Bills & Income | `UI Enhancement` | Account last-four has no dedicated column | Open |
| 4-D | Phase 4 — Bills & Income | `Bug` | No visual feedback when expense edit is saved | Open — Defer if complex |
| 5-A | Phase 5 — Debt Tracker | `UI Enhancement` | No total creditor count on the page | Open |
| 5-B | Phase 5 — Debt Tracker | `UI Enhancement` | Column headers have no hover affordance | Open |
| 5-C | Phase 5 — Debt Tracker | `UX Issue` | Row height shifts inconsistently when sorting | Open |

---

*End of MyPayBoard Fix Specification v1.0*
