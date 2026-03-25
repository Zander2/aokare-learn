# Cross-Vendor and Cross-Category Anomalies
## Module 3: Anomaly Detection and Pattern Recognition | Lesson 3

**Learning Objectives:**
- Compare a vendor's behavior against peer vendors in the same category
- Detect coordinated anomalies across multiple vendors (e.g., simultaneous price increases)
- Identify category-level spend anomalies that individual vendor checks would miss

---

## The Limits of Single-Vendor Analysis

Everything we have done so far evaluates each vendor in isolation: Is this invoice unusual for *this* vendor? But some anomalies only become visible when you compare vendors against each other or look at spending across entire categories.

A vendor charging $14.50 per unit might look perfectly normal based on their own history. But if every other vendor in the same category charges $10.00-$11.00, that $14.50 is a 30-40% premium that deserves investigation. You would never catch this by looking at one vendor alone.

Cross-vendor analysis answers a different question: Is this vendor's behavior unusual *compared to its peers*?

## Peer-Group Analysis

### Defining Peer Groups

Vendors must be compared to relevant peers. A software license vendor is not a peer of a janitorial supplies vendor. Peer groups are defined by:

- **Spend category:** Office supplies, IT hardware, raw materials, professional services, logistics
- **Geography:** Regional vendors may have different cost structures than national or international vendors
- **Size:** A small local supplier may have higher per-unit costs than a large distributor — comparing them directly is unfair
- **Relationship type:** Contracted vendors vs. spot-buy vendors have different pricing dynamics

```python
def build_peer_group(vendor_id, vendor_master):
    vendor = vendor_master.get(vendor_id)
    peers = vendor_master.filter(
        category=vendor.category,
        region=vendor.region,           # Optional: same region
        size_tier=vendor.size_tier,     # Optional: similar size
        exclude=[vendor_id]
    )
    return peers
```

In practice, start with category only. Add region or size filters if the category is large enough (20+ vendors) to maintain statistical power after filtering.

### Relative Anomaly Scoring

Compare a vendor's metrics against the peer-group distribution:

```python
def peer_relative_score(vendor_id, metric, peer_group):
    """Score how a vendor's metric compares to its peers."""
    vendor_value = get_vendor_metric(vendor_id, metric)
    peer_values = [get_vendor_metric(p.id, metric) for p in peer_group]

    if len(peer_values) < 3:
        return None  # Insufficient peer data

    peer_median = statistics.median(peer_values)
    peer_mad = median_absolute_deviation(peer_values)

    if peer_mad == 0:
        return 0 if vendor_value == peer_median else float('inf')

    # Modified z-score using median and MAD (robust to outliers)
    modified_z = 0.6745 * (vendor_value - peer_median) / peer_mad
    return modified_z
```

### Metrics to Compare Across Peers

| Metric | What It Reveals |
|--------|----------------|
| Average unit price (for same item) | Is this vendor significantly more expensive? |
| Price change rate (YoY) | Is this vendor increasing prices faster than peers? |
| Dispute rate | Does this vendor generate more disputes than peers? |
| Invoice accuracy rate | How often do this vendor's invoices match perfectly? |
| Payment terms | Is this vendor offering worse terms than competitors? |
| Lead time | Does this vendor deliver slower than peers? |

**Example output:**

```
Vendor V-10042 (Acme Industrial) vs. Peer Group: Industrial Supplies (n=18)
═══════════════════════════════════════════════════════════════════════════
Metric                    V-10042    Peer Median    Modified Z    Flag?
─────────────────────────────────────────────────────────────────────────
Avg unit price (GASKET)   $14.50       $11.20         +2.8        Yes
Price change (YoY)        +6.2%        +2.1%          +2.1        Yes
Dispute rate              4.8%         3.2%           +1.1        No
Invoice accuracy          91%          94%            -1.4        No
Payment terms             Net 30       Net 30          0.0        No
```

This vendor is significantly more expensive than peers (+2.8 modified z-score) and increasing prices faster (+2.1). These are worth investigating even though the vendor's invoices individually pass all rule-based and single-vendor anomaly checks.

