# Temporal Pattern Analysis
## Module 3: Anomaly Detection and Pattern Recognition | Lesson 2

**Learning Objectives:**
- Detect invoice timing anomalies such as sudden frequency changes or off-cycle submissions
- Identify trend shifts in vendor pricing over rolling windows
- Recognize split-invoice patterns designed to stay below approval thresholds
- Implement rolling-window calculations for real-time anomaly scoring

---

## Time as a Detection Dimension

Lesson 3.1 focused on whether an invoice amount is unusual. This lesson focuses on when invoices arrive, how often they arrive, and how patterns change over time. Temporal analysis catches threats that amount-based checks miss entirely.

A vendor gradually increasing prices by 1% per quarter will never trigger a single-invoice anomaly flag — each invoice is close to recent invoices. But over two years, that is an 8% price creep that adds up to significant overspend. Only temporal analysis, looking at trends across time, will catch it.

## Invoice Timing Anomalies

### Off-Cycle Detection

Most vendors have a rhythm. They invoice on the 1st and 15th of each month. Or every Friday. Or on the last business day of the month. An invoice that arrives outside this rhythm is worth noting.

```python
def detect_off_cycle(invoice, vendor_profile):
    historical_days = [inv.invoice_date.day for inv in vendor_profile.recent_invoices]

    if len(historical_days) < 6:
        return None  # Not enough data

    # Find the typical invoicing days
    day_counts = Counter(historical_days)
    common_days = [day for day, count in day_counts.items()
                   if count >= len(historical_days) * 0.2]  # Day appears in 20%+ of invoices

    if not common_days:
        return None  # No clear pattern

    invoice_day = invoice.invoice_date.day
    min_distance = min(abs(invoice_day - d) for d in common_days)

    if min_distance > 5:  # More than 5 days from any typical invoicing day
        return {
            "anomaly": "off_cycle",
            "invoice_day": invoice_day,
            "typical_days": common_days,
            "distance": min_distance,
            "severity": "low"
        }
    return None
```

Off-cycle invoices are low-severity signals on their own. But combined with other anomalies (unusual amount, new item codes, rush payment terms), they become meaningful.

### Frequency Spike Detection

A vendor that normally sends 3-4 invoices per month suddenly sends 12. Why?

Legitimate reasons: a large project ramping up, multiple deliveries against a blanket PO, month-end catch-up from the supplier's AR team.

Suspicious reasons: invoice splitting (covered below), duplicate submissions, fraudulent invoices being mixed in with legitimate ones.

```python
def detect_frequency_spike(vendor_id, current_month, profile):
    current_count = count_invoices(vendor_id, month=current_month)
    expected = profile.invoices_per_month_mean
    std = profile.invoices_per_month_std

    if std == 0:
        z_score = float('inf') if current_count != expected else 0
    else:
        z_score = (current_count - expected) / std

    if z_score > 2.5:
        return {
            "anomaly": "frequency_spike",
            "current_count": current_count,
            "expected": round(expected, 1),
            "z_score": round(z_score, 2),
            "severity": "medium" if z_score < 4 else "high"
        }
    return None
```

### Frequency Drop Detection

Equally important: a vendor that normally invoices weekly suddenly goes silent for 6 weeks. This may indicate:
- Goods were delivered but not invoiced (future invoice will be large and backdated)
- Supplier is in financial distress
- A contract dispute is brewing on the supplier's side
- The vendor relationship is winding down

## Price Drift Detection

Price drift is the gradual upward movement of unit prices over time. Each individual invoice passes the tolerance check because it is only slightly above the previous invoice. But the cumulative effect is substantial.

### Rolling Window Price Trend

