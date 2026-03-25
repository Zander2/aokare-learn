# Duplicate Invoice Detection
## Module 2: Detecting Discrepancies with Rule-Based Logic | Lesson 3

**Learning Objectives:**
- Implement multi-field duplicate detection logic (invoice number, vendor, amount, date)
- Distinguish true duplicates from legitimate repeat invoices (e.g., recurring services)
- Design fuzzy-matching rules that catch near-duplicates with slight variations
- Calculate the financial exposure from duplicate payments and track prevention rates

---

## Why Duplicate Detection Deserves Its Own Lesson

Duplicate payments are the most expensive AP error. Unlike a pricing discrepancy where you might overpay by 5%, a duplicate payment is a 100% overpayment. Industry data consistently shows that 0.1% to 0.5% of total AP disbursements are duplicate payments. For a company paying $500 million per year through AP, that is $500,000 to $2.5 million in avoidable losses.

The frustrating part: most duplicate payments are recoverable, but the recovery process is expensive and slow. Auditing firms that specialize in recovery audits typically charge 20-35% of recovered funds as their fee. Prevention is dramatically cheaper than recovery.

## Exact-Match Duplicate Detection

The simplest and most reliable duplicate check compares invoice number and vendor ID:

```python
def exact_duplicate_check(invoice, existing_invoices):
    for existing in existing_invoices:
        if (invoice.vendor_id == existing.vendor_id and
            invoice.invoice_number == existing.invoice_number):
            return {
                "is_duplicate": True,
                "match_type": "exact",
                "matched_invoice_id": existing.id,
                "matched_payment_status": existing.payment_status,
                "confidence": 1.0
            }
    return {"is_duplicate": False}
```

This catches the obvious case: same vendor submits the same invoice number twice. Confidence is 100% — if the vendor ID and invoice number both match, it is a duplicate, period.

**But this misses a lot.** Duplicates arise from:
- The same invoice entered manually with a slightly different number (INV-1234 vs INV1234)
- The supplier resending the invoice with a new number because they thought the first was lost
- An OCR system misreading a character (INV-1234 vs INV-I234)
- The invoice arriving through two channels (email and supplier portal)

## Near-Duplicate Detection

Near-duplicates share most characteristics but differ in one or two fields. A multi-field scoring approach catches these:

```python
def near_duplicate_check(invoice, existing_invoices, thresholds):
    candidates = []

    for existing in existing_invoices:
        score = 0.0
        signals = []

        # Same vendor
        if invoice.vendor_id == existing.vendor_id:
            score += 0.3
            signals.append("same_vendor")

        # Same amount (exact)
        if invoice.total_amount == existing.total_amount:
            score += 0.3
            signals.append("same_amount")

        # Similar date (within N days)
        date_diff = abs((invoice.invoice_date - existing.invoice_date).days)
        if date_diff <= thresholds.date_window_days:  # e.g., 30 days
            score += 0.2
            signals.append(f"date_within_{date_diff}_days")

        # Similar invoice number
        inv_similarity = string_similarity(
            invoice.invoice_number,
            existing.invoice_number
        )
        if inv_similarity > thresholds.invoice_number_similarity:  # e.g., 0.8
            score += 0.2
            signals.append(f"similar_invoice_number_{inv_similarity:.2f}")

        if score >= thresholds.duplicate_threshold:  # e.g., 0.7
            candidates.append({
                "matched_invoice": existing.id,
                "score": score,
                "signals": signals,
                "confidence": "high" if score >= 0.9 else "medium"
            })

    return sorted(candidates, key=lambda x: x["score"], reverse=True)
```

### String Similarity for Invoice Numbers

Invoice numbers get mangled in many ways. Here are common patterns and how to catch them:

| Original | Duplicate | Cause |
|----------|-----------|-------|
| INV-2025-0892 | INV2025-0892 | Formatting stripped |
| INV-2025-0892 | INV-2025-O892 | OCR: 0 read as O |
| INV-2025-0892 | INV-2025-0892A | Suffix added by sender |
| 2025-0892 | INV-2025-0892 | Prefix added/removed |

