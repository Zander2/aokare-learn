# Pricing Discrepancy Detection
## Module 2: Detecting Discrepancies with Rule-Based Logic | Lesson 1

**Learning Objectives:**
- Design rules that compare invoice unit prices against contracted PO prices
- Implement tiered tolerance logic (e.g., exact match for high-value items, percentage tolerance for commodities)
- Handle price-escalation clauses, volume discounts, and retroactive pricing adjustments
- Generate structured discrepancy reports with variance calculations

---

## The Core Problem

Pricing discrepancies are the most common type of AP dispute, and they range from trivial rounding differences to six-figure overcharges. The challenge is not detecting that a price is different — any comparison operator can do that. The challenge is knowing which differences matter, which are expected, and which require action.

A naive system that flags every price mismatch will drown your AP team in false positives. A system with thresholds that are too wide will let real overcharges through. The goal is a rule-based detection layer that is precise enough to catch genuine discrepancies while ignoring noise.

## Basic Price Comparison Logic

The simplest pricing check compares the invoice unit price against the PO unit price for each line item:

```python
def check_price(invoice_line, po_line):
    invoice_price = invoice_line.unit_price
    po_price = po_line.unit_price

    variance = invoice_price - po_price
    variance_pct = (variance / po_price) * 100 if po_price != 0 else float('inf')

    return {
        "item_code": invoice_line.item_code,
        "po_price": po_price,
        "invoice_price": invoice_price,
        "variance_amount": variance,
        "variance_pct": variance_pct,
        "direction": "over" if variance > 0 else "under" if variance < 0 else "match"
    }
```

This gives you the raw data. The next step is applying tolerance logic to determine whether the variance is actionable.

## Tiered Tolerance Design

Not all items deserve the same tolerance. A $0.50 variance on a $500 item is noise. A $0.50 variance on a $2.00 item is a 25% overcharge. Tiered tolerances solve this.

### Strategy 1: Value-Based Tiers

```yaml
pricing_tolerances:
  high_value:  # items with unit price > $100
    percentage: 1.0
    absolute: 2.00
    mode: "lesser_of"
  medium_value:  # items with unit price $10 - $100
    percentage: 3.0
    absolute: 5.00
    mode: "greater_of"
  low_value:  # items with unit price < $10
    percentage: 5.0
    absolute: 0.50
    mode: "greater_of"
```

For a high-value item at $250/unit, the tolerance is the lesser of 1% ($2.50) or $2.00 — so $2.00. The system is strict on expensive items.

For a low-value item at $3.00/unit, the tolerance is the greater of 5% ($0.15) or $0.50 — so $0.50. The system is lenient on cheap items where small absolute differences are meaningless.

### Strategy 2: Category-Based Tiers

Different item categories have different pricing volatility. Raw materials with commodity pricing fluctuate daily. Contracted services have fixed rates. Your tolerances should reflect this:

```yaml
category_tolerances:
  commodity_raw_materials:
    percentage: 8.0
    note: "Market-linked pricing, expect volatility"
  contracted_goods:
    percentage: 0.5
    note: "Fixed-price contracts, tight tolerance"
  services:
    percentage: 0.0
    note: "Exact match to PO rate required"
  freight_shipping:
    percentage: 10.0
    note: "Variable based on fuel surcharges, weight"
```

### Strategy 3: Vendor-Based Tiers

Vendors with a strong track record might get slightly wider tolerances. New vendors or vendors with a history of pricing discrepancies get tighter scrutiny:

```yaml
vendor_tolerances:
  tier_1_strategic:  # top 20 vendors by spend, 3+ year relationship
    pricing_multiplier: 1.2  # 20% wider than default
  tier_2_standard:
    pricing_multiplier: 1.0  # default
  tier_3_new_or_flagged:
    pricing_multiplier: 0.5  # 50% tighter than default
```

## Handling Contract Complexity

Real-world pricing is rarely "one price per item forever." Contracts contain clauses that make price comparison non-trivial.

### Price Escalation Clauses

Many contracts tie prices to an index (CPI, PPI, commodity index). The supplier may invoice at an escalated price that is contractually valid but does not match the original PO price.

```python
def get_effective_price(po_line, invoice_date, contract):
    base_price = po_line.unit_price

    if contract.has_escalation_clause:
        escalation = contract.get_escalation_factor(
            base_date=po_line.po_date,
            current_date=invoice_date,
            index=contract.escalation_index  # e.g., "CPI-U"
        )
        effective_price = base_price * (1 + escalation)
        return effective_price

    return base_price
```

**Example:** A contract signed in January 2025 with a base price of $10.00/unit and CPI escalation. By July, CPI has increased 2.3%. The effective price is $10.23. The invoice at $10.23 is not a discrepancy — it is a valid escalation. But without the escalation logic, your system would flag a $0.23 variance on every line.

### Volume Discounts

Volume discount structures mean the unit price depends on the total quantity ordered over a period:

| Volume Tier | Unit Price |
|-------------|-----------|
| 1 - 999 | $15.00 |
| 1,000 - 4,999 | $14.25 |
| 5,000 - 9,999 | $13.50 |
| 10,000+ | $12.75 |

If your PO was created when cumulative volume was at 800 units (tier 1, $15.00), but by the time the invoice is processed, cumulative volume has crossed 1,000 units, the supplier may invoice at $14.25. Both prices are "correct" depending on when you evaluate.

