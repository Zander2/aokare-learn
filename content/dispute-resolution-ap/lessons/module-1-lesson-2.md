# The Three-Way Match as a Dispute Prevention Framework
## Module 1: Foundations of AP Dispute Resolution | Lesson 2

**Learning Objectives:**
- Explain the three-way match process (PO, goods receipt, invoice) and why it is the gold standard for invoice validation
- Identify the specific data fields compared at each stage of the match
- Recognize the common failure points where mismatches occur
- Describe tolerance thresholds and when a mismatch becomes a dispute

---

## Why Three-Way Matching Exists

The three-way match is the single most important control in accounts payable. It answers three questions simultaneously:

1. **Did we order this?** (Purchase Order)
2. **Did we receive it?** (Goods Receipt Note)
3. **Is the invoice correct?** (Invoice)

If all three documents agree, the invoice is valid and can be paid. If they do not agree, you have a discrepancy that needs investigation — and potentially a dispute.

Organizations that skip three-way matching — or perform it poorly — see dispute rates of 8-15%. Organizations with rigorous three-way matching typically keep dispute rates below 3%. That difference, at scale, translates to millions of dollars in avoided costs and thousands of hours of recovered labor.

## Document 1: The Purchase Order

The purchase order is the buyer's statement of intent. It is the baseline against which everything else is measured. A well-structured PO contains:

### Header-Level Fields
- **PO Number:** Unique identifier, the primary key for matching
- **Vendor ID:** Links to the supplier master record
- **PO Date:** When the order was placed
- **Delivery date(s):** Expected receipt date(s)
- **Payment terms:** Net 30, 2/10 Net 30, etc.
- **Ship-to address:** Where the goods should arrive
- **Currency:** Transaction currency
- **Total PO value:** Sum of all line items

### Line-Level Fields
- **Line number:** Sequential identifier within the PO
- **Item code/SKU:** What is being ordered
- **Description:** Human-readable item description
- **Quantity:** How many units
- **Unit of measure (UOM):** Each, case, pallet, kilogram, etc.
- **Unit price:** Price per unit of measure
- **Line total:** Quantity x unit price
- **Tax code:** Applicable tax treatment

The PO is the contract. When the invoice arrives and says $14.20 per unit, the first question is: what does the PO say? If the PO says $12.50, the PO wins unless there is a documented contract amendment.

## Document 2: The Goods Receipt Note (GRN)

The goods receipt note is created when the warehouse or receiving dock confirms that goods have physically arrived. It captures what was actually delivered, as opposed to what was ordered.

### Key GRN Fields
- **GRN number:** Unique receipt identifier
- **PO reference:** Links back to the PO
- **Receipt date:** When goods arrived
- **Received quantity:** How many units were actually counted
- **Item condition:** Accepted, rejected, or conditionally accepted
- **Receiving location:** Which warehouse or dock
- **Inspector/receiver:** Who confirmed receipt

### What the GRN Does Not Capture

The GRN typically does not verify pricing — the receiving dock does not know or care what the unit price is. The GRN only confirms physical receipt: what arrived, how much, and in what condition. This is important because it means pricing discrepancies can only be caught by comparing the invoice to the PO directly.

### Common GRN Problems

**Delayed entry:** Goods arrive on Monday, but the GRN is not entered until Wednesday. If the invoice arrives Tuesday, the three-way match fails because there is no GRN yet — even though the goods are sitting in the warehouse.

**Partial receipts:** A PO for 1,000 units may be delivered in 3 shipments: 400, 350, and 250. Each shipment generates a separate GRN. The invoice might cover all 1,000 units, requiring the matching logic to aggregate across three GRNs.

**Unit of measure mismatch:** The PO says "12 cases." The GRN says "144 each." Both are correct (12 units per case), but the systems need to know the conversion factor or the match fails.

## Document 3: The Invoice

The invoice is the supplier's claim for payment. It should mirror the PO and GRN, but in practice, discrepancies are common.

### Key Invoice Fields for Matching
- **Invoice number:** Supplier's unique identifier
- **PO reference:** Which PO this invoice relates to
- **Invoice date:** When the invoice was issued
- **Line items:** Item codes, descriptions, quantities, unit prices
- **Tax amounts:** VAT, GST, sales tax by line or at header level
- **Freight/shipping charges:** If applicable
- **Total amount:** Sum of all lines plus tax and freight

### Where Invoices Diverge from POs

Invoices can diverge from POs for legitimate reasons:
- **Price escalation:** Contractual price adjustment took effect between PO creation and invoicing
- **Partial invoicing:** Supplier invoices for what was shipped, not the full PO quantity
- **Freight additions:** Shipping charges not on the original PO
- **Tax calculation differences:** Rounding differences in tax calculations

And for illegitimate reasons:
- **Price inflation:** Supplier invoices at a higher price than contracted
- **Quantity padding:** Invoicing for more than was shipped
- **Duplicate submission:** Same invoice submitted twice

## The Matching Process: Field by Field

Here is what a three-way match actually compares:

