# Statistical Baselines for Invoice Behavior
## Module 3: Anomaly Detection and Pattern Recognition | Lesson 1

**Learning Objectives:**
- Construct statistical baselines for invoice amounts, frequencies, and timing per vendor
- Apply z-score and IQR methods to flag outlier invoices
- Account for seasonality and business cycles when building baselines
- Set alert thresholds that balance sensitivity against false-positive rates

---

## Beyond Rules: Why Statistical Detection Matters

Rule-based detection (Module 2) catches discrepancies against known expectations: the PO price, the GRN quantity, the exact invoice number. But rules cannot catch what they do not explicitly look for.

Consider this: a vendor who normally invoices $15,000-$20,000 per month suddenly submits an invoice for $85,000. No pricing discrepancy — the unit prices match the PO. No quantity issue — the quantities match the GRN. No duplicate. Every rule passes. But something is clearly unusual, and that invoice deserves human review.

Statistical anomaly detection answers the question: "Is this invoice consistent with what we normally see from this vendor?" It does not replace rules — it complements them by catching the unexpected.

## Building Vendor Profiles

A vendor profile is a statistical summary of a vendor's invoicing behavior over a historical window. It captures what "normal" looks like for that vendor.

### Key Profile Dimensions

```python
class VendorProfile:
    vendor_id: str
    profile_period: str       # e.g., "2024-01-01 to 2024-12-31"
    sample_size: int          # Number of invoices in the period

    # Amount statistics
    amount_mean: float        # Average invoice amount
    amount_median: float      # Median invoice amount
    amount_std: float         # Standard deviation
    amount_min: float
    amount_max: float
    amount_q1: float          # 25th percentile
    amount_q3: float          # 75th percentile

    # Frequency statistics
    invoices_per_month_mean: float
    invoices_per_month_std: float
    avg_days_between_invoices: float

    # Timing statistics
    typical_invoice_day_of_month: list  # e.g., [1, 15] for bimonthly
    typical_payment_terms: str
```

### Building the Profile

```python
def build_vendor_profile(vendor_id, lookback_months=12):
    invoices = get_invoices(
        vendor_id=vendor_id,
        date_range=(today() - months(lookback_months), today()),
        status=["paid", "approved"]  # Only use settled invoices
    )

    if len(invoices) < 10:
        return None  # Insufficient data for reliable statistics

    amounts = [inv.total_amount for inv in invoices]

    profile = VendorProfile(
        vendor_id=vendor_id,
        sample_size=len(invoices),
        amount_mean=statistics.mean(amounts),
        amount_median=statistics.median(amounts),
        amount_std=statistics.stdev(amounts),
        amount_min=min(amounts),
        amount_max=max(amounts),
        amount_q1=percentile(amounts, 25),
        amount_q3=percentile(amounts, 75),
    )

    # Frequency: group by month
    monthly_counts = group_by_month(invoices)
    profile.invoices_per_month_mean = statistics.mean(monthly_counts.values())
    profile.invoices_per_month_std = statistics.stdev(monthly_counts.values())

    return profile
```

**Important:** Only use paid/approved invoices for the baseline. Including disputed invoices in the profile would contaminate the baseline with the anomalies you are trying to detect.

## Z-Score Anomaly Detection

The z-score measures how many standard deviations an observation is from the mean. For normally distributed data, 99.7% of values fall within 3 standard deviations.

```python
def z_score_check(invoice_amount, profile):
    if profile.amount_std == 0:
        return 0 if invoice_amount == profile.amount_mean else float('inf')

    z = (invoice_amount - profile.amount_mean) / profile.amount_std
    return z
```

### Interpreting Z-Scores

| Z-Score | Interpretation | Suggested Action |
|---------|---------------|------------------|
| -2 to 2 | Normal range | No flag |
| 2 to 3 | Unusual | Low-priority review |
| 3 to 4 | Highly unusual | Flag for review |
| > 4 | Extreme outlier | Hold for investigation |
| < -3 | Unusually low | Investigate (potential partial invoice or error) |

