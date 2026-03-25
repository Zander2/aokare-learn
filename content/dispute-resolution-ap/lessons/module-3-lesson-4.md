# Combining Rules and Anomaly Scores
## Module 3: Anomaly Detection and Pattern Recognition | Lesson 4

**Learning Objectives:**
- Design a composite scoring system that merges rule-based flags with anomaly scores
- Weight different signal types based on their predictive value for true disputes
- Implement a priority queue that surfaces the highest-risk invoices first
- Evaluate the combined system's performance using dispute-resolution outcome data

---

## The Integration Problem

At this point in the course, you have two independent detection layers:

1. **Rule-based flags** (Module 2): Binary — the invoice either passes or fails each rule. Output: "pricing discrepancy detected" or "duplicate suspected."
2. **Anomaly scores** (Module 3): Continuous — a z-score, an IQR outlier flag, a temporal pattern score. Output: "this invoice is 3.2 standard deviations from the vendor's mean."

Both layers generate signals. But the AP reviewer does not want two separate queues. They want one ranked list: which invoices need attention first? The composite scoring system provides that ranking.

## Signal Fusion: Combining Binary and Continuous Signals

### Normalizing Signals to a Common Scale

Rule flags are binary (0 or 1). Anomaly scores are continuous and on different scales (z-scores range from 0 to infinity; percentage variances can be any number). Before combining them, normalize everything to [0, 1].

```python
def normalize_z_score(z, max_z=5.0):
    """Convert z-score to [0, 1] range."""
    return min(abs(z) / max_z, 1.0)

def normalize_variance_pct(variance_pct, max_pct=50.0):
    """Convert percentage variance to [0, 1] range."""
    return min(abs(variance_pct) / max_pct, 1.0)

def normalize_rule_flag(flag, severity=None):
    """Convert a rule flag to [0, 1] based on severity."""
    if not flag:
        return 0.0
    severity_map = {"low": 0.3, "medium": 0.6, "high": 0.85, "critical": 1.0}
    return severity_map.get(severity, 0.5)
```

### Building the Signal Vector

For each invoice, construct a vector of normalized signals:

```python
def build_signal_vector(invoice, rule_results, anomaly_results):
    return {
        # Rule-based signals
        "price_discrepancy": normalize_rule_flag(
            rule_results.price_flag, rule_results.price_severity),
        "quantity_discrepancy": normalize_rule_flag(
            rule_results.qty_flag, rule_results.qty_severity),
        "duplicate_flag": normalize_rule_flag(
            rule_results.dup_flag, rule_results.dup_severity),

        # Amount anomaly signals
        "amount_z_score": normalize_z_score(anomaly_results.amount_z),
        "amount_iqr_outlier": 1.0 if anomaly_results.iqr_outlier else 0.0,

        # Temporal signals
        "frequency_anomaly": normalize_z_score(anomaly_results.freq_z),
        "price_drift": normalize_variance_pct(anomaly_results.price_drift_pct),
        "splitting_score": anomaly_results.splitting_confidence,

        # Cross-vendor signals
        "peer_price_anomaly": normalize_z_score(anomaly_results.peer_z),
        "vendor_risk_tier": anomaly_results.vendor_risk_score  # Already 0-1
    }
```

## Weighting Strategies

Not all signals are equally predictive. A duplicate flag with high confidence should carry more weight than a slightly off-cycle invoice date. There are two approaches to setting weights.

### Expert-Assigned Weights

Domain experts (experienced AP managers) assign weights based on their judgment of which signals matter most:

```yaml
signal_weights:
  # Rule-based (high weight — deterministic, high-confidence)
  price_discrepancy: 0.25
  quantity_discrepancy: 0.20
  duplicate_flag: 0.30

  # Amount anomaly (medium weight — statistical, some false positives)
  amount_z_score: 0.10
  amount_iqr_outlier: 0.08

  # Temporal (medium-low weight — contextual signals)
  frequency_anomaly: 0.05
  price_drift: 0.10
  splitting_score: 0.15

  # Cross-vendor (low weight — strategic, not invoice-specific)
  peer_price_anomaly: 0.05
  vendor_risk_tier: 0.05
```

