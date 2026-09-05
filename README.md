# DealFlow360 — Intelligent, Self-Governing Sales Operations Platform

> **Odoo Grand Finale Hackathon**  
> An autonomous CPQ, discount governance, multi-warehouse fulfillment, and hybrid billing engine built with **NestJS**, **Prisma ORM**, **PostgreSQL**, and **Next.js**.

---

## 🌟 Executive Summary

Traditional sales systems treat quotations as passive, static forms. **DealFlow360** turns quotations into living, self-governing deal engines:
1. **Multi-Tier Discount Governance & Zero-Click Approval Routing:** Prevents margin leakage by evaluating line-level discounts against customer tier ceilings and routing MEDIUM/HIGH risk deals through a multi-tier hierarchy (Sales Manager $\to$ Finance Controller).
2. **AI Upsell & Margin Impact:** Surfaces ranked co-purchase recommendations in real time while building quotes.
3. **The Critical "Red-Dashed Loop":** When customers propose counter-discounts via their secure portal, the system automatically detects policy breaches, resets the quote to `PENDING_APPROVAL`, and re-routes it into the managerial queue.
4. **Intelligent Multi-Warehouse Stock Splitting:** Optimizes fulfillment across facilities to minimize shipping costs and automatically partitions inventory deficits into backorder pools.
5. **Hybrid Invoicing & Mid-Cycle Billing Proration:** Mixes one-time hardware and recurring SaaS lines on a single order with calendar-day proration on seat adjustments.
6. **Deal Health & Anomaly Intelligence:** Continuously monitors stalled deals (>7 days) and rep discount anomalies with proactive nudge actions.

---

## 🏆 Hackathon Deliverables

All 4 official hackathon deliverables required by the problem statement are complete and located in `docs/`:

| Deliverable | Description | File Location |
| :--- | :--- | :--- |
| **Deliverable #1** | **Working Code & Seed Data** | `apps/backend/` & `apps/backend/prisma/seed.ts` |
| **Deliverable #2** | **5-Minute Live Demo Pitch Script** | [`docs/demo_presentation_script.md`](file:///home/raj-ribadiya/Desktop/odoo-boilerplate/docs/demo_presentation_script.md) |
| **Deliverable #3** | **1-Page Architecture & Data Model (ERD)** | [`docs/architecture_and_data_model.md`](file:///home/raj-ribadiya/Desktop/odoo-boilerplate/docs/architecture_and_data_model.md) |
| **Deliverable #4** | **"What We Would Build Next" Roadmap** | [`docs/what_we_would_build_next.md`](file:///home/raj-ribadiya/Desktop/odoo-boilerplate/docs/what_we_would_build_next.md) |
| **Bonus** | **Frontend Teammate API Integration Guide** | [`docs/api_quickstart_for_frontend.md`](file:///home/raj-ribadiya/Desktop/odoo-boilerplate/docs/api_quickstart_for_frontend.md) |

---

## ⚡ Quick Start & Verification

### 1. Prerequisites
* Node.js 18+
* Docker & Docker Compose
* `pnpm`

### 2. Launch Services
```bash
# 1. Start PostgreSQL database container:
pnpm up

# 2. Seed database with rich sample data (users, products, discount ceilings, warehouses):
pnpm seed

# 3. Start development servers:
pnpm dev:backend   # NestJS API on http://localhost:4000
pnpm dev:frontend  # Next.js UI on http://localhost:3000
```

### 3. Run Automated Section 9 Quick Test Flow
We have packaged an automated end-to-end verification script testing all 8 steps of the Quick Test Flow:
```bash
pnpm test:flow
```
Output:
```text
✔ [STEP 1 PASSED] Sales Rep authenticated successfully (rep@dealflow.com)
✔ [STEP 2 PASSED] Quotation Q-1016 built for Beta Industries with 14% discount (exceeds Silver 10% ceiling)
✔ [STEP 3 PASSED] Upsell suggestions verified (no additional pairing needed)
✔ [STEP 4 PASSED] Zero-click approval auto-router flagged Q-1016 -> Routed to Sales Manager (PENDING_APPROVAL)
✔ [STEP 5 PASSED] Sales Manager approved quote -> Status advanced to SENT_TO_CUSTOMER
✔ [STEP 6 PASSED] RED-DASHED LOOP ACTIVATED: Customer proposed 18% counter -> Auto re-routed to Approval Queue!
✔ [STEP 7 PASSED] Multi-Warehouse Auto-Split Executed: Stock partitioned across facilities
✔ [STEP 8 PASSED] Hybrid Billing Generated: Split into One-Time and Recurring Invoices (Status: PAID)

🎉 ALL 8 QUICK TEST FLOW STEPS VERIFIED WITH 100% SUCCESS! 🎉
```

---

## 🔑 Demo Personas

All accounts have password `123456`:
* **Admin:** `admin@dealflow.com`
* **Sales Rep:** `rep@dealflow.com`
* **Sales Manager (L1 Approver):** `manager@dealflow.com`
* **Finance Controller (L2 Approver):** `finance@dealflow.com`

---

## 📚 Interactive API Documentation
* **Swagger UI:** `http://localhost:4000/api/docs`
* **Health Probe:** `http://localhost:4000/api/health`
* **Database Studio:** `pnpm studio`