```python
def detect_price_drift(vendor_id, item_code, lookback_months=12):
    invoices = get_invoice_lines(
        vendor_id=vendor_id,
        item_code=item_code,
        months=lookback_months,
        sort="invoice_date"
    )

    if len(invoices) < 6:
        return None

    prices = [inv.unit_price for inv in invoices]
    dates = [inv.invoice_date for inv in invoices]

    # Calculate the trend using simple linear regression
    x = [(d - dates[0]).days for d in dates]
    slope, intercept = linear_regression(x, prices)

    # Annualize the slope
    daily_drift = slope
    annual_drift = daily_drift * 365
    annual_drift_pct = (annual_drift / prices[0]) * 100

    if abs(annual_drift_pct) > 5:  # More than 5% annual drift
        return {
            "anomaly": "price_drift",
            "item_code": item_code,
            "start_price": prices[0],
            "current_price": prices[-1],
            "annual_drift_pct": round(annual_drift_pct, 1),
            "severity": "medium" if abs(annual_drift_pct) < 10 else "high",
            "note": "Verify against contract escalation terms"
        }
    return None
```

**Example:** A vendor's unit price for Widget-X over 12 months: $10.00, $10.08, $10.15, $10.22, $10.30, $10.40. Each increase is less than 1% — within a standard 2% tolerance. But the annualized trend is 4.8%. If the contract does not include an escalation clause, this represents $4,800 in overspend per 10,000 units annually.

### Change-Point Detection

Sometimes the shift is not gradual — a vendor changes pricing abruptly. Change-point detection identifies the moment behavior shifts.

```python
def detect_change_point(prices, min_segment=5):
    """Simple change-point detection using mean-shift analysis."""
    best_split = None
    best_cost_reduction = 0

    total_variance = variance(prices)

    for i in range(min_segment, len(prices) - min_segment):
        left = prices[:i]
        right = prices[i:]

        split_variance = (len(left) * variance(left) + len(right) * variance(right)) / len(prices)
        cost_reduction = total_variance - split_variance

        if cost_reduction > best_cost_reduction:
            best_cost_reduction = cost_reduction
            best_split = i

    if best_split and best_cost_reduction > total_variance * 0.3:  # 30% variance reduction
        left_mean = statistics.mean(prices[:best_split])
        right_mean = statistics.mean(prices[best_split:])
        shift_pct = ((right_mean - left_mean) / left_mean) * 100

        return {
            "change_point_index": best_split,
            "before_mean": round(left_mean, 2),
            "after_mean": round(right_mean, 2),
            "shift_pct": round(shift_pct, 1)
        }
    return None
```

## Invoice Splitting Detection

Invoice splitting is a red flag pattern where a vendor (or an internal actor) breaks one large invoice into multiple smaller invoices to stay below approval thresholds.

**Example:** Your approval policy requires manager sign-off for invoices over $5,000. A vendor who would normally send one $12,000 invoice instead sends three invoices: $3,800, $4,100, and $4,100 — all on the same day, all from the same vendor, all referencing similar items. Each invoice is under the threshold.

### Detection Logic

```python
def detect_splitting(vendor_id, date_range, approval_threshold):
    invoices = get_invoices(
        vendor_id=vendor_id,
        date_range=date_range  # Typically check within a 3-5 day window
    )

    # Group invoices by submission date (or within N days of each other)
    date_clusters = cluster_by_date(invoices, max_gap_days=3)

    flags = []
    for cluster in date_clusters:
        if len(cluster) < 2:
            continue

        total = sum(inv.total_amount for inv in cluster)
        all_below_threshold = all(inv.total_amount < approval_threshold for inv in cluster)
        total_above_threshold = total >= approval_threshold

        if all_below_threshold and total_above_threshold:
            # Additional checks: do the invoices reference similar items?
            item_overlap = calculate_item_overlap(cluster)

            flags.append({
                "anomaly": "potential_splitting",
                "invoice_count": len(cluster),
                "individual_amounts": [inv.total_amount for inv in cluster],
                "combined_total": total,
                "approval_threshold": approval_threshold,
                "item_overlap_pct": item_overlap,
                "severity": "high" if item_overlap > 50 else "medium",
                "date_range": f"{cluster[0].invoice_date} to {cluster[-1].invoice_date}"
            })

    return flags
```