Weights do not need to sum to 1.0 — they represent relative importance, and the composite score is normalized after aggregation.

**Advantages:** Fast to implement, incorporates institutional knowledge.
**Disadvantages:** Subjective, may not reflect actual predictive value.

### Data-Driven Calibration

If you have historical data with known outcomes (invoices that became disputes vs. those that did not), you can learn optimal weights:

```python
from sklearn.linear_model import LogisticRegression

def calibrate_weights(historical_invoices):
    X = []  # Signal vectors
    y = []  # 1 = became a dispute, 0 = did not

    for invoice in historical_invoices:
        signals = build_signal_vector(invoice, invoice.rule_results, invoice.anomaly_results)
        X.append(list(signals.values()))
        y.append(1 if invoice.was_disputed else 0)

    model = LogisticRegression()
    model.fit(X, y)

    # The coefficients ARE the optimal weights
    weights = dict(zip(signals.keys(), model.coef_[0]))
    return weights
```

**Advantages:** Reflects actual predictive power based on your data.
**Disadvantages:** Requires 6-12 months of labeled outcome data; weights may shift as vendor behavior changes.

### Recommended Approach: Start Expert, Evolve to Data-Driven

Start with expert-assigned weights. Collect outcome data for 6-12 months. Then calibrate using data-driven methods. Compare the data-driven weights against the expert weights — significant differences reveal blind spots in either approach.

## Composite Risk Score Calculation

```python
def calculate_risk_score(signal_vector, weights):
    raw_score = sum(
        signal_vector[signal] * weights[signal]
        for signal in signal_vector
    )

    # Normalize to [0, 100]
    max_possible = sum(abs(w) for w in weights.values())
    normalized_score = (raw_score / max_possible) * 100

    return round(min(normalized_score, 100), 1)
```

**Example calculation:**

| Signal | Value | Weight | Contribution |
|--------|-------|--------|-------------|
| price_discrepancy | 0.85 (high severity) | 0.25 | 0.213 |
| quantity_discrepancy | 0.0 (no flag) | 0.20 | 0.000 |
| duplicate_flag | 0.0 (no flag) | 0.30 | 0.000 |
| amount_z_score | 0.64 (z=3.2) | 0.10 | 0.064 |
| price_drift | 0.16 (8% annual) | 0.10 | 0.016 |
| peer_price_anomaly | 0.56 (z=2.8) | 0.05 | 0.028 |
| *others* | 0.0 | various | 0.000 |
| **Total** | | | **0.321** |

Normalized: (0.321 / 1.33) * 100 = **24.1**

This invoice scores 24.1 out of 100. It has a pricing discrepancy and some anomaly signals but no quantity or duplicate issues. Whether 24.1 is "high" depends on your threshold settings.

## Priority Queue Design

The composite score drives a priority queue that routes invoices to the right action:

### Threshold Configuration

```yaml
priority_tiers:
  auto_block:
    min_score: 80
    action: "Block payment immediately. Auto-create dispute case."
    sla: "Review within 4 hours"
    examples: "High-confidence duplicate, critical price/qty discrepancy"

  priority_review:
    min_score: 50
    action: "Hold payment. Route to senior AP reviewer."
    sla: "Review within 1 business day"
    examples: "Multiple medium-severity signals, new vendor with anomalies"

  standard_review:
    min_score: 25
    action: "Hold payment. Add to review queue."
    sla: "Review within 3 business days"
    examples: "Single medium-severity signal, known vendor with one flag"

  monitoring:
    min_score: 10
    action: "Allow payment. Log for periodic audit."
    sla: "Monthly batch review"
    examples: "Low-severity flag, borderline anomaly score"

  auto_approve:
    min_score: 0
    action: "Release for payment. No review needed."
    sla: "N/A"
    examples: "All rules pass, no anomaly signals"
```

