# MyPayBoard — Template System Spec

**Version:** 1.0  
**Status:** Implemented  
**Scope:** Template creation flow, Create New Month flow, Pay Boards navigation, Templates page

---

## 1. Core Data Model

### The Data Chain

```
Bills & Income → (live pull while editing) → Template → (snapshot on save) → Board (isolated snapshot)
```

### Rules

- **Bills & Income** is the permanent source of truth for recurring household bills and income sources.
- The **Template editor** always displays live values pulled from Bills & Income — like a spreadsheet cell referencing a source sheet. While the editor is open, fields reflect the current Bills & Income state.
- **Saving a template** freezes those live values into a stored snapshot. The template now owns those values independently.
- **Creating a board from a template** copies the template's frozen snapshot into the new board. The board is fully isolated from that point forward.
- Changes made inside a board **never** propagate back to the template or Bills & Income.
- Changes made in Bills & Income **never** retroactively affect existing templates or existing boards.
- To update a template with new Bills & Income values, the user must open the template editor and use the **Refresh from Bills & Income** action, then save.

### What Templates Store

| Field | Included |
|---|---|
| Template name | ✅ |
| Assigned household users | ✅ |
| Pay Date Modules (structure) | ✅ |
| Income source per module | ✅ |
| Default pay amount per module | ✅ |
| Default pay date per module | ✅ |
| Creditor assignments per module | ✅ |
| Creditor due dates | ✅ |
| Typical bill allocations | ✅ |
| Savings goals | ❌ |
| Debt payoff targets | ❌ |
| Monthly notes | ❌ |
| One-off bills | ❌ |
| Temporary adjustments | ❌ |

---

## 2. Navigation — Pay Boards

### Sidebar Behavior

- The sidebar contains **Pay Boards** with a caret toggle and an inline **+ New Pay Board** action.
- Clicking **Pay Boards** expands an inline list of all non-archived boards, ordered chronologically.
- The currently viewed board receives the standard active state treatment (left-border highlight or background fill — consistent with the existing sidebar active pattern).
- The most recently viewed board is persisted in app state so returning users land on the correct board automatically.
- No "active" vs "upcoming" distinction is surfaced in the UI at this time. All non-archived boards are treated equally.
- Archived boards do **not** appear in this list. They are accessible only through the Archive section.

### Expected Volume

Typically 1–3 boards visible at any time. Nav design does not need to account for large board counts at this stage.

---

## 3. Templates Location

- Templates are a direct **MANAGE** sidebar item.
- The implemented route is `/dashboard/settings/templates`; the legacy `/dashboard/templates` route redirects there.
- Templates are configuration-level tools, not daily workspace items, and are intentionally separated from the primary nav.

---

## 4. Templates Page

### Layout

Card grid. Each card displays:

- Template name
- Summary line: e.g., *"3 pay modules · Chris & Nicole"*
- Last saved date
- Default badge (if designated as the household default)
- **Edit** and **Delete** actions
- **Use Template** shortcut — triggers the Create New Month modal pre-selected to this template

### Default Template

- One template can be designated as the household default.
- The default template is pre-selected in the Create New Month modal's Template dropdown.
- Default status is settable from the template card (e.g., a toggle or context menu option).

### Empty State

When no templates exist, the Templates page displays a contextual empty state:

- Brief explanation of what templates are and why they're needed
- Single CTA: **Create New Template**
- No other options shown

---

## 5. Create New Template Flow

### Entry Points

- Templates page CTA (primary)
- Templates page empty state CTA (first-time user)

### Step 1 — Create Template Modal

A simple modal with the following fields:

| Field | Behavior |
|---|---|
| Template name | Free text input |
| Starting point | Radio or segmented control: **Start from Scratch** / **Copy Existing Template** |
| Copy from (conditional) | Dropdown of existing templates — only shown if Copy Existing Template is selected |

**Confirm action:** Opens the template editor workspace.

### Step 2 — Template Editor Workspace

The template editor looks and behaves nearly identically to the monthly board workspace. The primary differences are:

- Page header identifies this as a template (e.g., *"Editing: Standard Month"*)
- **Save** and **Save & Close** buttons in a persistent sticky footer or header action bar
- **Refresh from Bills & Income** button — re-pulls current Bills & Income values into all auto-populated fields without saving; user reviews and saves manually
- No board-specific fields (monthly notes, one-off bills, savings goals)

### Pay Date Module Configuration

Inside the template editor, users build Pay Date Modules by adding them individually (no upfront count declaration). Each module contains:

| Field | Source |
|---|---|
| Assigned user | Dropdown — only users selected during template setup |
| Income source | Dropdown — pulled live from Bills & Income entries |
| Default pay amount | Auto-populated from Bills & Income; editable |
| Default pay date | Manual entry or frequency-based input |

Modules **automatically re-order chronologically** whenever pay dates are changed.

### Save Behavior

- **Save** — persists the current state as a frozen snapshot; user stays in the editor
- **Save & Close** — persists the snapshot and returns the user to the Templates page
- No autosave. Changes are not committed until the user explicitly saves.

---

## 6. Create New Month Flow

### Entry Point

A persistent **+ Create New Month** action — located in the sidebar or another always-accessible location. Low-frequency action; does not need to be prominent, but must always be reachable.

### Path A — Templates Exist

Modal opens with two fields:

**Board Timing**
- Dropdown preselected to the current month
- Options: current month + 6–8 months forward

**Template**
- Dropdown preselected to the household default template
- Lists all saved templates

Helper text below the Template dropdown updates dynamically to describe the selected template (e.g., *"This template includes your pay dates, income sources, and creditors."*)

**Actions:** Cancel / **Create Board**

On confirm: the new board is generated from the template snapshot and the user is taken directly into the new board workspace. The board immediately appears in the Pay Boards nav dropdown.

### Path B — No Templates Exist

The Create New Month modal does not open. Instead, an inline empty state or small contextual modal appears:

- Message: *"You need a template before creating a board."* (or equivalent clear copy)
- Single CTA: **Create New Template**
- Routes user to the Create New Template flow

---

## 7. Board Behavior Post-Creation

Once a board is created from a template it is fully independent. Users can:

- Change pay dates, pay amounts, income sources
- Change creditor due dates and amounts
- Move creditors between pay date modules
- Add one-off bills and temporary items
- Remove items for the current month only

None of these changes affect the originating template or Bills & Income.

To modify a template, users must navigate to Templates and explicitly choose **Edit Template**.

---

## 8. First-Time User Experience

New users have no templates. The system should guide them clearly:

1. On first login or first visit to Pay Boards, surface a prompt to create a template before creating a board.
2. The Templates page empty state is the primary onboarding touchpoint — clear CTA, brief explanation.
3. Once a first template is saved, the full Create New Month flow becomes available.

---

## 9. Out of Scope (Current Version)

The following are noted for future consideration but are not part of this implementation:

- Automatic board lifecycle transitions (e.g., June auto-archives when July becomes active)
- Template-to-Bills & Income sync indicators ("template out of sync" warnings)
- Payoff tracking or automatic creditor removal from templates
- Budget overrun warnings during board creation
- Required field validation
- Admin permission levels for template management

---

*Last updated: June 2026*
