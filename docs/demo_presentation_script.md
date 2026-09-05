# DealFlow360 — 5-Minute Live Presentation & Demo Script

> **Odoo Grand Finale Hackathon Deliverable #2**  
> Covers two full flows end-to-end:
> 1. **Flow 1: Zero-Click Governance, Upsell Engine & The Critical Red-Dashed Loop**
> 2. **Flow 2: Intelligent Multi-Warehouse Split & Hybrid Billing with Mid-Cycle Proration**

---

## ⏱ Time Allocation Overview

| Timestamp | Phase | Presenter Role / Action | Screen / View |
| :--- | :--- | :--- | :--- |
| **0:00 – 0:45** | Problem Statement & Hook | "Why DealFlow360?" Real-world sales chaos | Architecture Slide |
| **0:45 – 2:30** | **Flow 1**: Governance & Portal Loop | Rep builds quote $\to$ Upsell $\to$ Manager approval $\to$ Customer counter $\to$ Re-approval | Screens 3, 4, 5, 6, 11 |
| **2:30 – 4:00** | **Flow 2**: Fulfillment & Hybrid Billing | Warehouse stock auto-split $\to$ Backorders $\to$ One-Time vs Recurring invoices $\to$ Proration | Screens 7, 8, 9, 10, 12, 13 |
| **4:00 – 4:30** | Intelligence & Deal Health | Stalled deals alert $\to$ Discount anomalies $\to$ Rep nudge action | Screen 14 & 15 |
| **4:30 – 5:00** | Summary & What We Would Build Next | Business value + Roadmap | Closing Slide |

---

## 🎙 Minute-by-Minute Pitch Script

### [0:00 - 0:45] The Hook & Value Proposition
* **Presenter:**
  > *"Good afternoon judges. Most sales software works fine when deals are simple: you create a quote, send a static PDF, and hope for the best. But in modern B2B commerce, reality is messy.*
  > 
  > *Reps offer uncontrolled discounts that erode profitability; inventory is fragmented across multiple depots; contracts mix physical hardware with monthly SaaS; and customers negotiate back-and-forth over email where managers lose track.*
  > 
  > *Meet **DealFlow360** — an intelligent, self-governing sales operations platform that turns quotations into living, automated deal engines."*

---

### [0:45 - 2:30] Flow 1: Quotation CPQ, AI Upsell, & The "Red-Dashed Loop"
* **Action 1 (Login as Sales Rep):**
  > *"Let's log in as J. Rao, our Sales Rep (`rep@dealflow.com`). Notice our 5-column Kanban pipeline showing deals categorized by risk and stage."*
* **Action 2 (Create Quote & Line Limits):**
  > *"We open a new quotation for **Beta Industries**, a Silver Tier customer with a 10% maximum discount ceiling. We add 24x Laptop Pro 14s at a 14% discount. Notice the system immediately displays an `OVER (+4.0pt)` badge and flags the deal with a **MEDIUM Blended Risk Score**."*
* **Action 3 (Smart Upsell Panel):**
  > *"On the right side panel, our recommendation engine detects the Laptop order and surfaces the **Wireless Ergonomic Mouse** with historical co-purchase affinity. With 1 click, we accept the upsell: the quote total and live margin update instantly."*
* **Action 4 (Zero-Click Auto Router):**
  > *"The rep clicks 'Submit'. Because the line exceeded the tier ceiling, the zero-click router automatically moves the deal into `PENDING_APPROVAL` and routes it to the Sales Manager."*
* **Action 5 (Manager Reviews & Approves):**
  > *"Switching to Sales Manager M. Shah (`manager@dealflow.com`): in the Approvals queue, the manager sees the exact 'Why This Quote Was Flagged' audit explanation, and clicks **Approve**. The quote immediately transitions to `SENT_TO_CUSTOMER`."*
* **Action 6 (Customer Portal & The Critical Red-Dashed Loop):**
  > *"Now the customer opens their restricted self-service portal link (`/portal/quote/:token`). Notice internal costs and margins are securely hidden!*
  > 
  > *The customer types a line comment and proposes an 18% counter-discount. Watch what happens when they click Submit: **The Red-Dashed Loop activates!** Because 18% exceeds the Silver ceiling, the quote instantly resets to `PENDING_APPROVAL` and re-enters the Manager's queue. Pricing discipline is never compromised."*

---

### [2:30 - 4:00] Flow 2: Multi-Warehouse Stock Split & Hybrid Billing
* **Action 7 (Customer Confirms):**
  > *"The manager approves the counter-offer, and the customer executes 1-click confirmation. The order moves to `CONFIRMED`."*
* **Action 8 (Intelligent Stock Splitting):**
  > *"Under Fulfillment (Screen 7 & 8), our optimization algorithm evaluates physical inventory across facilities:*
  > * *Main Warehouse has 18 units in stock.*
  > * *East Depot supplies 4 units.*
  > * *The remaining 2 units are automatically partitioned into an active `BACKORDER` pool to avoid order blocking.*
  > 
  > *Operations can accept the recommended split or manually override with 1 click."*
* **Action 9 (Hybrid Billing Engine):**
  > *"Notice this single order had both physical hardware and a recurring Enterprise Support subscription.*
  > 
  > *Our billing engine automatically partitions this into two synchronized streams:*
  > 1. *A One-Time Invoice (`INV-1001`) with Net 30 terms for hardware.*
  > 2. *A Recurring Subscription Contract with scheduled monthly billing cycles.*
  > 
  > *When a customer changes seats mid-cycle (e.g., adding 2 seats on day 15), our calendar-day proration engine automatically calculates the exact unbilled delta and updates the ledger."*

---

### [4:00 - 4:30] Intelligence & Deal Health
* **Action 10 (Deal Health Dashboard):**
  > *"On Screen 14, sales leadership gets real-time governance:*
  > * *Automatic detection of **Stalled Deals** (>7 days of inactivity).*
  > * ***Discount Anomaly Alerts** flagging reps whose pricing deviates significantly from historical averages.*
  > * *1-click **Manager Nudge** sending proactive alerts before deals go cold.*
  > * *Instant **Pipeline CSV & Printable PDF Reports** for executive review."*

---

### [4:30 - 5:00] Conclusion & Why It Wins
* **Presenter:**
  > *"In summary, DealFlow360 solves real-world B2B sales complexity not through static forms, but through self-governing business logic: automated risk routing, multi-depot fulfillment reality, reconciled hybrid billing, and living customer negotiations.*
  > 
  > *Every single calculation you saw today runs on real database relations with zero hardcoded mocks.*
  > 
  > *Thank you, and we welcome your questions!"*