## Coordinated Anomaly Detection

Coordinated anomalies occur when multiple vendors exhibit unusual behavior simultaneously. This can indicate:

- **Market events:** A raw material price shock affects all vendors in a category
- **Collusion:** Multiple vendors coordinate price increases (rare but serious)
- **Internal control failure:** A procurement manager who manages multiple vendor relationships is manipulating pricing

### Simultaneous Price Increase Detection

```python
def detect_coordinated_price_changes(category, time_window_days=30):
    vendors = get_vendors_by_category(category)
    price_changes = []

    for vendor in vendors:
        recent_change = get_most_recent_price_change(vendor.id, within_days=time_window_days)
        if recent_change and recent_change.pct > 0:
            price_changes.append({
                "vendor_id": vendor.id,
                "vendor_name": vendor.name,
                "change_pct": recent_change.pct,
                "change_date": recent_change.date,
                "items_affected": recent_change.items
            })

    # Flag if a significant proportion of vendors changed prices simultaneously
    total_vendors = len(vendors)
    changed_vendors = len(price_changes)

    if changed_vendors >= 3 and (changed_vendors / total_vendors) > 0.3:
        avg_increase = statistics.mean([pc["change_pct"] for pc in price_changes])
        return {
            "anomaly": "coordinated_price_increase",
            "category": category,
            "vendors_affected": changed_vendors,
            "total_vendors": total_vendors,
            "average_increase": round(avg_increase, 1),
            "details": price_changes,
            "severity": "high",
            "note": "Verify against market conditions. If no market justification, investigate further."
        }
    return None
```

### Distinguishing Market Events from Suspicious Coordination

When 5 out of 12 steel suppliers increase prices by 8-12% in the same month, it is probably a market event (steel prices are up). When 4 out of 10 office supply vendors increase prices by exactly 7% in the same week with no visible market driver, that is suspicious.

Context data helps disambiguate:
- **Commodity indices:** Compare vendor price changes against public commodity price indices (steel, copper, oil, etc.)
- **Inflation data:** Compare against CPI/PPI for the relevant sector
- **News analysis:** Industry-specific supply disruptions, tariff changes, regulatory changes

```python
def contextualize_price_changes(category, vendor_changes, market_data):
    market_change = market_data.get_index_change(
        index=category_to_index[category],
        period="last_30_days"
    )

    for change in vendor_changes:
        excess_over_market = change["change_pct"] - market_change
        change["market_benchmark"] = market_change
        change["excess_increase"] = round(excess_over_market, 1)

    # Flag vendors whose increases significantly exceed market movement
    suspicious = [c for c in vendor_changes if c["excess_increase"] > 3.0]
    return suspicious
```

## Category-Level Spend Anomalies

Looking at individual vendors can miss the big picture. Category-level analysis catches:

- **Budget overruns:** Total spend in a category exceeds budget or forecast
- **Vendor concentration shifts:** A larger share of spend flowing to one vendor (potentially reducing negotiating leverage)
- **Category mix changes:** Spending shifting between categories in unexpected ways

### Category Spend Monitoring

```python
def monitor_category_spend(category, period="month"):
    actual_spend = get_total_spend(category=category, period=period)
    budget = get_budget(category=category, period=period)
    forecast = get_forecast(category=category, period=period)
    prior_year = get_total_spend(category=category, period=same_period_last_year())

    return {
        "category": category,
        "actual": actual_spend,
        "budget": budget,
        "budget_variance": actual_spend - budget,
        "budget_variance_pct": ((actual_spend - budget) / budget) * 100,
        "forecast": forecast,
        "forecast_variance": actual_spend - forecast,
        "yoy_change_pct": ((actual_spend - prior_year) / prior_year) * 100,
        "flags": []
    }
```

**Example:**