A good approach: normalize before comparing, then apply edit distance on the residual.

```python
def normalize_invoice_number(inv_num):
    """Strip common prefixes, special characters, leading zeros."""
    normalized = inv_num.upper()
    normalized = re.sub(r'^(INV|INVOICE|BILL|REC)[#\-_.\s]*', '', normalized)
    normalized = re.sub(r'[^A-Z0-9]', '', normalized)
    normalized = normalized.lstrip('0')
    return normalized

def string_similarity(a, b):
    """Jaro-Winkler similarity — good for short alphanumeric strings."""
    norm_a = normalize_invoice_number(a)
    norm_b = normalize_invoice_number(b)

    if norm_a == norm_b:
        return 1.0

    # Jaro-Winkler gives higher weight to strings that match from the beginning
    return jaro_winkler_similarity(norm_a, norm_b)
```

### Amount-Based Detection

Sometimes the invoice number is completely different, but the amount, vendor, and date are suspiciously similar:

```python
def amount_based_duplicate_check(invoice, existing_invoices, window_days=45):
    """Find invoices from the same vendor with the same amount in a time window."""
    matches = []
    for existing in existing_invoices:
        if (invoice.vendor_id == existing.vendor_id and
            invoice.total_amount == existing.total_amount and
            abs((invoice.invoice_date - existing.invoice_date).days) <= window_days and
            invoice.id != existing.id):
            matches.append(existing)
    return matches
```

This is high-recall but lower-precision. Many legitimate invoices will match: a monthly retainer of $5,000 will match every month. That is where whitelisting comes in.

## Distinguishing True Duplicates from Legitimate Repeats

The hardest part of duplicate detection is not catching duplicates — it is not flagging legitimate invoices as duplicates. Recurring payments are the primary source of false positives.

### Recurring Invoice Whitelisting

```yaml
recurring_whitelist:
  - vendor_id: "V-20045"
    description: "Monthly IT support retainer"
    expected_amount: 5000.00
    frequency: "monthly"
    tolerance_days: 5  # Allow 5-day variance from expected date

  - vendor_id: "V-30012"
    description: "Weekly janitorial service"
    expected_amount: 1250.00
    frequency: "weekly"
    tolerance_days: 2

  - vendor_id: "V-10088"
    description: "Quarterly software license"
    expected_amount: 22500.00
    frequency: "quarterly"
    tolerance_days: 15
```

When the duplicate detector flags a match, check it against the whitelist:

```python
def is_whitelisted_recurring(invoice, matched_invoice, whitelist):
    for rule in whitelist:
        if invoice.vendor_id != rule.vendor_id:
            continue
        if abs(invoice.total_amount - rule.expected_amount) > rule.amount_tolerance:
            continue

        # Check if the date gap matches the expected frequency
        date_gap = (invoice.invoice_date - matched_invoice.invoice_date).days
        expected_gap = frequency_to_days(rule.frequency)

        if abs(date_gap - expected_gap) <= rule.tolerance_days:
            return True  # This is a legitimate recurring invoice

    return False  # Not whitelisted — treat as potential duplicate
```

### Pattern-Based Recurring Detection

You cannot always maintain a manual whitelist — especially with hundreds of vendors. Use pattern detection to automatically identify recurring invoices:

```python
def detect_recurring_pattern(vendor_id, amount, invoice_history, min_occurrences=3):
    """Check if this vendor+amount combination has a recurring pattern."""
    matching_invoices = [
        inv for inv in invoice_history
        if inv.vendor_id == vendor_id and inv.total_amount == amount
    ]

    if len(matching_invoices) < min_occurrences:
        return None  # Not enough data

    # Calculate gaps between consecutive invoices
    dates = sorted([inv.invoice_date for inv in matching_invoices])
    gaps = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]

    avg_gap = sum(gaps) / len(gaps)
    gap_variance = sum((g - avg_gap)**2 for g in gaps) / len(gaps)

    if gap_variance < (avg_gap * 0.3)**2:  # Low variance = consistent pattern
        return {
            "is_recurring": True,
            "frequency_days": round(avg_gap),
            "confidence": "high" if gap_variance < (avg_gap * 0.1)**2 else "medium"
        }
    return {"is_recurring": False}
```

