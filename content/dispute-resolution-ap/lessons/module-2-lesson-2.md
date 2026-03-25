# Quantity and Goods Receipt Reconciliation
## Module 2: Detecting Discrepancies with Rule-Based Logic | Lesson 2

**Learning Objectives:**
- Design reconciliation rules that match invoiced quantities against goods receipt quantities
- Handle partial shipments, over-shipments, and back-orders
- Implement time-window logic that accounts for goods-in-transit
- Flag quantity mismatches with appropriate severity levels

---

## The Quantity Matching Challenge

Pricing comparison is a simple math problem: compare two numbers. Quantity reconciliation is a data-linkage problem. Goods arrive in multiple shipments, get received at different docks, are inspected at different times, and are recorded by different people. An invoice may cover goods from one shipment or five. The GRN may be entered the same day the goods arrive or three days later.

Your detection rules need to handle this messiness. A system that only works when there is exactly one PO, one shipment, and one invoice per order will fail on at least 30% of real-world transactions.

## The Three-Way Quantity Check

For quantity reconciliation, you are comparing three numbers:

- **PO quantity:** What was ordered
- **GRN quantity:** What was received (sum of all goods receipts against the PO line)
- **Invoice quantity:** What the supplier is billing for

Each pair comparison tells you something different:

| Comparison | Interpretation |
|-----------|---------------|
| Invoice qty > GRN qty | Supplier is billing for more than you received |
| Invoice qty < GRN qty | Supplier is billing for less than you received (partial invoice) |
| Invoice qty > PO qty | Supplier is billing for more than you ordered |
| GRN qty < PO qty | Partial delivery (may be expected if back-ordered) |
| GRN qty > PO qty | Over-delivery |

The most critical check is **Invoice qty vs. GRN qty** — this catches the scenario where you are being asked to pay for goods you did not receive.

## Basic Quantity Matching Rule

```python
def check_quantity(invoice_line, po_line, grn_lines):
    invoice_qty = invoice_line.quantity
    po_qty = po_line.quantity

    # Sum all goods receipts for this PO line
    total_received = sum(
        grn.accepted_quantity for grn in grn_lines
        if grn.po_line_id == po_line.id
    )

    # Note: use accepted_quantity, not delivered_quantity
    # Rejected items at the dock should not count

    return {
        "item_code": invoice_line.item_code,
        "po_qty": po_qty,
        "received_qty": total_received,
        "invoice_qty": invoice_qty,
        "qty_vs_grn": invoice_qty - total_received,
        "qty_vs_po": invoice_qty - po_qty,
        "grn_vs_po": total_received - po_qty
    }
```

### The "Accepted Quantity" Distinction

When goods arrive at the dock, two things can happen: they are accepted or rejected. The GRN should record both. Only accepted quantities count for matching purposes.

**Example:** PO for 500 units. Truck delivers 500 units. Receiving inspector finds 20 units with damaged packaging and rejects them. GRN shows: delivered 500, accepted 480, rejected 20. If the invoice says 500, the discrepancy is 20 units — the supplier needs to either credit the 20 rejected units or arrange replacement.

## Handling Partial Shipments

Partial shipments are the single biggest source of complexity in quantity matching. A PO for 10,000 units might arrive across 4 shipments over 6 weeks.

### Scenario: Multiple GRNs, One Invoice

PO-2025-1100: 10,000 units of Component A at $5.00/unit

| GRN | Date | Quantity Received |
|-----|------|-------------------|
| GRN-4401 | Mar 5 | 3,000 |
| GRN-4455 | Mar 12 | 2,500 |
| GRN-4512 | Mar 20 | 2,500 |
| GRN-4580 | Mar 28 | 2,000 |

Total received: 10,000 units. Invoice arrives for 10,000 units at $5.00/unit. This should match — but only if your system aggregates across all four GRNs for the same PO line.

### Scenario: Multiple GRNs, Multiple Invoices

Same PO, but the supplier invoices per shipment:

| Invoice | GRN(s) | Invoiced Qty |
|---------|--------|--------------|
| INV-A | GRN-4401 | 3,000 |
| INV-B | GRN-4455 + GRN-4512 | 5,000 |
| INV-C | GRN-4580 | 2,000 |

Now your matching logic needs to know which GRNs correspond to which invoices. If the supplier does not reference specific GRN numbers on the invoice (many do not), you need a strategy:

**Strategy 1: FIFO matching.** Match invoice quantities against GRN quantities in chronological order. INV-A (3,000) matches against GRN-4401 (3,000). INV-B (5,000) matches against GRN-4455 (2,500) + GRN-4512 (2,500). INV-C (2,000) matches against GRN-4580 (2,000).

**Strategy 2: Cumulative matching.** Track cumulative invoiced vs. cumulative received. After INV-A: invoiced 3,000, received 3,000 — balanced. After INV-B: invoiced 8,000, received 8,000 — balanced. After INV-C: invoiced 10,000, received 10,000 — balanced.

Cumulative matching is simpler and more robust. It does not require tracking which invoice maps to which GRN — it just checks that total invoiced never exceeds total received.

```python
def cumulative_quantity_check(po_line, all_invoices, all_grns):
    total_invoiced = sum(
        inv.quantity for inv in all_invoices
        if inv.po_line_id == po_line.id
    )
    total_received = sum(
        grn.accepted_quantity for grn in all_grns
        if grn.po_line_id == po_line.id
    )

    over_invoiced = max(0, total_invoiced - total_received)
    under_invoiced = max(0, total_received - total_invoiced)

    return {
        "po_line": po_line.id,
        "total_ordered": po_line.quantity,
        "total_received": total_received,
        "total_invoiced": total_invoiced,
        "over_invoiced": over_invoiced,
        "under_invoiced": under_invoiced,
        "remaining_to_receive": po_line.quantity - total_received,
        "remaining_to_invoice": total_received - total_invoiced
    }
```

