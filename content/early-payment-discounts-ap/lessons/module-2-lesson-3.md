# Predicting Supplier Receptiveness
## Module 2: Discount Identification and Opportunity Analysis | Lesson 3

**Learning Objectives:**
- Use historical data to estimate a supplier's likelihood of accepting a discount proposal
- Identify supplier signals that indicate openness to early payment (cash flow stress, seasonal patterns, past behavior)
- Explain how machine learning models improve prediction accuracy over time
- Interpret a supplier receptiveness score and decide whether to proceed

---

## Why Prediction Matters

When a supplier already offers discount terms on their invoice, there is nothing to predict — the discount is available, and the agent simply needs to pay on time. But the most valuable discount opportunities often come from **proactive negotiation**: approaching suppliers who do not currently offer discounts and proposing early payment in exchange for a price reduction.

Proactive outreach has a cost. Every proposal the agent sends consumes communication bandwidth, risks annoying a supplier with an unwanted solicitation, and requires follow-up. Sending proposals to suppliers who will never accept wastes resources and can damage relationships.

A good prediction model lets the agent focus outreach on suppliers who are likely to say yes, dramatically improving the program's efficiency and supplier satisfaction.

## Historical Acceptance Rates as a Baseline

The simplest predictor is past behavior. If a supplier has accepted 4 out of 5 discount proposals in the past, their predicted acceptance rate is 80%. If they have rejected every proposal, it is close to 0%.

### Building the History

Track every negotiation outcome in a structured format:

```python
negotiation_record = {
    "supplier_id": "SUP-00342",
    "proposal_date": "2026-02-15",
    "proposed_discount": 1.5,
    "proposed_payment_day": 10,
    "original_terms": "net 30",
    "outcome": "accepted",         # accepted | rejected | counter | no_response
    "counter_terms": None,          # If counter: {"discount": 1.0, "days": 15}
    "response_time_hours": 18,
    "invoice_amount": 47500.00
}
```

With enough history, the baseline acceptance rate for each supplier becomes reliable:

```python
def baseline_acceptance_rate(supplier_id, min_proposals=3):
    history = get_negotiation_history(supplier_id)

    if len(history) < min_proposals:
        return None  # Insufficient data; use segment default

    accepted = sum(1 for h in history if h.outcome == "accepted")
    return accepted / len(history)
```

The `min_proposals` threshold matters. A supplier with one acceptance out of one proposal shows 100% — but that is not statistically meaningful. Require at least 3-5 data points before trusting supplier-specific rates. For new suppliers, fall back to segment-level or industry-level defaults.

### Segment-Level Defaults

When you lack supplier-specific history, use the average acceptance rate for their segment:

| Supplier Segment | Typical Baseline Acceptance Rate |
|-----------------|--------------------------------|
| Small suppliers (< $1M revenue) | 55-65% |
| Mid-market suppliers ($1M-$50M) | 40-55% |
| Large suppliers (> $50M) | 25-35% |
| Cash-constrained industries | 60-70% |
| Capital-intensive industries | 35-45% |

Small suppliers generally have higher acceptance rates because they value cash flow more acutely. Large suppliers often have access to cheaper financing and are less motivated by a 1-2% discount.

## Enrichment Signals

Historical acceptance rates are a starting point, but richer signals improve predictions substantially.

### Financial Health Indicators

A supplier experiencing cash flow pressure is more likely to accept early payment. Indicators include:

- **Public financial data** — For publicly traded suppliers, monitor current ratio, quick ratio, and days sales outstanding. A rising DSO suggests the supplier is collecting more slowly and may welcome faster payment from you.
- **Credit reports** — Dun & Bradstreet, Experian Business, or similar services provide payment behavior scores. A declining score suggests the supplier is paying their own bills more slowly — a cash pressure signal.
- **Payment behavior to you** — Ironic but useful: if a supplier is accelerating their invoice submissions or following up more aggressively on payment status, they may need cash.

### Seasonal Patterns

Many businesses have predictable cash flow cycles:

- **Retailers** need cash in Q3 to fund holiday inventory
- **Agriculture suppliers** face seasonal planting/harvest cash needs
- **Tax season** (Q1 in the US) creates cash pressure for many businesses
- **Year-end** budget cycles create spending pressure in Q4

Track acceptance rates by quarter. If a supplier consistently accepts in Q4 but rejects in Q2, the agent should time outreach accordingly.

```python
def seasonal_adjustment(supplier_id, current_quarter):
    quarterly_rates = get_quarterly_acceptance_rates(supplier_id)
    # quarterly_rates = {"Q1": 0.45, "Q2": 0.30, "Q3": 0.55, "Q4": 0.70}

    if quarterly_rates:
        overall_rate = sum(quarterly_rates.values()) / 4
        seasonal_factor = quarterly_rates[current_quarter] / overall_rate
        return seasonal_factor  # > 1.0 means above-average receptiveness this quarter
    return 1.0  # No adjustment
```

### Invoice Size Effects

Suppliers may be more receptive to discounts on larger invoices because the absolute dollar impact of delayed payment is greater. A $500,000 invoice sitting unpaid for 30 days represents significant working capital; a $2,000 invoice does not.

