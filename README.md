# DealFlow360

## Enterprise Configure, Price, Quote (CPQ), Margin Governance & Multi-Depot Operations Platform

```text
====================================================================================================
  DEALFLOW360 :: NEXT-GENERATION ENTERPRISE ORDER-TO-CASH & REVENUE OPERATIONS ENGINE
  Autonomous Dual-Ceiling Governance | Red-Dashed Loop Negotiations | Multi-Depot Geodesic Splitting
  Hybrid Recurring Billing | Razorpay Cryptographic Settlement | FP-Growth Market Basket Intelligence
====================================================================================================
```

[![Runtime](https://img.shields.io/badge/Runtime-Node.js%2018%20%7C%2020%20LTS-026e00.svg)](https://nodejs.org/)
[![Backend](https://img.shields.io/badge/Backend-NestJS%2010.3.8-ea2845.svg)](https://nestjs.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js%2014.2.23%20App%20Router-000000.svg)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20Alpine-336791.svg)](https://www.postgresql.org/)
[![ORM](https://img.shields.io/badge/ORM-Prisma%205.14.0-2d3748.svg)](https://www.prisma.io/)
[![Cache & Throttling](https://img.shields.io/badge/Cache-Redis%207%20Alpine-dc382d.svg)](https://redis.io/)
[![Object Storage](https://img.shields.io/badge/Storage-MinIO%20S3%20Compatible-c72c48.svg)](https://min.io/)
[![Payment Gateway](https://img.shields.io/badge/Payments-Razorpay%20SDK-0c2340.svg)](https://razorpay.com/)
[![API Spec](https://img.shields.io/badge/API-OpenAPI%203.0%20%2F%20Swagger-85ea2d.svg)](http://localhost:4000/api/docs)
[![E2E Verification](https://img.shields.io/badge/E2E%20Suite-8%20of%208%20Steps%20Verified-brightgreen.svg)](scripts/verify-quick-flow.js)

---

### Executive Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Enterprise Problem vs The DealFlow360 Solution](#2-the-enterprise-problem-vs-the-dealflow360-solution)
3. [60-Second Guided Evaluation Tour](#3-60-second-guided-evaluation-tour)
4. [Autonomous Business Engines](#4-autonomous-business-engines)
   - [4.1 Dual-Ceiling Governance Matrix and Zero-Click Router](#41-dual-ceiling-governance-matrix-and-zero-click-router)
   - [4.2 The Red-Dashed Loop: Counter-Offer Policy Re-Routing](#42-the-red-dashed-loop-counter-offer-policy-re-routing)
   - [4.3 Haversine Geodesic Multi-Depot Inventory Splitting & Backorders](#43-haversine-geodesic-multi-depot-inventory-splitting--backorders)
   - [4.4 Hybrid Billing Split and Calendar-Day Proration Engine](#44-hybrid-billing-split-and-calendar-day-proration-engine)
   - [4.5 Native FP-Growth Algorithm & Hybrid Market Basket Intelligence](#45-native-fp-growth-algorithm--hybrid-market-basket-intelligence)
   - [4.6 Razorpay Payment Gateway & Cryptographic Settlement](#46-razorpay-payment-gateway--cryptographic-settlement)
   - [4.7 Continuous Deal Health & Anomaly Surveillance](#47-continuous-deal-health--anomaly-surveillance)
   - [4.8 Media Storage, Security & Sliding-Window Rate Limiting](#48-media-storage-security--sliding-window-rate-limiting)
5. [System Architecture and Data Flow](#5-system-architecture-and-data-flow)
6. [Mathematical Specifications and Governance Logic](#6-mathematical-specifications-and-governance-logic)
7. [Database Architecture and Production Index Strategy](#7-database-architecture-and-production-index-strategy)
8. [Role-Based Access Control and Persona Directory](#8-role-based-access-control-and-persona-directory)
9. [Complete Application Screen Catalog](#9-complete-application-screen-catalog)
10. [REST API Gateway and Endpoint Reference](#10-rest-api-gateway-and-endpoint-reference)
11. [Installation, Configuration, and Quickstart Runbook](#11-installation-configuration-and-quickstart-runbook)
12. [Automated Verification and Test Suites](#12-automated-verification-and-test-suites)
13. [Monorepo Codebase Layout](#13-monorepo-codebase-layout)
14. [Troubleshooting, Reliability & Production Operations](#14-troubleshooting-reliability--production-operations)
15. [Enterprise Standards & Indian Rupee (INR) Standardization](#15-enterprise-standards--indian-rupee-inr-standardization)

---

## 1. Executive Summary

DealFlow360 is an enterprise-grade Configure, Price, Quote (CPQ), sales governance, and revenue operations platform engineered to eliminate margin leakage, accelerate quotation-to-cash cycle velocity, and automate commercial policy enforcement across complex B2B negotiations.

Legacy enterprise resource planning (ERP) platforms excel at post-facto transactional ledger accounting, but fail during dynamic, multi-party sales negotiations. Sales representatives negotiate unapproved discounts in private email threads, commercial managers lack immediate visibility into compound concession impacts on gross margins, fulfillment teams discover stock fragmentation only after order signing, and accounting teams spend weeks manually splitting mixed hardware capital expenditures from recurring SaaS software subscriptions.

DealFlow360 resolves these systematic operational failures through an autonomous engine that:
* Enforces real-time **Dual-Ceiling Governance** across customer relationship tiers and product category margins, auto-approving in-policy quotes via a **Zero-Click Router** while escalating breaches to tiered review queues.
* Secures customer negotiations via tokenized portals that mask internal wholesale costs and margins, automatically intercepting buyer counter-offers through the **Red-Dashed Loop** to reset status and mandate re-approval when concession ceilings are breached.
* Executes a **Geodesic Haversine Multi-Depot Allocation Engine** across distributed warehouses, partitioning inventory by freight cost and isolating unfulfillable stock into tracked backorders.
* Bifurcates confirmed orders into **Split Hybrid Invoicing**: Net 30 one-time commercial invoices for physical equipment and automated recurring SaaS subscription contracts with high-precision calendar-day proration.
* Settles accounts receivable natively via **Razorpay** with server-side HMAC-SHA256 cryptographic verification and generates browser-native corporate documents formatted in Indian Rupee (INR / ₹).
* Delivers market basket intelligence through a **Native FP-Growth Association Rule Engine** in TypeScript, computing Lift, Support, and Confidence to drive 1-click upsells directly in the CPQ cart.

---

## 2. The Enterprise Problem vs The DealFlow360 Solution

| Operational Vector | Legacy Enterprise ERP / Manual Workflows | DealFlow360 Autonomous Platform |
| :--- | :--- | :--- |
| **Discount Enforcement** | Post-facto audits; sales reps offer concessions that silently wipe out margins. | **Real-Time Dual Ceilings:** Automatically enforces customer tier caps and category floors before quotation submission. |
| **Approval Routing** | Deals sit idle in email threads or slow, rigid multi-day approval tickets. | **Zero-Click Router:** In-policy proposals auto-approve instantly; deviations route conditionally to L1 Manager or L2 Finance. |
| **Customer Negotiation** | Unmonitored PDF markups and email chains; buyers bypass sales policies. | **The Red-Dashed Loop:** Tokenized portal with masked wholesale costs; counter-offers breaching policy lock confirmation and revert to management. |
| **Inventory Allocation** | Manual stock queries; orders rejected post-sale due to multi-warehouse fragmentation. | **Haversine Geodesic Allocation:** Computes lowest-cost split across nearest depots and isolates backorders automatically. |
| **Mixed-Model Invoicing** | Manual spreadsheet reconciliation to separate hardware capex from SaaS ARR. | **Hybrid Billing Split:** Automatically generates Net 30 invoices for hardware and subscription contracts for recurring software. |
| **Subscription Amendments** | Coarse monthly approximations leading to customer disputes over seat upgrades. | **Calendar-Day Proration:** High-precision unbilled fraction calculation with an immutable, append-only proration ledger. |
| **Upsell Intelligence** | Static manual catalogs or unranked upsell suggestions without margin awareness. | **Native FP-Growth Engine:** Mined association rules (Lift, Confidence) combined with live margin deltas and stock validation. |
| **Payment Collection** | Disconnected bank wire checks requiring manual ERP bank reconciliation. | **Native Razorpay Gateway:** Instant checkout via UPI, Cards, Net Banking, and NEFT with HMAC-SHA256 signature verification. |
| **Currency & Remittance** | Hardcoded foreign currency templates without local banking remittance. | **Full INR Standardization:** Domestic banking rails, IFSC, UPI handles, and Indian Rupee notation across all screens and documents. |

---

## 3. 60-Second Guided Evaluation Tour

To evaluate the platform end-to-end, launch the local environment ([Installation Runbook](#11-installation-configuration-and-quickstart-runbook)) and execute these four test workflows:

### Scenario A: Real-Time CPQ, AI Upsell, and Zero-Click Auto-Approval
1. Navigate to `http://localhost:3000/quotations` and sign in as Sales Representative (`rep@dealflow.com` / `123456`).
2. Click **New Quotation**, select **Acme Enterprises Inc** (Gold Tier, 15.0% allowable ceiling), and add **Laptop Pro 14** (24 units at ₹1,200.00).
3. Set the line discount to `8.0%`. Notice the real-time gross margin recalculation (margin remains healthy at >30%).
4. The **AI Recommendation Engine** surfaces a 1-click upsell: *Wireless Ergonomic Mouse* or *Docking Station*. Click **1-Click Add**.
5. Click **Submit Quotation**. Because all line items fall within the 15.0% Gold ceiling, the zero-click router auto-approves the proposal, advancing it directly to `SENT_TO_CUSTOMER`.

### Scenario B: The Policy Breach and Red-Dashed Loop Negotiation
1. Create a quote for **Beta Manufacturing Ltd** (Silver Tier, 10.0% ceiling) and input a `14.0%` line discount.
2. Submit the quote. The governance engine flags a `+4.0pt` policy breach and assigns the deal **High Blended Risk**, routing it to `PENDING_APPROVAL`.
3. Sign out and sign in as Sales Manager (`manager@dealflow.com` / `123456`). Navigate to `/approvals`, review the deviation audit, and click **Approve Exception**.
4. The quote transitions to `SENT_TO_CUSTOMER` with a secure portal token generated.
5. Open the customer link (`/portal/quote/[token]`). Internal costs and margins are invisible. As the customer, propose an `18.0%` counter-discount.
6. The **Red-Dashed Loop** activates: the quotation status immediately revokes back to `PENDING_APPROVAL`, locking customer confirmation controls until management signs off on the negotiated terms.

### Scenario C: Haversine Multi-Depot Warehouse Splitting & Backorders
1. Sign in as Operations Administrator (`admin@dealflow.com` / `123456`) and confirm a quotation demanding 40 units of hardware.
2. Open `/fulfillment`. The single-depot check identifies that no single facility has 40 units in stock.
3. The greedy allocation engine computes the lowest cost-weight distribution across nearest depots (e.g. San Francisco Bay Depot and Chicago Central Depot), assigning available stock and isolating any deficit into `quantityBackordered`.

### Scenario D: Instant Razorpay Payment and Printable Invoice PDF
1. Navigate to `/invoices` as Finance Controller (`finance@dealflow.com` / `123456`).
2. Select any `UNPAID` invoice and click **Pay**.
3. In the payment modal, click **Pay ₹... with Razorpay**.
4. The Razorpay checkout modal opens. Select **UPI** (`success@razorpay`) or **Card** (`4111 1111 1111 1111`, expiry `12/28`, CVV `123`, OTP `Success`).
5. Upon completion, the backend cryptographically verifies the HMAC-SHA256 signature, sets the invoice status to `PAID`, and logs the transaction reference.
6. Click **Download / Print**. A formatted HTML invoice opens with print stylesheets (`@media print`) and bank remittance details (HDFC Bank IFSC / UPI).

---

## 4. Autonomous Business Engines

### 4.1 Dual-Ceiling Governance Matrix and Zero-Click Router

DealFlow360 continuously checks quotation line items against two concurrent boundary constraints:
1. **Customer Relationship Tier Ceilings:**
   * Bronze: `5.0%` maximum discount concession.
   * Silver: `10.0%` maximum discount concession.
   * Gold: `15.0%` maximum discount concession.
2. **Product Classification Ceilings:**
   * Hardware: `15.0%` ceiling (capital physical assets).
   * Professional Services: `10.0%` ceiling (billable engineering hours).
   * Software Subscriptions: `15.0%` ceiling (recurring software contracts).

```mermaid
flowchart TD
    StartQuote[Quotation Line Submitted] --> CalculateLimits["AllowedCeiling = min(TierCeiling, CategoryCeiling)"]
    CalculateLimits --> ComputeDeviation["LineDeviation = max(0, ProposedDiscount - AllowedCeiling)"]
    ComputeDeviation --> EvaluateEffective["EffectiveDeviation = max(MaxLineDeviation, CumulativeDeviation)"]
    
    EvaluateEffective --> CheckZero{EffectiveDeviation == 0?}
    CheckZero -- Yes --> AutoApprove["Zero-Click Auto-Approve<br/>Status: SENT_TO_CUSTOMER"]
    
    CheckZero -- No --> CheckL1{EffectiveDeviation <= 5.0%?}
    CheckL1 -- Yes --> RouteL1["Single-Tier Review<br/>Role: Sales Manager (L1)"]
    
    CheckL1 -- No --> RouteL2["Two-Tier Sequential Review<br/>Stage 1: Sales Manager (L1)<br/>Stage 2: Finance Controller (L2)"]
    
    RouteL1 --> ApprovedL1[Manager Approves] --> FinalApprove["Status: SENT_TO_CUSTOMER"]
    RouteL2 --> ApprovedL1Seq[Manager Signs L1] --> FinanceSign[Finance Controller Signs L2] --> FinalApprove
```

* **Segregation of Duties:** The approval service explicitly blocks sales representatives from approving their own quotations (`salesRepId === currentUser.id`), requiring independent managerial sign-off.

---

### 4.2 The Red-Dashed Loop: Counter-Offer Policy Re-Routing

External procurement teams collaborate through a tokenized portal (`/portal/quote/[token]`) where internal wholesale costs (`baseCost`, `unitCost`, `totalCost`) and margin percentages (`lineMarginPercent`, `totalMarginPercent`) are omitted from API serialization.

When an external customer proposes a counter-discount that exceeds allowable ceilings, the platform initiates the **Red-Dashed Loop**:

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Representative
    actor Mgr as Sales Manager (L1)
    actor Cust as Enterprise Customer
    participant Core as DealFlow360 API Gateway
    participant DB as PostgreSQL Database

    Rep->>Core: Builds Quote (24 units at 14% discount)
    Core->>DB: Detects 4.0pt Silver Breach -> PENDING_APPROVAL
    Mgr->>Core: Manager Approves Exception
    Core->>DB: Advances to SENT_TO_CUSTOMER (Token Issued)
    Core-->>Cust: Dispatches Secure Portal Link
    
    Note over Cust,Core: Customer Portal (Wholesale Costs & Margins Masked)
    Cust->>Core: Proposes 18% Counter-Discount
    
    rect rgb(254, 242, 242)
        Note over Core,DB: RED-DASHED LOOP ACTIVATION
        Core->>Core: Evaluates 18% vs 10% ceiling -> +8.0pt breach
        Core->>DB: Reverts status: PENDING_APPROVAL
        Core->>DB: Generates ApprovalRequest & Audit Log
        Core-->>Cust: Locks confirmation controls in portal
        Core-->>Mgr: Re-routes deal to Manager Approval Queue
    end
    
    Mgr->>Core: Approves Counter Terms
    Core->>DB: Transitions status: SENT_TO_CUSTOMER
    Cust->>Core: Executes Digital Sign-Off (/accept)
    Core->>DB: Transitions status: CONFIRMED
    Core->>Core: Triggers Stock Split and Invoicing
```

* **Shortage Review Resolution:** When inventory deficits occur, operations can submit a shortage proposal (`POST /api/fulfillments/:id/propose-shortage`). The buyer can accept partial immediate dispatch (`ACCEPTED_PARTIAL`) with automatic financial recalculation or place the order on hold pending full restock (`WAIT_RESTOCK`).

---

### 4.3 Haversine Geodesic Multi-Depot Inventory Splitting & Backorders

When an order containing physical items (`HARDWARE`) is confirmed, the fulfillment engine resolves inventory across registered warehouse depots:
1. **Haversine Geodesic Calculation:** Computes great-circle distances between the customer's shipping coordinates (`shippingLatitude`, `shippingLongitude`) and depot locations (`latitude`, `longitude`):
   584808d = 2R rcsin\left(\sqrt{\sin^2\left(rac{\Delta \phi}{2}ight) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(rac{\Delta \lambda}{2}ight)}ight)584808
2. **Transit Time Estimation:** Ranks facilities by distance (0–300 km: 1 day; 301–1,000 km: 2 days; >1,000 km: 4 days). If GPS coordinates are omitted, ranks by `shippingCostWeight` and `defaultLeadDays`.
3. **Single-Depot Fast Path:** Checks if the nearest depot holds 100% of all required items. If so, assigns the entire order to that single facility to avoid split-shipment freight overhead.
4. **Greedy Multi-Depot Waterfall Solver:** If no single facility can satisfy the order, available units are allocated from the lowest-cost nearest depots until line demand is met.
5. **Automated Backorder Pool:** If network-wide stock is insufficient, fulfilled items are dispatched and unfulfilled units are isolated in `quantityBackordered` with `FulfillmentStatus.BACKORDER`.
6. **Stock Deduction & Consolidate Backorders:** Dispatching (`POST /api/fulfillments/:id/dispatch`) atomically decrements `inStock` and `available` in `WarehouseStock`. When fresh stock arrives, `POST /api/fulfillments/:id/consolidate-backorder` automatically re-allocates inventory to clear pending backorders.

---

### 4.4 Hybrid Billing Split and Calendar-Day Proration Engine

Orders containing mixed products are partitioned automatically into synchronized commercial documents via `POST /api/invoices/generate-from-quotation/:quotationId`:
* **One-Time Commercial Invoices:** Issued under Net 30 maturity with unique sequence identifiers (`INV-XXXX`) for hardware and professional services.
* **Recurring Subscriptions:** Activated under recurring contract cycles (`WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`) with automated renewal schedules (`nextBillingDate`).
* **Initial Cycle Invoices:** Generated under Net 15 terms (`INV-SUB-XXXX`) linked directly to the parent `Subscription`.
* **High-Precision Calendar-Day Proration:** When seat or unit counts change mid-cycle, unbilled fractions are calculated down to the calendar day:
   584808	ext{ProratedDeltaAmount} = \left(rac{	ext{DaysRemaining}}{	ext{CycleDays}}ight) 	imes (	ext{NewRecurringAmount} - 	ext{OldRecurringAmount})584808
   Every financial adjustment is recorded in an immutable append-only `SubscriptionProrationLog`. Cancellation refunds similarly calculate remaining unbilled fractions.

---

### 4.5 Native FP-Growth Algorithm & Hybrid Market Basket Intelligence

DealFlow360 implements a high-performance native TypeScript FP-Growth (Frequent Pattern Growth) association rule mining engine ([`fp-growth.engine.ts`](apps/backend/src/upsell-rules/fp-growth.engine.ts)) paired with admin curation to drive cart upsells.

```text
Historical B2B Orders ──► Transaction Baskets ──► FP-Tree Construction ──► Association Rules {Antecedents} => {Consequents}
                                                                                   │
                                                                   Support, Confidence, Lift
                                                                                   │
                                                                                   ▼
Cart Items ──► Match Rules + Admin Curated Feed ──► Stock Filter ──► Composite Scoring ──► Top-Ranked 1-Click Upsells
```

* **Composite Recommendation Scoring Formula:**
   584808	ext{Score} = 	ext{Lift} 	imes \left(rac{	ext{MarginPercent}}{100}ight) 	imes (1.3^{	ext{isPromoted}}) 	imes (1.25^{	ext{isMultiItemCart}}) 	imes 10584808
* **Multi-Channel Blending:**
   1. **Channel 1 (Admin Direct Feed):** Curated recommendations (`AdminCuratedUpsell`) prioritized by rank (1 to 5) with strict stock availability checks.
   2. **Channel 2 (Combined Cart Co-Occurrence):** Identifies items frequently purchased alongside all cart items simultaneously, sorted by margin percentage.
   3. **Channel 3 (FP-Growth Association Mining):** Mines rules with Lift $\ge 1.05$ and Confidence $\ge 0.20$, prioritizing high-margin pairings.
* **Standalone Python AI Engine:** Includes [`apps/ai-service/market_basket_fpgrowth.py`](apps/ai-service/market_basket_fpgrowth.py) using `mlxtend` / pure-Python fallback for offline training on live PostgreSQL databases.

---

### 4.6 Razorpay Payment Gateway & Cryptographic Settlement

Online receivables are settled through a two-step payment gateway flow:
1. **Order Initialization (`POST /api/invoices/:id/razorpay/order`):** Instantiates the Razorpay SDK client and generates an order in Indian Rupee denominated in paise (`Math.round(invoice.amount * 100)`).
2. **Interactive Checkout:** Frontend dynamically mounts Razorpay Checkout (`checkout.js`), accepting UPI (`success@razorpay`), Credit/Debit Cards, Net Banking, and NEFT.
3. **HMAC-SHA256 Signature Verification (`POST /api/invoices/:id/razorpay/verify`):** Cryptographically verifies the payment signature using the server-side secret:
   584808	ext{GeneratedSignature} = 	ext{HMAC-SHA256}(	ext{keySecret},\ 	ext{razorpay\_order\_id} + "|" + 	ext{razorpay\_payment\_id})584808
   If the signature matches `razorpay_signature`, the invoice transitions to `PAID`, `paidAt` is set, and a `Payment` record is created.

---

### 4.7 Continuous Deal Health & Anomaly Surveillance

A deal intelligence surveillance monitor audits active opportunities in real time:
* **Stalled Deal Scanner:** Flags quotations with zero activity for more than 7 consecutive days in active negotiation (`SENT_TO_CUSTOMER`, `UNDER_NEGOTIATION`, `DRAFT`).
* **90-Day Rolling Rep Median Anomaly Detector:** Queries historical quotation lines closed by the sales representative over the last 90 days, computes the true statistical median, and flags a `DISCOUNT_ANOMALY` if a proposed discount exceeds $	ext{Median} + 10.0	ext{pt}$. Anomalies automatically escalate the quotation to `HIGH` risk.
* **Delivery Promise Slippage Tracker:** Calculates lead time plus transit days across allocated warehouses; if earliest arrival exceeds `promisedDeliveryDate`, flags `DELIVERY_SLIPPAGE`.
* **Managerial Coaching Nudges:** Enables managers to send structured nudges (`POST /api/analytics/nudge`) that inject guidance directly into quotation comments and update `lastActivityAt`.

---

### 4.8 Media Storage, Security & Sliding-Window Rate Limiting

* **MinIO S3 Object Storage (`StorageService`):** Connects to MinIO S3 API on port `9000`, configures bucket `dealflow-media` with public read policies for user avatars and cover banners, and provides Multer upload handlers (`POST /api/users/profile/avatar` and `POST /api/users/profile/banner`).
* **Argon2 Password Hashing & JWT Rotation:** Passwords hashed with Argon2; authentication uses short-lived access tokens (15 minutes) and rotating refresh tokens (7 days) with session invalidation on logout.
* **Email OTP & Magic Links (`MailService`):** Nodemailer integration providing 6-digit email OTPs for self-service signup verification and 15-minute tokenized password reset links.
* **Redis Sliding-Window Rate Limiter (`RateLimitGuard`):** Applied globally across HTTP routes via `APP_GUARD`.
   - Default rate limit: 100 requests per 60 seconds per IP/User.
   - Strict auth rate limit: 5 requests per 60 seconds on sensitive endpoints (`/signup/initiate`, `/password-reset/initiate`).
   - Standard RFC headers attached: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.
   - Health check exempt via `@SkipRateLimit()`; fail-open design prevents Redis glitches from disrupting traffic.

---

## 5. System Architecture and Data Flow

```text
+---------------------------------------------------------------------------------------------------+
|                                      CLIENT LAYER (PORT 3000)                                     |
|                                                                                                   |
|  +-----------------------------------------------------+  +------------------------------------+  |
|  |           ENTERPRISE OPERATIONS CONSOLE             |  |      CUSTOMER NEGOTIATION PORTAL   |  |
|  |   /dashboard   /pipeline   /quotations  /approvals  |  |      /portal/quote/:token          |  |
|  |   /fulfillment /invoices   /subscriptions /health   |  |      (Masked Wholesale Costs)      |  |
|  +-----------------------------------------------------+  +------------------------------------+  |
+---------------------------------------------------|----------------------------------|------------+
                                                    | Bearer JWT                       | Signed Token
                                                    v                                  v
+---------------------------------------------------------------------------------------------------+
|                                APPLICATION GATEWAY: NESTJS (PORT 4000)                            |
|                                                                                                   |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
|  |   RATE LIMIT GUARD  |  |     AUTH & RBAC     |  |   CPQ MARGIN CALC   |  |   ZERO-CLICK     |  |
|  |  Redis Fixed Window |  |   Argon2 / JWT      |  |  Dual-Ceiling Logic |  |  Approval Router |  |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
|  |   NATIVE FP-GROWTH  |  |  HAVERSINE SPLITTER |  |   HYBRID INVOICING  |  |     RAZORPAY     |  |
|  |  Association Rules  |  |  Multi-Depot Solver |  |  Net 30 / MRR Split |  |  HMAC Verification|  |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
+---------------------------------------------------|-----------------------------------------------+
                                                    | Prisma ORM 5.14
                                                    v
+---------------------------------------------------------------------------------------------------+
|                                        PERSISTENCE & INFRASTRUCTURE                               |
|                                                                                                   |
|  +-----------------------------------+  +-------------------------+  +-------------------------+  |
|  |       POSTGRESQL 16 DATABASE      |  |       REDIS 7 CACHE     |  |     MINIO S3 STORAGE    |  |
|  |  26 Relational Models             |  |  Rate Limiting Counters |  |  Bucket: dealflow-media |  |
|  |  5 Production Indexes             |  |  Session Store          |  |  Avatars & Banners      |  |
|  +-----------------------------------+  +-------------------------+  +-------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Mathematical Specifications and Governance Logic

### 1. Allowable Discount Ceiling and Line Deviation
584808	ext{AllowedCeiling} = \min\Big(	ext{TierCeiling}[	ext{CustomerTier}],\ 	ext{CategoryCeiling}[	ext{ProductCategory}]\Big)584808
584808	ext{OverLimitPoints} = \max\Big(0.0,\ 	ext{ProposedDiscountPercent} - 	ext{AllowedCeiling}\Big)584808

### 2. Line-Item Financial Calculations
584808	ext{LineGross} = 	ext{UnitPrice} 	imes 	ext{Quantity}584808
584808	ext{LineDiscountAmount} = 	ext{LineGross} 	imes \left(rac{	ext{DiscountPercent}}{100}ight)584808
584808	ext{LineTotal} = 	ext{LineGross} - 	ext{LineDiscountAmount}584808
584808	ext{LineCostTotal} = 	ext{UnitCost} 	imes 	ext{Quantity}584808
584808	ext{LineMarginPercent} = egin{cases}
\displaystyle \left(rac{	ext{LineTotal} - 	ext{LineCostTotal}}{	ext{LineTotal}}ight) 	imes 100 & 	ext{if } 	ext{LineTotal} > 0 \
0.0 & 	ext{otherwise}
\end{cases}584808

### 3. Blended Quotation Valuation and Risk Scoring
584808	ext{Subtotal} = \sum_{	ext{lines}} 	ext{LineGross}584808
584808	ext{LineDiscountsTotal} = \sum_{	ext{lines}} 	ext{LineDiscountAmount}584808
584808	ext{OrderDiscountValue} = (	ext{Subtotal} - 	ext{LineDiscountsTotal}) 	imes \left(rac{	ext{OrderDiscountPercent}}{100}ight)584808
584808	ext{FinalPayableAmount} = \max\Big(0.0,\ 	ext{Subtotal} - (	ext{LineDiscountsTotal} + 	ext{OrderDiscountValue})\Big)584808
584808	ext{BlendedMarginPercent} = \left(rac{	ext{FinalPayableAmount} - \sum 	ext{LineCostTotal}}{	ext{FinalPayableAmount}}ight) 	imes 100584808
584808	ext{MaxLineDeviation} = \max_{	ext{lines}}(	ext{OverLimitPoints})584808
584808	ext{TotalConcessionDeviation} = \sum_{	ext{lines}}(	ext{OverLimitPoints}) + 	ext{OrderDiscountPercent}584808

584808	ext{BlendedRiskLevel} = egin{cases}
\mathbf{LOW} & 	ext{MaxLineDeviation} = 0 	ext{ and } 	ext{TotalConcessionDeviation} = 0 \implies 	ext{Zero-Click Auto-Approve} \
\mathbf{MEDIUM} & 	ext{MaxLineDeviation} \le 5.0 	ext{ and } 	ext{TotalConcessionDeviation} \le 5.0 \implies 	ext{Sales Manager (L1)} \
\mathbf{HIGH} & 	ext{MaxLineDeviation} > 5.0 	ext{ or } 	ext{TotalConcessionDeviation} > 5.0 	ext{ or Rep Anomaly} \implies 	ext{Manager (L1)} 	o 	ext{Finance (L2)}
\end{cases}584808

### 4. 90-Day Rolling Rep Median Discount Anomaly
584808	ext{Threshold} = 	ext{HistoricalMedian}_{90d} + 10.0	ext{pt}584808
584808	ext{isAnomaly} = 	ext{ProposedDiscount} > 	ext{Threshold}584808

### 5. Multi-Depot Freight Cost Calculation
584808	ext{ShipmentCost} = 	ext{QuantityFulfilled} 	imes 10.0 	imes 	ext{WarehouseCostWeight} 	imes \left(1.2^{	ext{DistanceKm} > 500}ight)584808

### 6. High-Precision Calendar-Day Proration
584808	ext{DaysRemaining} = \max\left(0,\ \left\lceil rac{	ext{NextBillingDate} - 	ext{AdjustmentDate}}{86,400,000} ightceilight)584808
584808	ext{CycleDays} = egin{cases} 7 & 	ext{WEEKLY} \ 30 & 	ext{MONTHLY} \ 90 & 	ext{QUARTERLY} \ 365 & 	ext{YEARLY} \end{cases}584808
584808	ext{ProratedDelta} = \left(rac{	ext{DaysRemaining}}{	ext{CycleDays}}ight) 	imes (	ext{NewRecurringRate} - 	ext{OldRecurringRate})584808

---

## 7. Database Architecture and Production Index Strategy

### 7.1 Entity Relationship Specification

The schema defined in [`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma) implements 26 relational models and 13 database enums:

```mermaid
erDiagram
    User ||--o{ Quotation : "creates as salesRep"
    User ||--o{ ApprovalAuditLog : "authorizes"
    User ||--o{ Customer : "manages"
    Customer ||--o{ Quotation : "receives"
    Customer ||--o{ Subscription : "contracts"
    Customer ||--o{ Invoice : "billed"

    Quotation ||--|{ QuotationLine : "contains"
    Quotation ||--o{ ApprovalRequest : "evaluates"
    Quotation ||--o| FulfillmentOrder : "dispatches"
    Quotation ||--o{ Invoice : "invoices"
    Quotation ||--o{ Subscription : "contracts"
    Quotation ||--o{ QuotationComment : "negotiates"
    Quotation ||--o{ DealHealthAlert : "monitors"

    ApprovalRequest ||--|{ ApprovalAuditLog : "audit trail"
    FulfillmentOrder ||--|{ FulfillmentSplitItem : "allocates"

    Product ||--o{ QuotationLine : "itemized"
    Product ||--o{ WarehouseStock : "stored"
    Product ||--o{ ProductVariant : "variants"
    Product ||--o{ ProductCoPurchaseRule : "paired"
    Product ||--o{ AdminCuratedUpsell : "curated"

    Warehouse ||--|{ WarehouseStock : "stocks"
    Warehouse ||--o{ FulfillmentSplitItem : "dispatches"

    Subscription ||--|{ SubscriptionProrationLog : "audit proration"
    Subscription ||--o{ Invoice : "recurring bills"
    Invoice ||--o{ Payment : "settles"
```

### 7.2 Production Index Strategy

To maintain sub-millisecond query latency on enterprise data sets while preventing write amplification, DealFlow360 enforces 5 targeted production indexes:

```prisma
// Quotation Pipeline Stage Filtering Index
model Quotation {
  ...
  @@index([status])
  @@index([customerId])
}

// CPQ Line Item Assembly Index
model QuotationLine {
  ...
  @@index([quotationId])
}

// Automated Subscription Renewal Scanner Index
model Subscription {
  ...
  @@index([status, nextBillingDate])
}

// Accounts Receivable Aging Index
model Invoice {
  ...
  @@index([status])
}
```

| Model | Index Directive | Operational Impact |
| :--- | :--- | :--- |
| `Quotation` | `@@index([status])` | Accelerates 5-column Kanban aggregation and pending approval queue filtering. |
| `Quotation` | `@@index([customerId])` | Speeds up customer dossier lookups, credit history, and historical quotation queries. |
| `QuotationLine` | `@@index([quotationId])` | Optimizes high-frequency relational joins during line-item updates and margin recalculations. |
| `Subscription` | `@@index([status, nextBillingDate])` | Enables instantaneous batch scanning for recurring invoice billing cycles. |
| `Invoice` | `@@index([status])` | Provides zero-latency ledger partitioning across UNPAID, PAID, and OVERDUE receivables. |

---

## 8. Role-Based Access Control and Persona Directory

Security is enforced via Argon2 password verification and dual-token JWT authentication (Access Token: 15 minutes, Refresh Token: 7 days).

| System Role | Portal Access | CPQ Builder | Approval Inbox | Fulfillment | Invoices & Razorpay | Governance Config |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Sales Representative** (`SALES_REP`) | No | Full Create/Edit | Submit Only | Read Only | View Only | Read Only |
| **Sales Manager** (`SALES_MANAGER`) | No | Full Access | Level 1 (L1) | Read / Split | View Only | Read Only |
| **Finance Controller** (`FINANCE`) | No | Read Only | Level 2 (L2) | Read / Override | Full Write / Settle | Read Only |
| **System Administrator** (`ADMIN`) | No | Full Access | Full Access | Full Access | Full Access | Full Access |
| **Enterprise Customer** (`CUSTOMER`) | Restricted | No | Counter-Offer | No | View / Razorpay Pay | No |

### Pre-Configured Demonstration Accounts

All demonstration accounts are provisioned via `pnpm seed` with standard initial password: `123456`.

* **System Administrator:** `admin@dealflow.com` (Aniket Dabhi — Executive Administration)
* **Sales Representative:** `rep@dealflow.com` (J. Rao — Direct Sales Account Executive)
* **Sales Manager (L1 Approver):** `manager@dealflow.com` (M. Shah — Commercial Sales Director)
* **Finance Controller (L2 Approver):** `finance@dealflow.com` (R. Iyer — Revenue Operations Controller)
* **Enterprise Customer:** `customer@dealflow.com` (Vikram Mehta — Procurement Lead)

---

## 9. Complete Application Screen Catalog

The frontend is built with Next.js 14 App Router and Tailwind CSS, organized across 18 dedicated operational screens:

| Screen # | Module Name | Route Path | Authorized Roles | Functional Description |
| :---: | :--- | :--- | :--- | :--- |
| **01** | **Authentication Portal** | `/auth` | Public / All | JWT credential login, 2FA OTP verification, session management. |
| **02** | **Password Recovery** | `/auth/reset-password` | Public / All | Secure magic link password recovery with Argon2 hashing. |
| **03** | **Executive Dashboard** | `/dashboard` | Internal Roles | Real-time KPI cards: pipeline value, active deals, win rate, pending approvals. |
| **04** | **Opportunity Pipeline** | `/pipeline` | Rep, Manager, Admin | Interactive 5-column Kanban board with stage counts and valuations. |
| **05** | **CPQ Quotation Engine** | `/quotations` | Rep, Manager, Admin | Interactive CPQ builder, live margin badges, 1-click AI upsell drawer. |
| **06** | **Approval Governance** | `/approvals` | Manager, Finance | Approval inbox filtering by risk level (`MEDIUM` / `HIGH`) with audit trail. |
| **07** | **Inventory Fulfillment** | `/fulfillment` | Ops, Finance, Admin | Multi-depot split inspector, cost calculation, backorder tracking. |
| **08** | **Recurring Subscriptions**| `/subscriptions` | Finance, Admin | Active, Paused, Cancelled MRR agreements with calendar-day proration. |
| **09** | **Customer Portal** | `/portal/quote/[token]`| **Customer (Tokenized)**| Masked proposal presentation, line discussions, counter-offer form. |
| **10** | **Invoices & Receivables** | `/invoices` | Finance, Admin | Split invoice ledger, Razorpay payment modal, printable HTML/PDF generator. |
| **11** | **Pipeline Surveillance** | `/health` | Manager, Admin | Anomaly monitor: stalled quotes (>7d), rep discount median breaches (+10pt). |
| **12** | **Executive Reports & BI** | `/reports` | Manager, Admin | Revenue reports by customer tier and category; CSV and printable PDF export. |
| **13** | **Catalog Management** | `/products` | Rep, Manager, Admin | Product master with SKU search, unit costs, pricing, and variant manager. |
| **14** | **Warehouse Master** | `/warehouses` | Ops, Admin | Depot directory, geographic coordinates, lead days, stock adjustments. |
| **15** | **Customer Directory** | `/customers` | Rep, Manager, Admin | Enterprise accounts with relationship tier classifications and deal history. |
| **16** | **Governance Settings** | `/governance` | Admin | Tier discount caps, product category ceilings, approval chain matrices. |
| **17** | **User Administration** | `/users` | Admin | Internal user provisioning, role assignments, team configurations. |
| **18** | **User Profile** | `/profile` | Authenticated | Personal profile details, MinIO avatar/banner upload, session info. |

---

## 10. REST API Gateway and Endpoint Reference

Interactive Swagger documentation is mounted at `http://localhost:4000/api/docs`.

### Authentication & Identity
```http
POST   /api/auth/signup/initiate             Step 1: Validate signup and send 6-digit OTP email
POST   /api/auth/signup/verify               Step 2: Verify OTP, create user account, return tokens
POST   /api/auth/login                       Argon2 credential verification, return access & refresh tokens
POST   /api/auth/refresh                     Rotate refresh token and issue new access token
POST   /api/auth/logout                      Invalidate active refresh token session
POST   /api/auth/password-reset/initiate     Step 1: Dispatch password reset magic link email
GET    /api/auth/password-reset/validate     Validate password reset magic link token
POST   /api/auth/password-reset/verify       Step 2: Verify token and update password with Argon2
GET    /api/auth/me                          Retrieve authenticated user profile
```

### CPQ & Quotations
```http
GET    /api/quotations/pipeline              5-column Kanban pipeline data with stage counts and valuations
GET    /api/quotations                       Query quotations with status, customer, rep, and search filters
POST   /api/quotations                       Create new quotation in DRAFT state
GET    /api/quotations/:id                   Full quote details, line items, limit badges, and approval history
PUT    /api/quotations/:id/lines             Update quotation lines with real-time limit badges and margin recalculation
POST   /api/quotations/:id/submit            Submit quotation through zero-click approval router
GET    /api/quotations/:id/upsell-suggestions Retrieve ranked AI upsell recommendations based on quote cart
POST   /api/quotations/:id/lines/upsell      1-click add recommended upsell product into quote lines
POST   /api/quotations/:id/approve           Approve quotation directly (Manager / Finance)
POST   /api/quotations/:id/reject            Reject quotation directly
POST   /api/quotations/:id/confirm           Confirm quotation into active order
PATCH  /api/quotations/:id/status            Update quotation status (Kanban stage moves)
GET    /api/quotations/:id/comments          Get all comments for a quotation
POST   /api/quotations/:id/comments          Add negotiation comment or sales note
```

### Approval Governance
```http
GET    /api/approvals                        Retrieve pending approvals filtered by stage, riskLevel, isCompleted
GET    /api/approvals/:id                    Retrieve approval request details with full audit log
POST   /api/approvals/:id/action             Execute action: APPROVED, RETURNED_FOR_REVISION, REJECTED
```

### Customer Negotiation Portal (Tokenized)
```http
GET    /api/portal/quotes                    List available portal quotations (costs/margins masked)
GET    /api/portal/quote/:token              Customer view of quote (costs and margins masked)
POST   /api/portal/quote/:token/accept       Customer 1-click acceptance of quotation terms
POST   /api/portal/quote/:token/confirm       Alias of /accept
POST   /api/portal/quote/:token/comment      Post negotiation comment via customer portal
POST   /api/portal/quote/:token/counter      Submit counter-discount (Red-Dashed Loop: resets to PENDING_APPROVAL)
POST   /api/portal/quote/:token/shortage-action Customer response to shortage proposal (ACCEPT partial or REJECT)
```

### Fulfillment & Multi-Warehouse Split
```http
POST   /api/fulfillments/quotation/:quotationId/split Calculate and execute intelligent multi-warehouse split
GET    /api/fulfillments/quotation/:quotationId Get fulfillment order and split details for a quotation
GET    /api/fulfillments                     List all fulfillment orders (filter by status, hasBackorder)
GET    /api/fulfillments/:id                 Get fulfillment order details by ID
PATCH  /api/fulfillments/:id/override        Manual override of warehouse item allocations
POST   /api/fulfillments/:id/dispatch        Dispatch shipments and deduct physical warehouse inventory
POST   /api/fulfillments/:id/consolidate-backorder Consolidate pending backorders when new stock arrives
POST   /api/fulfillments/:id/propose-shortage Ops records offer to fulfill partial quantity due to shortage
```

### Invoicing, Settlements & Razorpay
```http
POST   /api/invoices/generate-from-quotation/:quotationId Generate split One-Time and Recurring invoices
GET    /api/invoices                         Query commercial invoice ledger (status, type, customer)
GET    /api/invoices/:id                     Get invoice details and payment history
POST   /api/invoices/:id/pay                 Record payment against invoice (marks PAID when balance cleared)
POST   /api/invoices/:id/razorpay/order      Create Razorpay order in INR (paise)
POST   /api/invoices/:id/razorpay/verify     Verify HMAC-SHA256 signature and record settled payment
```

### Subscriptions & Proration
```http
GET    /api/config/subscription-plans        List all subscription plan templates
GET    /api/config/subscription-plans/:id    Get subscription plan template by ID
POST   /api/config/subscription-plans        Create new subscription plan template (Admin)
PUT    /api/config/subscription-plans/:id    Update subscription plan template (Admin)
DELETE /api/config/subscription-plans/:id    Delete subscription plan template (Admin)
GET    /api/subscriptions                    List all active customer subscription contracts
POST   /api/subscriptions                    Create a new subscription contract
GET    /api/subscriptions/:id                Get subscription contract details with proration history
POST   /api/subscriptions/:id/pause          Pause subscription billing
POST   /api/subscriptions/:id/resume         Resume paused subscription
POST   /api/subscriptions/:id/cancel         Cancel subscription contract with automatic proration refund
POST   /api/subscriptions/:id/adjust-quantity Upgrade/downgrade subscription seats with mid-cycle proration delta
```

### Discount Governance & Rules Configuration
```http
GET    /api/config/discount-rules            Retrieve active discount ceilings and approval routing matrix
POST   /api/config/discount-rules/validate-line Validate line discount against tier and category ceilings
POST   /api/config/discount-rules/calculate-blended-risk Compute blended risk score across mixed categories
PUT    /api/config/discount-rules/tier       Update customer tier discount ceiling (Admin)
PUT    /api/config/discount-rules/category   Update product category discount ceiling (Admin)
PUT    /api/config/discount-rules/approval-matrix Update approval chain requirements for risk levels (Admin)
PUT    /api/config/discount-rules            Batch update discount rules or ceilings (Admin)
```

### AI Upsell & Market Basket Configuration
```http
GET    /api/config/upsell-rules              List all upsell / co-purchase pairing rules
GET    /api/config/upsell-rules/:id          Get upsell rule by ID
POST   /api/config/upsell-rules              Create new upsell pairing rule (Admin)
PUT    /api/config/upsell-rules/:id          Update upsell pairing rule (Admin)
DELETE /api/config/upsell-rules/:id          Delete upsell pairing rule (Admin)
GET    /api/config/upsell-rules/curated/list List admin-curated upsell recommendations
POST   /api/config/upsell-rules/curated      Create/update admin-curated recommendation with rank (1 to 5)
DELETE /api/config/upsell-rules/curated/:id  Delete admin-curated upsell rule
POST   /api/config/upsell-rules/cart-recommendations Generate hybrid recommendations (Admin Feed + FP-Growth)
```

### Products, Customers & Warehouses Master
```http
GET    /api/products                         List active catalog products with aggregated stock
POST   /api/products                         Create new catalog product
GET    /api/products/:id                     Get product details, variants, and stock
PUT    /api/products/:id                     Update product pricing and thresholds
DELETE /api/products/:id                     Deactivate catalog product
POST   /api/products/:id/variants            Add product variant (RAM, Storage, Color)
DELETE /api/products/:id/variants/:variantId Delete product variant

GET    /api/customers                        List customer profiles filterable by tier or rep
POST   /api/customers                        Create new customer profile
GET    /api/customers/:id                    Get customer details, assigned rep, and quotes
PATCH  /api/customers/:id                    Update customer tier, rep, or shipping coordinates
DELETE /api/customers/:id                    Delete customer record

GET    /api/warehouses                       List all warehouses with stock metrics
POST   /api/warehouses                       Create a new warehouse facility
GET    /api/warehouses/:id                   Get warehouse details and product stock breakdown
PATCH  /api/warehouses/:id                   Update warehouse details or shipping cost weight
DELETE /api/warehouses/:id                   Delete warehouse facility
POST   /api/warehouses/stock-adjustment      Adjust physical stock levels or reserved counts
POST   /api/warehouses/replenishment-rule    Configure minimum stock replenishment thresholds
```

### Analytics, Surveillance & Reports
```http
GET    /api/analytics/dashboard-metrics      Aggregate pipeline valuation, win rate, and pending counts
GET    /api/analytics/deal-health            Surveillance alerts for stalled quotes and rep anomalies
POST   /api/analytics/nudge                  Send coaching nudge alert to sales rep for stalled quote
GET    /api/analytics/reports                Revenue distribution by tier and product category
GET    /api/analytics/export/csv             Export complete opportunity pipeline as CSV
GET    /api/analytics/export/pdf             Render executive printable PDF pipeline report
```

### User Management, Profile & Storage
```http
GET    /api/users/profile                    Get current authenticated user profile
PATCH  /api/users/profile                    Update profile details (Name, Phone, Team, Location)
POST   /api/users/profile/avatar             Upload profile picture to MinIO S3 object storage
POST   /api/users/profile/banner             Upload cover banner to MinIO S3 object storage
GET    /api/users                            Admin list all users, optionally filtered by Role
POST   /api/users                            Admin provision internal user
GET    /api/users/:id                        Admin retrieve user profile by ID
PATCH  /api/users/:id                        Admin update user details or role
DELETE /api/users/:id                        Admin delete user record
GET    /api/health                           System health and PostgreSQL database connectivity probe
```

---

## 11. Installation, Configuration, and Quickstart Runbook

### 1. System Prerequisites
* **Node.js**: `v18.0.0` or `v20.x` LTS
* **Package Manager**: `pnpm` (`v9.x` or higher)
* **Container Engine**: Docker Desktop or Docker Engine with Docker Compose

### 2. Service Deployment
```bash
# 1. Clone repository
git clone https://github.com/your-org/odoo-boilerplate.git
cd odoo-boilerplate

# 2. Install workspace dependencies
pnpm install

# 3. Automated Onboarding (checks tools, creates .env, boots docker, pushes schema, seeds data)
# On Linux / macOS:
make setup
# On Windows:
make setup-windows
```

### 3. Manual Step-by-Step Runbook
```bash
# 1. Launch infrastructure services (PostgreSQL 16, Redis 7, MinIO S3)
pnpm up

# 2. Push database schema to PostgreSQL
pnpm --filter backend prisma db push

# 3. Seed 500+ realistic enterprise demonstration records
pnpm seed

# 4. Launch development servers concurrently
pnpm dev
```

* Backend API: `http://localhost:4000`
* Frontend Application: `http://localhost:3000`
* Swagger Interactive API Docs: `http://localhost:4000/api/docs`
* Prisma Studio: `pnpm studio` (`http://localhost:5555`)
* MinIO Web Console: `http://localhost:9001` (`minioadmin` / `minioadmin`)

### 4. Environment Configuration Variables

The root `.env` and `apps/backend/.env` files define runtime infrastructure parameters:

```env
# Relational Database (PostgreSQL 16)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/odoo_hackathon?schema=public"

# Cache & Sliding Window Rate Limiting (Redis 7)
REDIS_URL="redis://localhost:6379"

# API Gateway Port
PORT=4000

# Cryptographic Tokens (Argon2 / JWT)
JWT_ACCESS_SECRET="dealflow360_access_secret_super_secure_key_2026"
JWT_REFRESH_SECRET="dealflow360_refresh_secret_ultra_secure_key_2026"
JWT_ACCESS_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# SMTP Mail Dispatcher (OTP & Magic Links)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="DealFlow360 <no-reply@dealflow.com>"

# MinIO S3-Compatible Object Storage
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="dealflow-media"
MINIO_PUBLIC_URL="http://localhost:9000"

# Payment Gateway (Razorpay)
RAZORPAY_KEY_ID="rzp_test_RxunWa1YW8gqZw"
RAZORPAY_KEY_SECRET="3X6xHKAKBMsHm0wR9cggE6xr"

# Frontend API URL (apps/frontend/.env.local)
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

---

## 12. Automated Verification and Test Suites

DealFlow360 includes automated verification scripts testing all business logic and architectural constraints against live services:

### 1. End-to-End Business Flow Suite (8 of 8 Steps)
```bash
pnpm test:flow
```
```text
====================================================================================================
  RUNNING AUTOMATED DEALFLOW360 END-TO-END VERIFICATION SUITE
====================================================================================================
  ✔ [STEP 1 PASSED] Sales Rep authenticated successfully (rep@dealflow.com)
  ✔ [STEP 2 PASSED] Quotation Q-1042 built for Beta Industries with 14% discount (exceeds Silver 10% ceiling)
  ✔ [STEP 3 PASSED] Accepted 1-click upsell (Docking Station) — Total & Margin updated in real time
  ✔ [STEP 4 PASSED] Zero-click approval auto-router flagged Q-1042 -> Routed to Sales Manager (PENDING_APPROVAL)
  ✔ [STEP 5 PASSED] Sales Manager approved quote -> Status advanced to SENT_TO_CUSTOMER
  ✔ [STEP 6 PASSED] RED-DASHED LOOP ACTIVATED: Customer proposed 18% counter -> Auto re-routed to Approval Queue!
  ✔ [STEP 7 PASSED] Multi-Warehouse Auto-Split Executed: Stock partitioned across facilities
  ✔ [STEP 8 PASSED] Hybrid Billing Generated: Split into One-Time and Recurring Invoices
====================================================================================================
  ALL 8 CORE BUSINESS LOGIC STEPS VERIFIED WITH 100% SUCCESS
====================================================================================================
```

### 2. Redis Rate Limiting & Header Verification Suite
```bash
node scripts/test-rate-limiting.js
```
* Verifies `@SkipRateLimit` exemption on `/api/health`.
* Verifies strict 5 req/60s rate limit on `/api/auth/login` with HTTP 429 and `Retry-After`.
* Verifies `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

### 3. AI Upsell & Recommendation Engine Math Verification
```bash
node scripts/verify-ai-math.js
node scripts/test-recommendation-engine.js
```
* Verifies Lift, Confidence, Support, and Composite Score equations.
* Verifies dual-channel recommendation blending (Admin Curated rank 1..5 and FP-Growth association rules).

### 4. Database Population & Integrity Auditor
```bash
node scripts/verify-db-counts.js
```
* Audits database tables ensuring all 26 relational entities meet production-scale demonstration quotas.

---

## 13. Monorepo Codebase Layout

```text
odoo-boilerplate/
├── apps/
│   ├── ai-service/                  # Standalone Python Market Basket Analysis Service
│   │   └── market_basket_fpgrowth.py # FP-Growth & Association Mining (mlxtend / fallback)
│   ├── backend/                     # NestJS 10 Enterprise REST API Gateway
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # 26 Relational Models, 13 Enums, 5 Essential Indexes
│   │   │   └── seed.ts              # 500+ Record Database Seeder with Geo-Coordinates
│   │   └── src/
│   │       ├── analytics/           # Deal Surveillance, Stalled Scanners & PDF Reports
│   │       ├── approvals/           # Multi-Tier Approval Chain & Segregation of Duties
│   │       ├── auth/                # Argon2, JWT Bearer Tokens, OTP Signup & Password Reset
│   │       ├── common/              # Guards (JWT, Roles, RateLimit) & Decorators
│   │       ├── customers/           # Customer Master & Tier Directory (Bronze, Silver, Gold)
│   │       ├── discount-rules/      # Dual-Ceiling Governance & 90-Day Rep Median Anomaly
│   │       ├── fulfillments/        # Haversine Geodesic Stock Splitter & Backorder Pool
│   │       ├── invoices/            # Hybrid Invoicing Split & Razorpay Gateway
│   │       ├── mail/                # Nodemailer SMTP Email Dispatcher
│   │       ├── portal/              # Customer Collaboration Portal & The Red-Dashed Loop
│   │       ├── products/            # Product Master, Variants & Price Lists
│   │       ├── quotations/          # CPQ Engine, Margin Recalculation & Deal Health Stub
│   │       ├── redis/               # Redis Client & Atomic Fixed-Window Rate Limiter
│   │       ├── storage/             # MinIO S3 Object Storage Provider
│   │       ├── subscriptions/       # MRR Contracts, Proration Ledger & Plan Templates
│   │       ├── upsell-rules/        # Native TypeScript FP-Growth Engine & Hybrid Recommender
│   │       ├── users/               # Internal User Directory, Profiles & Media Upload
│   │       ├── warehouses/          # Warehouse Master, GPS Coordinates & Stock Adjustments
│   │       ├── app.module.ts        # Root Dependency Injection Container (18 Modules)
│   │       └── main.ts              # HTTP Application Bootstrap, Swagger UI & Global Pipes
│   └── frontend/                    # Next.js 14 App Router User Interface
│       └── src/
│           ├── app/                 # 18 Role-Based Application Screens
│           │   ├── approvals/       # Manager & Finance Approval Inboxes
│           │   ├── auth/            # Login, Signup, and Reset Password Views
│           │   ├── customers/       # Customer Directory & Account Management
│           │   ├── dashboard/       # Executive Operational KPI Board
│           │   ├── fulfillment/     # Multi-Depot Stock Split & Backorder Inspector
│           │   ├── governance/      # Discount Ceilings & Approval Matrix Settings
│           │   ├── health/          # Deal Surveillance, Slippages & Nudges
│           │   ├── invoices/        # Receivables Ledger & Razorpay Checkout Modal
│           │   ├── pipeline/        # 5-Stage Kanban Opportunity Pipeline
│           │   ├── portal/          # Tokenized Customer Negotiation Portal
│           │   ├── products/        # Catalog, Variants & Curated Upsell Feeds
│           │   ├── profile/         # Personal Profile, MinIO Avatar & Banner Upload
│           │   ├── quotations/      # Interactive CPQ Cart & Printable Proposal PDF
│           │   ├── reports/         # Executive BI, Category Revenue & CSV/PDF Exporters
│           │   ├── subscriptions/   # Active MRR Agreements & Mid-Cycle Proration
│           │   ├── users/           # User Management & RBAC Administration
│           │   └── warehouses/      # Facility Directory & Physical Stock Levels
│           ├── components/          # Design System Components (Layout, Sidebar, Navbar)
│           ├── context/             # AuthContext (JWT State, Profile Sync, Auto-Refresh)
│           └── services/            # Centralized API Clients (apiClient.js, quotationsService.js)
├── infra/
│   └── docker-compose.yml           # PostgreSQL 16 Alpine, Redis 7 Alpine & MinIO Storage
├── scripts/
│   ├── setup/                       # Automated Onboarding Scripts (setup.sh & setup.bat)
│   ├── test-rate-limiting.js        # Redis Rate Limiting & RFC Header Verification
│   ├── test-recommendation-engine.js # Recommendation Engine Testing
│   ├── test-minio-avatar-banner.js  # MinIO S3 Media Upload Verification
│   ├── verify-ai-math.js            # FP-Growth & Mathematical Formula Verification
│   ├── verify-db-counts.js          # PostgreSQL Database Record Count Auditor
│   └── verify-quick-flow.js         # 8-Step End-to-End Automated Verification Runner
├── Makefile                         # Everyday Development & Operations Commands
├── package.json                     # Root pnpm Workspace Configuration
└── README.md                        # Master Technical Documentation
```

---

## 14. Troubleshooting, Reliability & Production Operations

### 1. Razorpay Gateway Error: `key_id or oauthToken is mandatory`
* **Root Cause:** Razorpay SDK instantiated during module startup without environment credentials.
* **Resolution:** DealFlow360 implements lazy initialization for the Razorpay client. Ensure valid test credentials are set in both `apps/backend/.env` and `.env`:
  ```env
  RAZORPAY_KEY_ID="rzp_test_RxunWa1YW8gqZw"
  RAZORPAY_KEY_SECRET="3X6xHKAKBMsHm0wR9cggE6xr"
  ```

### 2. Database Connection Failure: `Can't reach database server at localhost:5432`
* **Root Cause:** Docker daemon inactive or container stopped.
* **Resolution:** Ensure the containerized PostgreSQL service is active:
  ```bash
  docker ps
  # If stopped, launch infrastructure services:
  pnpm up
  ```

### 3. Redis Rate Limiter Fallback (Fail-Open Design)
* If the Redis container is temporarily unavailable or unreachable, `RateLimitGuard` logs a warning and fails open, allowing application traffic to proceed without throwing false 500 errors.

### 4. MinIO Bucket Initialization: `dealflow-media`
* `StorageService` checks bucket existence on module initialization (`onModuleInit`). If the bucket does not exist, it creates `dealflow-media` and configures a public read-only policy for uploaded avatar and banner assets.

### 5. Browser Popups for Printable HTML/PDF Documents
* The quotation and invoice print engine generates dynamic in-memory HTML blobs rendered via semantic print stylesheets (`@media print`). Enable browser popups for `http://localhost:3000` to allow print windows to open.

---

## 15. Enterprise Standards & Indian Rupee (INR) Standardization

* **Standardized Currency:** Indian Rupee (INR / ₹) is standardized across all CPQ line items, gross margin equations, split invoices, revenue reports, and Razorpay checkout sessions (`toLocaleString('en-IN')`).
* **Payment Standards:** Native Razorpay integration with HMAC-SHA256 signature verification and paisa denomination.
* **Audit Compliance:** Immutable, append-only ledgers for all managerial approval actions (`ApprovalAuditLog`) and mid-cycle subscription seat adjustments (`SubscriptionProrationLog`).
* **Architectural Integrity:** Clean modular separation in NestJS, type-safe PostgreSQL database access via Prisma ORM 5.14, and modern responsive client interfaces built with Next.js 14 App Router.
