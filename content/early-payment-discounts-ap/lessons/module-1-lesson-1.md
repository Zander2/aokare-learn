# The Economics of Early Payment
## Module 1: Foundations of Early Payment Discounts | Lesson 1

**Learning Objectives:**
- Calculate the annualized cost of forgoing an early payment discount (e.g., 2/10 net 30)
- Compare the effective annual rate of a discount against alternative uses of cash
- Explain why early payment discounts represent a win-win for buyer and supplier
- Identify the key variables that determine whether taking a discount is financially advantageous

---

## What Are Early Payment Discounts?

An early payment discount is a price reduction a supplier offers in exchange for receiving payment before the standard due date. The buyer pays less; the supplier gets cash faster. Both sides benefit when the terms are right.

The most common notation is **2/10 net 30**, which means: take a 2% discount if you pay within 10 days, otherwise the full amount is due in 30 days. Other common structures include 1/10 net 30, 2/10 net 45, and 3/10 net 60.

Here is what the notation breaks down to:

| Component | Meaning |
|-----------|---------|
| 2 | Discount percentage |
| 10 | Discount window (days from invoice date) |
| net 30 | Full payment due date (days from invoice date) |

When you see "2/10 net 30" on an invoice, you have a choice: pay $98 on day 10 or pay $100 on day 30. That $2 difference over 20 days has a much larger annualized impact than it first appears.

## The Annualized Rate Formula

The core formula for calculating the annualized cost of forgoing a discount is:

```
Annualized Rate = (Discount % / (1 - Discount %)) × (365 / (Full Terms - Discount Period))
```

Let's work through the 2/10 net 30 example:

```
Annualized Rate = (0.02 / (1 - 0.02)) × (365 / (30 - 10))
                = (0.02 / 0.98) × (365 / 20)
                = 0.02041 × 18.25
                = 0.3724
                = 37.24%
```

That 2% discount, if you skip it, costs you the equivalent of **37.24% annualized**. To put that in perspective, if your company can borrow at 6% or earn 5% on short-term investments, forgoing this discount is an extraordinarily expensive decision.

### Why Not Just Use 2% × (365/20)?

You might wonder why we divide the discount by (1 - discount%) rather than just using the discount percentage directly. The reason: you are earning the discount on the discounted amount, not the full amount. If you pay $98 to save $2, your return is $2 / $98 = 2.04%, not $2 / $100 = 2%. The difference is small at 2% but becomes meaningful at higher discount rates.

## Worked Examples Across Different Terms

| Terms | Discount % | Days Accelerated | Annualized Rate |
|-------|-----------|-----------------|----------------|
| 2/10 net 30 | 2% | 20 | 37.24% |
| 1/10 net 30 | 1% | 20 | 18.43% |
| 2/10 net 45 | 2% | 35 | 21.28% |
| 3/10 net 60 | 3% | 50 | 22.56% |
| 1/15 net 45 | 1% | 30 | 12.29% |
| 2/10 net 60 | 2% | 50 | 14.90% |

Notice the pattern: the annualized rate increases when the discount percentage is larger and when the acceleration window is shorter. A 2% discount over 20 days is far more valuable on an annualized basis than a 2% discount over 50 days.

### A Real-World Calculation

Suppose your company processes $50 million in annual invoices from suppliers offering 2/10 net 30 terms. If you capture the discount on all eligible invoices:

```
Annual savings = $50,000,000 × 0.02 = $1,000,000
Cash required earlier = $49,000,000 (discounted amount)
Days cash is deployed early = 20
```

One million dollars in savings for deploying cash 20 days early. The question is whether your company has a better use for that cash that yields more than 37.24% annualized.

## Opportunity Cost: What Else Could You Do With the Cash?

Taking an early payment discount is not free — you are giving up the use of that cash for the acceleration period. The decision framework is straightforward:

**Take the discount when:** The annualized discount rate exceeds your cost of capital or your best alternative return.

**Skip the discount when:** You have higher-returning uses for the cash or you need the liquidity for operational needs.

Consider a company with the following options:

| Use of Cash | Annualized Return |
|-------------|-------------------|
| Take 2/10 net 30 discount | 37.24% |
| Pay down revolving credit (8% interest) | 8.00% |
| Invest in money market fund | 5.25% |
| Fund a capital project (projected ROI) | 15.00% |

The early payment discount at 37.24% beats every alternative. Even if you needed to draw on a credit line at 8% to fund the early payment, you would net 29.24% annualized — still a clear win.

The break-even point is when your alternative return equals the annualized discount rate. For 2/10 net 30, you would need an alternative investment yielding over 37% to justify skipping the discount. That is rare outside of high-growth venture scenarios.

## The Supplier Perspective

Early payment discounts are not charity from the supplier. They are a rational financial instrument. Here is why suppliers offer them:

**Reducing Days Sales Outstanding (DSO).** If a supplier's average collection period is 45 days, accelerating even a portion of receivables to 10 days dramatically improves cash flow. For a supplier doing $20M in annual revenue, reducing DSO from 45 to 35 days frees up roughly $548,000 in working capital.

```
Working capital freed = (DSO reduction / 365) × Annual Revenue
                      = (10 / 365) × $20,000,000
                      = $547,945
```

**Improving cash flow predictability.** When suppliers know a buyer will pay on day 10 in exchange for 2%, they can forecast cash inflows more precisely. This reduces their need for expensive credit facilities or factoring arrangements.

**Lower cost than alternatives.** A supplier paying 2% for 20-day acceleration is effectively borrowing at 37.24% annualized — which sounds expensive. But consider the alternatives: invoice factoring typically costs 1-5% per invoice (with recourse risk), and small business credit lines can run 10-25% depending on creditworthiness. For suppliers with limited access to capital, a 2% discount for fast payment can be their cheapest financing option.

**Strengthening buyer relationships.** Offering discounts signals financial stability and willingness to partner. Buyers who consistently take discounts become preferred customers — they are reliable, predictable, and financially engaged.

## The Key Variables

Whether to take a discount comes down to four variables:

1. **Discount percentage** — Higher discounts create more value.
2. **Acceleration period** — Shorter gaps between discount date and full-term date increase the annualized rate.
3. **Cost of capital** — Your company's borrowing rate or opportunity cost sets the threshold.
4. **Cash availability** — You cannot take discounts you cannot fund, regardless of the math.

The first two are set by the supplier. The second two are internal to your organization. An effective early payment discount program requires visibility into all four — which is why, as we will see in later lessons, automation and treasury integration are critical.

## Why This Matters for Agent-Based AP

The economics described here do not change when an AI agent handles the process. What changes is the **capture rate**. Most organizations miss the majority of available discounts due to process friction: slow approvals, poor cash visibility, manual scheduling. When an autonomous agent on a platform like Causa Prima handles identification, scoring, and execution, the economics that make discounts attractive can actually be realized at scale.

In the next lesson, we will look at the full landscape of payment terms and discount structures you will encounter in practice — from simple static discounts to dynamic and sliding-scale models.
