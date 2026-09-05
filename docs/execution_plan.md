# DealFlow360 — End-to-End Step-by-Step Implementation & Testing Guide

This guide details the exact step-by-step development, architectural wiring, role capabilities, and test procedures for **DealFlow360**, from Authentication to Master Data, Quotation Engine, Governance, Multi-Warehouse Fulfillment, Hybrid Billing, Customer Portal, and Final Evaluation Testing.

---

## 🧭 Executive Summary & Technology Alignment

* **Architecture:** Decoupled Frontend (React/Vite/Tailwind) + REST Backend (Node.js/Prisma or Python/FastAPI) + PostgreSQL.
* **Team Roles:**
  * **Backend Dev 1:** Auth, Quotation Engine, Discount Governance & Blended Risk, Customer Portal Re-approval Loop.
  * **Backend Dev 2:** Master Data & Variants, Multi-Warehouse Auto-Split Engine, Hybrid Billing & Proration, Invoices.
  * **AI / Analytics Dev:** Live Upsell/Cross-sell Algorithm (Margin Delta Boost), Deal Health Anomaly Engine, PDF/Excel Reporting.
  * **Frontend Dev:** Responsive 18-Screen Client matching Excalidraw wireframes, Live Margin Indicator, 1-Click Role Switcher.

---

## 🔐 STEP 1: Authentication & Role Architecture (Screen 1)

### 1.1 Role Definitions
* **`ADMIN`**: Full platform control, product catalog, discount policies, warehouses.
* **`SALES_REP`**: Quotation creation, discount proposal, live margin tracking, upsell acceptance, portal chat.
* **`SALES_MANAGER`**: L1 approvals for medium/high risk quotes, Deal Health alerts, rep nudges.
* **`FINANCE`**: L2 approval for high-risk quotes, warehouse split validation, subscription reconciliation, invoice payments.
* **`CUSTOMER`**: External client access via `/portal/quote/:token` (No internal cost/margin visibility).

### 1.2 Backend Tasks (BE Dev 1)
* Endpoints:
  * `POST /api/auth/login` (Returns JWT/Session + User Profile + Role).
  * `GET /api/auth/me` (Validates current session).
* Seed 4 default persona credentials into database:
  * `rep@dealflow.com` (Password: `123456`, Role: `SALES_REP`)
  * `manager@dealflow.com` (Password: `123456`, Role: `SALES_MANAGER`)
  * `finance@dealflow.com` (Password: `123456`, Role: `FINANCE`)
  * `admin@dealflow.com` (Password: `123456`, Role: `ADMIN`)

### 1.3 Frontend Tasks (FE Dev)
* **Screen 1 (`/login`):**
  * Email and Password fields with standard validation.
  * **Hackathon Winning Demo Feature:** Top quick-switch bar:
    `[Login as Rep]` | `[Login as Manager]` | `[Login as Finance]` | `[Login as Customer]`
  * Persistent storage (LocalStorage) for active token and role.

---

## 🗄️ STEP 2: Master Data & Catalog Setup (Screens 16, 17, 18)

### 2.1 Backend Tasks (BE Dev 2)
* **Products & Variants API (`/api/products`):**
  * Core attributes: `sku`, `name`, `category` (`HARDWARE`, `SERVICES`, `SUBSCRIPTION`), `unit`, `baseCost` (CRITICAL for margin calculation), `basePrice`, `taxPercent`.
  * Variants support (`attribute: RAM`, `value: 16GB`, `extraPrice: 30`).
  * Subscription flags (`isSubscription`, `recurringInterval: MONTHLY/QUARTERLY/YEARLY`).
* **Warehouses & Stock API (`/api/warehouses`):**
  * Warehouses: `Main Warehouse` (Shipping weight: 1.0) and `East Depot` (Shipping weight: 1.2).
  * Stock levels per product: `inStock`, `reserved`, `available = inStock - reserved`.
* **Discount Ceilings API (`/api/config/discount-rules`):**
  * **Customer Tiers:** Bronze (5%), Silver (10%), Gold (15%).
  * **Categories:** Hardware (15%), Services (10%), Subscription (15%).
  * **Routing Matrix:**
    * $\le$ Limit $\rightarrow$ `No Approval Needed`
    * Over limit, medium risk $\rightarrow$ `Sales Manager`
    * Over limit, high risk $\rightarrow$ `Sales Manager THEN Finance`

