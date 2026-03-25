# Opportunity Scoring and Prioritization
## Module 2: Discount Identification and Opportunity Analysis | Lesson 2

**Learning Objectives:**
- Build a scoring model that ranks discount opportunities by net financial benefit
- Incorporate cash availability constraints into opportunity prioritization
- Weight supplier relationship factors alongside pure financial return
- Configure an agent's decision rules for which opportunities to pursue

---

## The Opportunity Scoring Framework

Not all discount opportunities are equal. A 2% discount on a $500 invoice is worth $10. A 1.5% discount on a $200,000 invoice is worth $3,000. But dollar value alone is not enough — the agent must also consider the probability of success, the relationship value of the supplier, and whether cash is available to fund the early payment.

A well-designed scoring model combines three dimensions:

1. **Financial value** — How much is this discount worth?
2. **Probability of success** — How likely is the supplier to accept (for proactive proposals) or how confident are we in capturing the discount (for existing terms)?
3. **Relationship value** — How strategically important is this supplier?

### The Scoring Formula

```python
def score_opportunity(invoice, supplier, cash_position):
    # Financial value component (0-100)
    discount_value = invoice.amount * invoice.discount_percent / 100
    annualized_rate = (invoice.discount_percent / (100 - invoice.discount_percent)) * \
                      (365 / (invoice.net_days - invoice.discount_days))
    financial_score = min(100, (discount_value / 50) * 20 + annualized_rate * 100)

    # Probability component (0-100)
    if invoice.has_existing_terms:
        # Existing terms: probability depends on our ability to pay in time
        days_remaining = (invoice.discount_deadline - today()).days
        probability_score = min(100, days_remaining * 15)
    else:
        # Proactive proposal: probability depends on supplier history
        probability_score = supplier.historical_acceptance_rate * 100

    # Relationship value component (0-100)
    segment_weights = {"strategic": 90, "preferred": 70, "transactional": 40, "occasional": 20}
    relationship_score = segment_weights.get(supplier.segment, 30)

    # Weighted combination
    weights = {"financial": 0.50, "probability": 0.30, "relationship": 0.20}
    total_score = (
        weights["financial"] * financial_score +
        weights["probability"] * probability_score +
        weights["relationship"] * relationship_score
    )

    # Cash availability gate
    if discount_value > cash_position.available_for_early_payment:
        total_score *= 0.1  # Severely penalize if unfundable

    return round(total_score, 2)
```

The weights are configurable — organizations that prioritize supplier relationships might increase the relationship weight; those focused purely on financial return might weight it at 0.60 or higher for the financial component.

## Financial Value Scoring in Detail

The financial component considers both the absolute dollar value and the annualized return rate.

### Why Both Matter

A $50 discount on a $2,500 invoice at 2/10 net 30 has a 37.24% annualized rate — excellent. But the absolute dollar value is small. Meanwhile, a $1,500 discount on a $150,000 invoice at 1/10 net 60 has a 7.35% annualized rate — modest — but the absolute value is significant.

The scoring function should reward both, because:

- High annualized rates represent efficient use of capital
- High absolute values deliver meaningful bottom-line impact
- The ideal opportunity has both

### Scaling the Financial Score

A practical scaling approach normalizes the financial score to a 0-100 range using your organization's typical invoice profile:

```python
def financial_score(discount_value, annualized_rate):
    # Value component: $0 = 0 points, $5,000+ = 50 points
    value_points = min(50, (discount_value / 5000) * 50)

    # Rate component: 0% = 0 points, 30%+ = 50 points
    rate_points = min(50, (annualized_rate / 0.30) * 50)

    return value_points + rate_points
```

Adjust the reference values ($5,000 and 30%) based on your organization's scale and cost of capital. A company with $1 billion in AP spend would set the value reference higher; a company borrowing at 12% would set the rate reference lower.

## Cash Availability as a Constraint

Financial attractiveness means nothing if you cannot fund the payment. Cash constraints transform the scoring problem from "rank everything by value" to "maximize total value within a budget."

### The Knapsack Analogy

This is a classic knapsack problem: you have a fixed amount of cash available for early payments (the knapsack capacity), and you want to select the combination of discount opportunities (items) that maximizes total savings (value).

```python
def prioritize_within_budget(opportunities, daily_budget):
    """
    Greedy approximation: sort by value-density (discount $ per $ of cash deployed),
    then fill until budget is exhausted.
    """
    # Calculate value density for each opportunity
    for opp in opportunities:
        opp.value_density = opp.discount_value / opp.payment_amount

    # Sort by value density (highest first)
    sorted_opps = sorted(opportunities, key=lambda x: x.value_density, reverse=True)

    selected = []
    remaining_budget = daily_budget

    for opp in sorted_opps:
        if opp.payment_amount <= remaining_budget:
            selected.append(opp)
            remaining_budget -= opp.payment_amount

    return selected
```

The greedy approach works well in practice because discount opportunities are divisible at the invoice level (you either take the discount on an invoice or you do not) and the value densities are relatively similar across invoices with the same terms.

### Integrating Treasury Forecasts

The budget is not static. It changes daily based on:

- Cash inflows (customer payments, financing draws)
- Cash outflows (payroll, debt service, other AP payments)
- Minimum balance requirements

The agent queries the treasury system each morning (or in real-time) to determine how much cash is available for early payments:

