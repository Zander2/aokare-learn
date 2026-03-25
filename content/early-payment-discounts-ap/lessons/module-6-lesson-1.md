# Capstone Case Study and Program Design Review
## Module 6: Capstone — Designing and Evaluating a Complete Discount Agent Program | Lesson 1

**Learning Objectives:**
- Evaluate a complete early payment discount agent program design for a mid-sized enterprise
- Identify gaps, risks, and improvement opportunities in the program
- Recommend specific configuration changes to improve discount capture rates
- Present a coherent assessment that spans financial, technical, and relationship dimensions

---

## The Capstone Scenario

Meet **Redstone Industries**, a fictional mid-sized manufacturer of industrial components. Redstone has decided to deploy an early payment discount agent on the Causa Prima platform. Their implementation has been running for 90 days, and the leadership team wants a comprehensive review.

Your job: evaluate the program design, identify what is working and what is not, and recommend improvements.

### Company Profile

| Attribute | Value |
|-----------|-------|
| Annual revenue | $180 million |
| Annual AP spend | $95 million |
| Number of suppliers | 247 |
| Supplier breakdown | 18 strategic, 45 preferred, 120 transactional, 64 occasional |
| ERP system | SAP S/4HANA |
| Treasury system | Kyriba |
| Cost of capital (WACC) | 9.2% |
| Current average DPO | 38 days |
| Target DPO (per CFO) | 32-40 days |
| Early payment budget | $2M/month |

### Program Configuration

Redstone's agent is configured as follows:

**Scoring weights:**
- Financial: 0.60
- Probability: 0.25
- Relationship: 0.15

**Discount thresholds:**
- Minimum annualized rate: 15% for all segments
- Maximum discount request: 2.5%
- Maximum payment acceleration: 30 days

**Outreach rules:**
- Email-based negotiation for all suppliers (no Causa Prima direct yet)
- Maximum 2 proposals per supplier per quarter
- Follow-up cadence: Day 3, Day 7
- Single payment limit: $150,000 (above this requires AP manager approval)

**Treasury integration:**
- Daily cash position pull from Kyriba (once per morning at 7 AM)
- Daily early payment budget: $100,000
- Weekly cap: $500,000
- Safety margin: 60%

### 90-Day Results

| Metric | Target | Actual |
|--------|--------|--------|
| Invoices with existing discount terms | — | 892 |
| Existing discounts captured | 80% | 71% |
| Proactive proposals sent | — | 214 |
| Proactive acceptance rate | 40% | 28% |
| Total discount savings | $280,000 | $198,000 |
| Average discount rate captured | 1.6% | 1.4% |
| Average cycle time (identification to payment) | 3 days | 5.2 days |
| DPO impact | Max -6 days | -4.2 days |
| Payment errors | 0 | 3 |
| Supplier complaints | 0 | 2 |

## Analyzing the Program: What Is Working

### Financial Performance

$198,000 in savings over 90 days, annualized to approximately $792,000, is a solid start. Against an estimated implementation cost of $250,000 and ongoing costs of $90,000/year, the program is ROI-positive in Year 1.

### Existing Discount Capture

A 71% capture rate on existing discounts is a significant improvement from the pre-agent baseline of approximately 24%. The agent is doing its core job — identifying invoices with discount terms and ensuring payment is made within the window.

### DPO Management

The DPO impact of -4.2 days keeps Redstone within the CFO's target range of 32-40 days (current DPO is 38 - 4.2 = 33.8 days). The agent is not over-accelerating payments.

## Analyzing the Program: Problem Areas

Now let's identify the issues. There are several — some subtle, some significant.

### Problem 1: The 71% Capture Rate Should Be Higher

A 71% capture rate on existing discount terms means 29% of available discounts are being missed. Where is the leakage?

**Investigation:** Pull the data on the 259 missed discounts (29% of 892):

```
Missed discount reasons (259 invoices):
- Approval delay (payment triggered but settled after deadline): 42%
- Cash constraint (budget exhausted for the day/week): 31%
- Invoice received too late (< 3 days remaining in window): 18%
- Payment error (ACH failure, wrong bank details): 7%
- Data issue (terms not recognized by parser): 2%
```

**Key finding:** 42% of misses are due to approval delays. The single-payment limit of $150,000 requires AP manager approval, and the manager is not responding fast enough. Additionally, the daily cash pull at 7 AM means the agent operates on stale data by afternoon.

**Recommendations:**
1. Raise the autonomous payment limit from $150,000 to $200,000 — this would eliminate approval delays on 60% of the flagged invoices
2. Increase Kyriba polling from once daily to every 4 hours
3. Implement direct ERP integration for invoice receipt dates to flag invoices arriving with less than 5 days remaining