**Example:** Vendor V-10042 has a mean invoice amount of $18,500 with a standard deviation of $3,200. A new invoice arrives for $32,100.

z = ($32,100 - $18,500) / $3,200 = 4.25

This is 4.25 standard deviations above the mean. Fewer than 0.001% of invoices would naturally be this high. This invoice should be investigated.

### When Z-Score Fails

Z-scores assume roughly symmetric, bell-shaped distributions. Invoice amounts often are not — they tend to be right-skewed, with many small invoices and occasional large ones. For a vendor that typically invoices $5,000-$8,000 but once a year has a $50,000 annual contract renewal, the $50,000 invoice will have an enormous z-score every year.

This is where the IQR method is more robust.

## IQR (Interquartile Range) Method

The IQR method uses percentiles instead of the mean and standard deviation, making it resistant to skew and outliers in the historical data.

```python
def iqr_check(invoice_amount, profile):
    iqr = profile.amount_q3 - profile.amount_q1
    lower_bound = profile.amount_q1 - (1.5 * iqr)
    upper_bound = profile.amount_q3 + (1.5 * iqr)

    if invoice_amount > upper_bound:
        severity = "standard_outlier"
        # Extreme outlier: beyond 3x IQR
        if invoice_amount > profile.amount_q3 + (3.0 * iqr):
            severity = "extreme_outlier"
        return {
            "is_anomaly": True,
            "severity": severity,
            "amount": invoice_amount,
            "upper_bound": upper_bound,
            "excess": invoice_amount - upper_bound
        }
    elif invoice_amount < lower_bound:
        return {
            "is_anomaly": True,
            "severity": "low_outlier",
            "amount": invoice_amount,
            "lower_bound": lower_bound,
            "deficit": lower_bound - invoice_amount
        }
    return {"is_anomaly": False}
```

**Example:** Vendor invoices over the past year: Q1=$4,200, Q3=$9,800. IQR = $5,600. Upper fence = $9,800 + (1.5 x $5,600) = $18,200. A $15,000 invoice is within bounds. A $22,000 invoice is a standard outlier. A $35,000 invoice ($9,800 + 3 x $5,600 = $26,600 extreme fence) is an extreme outlier.

### Z-Score vs. IQR: When to Use Which

| Situation | Recommended Method |
|-----------|-------------------|
| Large sample (50+ invoices), roughly symmetric distribution | Z-score |
| Skewed distribution (common in AP) | IQR |
| Small sample (10-30 invoices) | IQR (more stable with less data) |
| Need a continuous anomaly score (for ranking) | Z-score |
| Need a binary outlier flag | IQR |
| Best overall for AP | Use both; flag if either triggers |

## Accounting for Seasonality

Many vendors have legitimate seasonal patterns. An office supply vendor's invoices spike in September (back-to-school/fiscal-year start). A landscaping vendor invoices more in summer. A heating fuel supplier peaks in winter.

If you build an annual baseline without accounting for seasonality, you will flag every winter invoice from the fuel supplier as an anomaly.

### Monthly Baselines

Instead of one profile per vendor, build twelve — one per month:

```python
def build_seasonal_profile(vendor_id, lookback_years=2):
    profiles = {}
    for month in range(1, 13):
        invoices = get_invoices(
            vendor_id=vendor_id,
            months=[month],
            years=range(current_year - lookback_years, current_year)
        )
        if len(invoices) >= 3:  # Need at least 3 data points per month
            amounts = [inv.total_amount for inv in invoices]
            profiles[month] = {
                "mean": statistics.mean(amounts),
                "std": statistics.stdev(amounts) if len(amounts) > 1 else 0,
                "q1": percentile(amounts, 25),
                "q3": percentile(amounts, 75),
                "count": len(amounts)
            }
        else:
            profiles[month] = None  # Insufficient data; fall back to annual profile
    return profiles
```