```
Category Spend Alert — March 2025
════════════════════════════════════
Category: Packaging Materials
Actual spend:     $342,000
Budget:           $280,000
Budget variance:  +$62,000 (+22.1%)    ← FLAG
Forecast:         $310,000
Forecast variance: +$32,000 (+10.3%)
YoY change:       +28.4%               ← FLAG

Contributing factors:
  - Vendor V-10042: spend up 45% vs. last month
  - Vendor V-20089: 3 new POs not in forecast
  - Unit prices: category avg up 6.2% vs. Q4
```

This kind of alert does not point to a specific invoice problem — it points to a category-level issue that may require procurement review. Perhaps a contract is expiring and spot-buy pricing is replacing contracted pricing. Perhaps a new project is consuming more packaging than planned.

### Vendor Concentration Analysis

```python
def vendor_concentration(category, period="quarter"):
    vendor_spends = get_spend_by_vendor(category=category, period=period)
    total = sum(vendor_spends.values())

    # Calculate Herfindahl-Hirschman Index (HHI)
    shares = [(spend / total) * 100 for spend in vendor_spends.values()]
    hhi = sum(s**2 for s in shares)

    # Top-vendor share
    top_vendor_share = max(shares)

    prior_hhi = get_prior_hhi(category, period=prior_period())

    return {
        "hhi": round(hhi),
        "prior_hhi": round(prior_hhi),
        "hhi_change": round(hhi - prior_hhi),
        "top_vendor_share": round(top_vendor_share, 1),
        "vendor_count": len(vendor_spends),
        "flag": hhi > 2500 or (hhi - prior_hhi) > 500
        # HHI > 2500 indicates high concentration
        # HHI increase > 500 indicates rapid concentration shift
    }
```

A rising HHI means spend is concentrating in fewer vendors. This is not necessarily bad — it might be a deliberate consolidation strategy. But if it is unplanned, it signals reduced negotiating leverage and increased supply risk.

## Network Analysis Concepts

At scale, vendor-buyer relationships form a network. Network analysis reveals patterns invisible to traditional metrics.

### Common Network Patterns to Watch

**Circular relationships:** Vendor A sells to your company. Your company sells to Vendor A's subsidiary. Vendor A's subsidiary buys from you. This creates potential conflicts of interest and opportunities for price manipulation.

**Shared addresses or bank accounts:** Two vendors with different names but the same mailing address, phone number, or bank account. This is a strong signal for fictitious vendor fraud.

**Bridge vendors:** A vendor that connects otherwise unrelated vendors through shared line items, shared contacts, or sequential invoicing patterns. Could indicate a middleman adding cost without value.

```python
def detect_shared_attributes(vendor_master):
    """Find vendors sharing suspicious attributes."""
    attribute_groups = {
        "address": defaultdict(list),
        "phone": defaultdict(list),
        "bank_account": defaultdict(list),
        "contact_email_domain": defaultdict(list)
    }

    for vendor in vendor_master:
        for attr in attribute_groups:
            value = getattr(vendor, attr, None)
            if value:
                normalized = normalize(value)
                attribute_groups[attr][normalized].append(vendor.id)

    flags = []
    for attr, groups in attribute_groups.items():
        for value, vendor_ids in groups.items():
            if len(vendor_ids) > 1:
                flags.append({
                    "attribute": attr,
                    "value": value,
                    "vendor_ids": vendor_ids,
                    "severity": "high" if attr == "bank_account" else "medium"
                })

    return flags
```

## Bringing It Together

Cross-vendor and cross-category analysis produces strategic intelligence, not just invoice-level flags. It tells you:

- Which vendors are expensive relative to peers (opportunity for renegotiation)
- Whether market conditions justify vendor price increases (or not)
- Whether category spending is on track (or needs procurement intervention)
- Whether vendor relationships show suspicious patterns (potential fraud)

These signals feed into the composite scoring system (Lesson 3.4) at a different granularity — vendor-level and category-level rather than invoice-level. They influence how individual invoice anomalies are interpreted: an invoice from a vendor flagged as "30% above peer pricing" should have a lower threshold for anomaly flagging.

---

**Up next:** Lesson 3.4 covers how to combine rule-based flags and anomaly scores into a single composite risk score and build a priority queue that surfaces the highest-risk invoices first.