### 2.2 Frontend Tasks (FE Dev)
* **Screen 16 & 17 (`/products`):** Catalog table with categories, base costs, pricing, variants, and stock on hand.
* **Screen 18 (`/config/discounts`):** Form tables for Tier Discount Ceilings, Category Discount Ceilings, and Approval Routing Rules.

---

## 🛒 STEP 3: Quotation Builder & Live Margin Indicator (Screens 2, 3, 4)

### 3.1 Backend Tasks (BE Dev 1)
* Endpoints:
  * `GET /api/quotations` (Filterable by stage for Kanban pipeline).
  * `POST /api/quotations` (Initialize quote in `DRAFT` status).
  * `PUT /api/quotations/:id` (Update line items, quantities, and discounts).
* **Mathematical Calculation Engine:**
  $$\text{Line Discounted Price} = \text{UnitPrice} \times \left(1 - \frac{\text{Discount\%}}{100}\right)$$
  $$\text{Line Margin\%} = \frac{\text{Line Discounted Price} - \text{UnitCost}}{\text{Line Discounted Price}} \times 100$$
  $$\text{Total Margin\%} = \frac{\text{Total Revenue} - \text{Total Cost}}{\text{Total Revenue}} \times 100$$
* **Line Limit Evaluation:**
  * For each line: $\text{AllowedLimit} = \min(\text{TierCeiling}, \text{CategoryCeiling})$.
  * If $\text{Discount\%} > \text{AllowedLimit} \implies \text{isOverLimit} = \text{true}, \text{overLimitPoints} = \text{Discount\%} - \text{AllowedLimit}$.

### 3.2 Frontend Tasks (FE Dev)
* **Screen 2 (`/dashboard`):** KPI summary cards (`Pending Approvals: 4`, `Open Quotations: 12`, `At-Risk Deals: 3`) + `+ New Quotation` button.
* **Screen 3 (`/quotations`):** 5-Column Kanban Board:
  `Draft` | `Pending Approval` | `Approved` | `Negotiation` | `Confirmed`.
* **Screen 4 (`/quotations/:id` - Cart Builder):**
  * Customer selector (displays tier badge, e.g., `Gold`).
  * Product lines table: Qty (+/-), Price, Discount input box.
  * **Live Status Badge:** Displays `OK` (green) if within limit, or `OVER (+8pt)` (red) if breached.
  * **Live Margin Meter:** Real-time visual progress bar reflecting order profit margin (e.g., `32.4% Margin`).

---

## 🤖 STEP 4: Live AI Upsell & Cross-Sell Suggestions (Screen 4 Sidebar)

### 4.1 AI / Analytics Dev Tasks
* Implement recommendation heuristics & correlation algorithm:
  * Analyze cart contents (e.g., `Laptop Pro 14` $\implies$ recommend `Wireless Mouse` [+$18 Margin Boost] and `Care Plan 2yr` [+$46 Margin Boost]).
  * Rank candidates by: (1) Co-purchase affinity, (2) Active promotion tags, (3) Minimum margin threshold compliance.
* Endpoint: `GET /api/quotations/:id/upsell-suggestions`.

### 4.2 Frontend Tasks (FE Dev)
* Quotation builder side panel:
  * Displays: Suggested Product Name, Promo tag, Margin Delta boost.
  * Action buttons: `+ Add to Quote` and `Dismiss`.
  * Clicking `Add` instantly appends product to cart lines and triggers real-time margin meter recalculation.

---

## ⚖️ STEP 5: Discount Governance & Blended Risk Engine (Screens 5, 6)

### 5.1 Backend Tasks (BE Dev 1) — Blended Risk Algorithm
When Sales Rep clicks **`Submit for Approval`**:
1. **Risk Evaluation:**
   * If $\text{Max Line Deviation} = 0 \implies \text{LOW Risk}$ (Auto-approves $\rightarrow$ `SENT_TO_CUSTOMER`).
   * If $0 < \text{Max Line Deviation} \le 5\% \implies \text{MEDIUM Risk}$ (`currentStage: SALES_MANAGER`).
   * If $\text{Max Line Deviation} > 5\%$ (e.g. Services line given 18% vs 10% allowed = +8pt) OR cumulative order margin loss is critical $\implies \text{HIGH Risk}$ (`currentStage: SALES_MANAGER`, followed by `FINANCE`).