### Problem 2: Low Proactive Acceptance Rate

The 28% acceptance rate on proactive proposals is well below the 40% target. The agent is sending 214 proposals and getting only 60 acceptances.

**Investigation:** Break down by supplier segment:

| Segment | Proposals Sent | Acceptance Rate |
|---------|---------------|----------------|
| Strategic | 12 | 42% |
| Preferred | 58 | 34% |
| Transactional | 108 | 24% |
| Occasional | 36 | 19% |

The overall 28% is dragged down by high volumes of proposals to transactional and occasional suppliers with low acceptance rates.

**Recommendations:**
1. Reduce proactive outreach to occasional suppliers — the 19% acceptance rate does not justify the volume. Set a minimum predicted acceptance rate of 30% for proactive proposals.
2. Increase outreach to strategic suppliers, where the 42% rate suggests room for more proposals.
3. Revise templates for transactional suppliers — the current template may be too generic. A/B test a template that leads with specific dollar savings rather than percentage.

### Problem 3: Scoring Weight Imbalance

The 0.60 financial weight means the agent prioritizes high-dollar opportunities over relationship-building and probability of success. This explains why it is sending many proposals to transactional suppliers (high financial value per invoice) with low acceptance rates.

**Recommendation:** Adjust weights to 0.45 financial, 0.30 probability, 0.25 relationship. This better balances the agent's effort across value and achievability.

### Problem 4: Cash Budget Underutilization

The daily budget of $100,000 with a 60% safety margin means the agent can only deploy $60,000/day in early payments. Given the $2M monthly budget, the daily cap should be approximately $67,000 on average — which is close to the effective limit. But some high-value days are constrained while low-value days leave budget unused.

**Recommendation:** Implement a rolling budget rather than a fixed daily cap. Allow the agent to use up to $150,000 on any given day as long as the weekly cap of $500,000 is respected. This provides flexibility for days with multiple attractive opportunities.

### Problem 5: Payment Errors

Three payment errors in 90 days may seem small, but at scale this rate (3/892 = 0.34%) would mean 12-15 errors per year. Each error requires manual intervention and risks supplier relationship damage.

**Investigation:** The three errors were:
1. ACH payment to a supplier who had changed bank accounts — ERP had stale banking details
2. Payment processed at full invoice amount instead of discounted amount — ERP integration mapped the wrong field
3. Duplicate payment — the agent triggered payment, the AP team also triggered payment manually (process overlap)

**Recommendations:**
1. Implement a pre-payment bank detail verification step
2. Add an integration test that verifies discount amount calculation in the ERP payment posting
3. Define clear process boundaries — invoices flagged by the agent should be locked from manual processing

### Problem 6: The Two Supplier Complaints

The two complaints came from:
1. A strategic supplier whose procurement manager was not informed about the agent program and was surprised by the automated email
2. A small supplier who felt the 2.5% discount request was too aggressive for their margins

**Recommendations:**
1. Require procurement sign-off before first agent contact with any strategic supplier (this should have been in place from the start — refer to Module 1, Lesson 4)
2. Implement the small supplier discount cap from Module 3, Lesson 2: maximum 1.5% for suppliers under $5M in revenue

## Preparing an Improvement Plan

A structured improvement plan organizes the recommendations by priority and timeline:

| Priority | Recommendation | Expected Impact | Timeline |
|----------|---------------|----------------|----------|
| Critical | Fix ERP integration for discount amount field | Eliminate payment amount errors | Week 1-2 |
| Critical | Require procurement approval for strategic suppliers | Prevent relationship damage | Week 1 |
| High | Raise autonomous payment limit to $200K | +8% capture rate improvement | Week 2-3 |
| High | Implement small supplier discount cap | Reduce complaints | Week 2 |
| High | Increase Kyriba polling frequency | Better cash utilization | Week 3-4 |
| Medium | Adjust scoring weights | Better proposal targeting | Week 3-4 |
| Medium | Switch to rolling daily budget | +5% budget utilization | Week 4-6 |
| Medium | Reduce occasional supplier outreach | Improve overall acceptance rate | Week 4-6 |
| Low | A/B test new templates for transactional segment | Improve transactional acceptance | Week 6-10 |
| Low | Define process boundaries for manual vs. agent payments | Eliminate duplicate payments | Week 6-10 |

This review demonstrates how to evaluate a live program holistically — connecting financial metrics to operational causes, tracing supplier complaints to configuration choices, and recommending specific, actionable improvements.

In the next lesson, we examine the ethical dimensions of deploying autonomous negotiation agents and the safeguards that responsible organizations must implement.