## PO-Based Duplicate Detection

An additional layer: check whether the same PO line has been invoiced twice. Even if the invoice numbers are different, if two invoices reference the same PO line for the same quantity, one of them is likely a duplicate.

```python
def po_line_double_invoice_check(invoice, all_invoices):
    """Flag if a PO line has been fully invoiced and this invoice would exceed the PO quantity."""
    for line in invoice.lines:
        if not line.po_reference:
            continue

        total_previously_invoiced = sum(
            other_line.quantity
            for other_inv in all_invoices
            for other_line in other_inv.lines
            if (other_line.po_reference == line.po_reference and
                other_line.item_code == line.item_code and
                other_inv.id != invoice.id and
                other_inv.status != "cancelled")
        )

        if total_previously_invoiced + line.quantity > line.po_quantity * 1.05:
            return {
                "flag": "over_invoiced_po_line",
                "po_reference": line.po_reference,
                "po_quantity": line.po_quantity,
                "previously_invoiced": total_previously_invoiced,
                "this_invoice": line.quantity,
                "total": total_previously_invoiced + line.quantity,
                "excess": (total_previously_invoiced + line.quantity) - line.po_quantity
            }
    return None
```

## Measuring Duplicate Prevention Effectiveness

Track these metrics to evaluate your detection system:

### Prevention Metrics

- **Duplicate catch rate:** Number of duplicates caught before payment / total duplicates detected (including post-payment recovery audits). Target: > 95%.
- **False positive rate:** Number of legitimate invoices flagged as duplicates / total invoices flagged. Target: < 10%.
- **Financial exposure prevented:** Dollar value of caught duplicates. This is your system's direct ROI.

### Recovery Metrics

- **Post-payment duplicates found:** Number discovered in periodic audits. This is a failure metric — every one of these was missed.
- **Recovery rate:** Percentage of post-payment duplicates where funds were successfully recovered. Typically 60-80%.
- **Recovery time:** Average days from discovery to recovery of funds. Often 60-120 days.

### Dashboard Example

```
Duplicate Detection Dashboard — March 2025
═══════════════════════════════════════════
Invoices processed:          12,847
Flagged as potential dup:       412 (3.2%)
Confirmed true duplicates:      187 (1.5%)
False positives:                225 (1.8%)
Precision:                      45.4%
Value of caught duplicates:  $892,340
Post-payment dups found:          3
Post-payment dup value:       $12,180

Catch rate: 187 / (187+3) = 98.4%
```

A 45% precision rate means more than half of flags are false positives. That sounds bad, but each investigation takes only 2-3 minutes (check the invoice, confirm it is recurring, dismiss the flag). Compared to the $892,340 saved, the investigation labor cost is negligible. In duplicate detection, optimizing for recall (catching all duplicates) is more important than optimizing for precision (avoiding false alarms).

## Common Pitfalls

**Pitfall 1: Only checking by invoice number.** You catch the obvious duplicates but miss resubmissions with new numbers.

**Pitfall 2: No time window.** Without a time window, you compare every invoice against every invoice ever received. This slows the system and generates ancient false matches. A 90-day window catches 99%+ of duplicates.

**Pitfall 3: Not handling credit notes.** A credit note and its corresponding original invoice will look like a duplicate (same vendor, same amount). Your logic must exclude credit notes from duplicate matching or at least recognize that a credit note with a negative amount is the resolution of a prior charge, not a duplicate.

**Pitfall 4: Case-sensitivity.** "INV-1234" and "inv-1234" must match. Always normalize to uppercase before comparing.

---

**Up next:** Lesson 2.4 brings together pricing, quantity, and duplicate checks into a unified rule engine architecture.