2. Action Endpoint: `POST /api/approvals/:id/action`:
   * Payloads: `APPROVE`, `RETURN_FOR_REVISION`, `REJECT` + `note`.
   * Create immutable audit log entry in `ApprovalAuditLog`.
   * If Manager approves a `HIGH` risk deal $\implies$ moves to `currentStage: FINANCE`.
   * Upon final approval $\implies$ status transitions to `SENT_TO_CUSTOMER`, generates `portalToken`.

### 5.2 Frontend Tasks (FE Dev)
* **Screen 5 (`/approvals`):** Approvals list with filter tabs (`Pending`, `Returned`, `Approved`) and risk badges.
* **Screen 6 (`/approvals/:id`):**
  * Badges: `Blended Risk: HIGH`, `Customer Tier: Gold`.
  * **"Why This Quote Was Flagged" Table:**
    * Hardware: 12% given, 15% allowed $\rightarrow$ `OK (0pt)`
    * Services: 18% given, 10% allowed $\rightarrow$ `OVER (+8pt)`
  * Stepper timeline: `Submitted` $\rightarrow$ `Sales Manager` $\rightarrow$ `Finance` $\rightarrow$ `Approved`.
  * Audit history table + action buttons (`Approve`, `Return for Revision`, `Reject`).

---

## 🔄 STEP 6: Customer Portal & The Re-Approval Trigger Loop (Screen 11)

### 6.1 Concept & Isolation
A distinct, public customer-facing view accessed via `/portal/quote/:token`. Strips away internal costs, margins, and supplier information.

### 6.2 Backend Tasks (BE Dev 1)
* `GET /api/portal/quote/:token`: Returns customer-sanitized quote details.
* `POST /api/portal/quote/:token/comment`: Records line-level comment in `QuotationComment`.
* **🔥 THE CRITICAL RE-APPROVAL TRIGGER (`POST /api/portal/quote/:token/counter`):**
  * Customer submits counter-offer (e.g., `18% Discount`).
  * System evaluates: `Counter Discount > Allowed Limit`?
  * **If YES:** System immediately re-routes quotation back to `PENDING_APPROVAL`, flags Screen 6, and notifies Sales Manager!
* `POST /api/portal/quote/:token/confirm`: Customer 1-click confirmation $\implies$ Quote status moves to `CONFIRMED`.

### 6.3 Frontend Tasks (FE Dev)
* **Screen 11 (`/portal/quote/:token`):**
  * Client header: `My Quotation`, `Messages`, `Profile`.
  * Status badge: `Status: Under Negotiation`.
  * Line comments tool (e.g. *"Can we push installation to next month?"*).
  * Input fields: `Counter Discount %` and `Requested Delivery Date`.
  * Buttons: `Submit Request` and `Confirm Quotation`.

---

## 📦 STEP 7: Multi-Warehouse Auto-Split & Stock Reservation (Screens 7, 8)

### 7.1 Backend Tasks (BE Dev 2) — Auto-Split Algorithm
Upon order confirmation:
1. Inspect ordered physical products (Hardware).
2. Fetch stock counts across `Main Warehouse` and `East Depot`.
3. **Allocation Heuristic:**
   * Order requires: `24x Laptop Pro 14`.
   * Main Warehouse has 18 available $\implies$ Allocate 18 units to Main Warehouse (Shipment 1, Cost: $42).
   * Remaining 6 units allocated to East Depot (Shipment 2, Cost: $29).
   * If total stock is insufficient $\implies$ Allocate available and create `BACKORDER` record.
4. Reserve inventory: $\text{Reserved} = \text{Reserved} + \text{Allocated}, \text{Available} = \text{InStock} - \text{Reserved}$.

### 7.2 Frontend Tasks (FE Dev)
* **Screen 7 (`/fulfillment`):** Live stock levels per warehouse + table of `Orders Awaiting Fulfillment`.
* **Screen 8 (`/fulfillment/:id`):**
  * Fulfillment split breakdown:
    * `Main Warehouse`: 18 units | 1 Shipment | $42 cost
    * `East Depot`: 6 units | 1 Shipment | $29 cost
  * Restock prompt: *"Consolidate Remaining Backorder prompt appears automatically once East Depot restocks."*
  * Buttons: `Accept Suggested Split` and `Manual Override`.

---

## 💳 STEP 8: Hybrid Billing & Subscription Proration (Screens 9, 10, 12, 13)