Conversely, some suppliers resist discounts on large invoices because the discount amount feels too large ("You want me to give up $10,000?"). Test this empirically with your supplier base.

### External Events

News and events can signal a change in receptiveness:

- **Supplier raises capital** — They may have less need for early payment
- **Industry downturn** — Increased receptiveness across the sector
- **Supplier wins large contract** — May need working capital to fund fulfillment
- **Key customer loss** — Cash pressure increases

Monitoring these signals at scale requires news API integration and is typically a Phase 2 enhancement. Start with internal data; add external enrichment as the model matures.

## Building a Predictive Model

Once you have enough data, a logistic regression model provides a solid predictive foundation. It is interpretable, auditable (important for financial applications), and effective with moderate data volumes.

### Feature Engineering

Define features that the model can use:

```python
features = {
    # Supplier characteristics
    "supplier_annual_revenue": float,       # Log-transformed
    "supplier_segment": str,                 # One-hot encoded
    "supplier_industry": str,                # One-hot encoded
    "supplier_credit_score": float,          # Normalized 0-100
    "supplier_dso": float,                   # Days sales outstanding

    # Historical behavior
    "historical_acceptance_rate": float,     # 0-1, or null if insufficient data
    "proposals_sent_count": int,             # How many times we've asked
    "days_since_last_proposal": int,         # Avoid over-solicitation
    "last_outcome": str,                     # accepted | rejected | counter | no_response

    # Invoice characteristics
    "invoice_amount": float,                 # Log-transformed
    "proposed_discount_percent": float,
    "proposed_payment_acceleration_days": int,
    "annualized_rate_offered": float,

    # Temporal features
    "quarter": int,                          # 1-4
    "month_end_proximity": int,              # Days until month end
    "year_end_proximity": int,               # Days until year end
}
```

### Model Training

```python
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
import numpy as np

# Prepare training data from historical negotiations
X, y = prepare_features_and_labels(negotiation_history)
# y = 1 if accepted, 0 if rejected/no_response
# Counter-offers can be labeled 1 (eventual agreement) or 0.5 (partial success)

model = LogisticRegression(
    penalty='l2',
    C=1.0,
    class_weight='balanced',  # Handle class imbalance
    max_iter=1000
)

# Cross-validate
scores = cross_val_score(model, X, y, cv=5, scoring='roc_auc')
print(f"AUC: {np.mean(scores):.3f} (+/- {np.std(scores):.3f})")

model.fit(X, y)
```

### Interpreting the Model

Logistic regression coefficients tell you which features drive predictions:

```python
feature_importance = sorted(
    zip(feature_names, model.coef_[0]),
    key=lambda x: abs(x[1]),
    reverse=True
)

# Example output:
# historical_acceptance_rate: +2.34  (strongest positive predictor)
# supplier_credit_score: -0.87      (higher credit = less likely to accept)
# invoice_amount_log: +0.65         (larger invoices = more likely)
# quarter_Q4: +0.52                 (Q4 is more receptive)
# days_since_last_proposal: +0.31   (more time = less annoyance)
```

This interpretability is critical. When a procurement manager asks "why did the agent contact this supplier?", you can point to specific factors: "Their historical acceptance rate is 68%, they are in a cash-constrained industry, and Q4 is historically their most receptive quarter."

## The Feedback Loop

Every negotiation outcome feeds back into the model, improving future predictions:

```
Predict → Propose → Observe Outcome → Update Training Data → Retrain → Predict
```

### Continuous Learning

Retrain the model on a regular schedule — weekly or monthly depending on data volume. Monitor for:

- **Concept drift** — Supplier behavior changing over time (e.g., a supplier secures a credit facility and stops accepting discounts)
- **Distribution shift** — Your supplier mix changing (new suppliers, lost suppliers)
- **Feedback bias** — If the model only recommends high-probability suppliers, you never learn about suppliers who might have accepted but were never asked

### Addressing Feedback Bias

This is the explore-exploit tradeoff. The agent must occasionally propose to low-probability suppliers to gather data and discover opportunities the model is missing.

A simple epsilon-greedy approach:

```python
def should_propose(supplier_id, epsilon=0.1):
    predicted_probability = model.predict_proba(features)[0][1]

    if random.random() < epsilon:
        # Explore: propose regardless of prediction (10% of the time)
        return True, "exploration"

    return predicted_probability >= min_threshold, "exploitation"
```

The `epsilon` parameter controls exploration rate. Start at 10-15% during the first few months to build data, then reduce to 5% once the model is well-calibrated.

## Deciding Whether to Proceed

The receptiveness prediction feeds into the overall opportunity score from the previous lesson. But there are also hard rules:

- **Never propose to a supplier who explicitly opted out.** Respect supplier preferences absolutely.
- **Do not propose within 30 days of a rejection.** Give the supplier time before asking again.
- **Limit proposals per supplier to 4 per year** (for proactive outreach). More than that risks relationship damage.
- **Require procurement approval before first contact** with strategic suppliers. The agent should not surprise a key supplier relationship.

These rules override the model's recommendation. The model predicts what is likely; the rules encode what is appropriate.

In the next lesson, we will connect the discount identification and scoring pipeline to cash flow data from treasury, ensuring the agent only pursues opportunities the organization can actually fund.