## Over-Shipment Handling

The supplier ships more than you ordered. This happens more often than you might expect — especially with commodity goods where the supplier ships from standard packaging that does not divide evenly.

**Example:** PO for 1,000 units. Supplier ships 1,020 units because they come in cases of 24, and 42 cases is 1,008 but they rounded up to 43 cases (1,032). Your receiving dock counts 1,020 accepted units.

Your rules need to decide:

```yaml
over_delivery:
  auto_accept_threshold_pct: 5.0    # Accept up to 5% over without action
  auto_accept_threshold_qty: 50     # Accept up to 50 units over
  mode: "lesser_of"                  # Both conditions must be met
  action_when_exceeded: "flag_for_review"
  note: "If accepted, PO quantity is adjusted upward"
```

If the over-delivery is within tolerance, the system auto-adjusts the PO quantity and allows the invoice to match. If it exceeds tolerance, it flags for procurement review — did we agree to accept the extra goods?

## Time-Window Logic: Invoice Before GRN

One of the most common false positives in quantity matching occurs when the invoice arrives before the goods receipt is entered. The matching system sees an invoice for 500 units and a GRN total of 0 units — that looks like a 500-unit discrepancy.

But the goods might be:
- Sitting on the dock, not yet counted
- In transit, arriving tomorrow
- Received but not entered into the system yet

### Solution: Grace Period

```python
def check_with_grace_period(invoice_line, po_line, grn_lines, config):
    total_received = sum(
        grn.accepted_quantity for grn in grn_lines
        if grn.po_line_id == po_line.id
    )

    if total_received >= invoice_line.quantity:
        return {"status": "matched"}

    # Check if we are still within the grace period
    days_since_invoice = (today() - invoice_line.invoice_date).days

    if days_since_invoice <= config.grace_period_days:  # e.g., 5 days
        return {
            "status": "pending_grn",
            "message": f"GRN shortfall of {invoice_line.quantity - total_received} units. "
                       f"Grace period: {config.grace_period_days - days_since_invoice} days remaining.",
            "action": "hold_and_recheck"
        }
    else:
        return {
            "status": "discrepancy",
            "shortage": invoice_line.quantity - total_received,
            "action": "flag_for_investigation"
        }
```

The grace period should be calibrated to your receiving process. If your warehouse typically enters GRNs within 2 business days of delivery, a 5-day grace period is reasonable. If GRN entry is consistently delayed (a process problem worth fixing separately), you may need 7-10 days — but longer grace periods mean slower dispute detection.

### Solution: Expected Delivery Date Check

If the PO includes an expected delivery date, you can be smarter:

```python
if po_line.expected_delivery_date > today():
    return {"status": "not_yet_due", "action": "hold_until_delivery_date"}
elif po_line.expected_delivery_date <= today() and total_received == 0:
    return {"status": "overdue_no_receipt", "action": "flag_receiving_and_supplier"}
```

## Back-Orders

A back-order occurs when the supplier acknowledges that they cannot fill the full PO quantity and will ship the remainder later. The GRN reflects a partial receipt, and the invoice should only cover what was shipped.

**Problem scenario:** PO for 1,000 units. Supplier ships 700 and back-orders 300. The invoice comes in for 700 units — correct. But if your system only checks "invoice qty vs. PO qty," it sees a 300-unit discrepancy and flags it.

**Solution:** Track back-order status at the PO line level:

```python
if po_line.backordered:
    expected_qty = po_line.quantity - po_line.backordered_quantity
    if abs(invoice_line.quantity - expected_qty) <= tolerance:
        return {"status": "matched_partial", "note": "Back-order pending for remaining qty"}
```

## Severity Classification

Not all quantity discrepancies are equal. Classify by severity to prioritize investigation:

```python
def classify_severity(shortage_qty, shortage_pct, total_value):
    if shortage_qty == invoice_qty and total_received == 0:
        return "critical"  # No receipt at all — potential fraud or lost shipment

    if shortage_pct > 20 or total_value > 10000:
        return "high"

    if shortage_pct > 5 or total_value > 1000:
        return "medium"

    return "low"
```

| Severity | Criteria | Action |
|----------|----------|--------|
| Critical | No GRN exists at all for invoiced items | Immediate investigation; hold payment |
| High | Shortage >20% or >$10,000 | Priority dispute; notify procurement |
| Medium | Shortage 5-20% or $1,000-$10,000 | Standard dispute process |
| Low | Shortage <5% and <$1,000 | Review at batch level; may auto-resolve |

## Unit of Measure Reconciliation

UOM mismatches are a silent killer of matching accuracy. The PO says 10 cases. The GRN says 240 each. The invoice says 10 cases. Are these the same?

You need a UOM conversion table:

```python
uom_conversions = {
    "GASKET-4200": {"case": 24, "pallet": 480, "each": 1},
    "WIDGET-100": {"box": 12, "carton": 144, "each": 1},
}

def normalize_to_base_uom(quantity, uom, item_code):
    factor = uom_conversions[item_code][uom.lower()]
    return quantity * factor
```

Always normalize to the base UOM (typically "each") before comparing. Log the original UOM and the conversion applied — auditors will ask.

---

**Up next:** Lesson 2.3 tackles duplicate invoice detection — from exact matches to fuzzy matching that catches near-duplicates caused by OCR errors and formatting variations.