The detection system needs access to cumulative volume data and the discount schedule to determine which price is appropriate.

### Retroactive Pricing Adjustments

Sometimes a contract renegotiation results in retroactive price changes: "New price of $11.50 effective for all invoices from March 1st forward." Invoices already paid at $12.00 need credit notes, and future invoices at $11.50 should match the new PO price — but the PO may not have been updated yet.

Handle this by maintaining a price-effective-date table:

```python
price_history = [
    {"item": "WIDGET-100", "price": 12.00, "effective_from": "2025-01-01", "effective_to": "2025-02-28"},
    {"item": "WIDGET-100", "price": 11.50, "effective_from": "2025-03-01", "effective_to": None},
]

def get_valid_price(item_code, invoice_date):
    for record in price_history:
        if (record["item"] == item_code and
            record["effective_from"] <= invoice_date and
            (record["effective_to"] is None or record["effective_to"] >= invoice_date)):
            return record["price"]
    return None  # No valid price found — flag for review
```

## Currency Conversion and Rounding

For international suppliers, the invoice may be in a different currency than the PO. Price comparison must account for:

1. **Agreed exchange rate:** Some contracts specify a fixed rate. Compare using that rate.
2. **Spot rate at invoice date:** If no fixed rate, convert using the rate on the invoice date.
3. **Rounding differences:** After conversion, minor rounding differences are inevitable. Use the absolute tolerance (e.g., $0.01) to absorb them.

```python
def convert_and_compare(invoice_price, invoice_currency, po_price, po_currency, invoice_date, contract):
    if invoice_currency == po_currency:
        return compare_prices(invoice_price, po_price)

    if contract.fixed_exchange_rate:
        rate = contract.fixed_exchange_rate
    else:
        rate = get_spot_rate(invoice_currency, po_currency, invoice_date)

    converted_invoice_price = round(invoice_price * rate, 2)
    return compare_prices(converted_invoice_price, po_price)
```

## Generating Discrepancy Reports

When a pricing discrepancy exceeds tolerance, the system should generate a structured report that includes everything needed for the next step — whether that is automatic escalation, human review, or supplier communication.

```json
{
  "discrepancy_id": "DSC-2025-04821",
  "invoice_number": "INV-88432",
  "vendor_id": "V-10042",
  "vendor_name": "Acme Industrial Supply",
  "detection_timestamp": "2025-07-15T09:23:41Z",
  "line_items": [
    {
      "line": 3,
      "item_code": "GASKET-4200",
      "po_number": "PO-2025-3847",
      "po_price": 12.50,
      "invoice_price": 13.25,
      "variance_amount": 0.75,
      "variance_pct": 6.0,
      "quantity": 2000,
      "total_variance": 1500.00,
      "tolerance_applied": "contracted_goods: 0.5%",
      "tolerance_threshold": 0.0625,
      "exceeds_tolerance": true,
      "severity": "major",
      "confidence": "high"
    }
  ],
  "total_invoice_variance": 1500.00,
  "recommended_action": "dispute",
  "supporting_references": {
    "po_link": "/documents/PO-2025-3847",
    "contract_link": "/contracts/CTR-V10042-2024",
    "price_history": "/vendors/V-10042/price-history/GASKET-4200"
  }
}
```

### Severity Classification

Assign severity based on the combination of variance percentage and total dollar impact:

| Variance % | Total Variance < $500 | $500 - $5,000 | > $5,000 |
|------------|----------------------|---------------|----------|
| < 5% | Low | Medium | High |
| 5% - 15% | Medium | High | Critical |
| > 15% | High | Critical | Critical |

This matrix ensures that a 20% variance on a $50 item (only $10 total) gets a "High" flag but not "Critical," while a 3% variance on a $200,000 PO line ($6,000 total) gets a "High" flag based on dollar impact alone.

## Overcharge vs. Undercharge: Asymmetric Treatment

Most organizations focus on overcharges (invoice price > PO price), but undercharges matter too. An invoice priced below the PO might indicate:

- The supplier made an error in your favor (they will discover it and send a debit note)
- The supplier applied a discount you did not expect (verify it is legitimate)
- There is a data entry error on the supplier's side that will create confusion later

Best practice: flag undercharges above a certain threshold (e.g., 10% below PO price or more than $500 total) for investigation. Do not just silently accept them.

## Putting It Together: A Pricing Rule Pipeline

```
Invoice received
  → Match each line item to PO line (by item code + PO reference)
  → For each matched line:
      → Retrieve effective price (with escalation, volume discount)
      → Convert currency if needed
      → Calculate variance (amount and percentage)
      → Apply tolerance (tiered by value/category/vendor)
      → If within tolerance → auto-approve line
      → If exceeds tolerance → classify severity → add to discrepancy report
  → If any line exceeds tolerance → hold invoice from payment
  → If all lines within tolerance → release for payment
```

This pipeline is deterministic, auditable, and configurable. In Lesson 2.4, we will see how to combine this with quantity and duplicate checks in a unified rule engine.

---

**Up next:** Lesson 2.2 covers quantity and goods receipt reconciliation — how to match invoiced quantities against what was actually received, including partial shipments and back-orders.
