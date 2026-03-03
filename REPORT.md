# BugApp — Development Report

**Project:** BugApp
**Date:** 2026-03-03
**Status:** 10 items resolved

---

## Summary

This report covers all resolved tasks and bug fixes delivered for the BugApp project. The primary focus of this development cycle was a **full UI/UX redesign** of the application to establish a consistent dark-theme, parallelogram-driven design language across all pages, alongside several bug fixes and usability improvements.

---

## Resolved Items

### Design & Redesign

#### #74 — Full Board page redesign
**Type:** Task | **Priority:** Critical | **Severity:** Major

Completely redesigned the Board (Kanban) page to match the new dark design system:
- Dark background (`#0f172a`), sharp-edged columns with no border-radius
- "Board" heading and "+ New Item" button styled as parallelograms
- Navbar redesigned to match — project selector, role badge, and logout button all follow the parallelogram style
- "Bug Tracker" brand text styled as a parallelogram accent tag

---

#### #75 — Items page redesign
**Type:** Task | **Priority:** Medium | **Severity:** Major

Redesigned the Items (Bugs) list page:
- Page renamed from "Bugs" to "Items" throughout
- Status, priority, severity, and type badges redesigned as parallelogram pills with coloured left-stripe accents
- Dark table with indigo header accent
- "+ New Item" button matches parallelogram style
- Filter dropdowns (Type, Status, Priority, Severity) rebuilt as custom parallelogram multi-select dropdowns — no checkboxes, keyboard-friendly

---

#### #77 — New Item & Edit Item complete redesign
**Type:** Task | **Priority:** Medium | **Severity:** Major

Both the New Item and Edit/Preview Item pages were fully redesigned to match the rest of the app:
- Dark card layout split into two columns: description on the left, metadata fields (Type, Status, Priority, Severity, Assignee) stacked on the right
- Title field moved into the page header — editable inline next to the item ID
- Metadata fields replaced with custom parallelogram dropdown components matching the filter style
- Save/Delete/Create/Cancel buttons in the header as parallelograms
- Always-editable fields — no hidden "Edit mode" toggle

---

#### #78 — Projects page redesign
**Type:** Task | **Priority:** Medium | **Severity:** Major

Applied the dark design system to the Projects page:
- Dark background and table matching Items/Board style
- Edit and Delete table buttons styled as coloured parallelograms
- Custom dark confirm modal replacing the browser's native `window.confirm`
- Create/Edit modal with parallelogram action buttons

---

#### #83 — Users page redesign
**Type:** Task | **Priority:** Medium | **Severity:** Major

Applied the same dark redesign to the Users page:
- Consistent dark table, heading, and button styling
- Role badges (admin, developer, tester) as parallelogram pills with colour accents
- Admin-only actions (Edit, Delete) shown conditionally
- Custom confirm modal for delete

---

### Bug Fixes

#### #76 — No default reporter when creating an item
**Type:** Bug | **Priority:** Medium | **Severity:** Major

- Reporter field on the New Item form now pre-selects the currently logged-in user automatically
- Non-admin users see the reporter as a read-only field — only admins can change it to a different user

---

#### #79 — Board empty column shows "No bugs" instead of "No items"
**Type:** Bug | **Priority:** Low | **Severity:** Minor

- Fixed placeholder text in empty Kanban columns from "No bugs" to "No items" to match the unified item terminology

---

#### #81 — "In Progress" status badge wraps to second line
**Type:** Bug | **Priority:** Medium | **Severity:** Minor

- Added `white-space: nowrap` to the base `.badge` class, preventing multi-word labels like "In Progress" from wrapping and breaking row layout

---

#### #82 — "View items" on Projects page ignores selected project
**Type:** Bug | **Priority:** High | **Severity:** Major

- Clicking "View items" now correctly calls `setSelectedProjectId` on the global `ProjectContext` before navigating to the Items page
- The navbar project selector updates immediately and the correct project's items are shown

---

#### #86 — System user visible in user lists and dropdowns
**Type:** Bug | **Priority:** Medium | **Severity:** Major

- The internal `deleted@system` user (used as a placeholder when real users are deleted) was appearing in all Reporter, Assignee, and comment user dropdowns
- Fixed by filtering this user out at the API layer in `getUsers()` — covers all components automatically

---

## Open Items

| # | Title | Priority | Severity |
|---|-------|----------|----------|
| 80 | Real-time board updates via WebSockets | High | Major |
| 87 | Add linking with Git commits | Medium | Major |
| 88 | Add image attachments to items | Medium | Minor |
| 89 | Rename "Bugs" menu item to "Items" | High | Minor |

---

*Report generated from BugApp project tracker — 2026-03-03*