When evaluating a January invoice, compare it against the January profile, not the annual average.

### Quarterly Patterns

If monthly data is too sparse (not enough invoices per month for reliable statistics), use quarterly grouping:

```python
def get_quarter(month):
    return (month - 1) // 3 + 1

# Group: Q1 = Jan-Mar, Q2 = Apr-Jun, Q3 = Jul-Sep, Q4 = Oct-Dec
```

### Trend Adjustment

If a vendor's invoices are growing 15% year-over-year because your business is buying more from them, this year's invoices will all look like anomalies compared to last year's baseline.

Apply a trend adjustment:

```python
def trend_adjusted_baseline(vendor_id, lookback_months=12):
    monthly_totals = get_monthly_totals(vendor_id, lookback_months=24)

    # Fit a simple linear trend
    x = list(range(len(monthly_totals)))
    slope, intercept = linear_regression(x, monthly_totals)

    # Project the trend forward
    current_month_index = len(monthly_totals)
    expected_current = slope * current_month_index + intercept

    # Adjust the baseline mean upward by the trend
    # Use residuals (actuals - trend) for standard deviation
    residuals = [actual - (slope * i + intercept) for i, actual in enumerate(monthly_totals)]
    adjusted_std = statistics.stdev(residuals)

    return expected_current, adjusted_std
```

## Setting Alert Thresholds

The threshold determines the trade-off between catching anomalies (recall) and not drowning in false alarms (precision).

### Cost-Based Threshold Setting

The optimal threshold depends on the cost of each outcome:

- **Cost of a false positive (FP):** An AP reviewer spends 10 minutes investigating a flagged invoice that turns out to be normal. Cost: ~$15 of labor.
- **Cost of a false negative (FN):** A genuinely anomalous invoice is paid without review. Average cost of a missed anomaly: depends on your data, but $500-$5,000 is typical.

If a missed anomaly costs 100x more than a false investigation, you should tolerate a high false-positive rate. Set the z-score threshold at 2.0 instead of 3.0.

```python
def optimal_threshold(fp_cost, fn_cost, historical_data):
    """Find the threshold that minimizes total expected cost."""
    best_threshold = None
    best_cost = float('inf')

    for threshold in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]:
        fps = count_false_positives(historical_data, threshold)
        fns = count_false_negatives(historical_data, threshold)
        total_cost = (fps * fp_cost) + (fns * fn_cost)

        if total_cost < best_cost:
            best_cost = total_cost
            best_threshold = threshold

    return best_threshold
```

### Practical Starting Points

For most AP operations, start with:
- **Z-score threshold:** 3.0 for amount anomalies (flag invoices >3 standard deviations from mean)
- **IQR multiplier:** 1.5 for standard outliers, 3.0 for extreme outliers
- **Frequency anomaly:** Flag if monthly invoice count exceeds mean + 2 standard deviations

Monitor the false-positive rate for the first 30 days, then adjust. If reviewers are dismissing 80%+ of flags, widen the threshold. If you discover anomalies that were missed, tighten it.

## Minimum Sample Size Requirements

Statistical methods require sufficient data. Do not apply z-score or IQR detection to a vendor with 5 historical invoices — the statistics will be meaningless.

| Historical Invoices | Recommended Approach |
|--------------------|--------------------|
| < 5 | No statistical detection; rely on rules only |
| 5-10 | IQR only (resistant to small samples) |
| 10-30 | IQR + conservative z-score (threshold of 3.5+) |
| 30-50 | Full z-score and IQR |
| 50+ | Full statistical detection with seasonality |

For new vendors, build the profile over the first 3-6 months before activating anomaly detection. During that ramp-up period, rely on rule-based detection only.

---

**Up next:** Lesson 3.2 covers temporal pattern analysis — detecting anomalies not just in invoice amounts but in their timing, frequency, and trends over time.
