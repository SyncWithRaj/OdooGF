# DealFlow360 — Architecture & Data Model

> **Odoo Grand Finale Hackathon Deliverable #3**  
> An Intelligent, Self-Governing Sales Operations & CPQ Platform

---

## 1. System Architecture Overview

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Access Tier"]
        PortalUI["Customer Negotiation Portal<br/>(/portal/quote/:token)"]
        InternalUI["Internal Next.js Workspace<br/>(Sales Rep, Manager, Finance, Admin)"]
    end

    subgraph APIGateway ["NestJS REST API Gateway (Port 4000)"]
        AuthModule["Auth & RBAC Guards<br/>JWT 15m/7d | Argon2 | Roles"]
        CPQModule["CPQ Quotation Engine<br/>Blended Risk | Margin Calc | Badges"]
        UpsellModule["AI Recommendation Engine<br/>Co-Purchase Affinity | Margin Boost"]
        ApprovalModule["Multi-Tier Governance<br/>L1 Manager -> L2 Finance"]
        FulfillModule["Intelligent Inventory Split<br/>Single-Depot Opt | Multi-Depot | Backorders"]
        BillingModule["Hybrid Billing & Proration<br/>One-Time Invoices | Subscriptions"]
        AnalyticsModule["Intelligence & Health<br/>Stalled Deals | Discount Anomalies"]
    end

    subgraph DataTier ["Data & Persistence Tier"]
        Postgres[(PostgreSQL Database<br/>Prisma ORM 5.22)]
        SMTP[Gmail SMTP Service<br/>Transactional OTP & Magic Links]
    end

    PortalUI -->|"Public Tokenized Access"| CPQModule
    PortalUI -->|"Counter Proposal Loop"| ApprovalModule
    InternalUI -->|"Bearer JWT"| AuthModule
    AuthModule --> CPQModule
    AuthModule --> ApprovalModule
    AuthModule --> FulfillModule
    AuthModule --> BillingModule
    AuthModule --> AnalyticsModule
    CPQModule --> UpsellModule
    CPQModule --> Postgres
    ApprovalModule --> Postgres
    FulfillModule --> Postgres
    BillingModule --> Postgres
    AnalyticsModule --> Postgres
    AuthModule --> SMTP
```

---

## 2. Core Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Quotation : manages
    User ||--o{ ApprovalAuditLog : actions
    Customer ||--o{ Quotation : places
    Customer ||--o{ Subscription : holds
    Customer ||--o{ Invoice : billed

    Quotation ||--|{ QuotationLine : contains
    Quotation ||--o{ ApprovalRequest : evaluates
    Quotation ||--o| FulfillmentOrder : dispatches
    Quotation ||--o{ Invoice : splits
    Quotation ||--o{ Subscription : contracts
    Quotation ||--o{ QuotationComment : discusses
    Quotation ||--o{ DealHealthAlert : monitored_by

    ApprovalRequest ||--|{ ApprovalAuditLog : logs

    Product ||--o{ QuotationLine : referenced_in
    Product ||--o{ WarehouseStock : stocked_at
    Product ||--o{ FulfillmentSplitItem : fulfilled_by
    Product ||--o{ ProductCoPurchaseRule : base_product
    Product ||--o{ ProductCoPurchaseRule : recommended_product

    Warehouse ||--|{ WarehouseStock : stores
    Warehouse ||--o{ FulfillmentSplitItem : ships_from

    FulfillmentOrder ||--|{ FulfillmentSplitItem : splits_into

    Subscription ||--|{ SubscriptionProrationLog : logs_proration
    Subscription ||--o{ Invoice : generates

    Invoice ||--o{ Payment : receives
```

---

## 3. The 3 Core Autonomous Business Engines

### Engine 1: Multi-Line Blended Risk Calculation (A3 Notes)
$$\text{AllowedLimit} = \min(\text{TierCeiling}, \text{CategoryCeiling})$$
$$\text{LineOverLimit} = \max(0, \text{DiscountPercent} - \text{AllowedLimit})$$
$$\text{MaxDeviation} = \max_{\text{all lines}}(\text{LineOverLimit})$$
* If $\text{MaxDeviation} == 0 \implies \mathbf{LOW\ RISK} \implies$ **Zero-Click Auto-Approve** $\to$ `SENT_TO_CUSTOMER`.
* If $0 < \text{MaxDeviation} \le 5.0\% \implies \mathbf{MEDIUM\ RISK} \implies$ Route to **Sales Manager** queue.
* If $\text{MaxDeviation} > 5.0\% \implies \mathbf{HIGH\ RISK} \implies$ Route to **Two-Tier (Sales Manager $\to$ Finance Controller)**.

### Engine 2: The Red-Dashed Re-Approval Loop (B8)
When a customer uses the portal to submit a Counter-Discount:
1. System evaluates counter-discount against tier ceiling.
2. If limit breached: Quotation status immediately resets to `PENDING_APPROVAL`, audit log is created, and quote re-enters manager's queue.
3. Once approved, portal refreshes and customer can execute 1-click confirmation.

### Engine 3: Multi-Warehouse Auto-Split & Optimization (B6)
1. Fetches real-time available stock across all active facilities.
2. Checks if primary warehouse can fulfill 100% of order with 1 shipment.
3. If not, partitions line across closest facilities using shipping cost weighting.
4. If total inventory across all depots is insufficient, reserves available stock and flags remaining deficit as `BACKORDER`.
5. Mid-fulfillment stock arrival triggers "Consolidate Remaining Backorder" workflow.

---

## 4. State Machine: Quotation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Rep Creates Quote
    DRAFT --> SENT_TO_CUSTOMER: Discount <= Limit (Zero-Click Auto)
    DRAFT --> PENDING_APPROVAL: Discount > Limit (Router flags Medium/High)
    
    PENDING_APPROVAL --> SENT_TO_CUSTOMER: Manager/Finance Approves
    PENDING_APPROVAL --> DRAFT: Returned for Revision
    PENDING_APPROVAL --> CANCELLED: Rejected

    SENT_TO_CUSTOMER --> UNDER_NEGOTIATION: Customer adds comments
    SENT_TO_CUSTOMER --> PENDING_APPROVAL: Customer counter > limit (Red-Dashed Loop!)
    SENT_TO_CUSTOMER --> CONFIRMED: Customer 1-Click Accept
    UNDER_NEGOTIATION --> CONFIRMED: Customer 1-Click Accept
    
    CONFIRMED --> FULFILLED: Warehouse Dispatched & Invoices Paid
    FULFILLED --> [*]
    CANCELLED --> [*]
```