### Queue Management

```python
def route_invoice(invoice, risk_score):
    for tier in priority_tiers:
        if risk_score >= tier.min_score:
            return {
                "invoice_id": invoice.id,
                "risk_score": risk_score,
                "tier": tier.name,
                "action": tier.action,
                "sla_deadline": calculate_sla(tier.sla),
                "assigned_queue": tier.review_queue
            }
```

### Queue Overflow Protection

What happens when 200 invoices hit the "priority review" tier on the same day? Your team cannot review them all within 1 business day.

**Solution 1: Within-tier ranking.** Within the "priority review" tier, sort by risk score descending. Review the 85-point invoices before the 52-point ones.

**Solution 2: Dynamic thresholds.** If the queue exceeds capacity, temporarily raise the threshold for lower tiers. Move some "standard review" items to "monitoring" to free up capacity for genuine priorities.

**Solution 3: Value-weighted priority.** Multiply the risk score by the invoice dollar value. A 60-point risk on a $500 invoice ($300 risk-weighted) is less urgent than a 40-point risk on a $50,000 invoice ($20,000 risk-weighted).

```python
def value_weighted_priority(risk_score, invoice_amount):
    return risk_score * math.log10(max(invoice_amount, 1))
```

## Performance Evaluation

How do you know if the combined system is working? Measure it against actual dispute outcomes.

### Metrics

```python
def evaluate_system(invoices_with_outcomes, score_threshold=25):
    results = {
        "total": len(invoices_with_outcomes),
        "flagged": 0, "not_flagged": 0,
        "true_pos": 0, "false_pos": 0,
        "true_neg": 0, "false_neg": 0
    }

    for inv in invoices_with_outcomes:
        flagged = inv.risk_score >= score_threshold
        disputed = inv.actual_outcome in ["disputed", "credit_note", "write_off"]

        if flagged and disputed: results["true_pos"] += 1
        elif flagged and not disputed: results["false_pos"] += 1
        elif not flagged and disputed: results["false_neg"] += 1
        else: results["true_neg"] += 1

    tp, fp, fn = results["true_pos"], results["false_pos"], results["false_neg"]
    results["precision"] = tp / (tp + fp) if (tp + fp) > 0 else 0
    results["recall"] = tp / (tp + fn) if (tp + fn) > 0 else 0
    results["f1"] = 2 * (results["precision"] * results["recall"]) / \
                    (results["precision"] + results["recall"]) \
                    if (results["precision"] + results["recall"]) > 0 else 0

    return results
```

### Targets

| Metric | Target | Rationale |
|--------|--------|-----------|
| Recall | > 90% | Catch 90%+ of invoices that will become disputes |
| Precision | > 35% | At least 1 in 3 flagged invoices is a true dispute |
| F1 Score | > 0.50 | Balanced measure |
| Auto-approve accuracy | > 99.5% | Less than 0.5% of auto-approved invoices should have been disputed |

The auto-approve accuracy is the most critical metric. Every invoice you auto-approve is an invoice you trust completely. If 2% of auto-approved invoices turn out to have issues, your system is not safe for automation.

## The Feedback Loop

The system improves over time through a feedback loop:

1. **Invoice arrives** → Signal vector built → Composite score calculated → Routed to queue
2. **Reviewer acts** → Confirms dispute, dismisses flag, or modifies agent recommendation
3. **Outcome recorded** → Dispute resolved, credit note received, or invoice paid as-is
4. **Weights recalibrated** → Using the new outcome data, update the signal weights
5. **Thresholds adjusted** → If too many false positives, raise thresholds; if missed disputes, lower them

This feedback loop is the bridge between Module 3 (detection) and Module 5 (learning). The composite scoring system is not static — it evolves as more data accumulates and as the AP team's decisions teach the system what matters.

---

**Up next:** Module 4 shifts from detection to action. Lesson 4.1 covers how to design the agent's decision logic — when to auto-resolve, when to escalate, and when to dispute.
