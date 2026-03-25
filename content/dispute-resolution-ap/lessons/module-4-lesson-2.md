# Drafting Supplier Dispute Messages
## Module 4: Autonomous Agent Behavior and Supplier Communication | Lesson 2

**Learning Objectives:**
- Design message templates that clearly communicate discrepancies to suppliers
- Configure the agent to include supporting evidence (PO references, receipt data, contract terms)
- Set appropriate tone and urgency levels based on dispute severity and supplier relationship
- Implement multi-language and multi-format output for global supplier bases
- Build a review-and-approve workflow for manager oversight of outgoing messages

---

## Why Message Quality Matters

A poorly worded dispute message delays resolution. If the supplier cannot understand what the discrepancy is, what evidence supports it, or what you want them to do, they will ask for clarification — adding 3-5 days to the cycle. Multiply that by hundreds of disputes per month and you have weeks of wasted time.

The agent's dispute messages need to be clear, complete, and professional. They should give the supplier everything they need to investigate and respond in a single reading. No ambiguity. No missing references. No aggressive tone that poisons the relationship.

## Message Template Architecture

Every dispute message follows the same structure, regardless of dispute type:

```
1. HEADER: Who we are, what this is about
2. DISCREPANCY DETAILS: Exactly what is wrong, with numbers
3. EVIDENCE: References to supporting documents
4. REQUESTED ACTION: What we want the supplier to do
5. DEADLINE: When we need a response
6. CONTACT: Who to reach out to with questions
```

### Template Implementation

```python
def generate_dispute_message(dispute, template_config):
    template = load_template(dispute.type, dispute.severity, dispute.vendor.language)

    context = {
        "company_name": config.company_name,
        "vendor_name": dispute.vendor.name,
        "invoice_number": dispute.invoice.number,
        "invoice_date": format_date(dispute.invoice.date, dispute.vendor.locale),
        "invoice_amount": format_currency(dispute.invoice.total, dispute.invoice.currency),
        "discrepancy_lines": format_discrepancy_lines(dispute.lines),
        "total_variance": format_currency(dispute.total_variance, dispute.invoice.currency),
        "po_reference": dispute.po.number,
        "grn_references": [grn.number for grn in dispute.grns],
        "contract_reference": dispute.contract.number if dispute.contract else None,
        "requested_action": get_requested_action(dispute),
        "response_deadline": format_date(dispute.response_deadline, dispute.vendor.locale),
        "contact_name": dispute.assigned_reviewer.name,
        "contact_email": dispute.assigned_reviewer.email,
        "dispute_id": dispute.id
    }

    return template.render(context)
```

### Example: Pricing Dispute Message

```markdown
Subject: Invoice Discrepancy — INV-88432 — Price Variance on PO-2025-3847

Dear Acme Industrial Supply Accounts Receivable Team,

We have identified a pricing discrepancy on Invoice INV-88432 dated March 15, 2025,
for a total of $26,500.00.

**Discrepancy Details:**

| Line | Item | PO Price | Invoice Price | Qty | Variance |
|------|------|----------|---------------|-----|----------|
| 3 | GASKET-4200 | $12.50 | $13.25 | 2,000 | $1,500.00 |

The unit price on line 3 does not match the contracted price per Purchase Order
PO-2025-3847. Our records show a contracted rate of $12.50/unit effective through
December 31, 2025 (Contract CTR-V10042-2024, Section 4.2).

**Supporting References:**
- Purchase Order: PO-2025-3847 (attached)
- Contract: CTR-V10042-2024, Pricing Schedule A
- Goods Receipt: GRN-7891 (2,000 units received March 12, 2025)

**Requested Action:**
Please issue a credit note for $1,500.00 or provide documentation supporting the
price of $13.25/unit (e.g., executed contract amendment, price escalation notice).

**Response Deadline:** March 25, 2025 (within 10 business days)

Payment on this invoice is on hold pending resolution of this discrepancy.
Undisputed lines remain scheduled for payment per standard terms.

For questions, please contact:
Sarah Chen, AP Specialist
sarah.chen@company.com | +1-555-0142
Reference: Dispute DSC-2025-04821

Regards,
Accounts Payable Department
[Company Name]
```

