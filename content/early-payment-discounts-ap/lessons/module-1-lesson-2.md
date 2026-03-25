# Payment Terms and Discount Structures in Practice
## Module 1: Foundations of Early Payment Discounts | Lesson 2

**Learning Objectives:**
- Identify common discount structures across industries
- Read and interpret payment terms on supplier invoices
- Distinguish between static discounts, sliding-scale discounts, and dynamic discounting
- Map discount terms to their financial impact on working capital

---

## Standard Payment Term Conventions

Payment terms follow conventions that have developed over decades of commercial practice. Understanding the notation is foundational — misreading terms leads to missed discounts or incorrect payments.

### The Standard Format

The format `X/Y net Z` encodes three values:

- **X** = Discount percentage
- **Y** = Number of days to qualify for the discount
- **Z** = Total days until full payment is due

Common variations include:

| Terms | Meaning |
|-------|---------|
| 2/10 net 30 | 2% discount if paid within 10 days; full amount due in 30 days |
| 1/10 net 30 | 1% discount if paid within 10 days; full amount due in 30 days |
| 2/10 net 60 | 2% discount if paid within 10 days; full amount due in 60 days |
| 3/10 net 45 | 3% discount if paid within 10 days; full amount due in 45 days |
| Net 30 | No discount offered; full payment due in 30 days |
| Net 60 EOM | Full payment due 60 days after end of month |
| CIA | Cash in advance — payment before delivery |
| COD | Cash on delivery |

### Reading Terms on Invoices

In practice, payment terms appear in multiple places and formats:

- **Invoice header or footer** — Usually printed as "Terms: 2/10 net 30"
- **Purchase order** — The PO may specify terms that differ from the invoice
- **Master supplier agreement** — Contract-level terms that override individual invoices
- **ERP system** — Stored as structured data fields (discount %, discount days, net days)

When terms conflict across these sources, the contractual hierarchy usually applies: master agreement > purchase order > invoice. Your agent needs to know which source to trust — a topic we cover in Module 4.

### Date Calculations

Terms are typically calculated from the **invoice date**, not the receipt date or goods delivery date. However, some suppliers specify:

- **ROG (Receipt of Goods)** — Terms begin when goods are received
- **EOM (End of Month)** — Terms begin at the end of the invoice month
- **Prox (Proximo)** — Payment due on a specific day of the following month

Example: "2/10 net 30 ROG" on an invoice dated January 5 for goods received January 12. The discount window runs from January 12 to January 22 (10 days from receipt). Full payment is due February 11 (30 days from receipt).

These variations matter enormously for automation. An agent that assumes all terms start from the invoice date will miscalculate discount windows on ROG and EOM terms, potentially paying early for no benefit or missing valid discount windows.

## Static vs. Dynamic Discounting

### Static Discounts

Static discounts are the traditional model: a fixed percentage for payment within a fixed window. The terms are set in advance, usually negotiated during supplier onboarding or contract renewal, and apply uniformly to all invoices under that agreement.

**Characteristics:**
- Fixed discount percentage
- Fixed discount window
- Predefined in the supplier agreement
- Binary outcome: you either qualify or you do not

Static discounts are simple but inflexible. If you miss day 10 by one day on a 2/10 net 30 term, the discount disappears entirely. There is no partial credit for paying on day 11.

### Dynamic Discounting

Dynamic discounting introduces a sliding scale where the discount percentage adjusts based on when you pay. The earlier you pay, the larger the discount. Pay on the full-term date, and the discount is zero.

A typical dynamic discount schedule might look like:

| Payment Day | Discount |
|-------------|----------|
| Day 1 | 2.50% |
| Day 5 | 2.25% |
| Day 10 | 2.00% |
| Day 15 | 1.50% |
| Day 20 | 1.00% |
| Day 25 | 0.50% |
| Day 30 | 0.00% |

The formula for a linear dynamic discount is:

```
Discount = Max Discount × ((Net Days - Payment Day) / (Net Days - 1))
```

For a $100,000 invoice under dynamic discounting with a max rate of 2.5% and net 30 terms:

```
Payment on Day 10: $100,000 × 2.5% × ((30 - 10) / (30 - 1)) = $1,724 savings
Payment on Day 20: $100,000 × 2.5% × ((30 - 20) / (30 - 1)) = $862 savings
```