```python
def get_available_budget(treasury_api):
    current_balance = treasury_api.get_balance()
    minimum_reserve = treasury_api.get_minimum_balance()
    committed_payments = treasury_api.get_committed_outflows(days=1)
    expected_inflows = treasury_api.get_expected_inflows(days=1)

    available = current_balance - minimum_reserve - committed_payments + expected_inflows
    early_payment_allocation = min(available * 0.5, treasury_api.get_daily_cap())

    return max(0, early_payment_allocation)
```

The `0.5` multiplier is a safety margin — the agent does not commit more than half of truly available cash to early payments, preserving buffer for unexpected outflows. The daily cap is a hard limit set by treasury.

## Supplier Segmentation

Not all suppliers are equally important. The relationship dimension of the scoring model reflects this reality.

### Segmentation Criteria

| Segment | Criteria | Agent Behavior |
|---------|----------|---------------|
| Strategic | Top 10% by spend, sole-source, or critical supply chain role | Pursue aggressively, accept lower returns, prioritize relationship |
| Preferred | Top 25% by spend, multiple alternatives exist | Pursue actively, standard return thresholds |
| Transactional | Commodity suppliers, easily substituted | Pursue based on pure financial return |
| Occasional | Low spend, infrequent transactions | Only pursue if discount is very attractive |

Strategic suppliers get a scoring bonus because early payment is a relationship investment, not just a financial transaction. Paying a strategic supplier early — even at a modest discount — strengthens the commercial relationship, may lead to better pricing on future contracts, and signals that you are a reliable buyer.

### Configuring Segment-Specific Thresholds

```python
segment_config = {
    "strategic": {
        "min_annualized_rate": 0.05,   # Accept as low as 5% annualized
        "max_payment_acceleration": 50, # Willing to pay up to 50 days early
        "relationship_weight": 0.35,    # Higher relationship weight
    },
    "preferred": {
        "min_annualized_rate": 0.10,
        "max_payment_acceleration": 35,
        "relationship_weight": 0.20,
    },
    "transactional": {
        "min_annualized_rate": 0.15,
        "max_payment_acceleration": 20,
        "relationship_weight": 0.10,
    },
    "occasional": {
        "min_annualized_rate": 0.25,
        "max_payment_acceleration": 10,
        "relationship_weight": 0.05,
    },
}
```

These thresholds encode organizational strategy directly into agent behavior. A CFO who says "we want to prioritize supplier relationships" is not issuing an abstract directive — it translates directly to lower minimum rate thresholds for strategic suppliers.

## Worked Example: Scoring a Batch of Invoices

Let's walk through scoring five real invoices using our framework. Assume a daily early payment budget of $200,000 and a cost of capital of 8%.

| Invoice | Amount | Terms | Supplier Segment | Historical Accept Rate | Days Left |
|---------|--------|-------|-----------------|----------------------|-----------|
| A | $85,000 | 2/10 net 30 | Strategic | N/A (existing terms) | 7 |
| B | $12,000 | 1.5/10 net 45 | Transactional | N/A (existing terms) | 4 |
| C | $150,000 | None (proactive) | Preferred | 62% | N/A |
| D | $45,000 | 2/10 net 30 | Preferred | N/A (existing terms) | 2 |
| E | $28,000 | None (proactive) | Strategic | 45% | N/A |

**Scoring each:**

**Invoice A:** Discount value = $1,700. Annualized rate = 37.24%. Financial score = 67. Probability score = 100 (7 days remaining, plenty of time). Relationship score = 90. **Total: 80.5**

**Invoice B:** Discount value = $180. Annualized rate = 15.87%. Financial score = 28.3. Probability score = 60 (4 days, tight). Relationship score = 40. **Total: 34.5**

**Invoice C:** Discount value = $2,250 (at assumed 1.5%). Annualized rate = TBD. Financial score = 45. Probability score = 62 (acceptance rate). Relationship score = 70. **Total: 55.1**

**Invoice D:** Discount value = $900. Annualized rate = 37.24%. Financial score = 53. Probability score = 30 (only 2 days left — risky). Relationship score = 70. **Total: 49.5**

**Invoice E:** Discount value = $420 (at assumed 1.5%). Annualized rate = TBD. Financial score = 18. Probability score = 45. Relationship score = 90. **Total: 40.5**

**Priority order:** A (80.5), C (55.1), D (49.5), E (40.5), B (34.5)

**Budget allocation:** Invoice A requires $83,300 in early cash. Invoice C requires $147,750. Combined = $231,050, which exceeds the $200,000 budget. The agent takes Invoice A ($83,300) and then looks at D ($44,100) — which fits. Total deployed: $127,400, with $72,600 remaining for later in the day.

Invoice C is deferred to the next day when fresh budget is available. Invoice D, despite having a lower total score than C, gets selected because it fits within today's budget and has only 2 days remaining. The agent should recognize urgency — a missed deadline cannot be recovered tomorrow.

This kind of nuanced, multi-factor optimization across dozens or hundreds of invoices daily is precisely what agents do better than humans. The scoring model makes the agent's decisions transparent and auditable — stakeholders can inspect the weights, review the scores, and adjust the parameters to align with organizational priorities.

In the next lesson, we will add another layer: predicting whether a supplier will accept a discount proposal before the agent reaches out.