### Refinements to Reduce False Positives

Not every cluster of small invoices is splitting. A janitorial vendor invoicing separately for different building locations will naturally send multiple invoices below $5,000.

Refine by checking:
- **Item similarity:** If the invoices contain the same or similar items, splitting is more likely.
- **PO references:** If all invoices reference different POs, they are likely legitimate separate orders.
- **Historical pattern:** If this vendor has always sent 3-4 small invoices per week, it is normal. Splitting is suspicious when the pattern is new.
- **Round numbers:** Invoices deliberately kept just below a threshold (e.g., $4,950, $4,900, $4,875) are more suspicious than natural amounts.

## Rolling Window Implementation

Real-time anomaly detection requires rolling windows — continuously updated statistical summaries that reflect recent behavior rather than static annual profiles.

### Window Size Selection

| Window Size | Pros | Cons |
|-------------|------|------|
| 30 days | Catches very recent changes | Noisy; insufficient data for many vendors |
| 90 days | Good balance of recency and stability | May miss seasonal patterns |
| 180 days | Captures half-year trends | Slower to react to genuine changes |
| 365 days | Full seasonal picture | Does not reflect recent vendor changes |

Best practice: use multiple windows. A short window (90 days) for detecting sudden changes and a long window (365 days) for establishing baselines. Flag when both windows agree.

### Exponential Decay

Instead of a hard window cutoff, weight recent invoices more heavily:

```python
def exponential_weighted_mean(invoices, half_life_days=60):
    """Compute a weighted mean where recent invoices count more."""
    weights = []
    values = []

    for inv in invoices:
        days_ago = (today() - inv.invoice_date).days
        weight = 2 ** (-days_ago / half_life_days)
        weights.append(weight)
        values.append(inv.total_amount)

    weighted_sum = sum(w * v for w, v in zip(weights, values))
    total_weight = sum(weights)

    return weighted_sum / total_weight if total_weight > 0 else 0
```

With a half-life of 60 days, an invoice from yesterday has a weight of ~1.0. An invoice from 60 days ago has a weight of ~0.5. An invoice from 120 days ago has a weight of ~0.25. This creates a smooth, continuously updating baseline that is more responsive to recent behavior without completely ignoring history.

### Updating Profiles in Production

In a production system, you do not rebuild vendor profiles from scratch every time an invoice arrives. Use incremental updates:

```python
def update_profile_incrementally(profile, new_invoice_amount):
    """Welford's online algorithm for running mean and variance."""
    profile.count += 1
    delta = new_invoice_amount - profile.running_mean
    profile.running_mean += delta / profile.count
    delta2 = new_invoice_amount - profile.running_mean
    profile.running_m2 += delta * delta2
    profile.running_std = math.sqrt(profile.running_m2 / profile.count)
```

This updates the profile in O(1) time regardless of how many historical invoices exist.

## Combining Temporal Signals

Each temporal check produces a signal. Combine them for a richer picture:

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Off-cycle timing | 0.1 | Weak signal alone |
| Frequency spike | 0.2 | Moderate — could be legitimate |
| Price drift | 0.3 | Strong — cumulative financial impact |
| Change-point detected | 0.25 | Strong — indicates behavioral shift |
| Splitting pattern | 0.35 | Strong — deliberate threshold avoidance |

A vendor invoice that triggers price drift (0.3) and is off-cycle (0.1) gets a temporal anomaly score of 0.4. One that triggers splitting (0.35) and frequency spike (0.2) gets 0.55. These scores feed into the composite scoring system covered in Lesson 3.4.

---

**Up next:** Lesson 3.3 expands the lens from individual vendors to cross-vendor and cross-category anomalies — detecting patterns that only emerge when you look at the full vendor portfolio.