Dynamic discounting is more flexible and captures more opportunities because there is always some discount available if you pay before the due date. It also creates a continuous optimization problem — exactly the kind of problem AI agents excel at solving.

### Sliding-Scale Discounts

Sliding-scale discounts offer tiered rates at predefined breakpoints rather than a continuous function. They sit between static and dynamic models:

```
If paid within 5 days:  3.0% discount
If paid within 10 days: 2.0% discount
If paid within 20 days: 1.0% discount
After 20 days:          0% (full payment at net terms)
```

This structure gives buyers multiple decision points and is common in industries where suppliers want to incentivize very early payment but still offer something for moderately early payment.

## Supply Chain Finance vs. Direct Discounts

Supply Chain Finance (SCF), also called reverse factoring, is a different mechanism that achieves a similar economic outcome. It is worth understanding the distinction because agents operating on Causa Prima will encounter both.

### How SCF Works

1. The buyer approves an invoice for payment
2. A third-party finance provider pays the supplier early (at a discount)
3. The buyer pays the finance provider on the original due date

The supplier gets early cash. The buyer preserves their payment terms. The finance provider earns the spread.

### Key Differences from Direct Discounts

| Dimension | Direct Early Payment Discount | Supply Chain Finance |
|-----------|------------------------------|---------------------|
| Who funds the early payment | Buyer (uses own cash) | Finance provider |
| Impact on buyer's cash flow | Cash leaves earlier | No change to payment timing |
| Discount negotiation | Buyer-supplier bilateral | Set by finance provider |
| Balance sheet treatment | Off-balance-sheet for buyer | May be reclassified as debt |
| Supplier onboarding | Minimal | Must join SCF program |
| Cost to supplier | The discount percentage | The finance provider's rate |

For organizations with strong cash positions, direct early payment discounts are typically more profitable because there is no intermediary taking a margin. For cash-constrained buyers, SCF can unlock supplier savings without accelerating cash outflows.

## Industry Benchmarks

Discount rates and payment terms vary significantly by industry. Here are typical ranges based on industry surveys:

| Industry | Common Terms | Typical Discount | Notes |
|----------|-------------|------------------|-------|
| Manufacturing | Net 30-45 | 1-2% | High volume, established practice |
| Technology/SaaS | Net 30 | 0.5-1.5% | Less common; subscription models |
| Retail/CPG | Net 30-60 | 1-3% | Seasonal pressure increases discounts |
| Construction | Net 30-90 | 1-2% | Long terms; discounts on materials |
| Healthcare | Net 45-60 | 1-2% | Regulatory and compliance delays |
| Professional Services | Net 30 | 0.5-1% | Relationship-driven; less price-sensitive |

Some industries have sector-specific conventions. In construction, for example, retention holdbacks (5-10% of invoice value held until project completion) complicate discount calculations because the discountable amount is less than the invoice face value.

## Mapping Terms to Working Capital Impact

Every payment term choice affects your company's working capital. The relationship is direct:

**Days Payable Outstanding (DPO)** measures how long, on average, your company takes to pay its suppliers. Taking early payment discounts reduces DPO, which reduces working capital — you are converting cash to payments faster.

```
DPO = (Accounts Payable / Cost of Goods Sold) × 365
```

If your company has $10M in AP and $50M in COGS:

```
DPO at net 30: (10,000,000 / 50,000,000) × 365 = 73 days
```

If you accelerate 30% of payments from day 30 to day 10 (a 20-day reduction on 30% of volume):

```
New DPO ≈ 73 - (0.30 × 20) = 67 days
Working capital impact = (6 / 365) × $50,000,000 = $821,918 additional cash tied up
```

That $822K in additional working capital is the cost. The benefit is the discount savings. The net is what matters — and in most cases with 2/10 net 30 terms, the discount savings far exceed the working capital cost.

Understanding this trade-off is essential for treasury coordination, which we will explore in Module 2. An AI agent that blindly maximizes discount capture without considering working capital impact could harm the organization's liquidity position. The best agents balance both.

In the next lesson, we will examine the practical landscape of how discounts are captured today — and why most organizations leave significant money on the table.
