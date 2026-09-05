# DealFlow360 — Frontend Teammate API Integration Guide

> **Quick Reference Cheatsheet for Frontend UI Development**  
> Backend Base URL: `http://localhost:4000`  
> Interactive Swagger Documentation: `http://localhost:4000/api/docs`

---

## 1. Demo Credentials (All seeded & ready)

| Persona | Email | Password | Allowed Roles / Scope |
| :--- | :--- | :--- | :--- |
| **Sales Rep** | `rep@dealflow.com` | `123456` | Workspace, Cart Builder, AI Upsell, Submit Quote |
| **Sales Manager** | `manager@dealflow.com` | `123456` | Approvals Queue (L1), Deal Health Dashboard, Nudge |
| **Finance Controller** | `finance@dealflow.com` | `123456` | High-Risk Approvals (L2), Fulfillments, Subscriptions, Invoices |
| **Admin** | `admin@dealflow.com` | `123456` | Full System Config (Discount ceilings, Warehouses, Products) |

---

## 2. Helpful Quick Terminal Commands

```bash
# 1. Reset and re-seed the entire database to fresh demo state:
pnpm seed

# 2. Run the 8-step automated end-to-end verification flow (takes 3 seconds):
pnpm test:flow

# 3. Open interactive Prisma Database Studio in browser:
pnpm studio
```

---

## 3. Screen-by-Screen API Endpoints & Payloads

### Screen 1: Authentication (`/login`, `/signup`)
* `POST /api/auth/login`
  * Body: `{ "email": "rep@dealflow.com", "password": "123456" }`
  * Returns: `{ "accessToken": "...", "user": { "id": "...", "fullName": "...", "role": "SALES_REP" } }`
* `GET /api/auth/me` (Send `Authorization: Bearer <token>`)

---

### Screen 2 & 3: Sales Dashboard & 5-Column Kanban (`/dashboard`, `/quotations`)
* `GET /api/analytics/dashboard`
  * Returns: `{ "activeQuotes": 4, "pendingApprovals": 1, "wonDeals": 2, "pipelineValue": 45200.00 }`
* `GET /api/quotations/pipeline`
  * Returns: 5 Kanban columns: `DRAFT`, `PENDING_APPROVAL`, `SENT_TO_CUSTOMER`, `UNDER_NEGOTIATION`, `CONFIRMED` with counts and quote cards.
* `GET /api/quotations` (Table list with optional query params `?status=...&search=...`)

---

### Screen 4: Quotation Builder & Cart (`/quotations/:id`)
* `GET /api/quotations/:id`
  * Returns: Full quotation detail, customer tier, lines with live margin % and limit badge (`OK (0pt)` or `OVER (+4pt)`), blended risk score (`LOW`, `MEDIUM`, `HIGH`).
* `PUT /api/quotations/:id` (or `PUT /api/quotations/:id/lines`)
  * Body:
    ```json
    {
      "lines": [
        { "productId": "UUID", "quantity": 10, "unitPrice": 850.00, "discountPercent": 12.0 }
      ]
    }
    ```
* `GET /api/quotations/:id/upsell-suggestions`
  * Returns ranked suggestions with `suggestedProductId`, `name`, `marginDelta`, and `promotionTag`.
* `POST /api/quotations/:id/lines/upsell`
  * Body: `{ "productId": "UUID", "quantity": 10, "discountPercent": 0 }`
* `POST /api/quotations/:id/submit` (or `/submit-approval`)
  * Body: `{ "reason": "Strategic customer expansion" }`
  * Triggers zero-click approval router. If discount exceeds limits, sets `PENDING_APPROVAL`.

---

### Screen 5 & 6: Approvals Governance (`/approvals`, `/approvals/:id`)
* `GET /api/approvals` (or `/api/approvals/queue`)
  * Returns pending approvals routed to current user's role stage.
* `GET /api/approvals/:id`
  * Returns exact audit trail, line-level discount deviation, and "Why Flagged" breakdown.