### 8.1 Backend Tasks (BE Dev 2)
Separate single order into two billing channels:
* **One-Time Channel:** Physical hardware & one-time services $\implies$ Generate `Invoice` (`invoiceType: ONE_TIME`, status: `UNPAID`).
* **Recurring Channel:** Subscription services (Care Plan, Cloud Backup) $\implies$ Create `Subscription` record with billing schedule (Monthly/Quarterly).
* **Proration Engine (`POST /api/subscriptions/:id/modify`):**
  * When customer changes quantity mid-cycle (e.g., day 15 of 30-day month):
    $$\text{Prorated Delta} = (\text{New Monthly Rate} - \text{Old Monthly Rate}) \times \frac{\text{Days Remaining}}{\text{Total Days in Cycle}}$$
  * Adjust next billing schedule or issue credit note.

### 8.2 Frontend Tasks (FE Dev)
* **Screen 9 & 10 (`/subscriptions`):**
  * Subscriptions list (`Active`, `Paused`, `Cancelled`).
  * Detail view showing originating one-time lines alongside active recurring schedule.
  * Controls: `Modify Subscription` and `Cancel Subscription`.
* **Screen 12 & 13 (`/invoices`):**
  * Invoices overview + detail reconciliation.
  * Stepper: `Order Confirmed` $\rightarrow$ `Shipped` $\rightarrow$ `Invoiced` $\rightarrow$ `Paid`.
  * Actions: `Record Payment` (updates status to `PAID`) and `Download Summary` (PDF export).

---

## 🩺 STEP 9: Deal Health & Anomaly Dashboard (Screen 14)

### 9.1 AI / Analytics Dev & BE 1 Tasks
Continuous anomaly detection queries:
1. **Stalled Deals:** Quotes where `lastActivityAt > 7 days` in non-terminal stages.
2. **Discount Anomalies:** Quotes where discount exceeds rep's historical average by $>10\%$ (e.g., historical 8% vs current 22%).
3. **Delivery Slippage:** Orders where warehouse backorder threatens promised delivery date.
4. Actions: `POST /api/analytics/nudge` (pings rep) and `POST /api/analytics/escalate` (alerts manager).

### 9.2 Frontend Tasks (FE Dev)
* **Screen 14 (`/deal-health`):**
  * Metric Badges: `5 Stalled Deals`, `2 Discount Anomalies`, `3 Delivery Slippage`.
  * Flagged deals table with `Escalate` (Red) and `Nudge Rep` (Blue) triggers. Clicking row opens the deal detail.

---

## 📊 STEP 10: Admin Reporting & Exporting (Screen 15)

* **Backend / AI Dev:** Aggregation endpoints for sales velocity, discount variance, and approval cycle times (`GET /api/analytics/reports`).
* **Frontend:** Filter bar (`Period`, `Sales Team`, `Approval Status`, `Product Category`) + KPI cards + `Export PDF` & `Export XLS` buttons.

---

## 🧪 STEP 11: End-to-End Evaluation Test Flow (The 8 Judge Checks)

Execute this exact test sequence during final testing and presentation rehearsal:

| Step | Action | Expected System Behavior |
| :---: | :--- | :--- |
| **1** | Log in as Admin / Rep | Verify Gold tier (15%), Hardware limit (15%), Services limit (10%), and 2 warehouses exist. |
| **2** | Create Quotation | Add `Laptop Pro 14` with 12% discount (OK) and `Onsite Setup Service` with 18% discount. |
| **3** | Observe Line Validation | Service line displays `OVER (+8pt)`. Margin indicator recalculates live. |
| **4** | Submit for Approval | System auto-computes `Blended Risk: HIGH`. Routes to `Sales Manager` queue without manual email. |
| **5** | Add Upsell Suggestion | In builder, click `+ Add to Quote` on `Wireless Mouse`. Verify total amount and margin increase immediately. |
| **6** | Manager Approval | Manager reviews "Why Flagged" breakdown, enters note, and approves deal. |
| **7** | Warehouse Auto-Split | In Fulfillment screen, verify system split order: `Main Warehouse: 18 units` + `East Depot: 6 units`. |
| **8** | Hybrid Billing Verification | Verify order generated two billing artifacts: (1) One-time Invoice INV-1042, (2) Monthly Subscription Schedule. |
| **9** | **Customer Portal Counter Loop** | Open `/portal/quote/:token`. Propose 20% discount. **Verify quote automatically re-enters Manager approval!** |
| **10**| Confirmation & Payment | Confirm quote, click `Record Payment` on Invoice. Verify status transitions to `PAID`. |