| Field | PO Value | GRN Value | Invoice Value | Match? |
|-------|----------|-----------|---------------|--------|
| Item code | GASKET-4200 | GASKET-4200 | GASKET-4200 | Yes |
| Quantity | 500 | 480 | 500 | No (GRN vs Invoice) |
| Unit price | $12.50 | N/A | $13.25 | No (PO vs Invoice) |
| UOM | Each | Each | Each | Yes |
| Line total | $6,250.00 | N/A | $6,625.00 | No |

In this example, there are two discrepancies: a quantity mismatch (invoice says 500, GRN says 480) and a pricing mismatch (PO says $12.50, invoice says $13.25). This invoice cannot be paid as-is.

## Tolerance Thresholds: When a Mismatch Becomes a Dispute

Not every mismatch is a dispute. Small rounding differences, minor quantity variances, and trivial price differences can be handled automatically through tolerance thresholds.

### Types of Tolerances

**Absolute tolerance:** A fixed dollar amount. Example: accept any price difference up to $0.50 per unit. If the PO price is $12.50 and the invoice price is $12.90, the $0.40 difference is within tolerance — auto-approve.

**Percentage tolerance:** A percentage of the expected value. Example: accept any price difference up to 3%. If the PO price is $12.50, the tolerance range is $12.13 to $12.88. An invoice price of $13.25 (6% over) exceeds tolerance — flag for review.

**Hybrid tolerance:** Whichever is greater (or lesser). Example: accept differences up to $1.00 OR 2%, whichever is larger. This prevents small-dollar items from generating disputes over trivial absolute amounts.

### Per-Line vs. Header-Level Tolerances

**Per-line tolerance** checks each line item individually. Line 1 might pass while line 3 fails.

**Header-level tolerance** checks the total invoice amount against the total PO amount. This can mask individual line problems — line 1 might be overpriced while line 2 is underpriced, and the total still matches.

Best practice is to apply both: per-line tolerances catch individual discrepancies, and header-level tolerances catch total-value issues.

### Tolerance Configuration Example

```yaml
tolerances:
  pricing:
    percentage: 2.0
    absolute: 1.00
    mode: "greater_of"  # accept if within EITHER threshold
  quantity:
    percentage: 5.0
    absolute: 5
    mode: "lesser_of"  # accept only if within BOTH thresholds
  total_invoice:
    percentage: 3.0
    absolute: 500.00
    mode: "greater_of"
```

This configuration says: for pricing, allow up to 2% or $1.00 (whichever is more generous). For quantity, allow up to 5% and 5 units (both must be satisfied — more conservative). For total invoice value, allow up to 3% or $500.

### When Tolerance Causes Problems

Tolerances that are too wide let real discrepancies through. A 5% price tolerance on a $2 million PO means you could overpay by $100,000 without triggering a flag.

Tolerances that are too narrow create false disputes. If your tolerance is 0.1% and rounding causes a $0.02 difference on a $20 item, you generate a dispute that wastes everyone's time.

The right tolerance depends on:
- **Item value:** Tighter tolerances for high-value items
- **Vendor relationship:** Tighter for new vendors, can be slightly looser for long-term partners with good track records
- **Item category:** Commodity items with volatile market prices may need wider tolerances than contracted goods
- **Historical data:** What percentage of flagged mismatches turned out to be legitimate disputes? If 90% of flags within a certain range are resolved as "no issue," your tolerance is too tight.

## Two-Way Match and Four-Way Match Variants

The three-way match is the standard, but variations exist:

**Two-way match (PO to invoice):** Skips the GRN. Used for services, subscriptions, and other non-physical goods where there is nothing to "receive" at a dock. Also used when speed is more important than control — some organizations two-way match invoices under $1,000.

**Four-way match (PO, GRN, inspection report, invoice):** Adds a quality inspection step. Used for regulated industries (pharmaceuticals, aerospace) or high-value raw materials where quality must be verified before payment is authorized.

## Common Three-Way Match Failure Points

Understanding where matches fail helps you design better detection systems:

1. **Missing PO reference:** Invoice does not include a PO number. Common with non-PO purchases, maintenance invoices, or suppliers who use their own reference numbers.
2. **GRN timing:** Invoice arrives before the GRN is entered. The match fails not because of a discrepancy but because of a process delay.
3. **UOM conversion:** PO says "cases," GRN says "each," invoice says "pallets." All may be correct but the system cannot match without conversion tables.
4. **Partial shipment aggregation:** Multiple GRNs need to be summed against one invoice line. If the matching logic only looks for a 1:1 match, it fails.
5. **Price amendments:** A contract price change was agreed verbally or via email but the PO was never updated. The PO shows the old price, the invoice shows the new price, and both parties think they are right.

These failure points are not just theoretical — they represent the majority of "false disputes" that clog AP departments. A well-designed system handles these scenarios before they become disputes.

---

**Up next:** In Lesson 1.3, we will map the stakeholders involved in dispute resolution and the communication flows that connect them.