* `POST /api/approvals/:id/action`
  * Body: `{ "action": "APPROVE" | "RETURN_FOR_REVISION" | "REJECT", "comment": "Approved" }`

---

### Screen 7 & 8: Warehouse Fulfillment & Stock Split (`/fulfillment`, `/fulfillment/:id`)
* `GET /api/warehouses/stock` (or `/api/warehouses`)
  * Returns all warehouses with live physical stock (`inStock`, `reserved`, `available`).
* `GET /api/fulfillments` (or `/api/fulfillment/orders`)
  * Returns orders awaiting shipment allocation.
* `POST /api/fulfillments/quotation/:quotationId/split`
  * Automatically calculates optimal multi-depot split (Main vs East Depot vs Backorder).
* `PATCH /api/fulfillments/:id/override` (or `/confirm-split`)
  * Allows manual quantity allocation per warehouse.
* `POST /api/fulfillments/:id/dispatch`
  * Deducts inventory and marks shipped.
* `POST /api/fulfillments/:id/consolidate-backorder`
  * Special B6 flow: absorbs newly arrived warehouse stock into backorders.

---

### Screen 9 & 10: Subscriptions & Proration (`/subscriptions`, `/subscriptions/:id`)
* `GET /api/subscriptions`
  * Returns active customer recurring contracts.
* `GET /api/subscriptions/:id`
  * Returns contract schedule, cycle rate, and proration audit history.
* `POST /api/subscriptions/:id/modify` (or `/adjust-quantity`)
  * Body: `{ "newQuantity": 4, "effectiveDate": "2026-09-15" }`
  * Computes mid-cycle calendar-day prorated delta.
* `POST /api/subscriptions/:id/cancel`
  * Body: `{ "reason": "Customer downsizing", "refundProrated": true }`

---

### Screen 11: Customer Portal Negotiation (`/portal/quote/:token`)
* `GET /api/portal/quote/:token`
  * Public tokenized view. Sensitive internal costs and margins are automatically omitted.
* `POST /api/portal/quote/:token/comment`
  * Body: `{ "message": "Can we schedule delivery for next month?" }`
* `POST /api/portal/quote/:token/counter`
  * Body: `{ "counterDiscountProposed": 18.0, "message": "Can you match 18%?" }`
  * **The Red-Dashed Loop:** If counter exceeds customer tier ceiling, automatically resets quote to `PENDING_APPROVAL` and re-enters manager's queue!
* `POST /api/portal/quote/:token/confirm` (or `/accept`)
  * Body: `{ "signatureName": "Procurement Lead" }`
  * Confirms quote and triggers fulfillment and invoice generation.

---

### Screen 12 & 13: Invoices & Payments (`/invoices`, `/invoices/:id`)
* `POST /api/invoices/generate-from-quotation/:quotationId`
  * Partitions quote into One-Time invoice (Hardware/Services) and Recurring invoice (Subscriptions).
* `GET /api/invoices`
  * Returns invoice list with status (`UNPAID`, `PAID`, `OVERDUE`).
* `POST /api/invoices/:id/pay`
  * Body: `{ "amount": 1200.00, "paymentMethod": "CREDIT_CARD", "referenceNote": "Paid via portal" }`

---

### Screen 14 & 15: Deal Health & Analytics (`/deal-health`, `/reports`)
* `GET /api/analytics/deal-health`
  * Returns stalled quotes (>7 days inactivity) and discount anomaly alerts.
* `POST /api/analytics/nudge`
  * Body: `{ "quotationId": "UUID", "message": "Please follow up with customer" }`
* `GET /api/analytics/reports`
  * Aggregated revenue and pipeline statistics.
* `GET /api/analytics/export/csv` (or `/export/xls`)
  * Downloadable spreadsheet export.
* `GET /api/analytics/export/pdf`
  * Printable HTML executive summary report.