This message contains everything the supplier needs: what is wrong, how much the variance is, what documents support the claim, what resolution is expected, and when.

## Tone Calibration

The agent should adjust tone based on context. A first notice to a strategic supplier reads differently than a third follow-up to a transactional vendor.

### First Notice vs. Follow-Up vs. Escalation

```yaml
tone_profiles:
  first_notice:
    salutation: "Dear [Vendor AR Team]"
    opening: "We have identified a discrepancy on..."
    closing: "We appreciate your prompt attention to this matter."
    urgency: "standard"
    includes_penalty_warning: false

  second_notice:
    salutation: "Dear [Vendor AR Team]"
    opening: "This is a follow-up to our previous communication dated [date] regarding..."
    closing: "Please prioritize this request, as the response deadline has passed."
    urgency: "elevated"
    includes_penalty_warning: false

  third_notice_escalation:
    salutation: "Dear [Vendor AR Manager / Sales Rep]"
    opening: "Despite our previous communications on [dates], we have not received a resolution for..."
    closing: "If we do not receive a response by [date], we will be unable to process future invoices from your organization until this matter is resolved."
    urgency: "high"
    includes_penalty_warning: true
```

### Strategic vs. Transactional Supplier Tone

```yaml
relationship_modifiers:
  strategic:  # Top 20 vendors by spend, long-term relationship
    tone: "collaborative"
    phrasing: "We would like to work together to resolve..."
    cc: "procurement_manager"  # Keep procurement in the loop
    avoid: ["demand", "require", "failure to"]

  standard:
    tone: "professional"
    phrasing: "Please review and respond..."
    cc: null
    avoid: ["demand", "failure to"]

  transactional:  # Spot-buy, replaceable vendors
    tone: "direct"
    phrasing: "Please provide resolution by..."
    cc: null
    avoid: []
```

The distinction matters. Sending a demanding tone to a strategic supplier can damage a relationship worth millions in annual spend. Sending a collaborative tone to a serial offender signals that you are not serious.

## Evidence Assembly

The agent must attach or reference all supporting evidence. An unsupported claim invites the supplier to dismiss it.

### Evidence Package

```python
def assemble_evidence(dispute):
    evidence = []

    # Always include
    evidence.append({
        "type": "purchase_order",
        "reference": dispute.po.number,
        "attach": True,
        "relevant_section": f"Line {dispute.po_line.number}: {dispute.po_line.item_code}"
    })

    evidence.append({
        "type": "invoice_copy",
        "reference": dispute.invoice.number,
        "attach": True
    })

    # For pricing disputes
    if dispute.type == "pricing":
        if dispute.contract:
            evidence.append({
                "type": "contract_excerpt",
                "reference": dispute.contract.number,
                "relevant_section": dispute.contract.pricing_clause,
                "attach": True
            })

    # For quantity disputes
    if dispute.type == "quantity":
        for grn in dispute.grns:
            evidence.append({
                "type": "goods_receipt",
                "reference": grn.number,
                "date": grn.receipt_date,
                "quantity": grn.accepted_quantity,
                "attach": True
            })

    # For duplicate disputes
    if dispute.type == "duplicate":
        evidence.append({
            "type": "original_invoice",
            "reference": dispute.matched_original.number,
            "payment_date": dispute.matched_original.payment_date,
            "attach": True
        })

    return evidence
```

### What Not to Include

- Internal scoring data (risk scores, anomaly signals) — this is internal decision-making context, not evidence
- Internal approval chains or reviewer names beyond the point of contact
- Threats or references to legal action (unless at the escalation stage and approved by legal)
- Other vendor data — never share one vendor's pricing or dispute data with another vendor

## Localization for Global Suppliers

A company with suppliers in 15 countries needs messages in multiple languages, with correct currency formatting, date formatting, and culturally appropriate phrasing.

### Localization Configuration

```yaml
vendor_locales:
  V-10042:
    language: "en-US"
    currency_format: "$1,234.56"
    date_format: "March 15, 2025"
  V-30088:
    language: "de-DE"
    currency_format: "1.234,56 EUR"
    date_format: "15. Marz 2025"
  V-40012:
    language: "ja-JP"
    currency_format: "123,456 JPY"
    date_format: "2025年3月15日"
```

### Translation Management

For templates, use a translation management approach:

```python
templates = {
    "en-US": {
        "subject": "Invoice Discrepancy — {invoice_number} — {discrepancy_type}",
        "opening": "We have identified a {discrepancy_type} on Invoice {invoice_number}...",
        # ...
    },
    "de-DE": {
        "subject": "Rechnungsabweichung — {invoice_number} — {discrepancy_type}",
        "opening": "Wir haben eine {discrepancy_type} bei Rechnung {invoice_number} festgestellt...",
        # ...
    }
}
```

**Important:** Do not use machine translation for dispute messages without human review. A translation error in a financial document can cause confusion, delays, or legal problems. Have templates professionally translated and reviewed by native speakers in the finance domain.

## Review-and-Approve Workflow

Not every message the agent drafts should be sent automatically. The review workflow controls which messages require human approval before sending.

### Draft Queue Design

```python
def route_message_for_review(message, dispute, config):
    # Auto-send conditions
    if (dispute.severity in ["low"] and
        dispute.message_sequence == 1 and  # First notice only
        dispute.vendor.risk_tier <= 2 and
        dispute.total_variance < config.auto_send_threshold):
        return {"action": "auto_send", "review_required": False}

    # Manager review required
    if (dispute.severity in ["high", "critical"] or
        dispute.vendor.is_strategic or
        dispute.total_variance > config.manager_review_threshold or
        dispute.message_sequence >= 3):  # Escalation messages always reviewed
        return {"action": "queue_for_manager_review", "reviewer": dispute.assigned_manager}

    # Standard review
    return {"action": "queue_for_review", "reviewer": dispute.assigned_reviewer}
```

### Manager Review Interface

The review interface should present:

1. **The draft message** — exactly as it will be sent
2. **The dispute context** — risk score, discrepancy details, vendor history
3. **Actions:** Approve as-is, Edit and approve, Reject with reason, Escalate further
4. **Batch approval** — for low-risk messages, allow the manager to approve 20 messages at once after reviewing a summary

```python
class MessageReviewAction:
    APPROVE = "approve"          # Send as drafted
    EDIT = "edit"                # Manager modifies, then sends
    REJECT = "reject"           # Do not send; provide alternative instruction
    ESCALATE = "escalate"       # Route to higher authority
    HOLD = "hold"               # Do not send yet; wait for more information
```

### Batch Approval for Efficiency

Reviewing 50 dispute messages individually is impractical. Enable batch approval for low-risk messages:

```python
def present_batch_for_approval(messages, manager):
    # Group by similarity
    groups = group_by_type_and_severity(messages)

    for group in groups:
        summary = {
            "count": len(group.messages),
            "type": group.dispute_type,
            "severity": group.severity,
            "total_variance": sum(m.dispute.total_variance for m in group.messages),
            "vendor_count": len(set(m.dispute.vendor_id for m in group.messages)),
            "sample_message": group.messages[0]  # Show one representative
        }
        # Manager reviews summary and sample, then approves/rejects the batch
        yield summary
```

This allows a manager to approve 30 "low severity pricing dispute first notices" in 2 minutes by reviewing one sample and confirming the batch, rather than spending 45 minutes reviewing each individually.

---

**Up next:** Lesson 4.3 covers the full dispute lifecycle — how to track disputes through state transitions from open to closed, including automated follow-ups and response handling.
