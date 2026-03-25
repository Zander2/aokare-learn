# Designing the Outreach Message
## Module 3: Supplier Communication and Negotiation Strategy | Lesson 1

**Learning Objectives:**
- Write a clear, professional discount proposal email that an AI agent can send
- Customize message templates based on supplier segment and relationship history
- Explain why email is used as the initial communication channel (transparency, audit trail, trust-building)
- Define the required elements of a compliant discount proposal

---

## Why Email First

When building an AI agent that negotiates with suppliers, the choice of communication channel is a design decision with significant implications. Causa Prima agents start with email for three reasons:

**Transparency.** Email creates a human-readable record of every interaction. Suppliers can review proposals on their own schedule, forward them internally for discussion, and refer back to specific terms. There is no "the system said something different" ambiguity.

**Audit trail.** Finance teams and auditors need to see what was communicated, when, and to whom. Email provides this naturally. Every proposal, response, counter-offer, and acceptance is documented in a format that auditors understand.

**Trust building.** Suppliers encountering automated negotiation for the first time need a low-friction entry point. Email is familiar. A well-crafted email from an identifiable sender at a real company domain builds credibility. Over time, as trust develops, supplier agents on the Causa Prima platform enable direct agent-to-agent negotiation (Module 5).

## Anatomy of an Effective Discount Proposal

A discount proposal email has six required elements. Missing any one reduces acceptance rates or creates compliance risk.

### 1. Clear Identification

The supplier must immediately know who is contacting them and why. The subject line and opening paragraph do this work:

```
Subject: Early Payment Opportunity — Invoice #48291 ($47,500.00)

Dear [Supplier Contact Name],

We are writing regarding Invoice #48291 dated March 15, 2026, for $47,500.00.
[Company Name]'s accounts payable team would like to propose an early payment
arrangement for this invoice.
```

No mystery. No marketing language. Invoice number, amount, and purpose in the first sentence.

### 2. The Proposal Terms

State the proposed discount and payment timeline in unambiguous language:

```
We propose to pay this invoice within 10 business days (by March 28, 2026) in
exchange for a 1.5% early payment discount, reducing the payment amount to
$46,787.50.

Standard payment terms: Net 30 (due April 14, 2026)
Proposed payment: $46,787.50 by March 28, 2026
Discount amount: $712.50
```

Use exact dates, not relative terms. "Within 10 business days" plus the calculated date eliminates ambiguity. State both the discounted amount and the discount amount — suppliers want to see both.

### 3. Benefit to the Supplier

Briefly articulate why this is attractive for the supplier:

```
This arrangement accelerates your receipt of payment by approximately 17 days,
improving your cash flow by receiving $46,787.50 sooner than the scheduled
payment date.
```

Do not over-sell. Do not imply the supplier needs cash. Simply state the factual benefit.

### 4. Response Instructions

Make it as easy as possible for the supplier to accept:

```
To accept this proposal, please reply to this email with "Accepted" or click
the link below. If you would like to propose alternative terms, please reply
with your preferred discount rate and payment timeline.

[Accept Proposal Button/Link]

This proposal is valid until March 21, 2026. If we do not receive a response
by this date, we will process payment at standard terms.
```

A single-word acceptance option ("Accepted") lowers friction dramatically. The link to a web form provides a structured alternative. The expiration date creates urgency without pressure.

### 5. Opt-Out Language

Every proposal must include a way for the supplier to decline future proposals:

```
If you prefer not to receive early payment proposals in the future, please
reply with "Opt Out" and we will remove you from future outreach.
```

This is both a compliance requirement and a relationship safeguard. A supplier who opts out should be permanently excluded from proactive outreach (they can still offer discount terms on their invoices, of course).

### 6. Sender Identity and Authority

The email must come from an identifiable source with clear authority:

```
This proposal is authorized by [Company Name]'s Accounts Payable department.

[AP Manager Name]
Accounts Payable
[Company Name]
[Phone] | [Email]
```

Even though the agent composes and sends the email, it should be sent under a real person's authority with a real contact for questions. This is not deception — the AP manager has authorized the agent to send proposals on their behalf, and the contact information provides a human escalation path.

## Template Design

In practice, the agent does not compose emails from scratch for each proposal. It populates templates with variables and conditional logic.

### Template Variables

```
{{supplier_contact_name}}    — "Maria Santos"
{{supplier_company_name}}    — "Midwest Components LLC"
{{buyer_company_name}}       — "Apex Manufacturing"
{{invoice_number}}           — "INV-48291"
{{invoice_amount}}           — "$47,500.00"
{{invoice_date}}             — "March 15, 2026"
{{original_due_date}}        — "April 14, 2026"
{{proposed_payment_date}}    — "March 28, 2026"
{{discount_percent}}         — "1.5%"
{{discounted_amount}}        — "$46,787.50"
{{discount_dollar_value}}    — "$712.50"
{{days_accelerated}}         — "17"
{{proposal_expiry_date}}     — "March 21, 2026"
{{ap_manager_name}}          — "James Chen"
{{ap_manager_email}}         — "jchen@apexmfg.com"
```

### Conditional Blocks

Different supplier segments receive different messages. Use conditional blocks to customize without maintaining separate templates:

```
{% if supplier.segment == "strategic" %}
As a valued long-term partner, we are pleased to offer this early payment
opportunity. We appreciate our ongoing relationship and look forward to
continuing to work together.
{% elif supplier.segment == "new" %}
As part of our commitment to building strong supplier relationships, we
offer early payment options to our partners. We hope this is the beginning
of a productive relationship.
{% else %}
We are reaching out to offer an early payment opportunity on the following
invoice.
{% endif %}

{% if supplier.previous_acceptances > 0 %}
We appreciate your participation in our early payment program. As with
previous arrangements, payment will be processed promptly upon acceptance.
{% endif %}

{% if invoice.amount > 100000 %}
Given the size of this invoice, we want to ensure you have adequate time
to review. Please do not hesitate to contact us with any questions.
{% endif %}
```

## Personalization at Scale

Personalization is not about inserting a first name. It is about making each message relevant to the specific supplier's context.

### Tone Calibration

The agent should adjust tone based on relationship history and segment:

| Supplier Context | Tone | Example Opening |
|-----------------|------|-----------------|
| Strategic, long history | Warm, collegial | "We'd like to continue our early payment arrangement on this latest invoice." |
| New supplier, first proposal | Professional, informative | "We're reaching out to introduce our early payment program and offer an opportunity on your recent invoice." |
| Supplier who previously declined | Respectful, no-pressure | "We wanted to check in with an early payment option. We understand if the timing doesn't work." |
| Supplier with counter-offer history | Collaborative, open | "We have an early payment proposal and welcome your input on terms that work for both sides." |

### Multi-Invoice Bundling

When a supplier has multiple eligible invoices, bundle them into a single communication rather than sending five separate emails:

```
We have identified the following invoices eligible for early payment:

Invoice #48291 — $47,500.00 (due April 14)
Invoice #48305 — $12,300.00 (due April 18)
Invoice #48312 — $8,750.00  (due April 22)

Total: $68,550.00
Proposed payment: $67,536.75 (1.5% discount)
Proposed payment date: March 28, 2026

You may accept for all invoices or select specific invoices for early payment.
```

Bundling reduces email volume, makes the total value proposition clearer, and simplifies the supplier's decision-making.

## Compliance Requirements

Automated supplier communications carry compliance obligations that vary by jurisdiction and industry:

### Anti-Coercion

The proposal must not pressure suppliers into accepting. Phrases to avoid:

- "Failure to accept may affect future orders" — coercive
- "This is a limited-time offer that won't be repeated" — manipulative urgency
- "Other suppliers have already accepted" — social pressure
- "Payment may be delayed if discount is not agreed" — retaliatory threat

Phrases that are appropriate:

- "This proposal is entirely optional"
- "Your regular payment terms remain unchanged if you prefer"
- "We welcome your response at your convenience before [date]"

### Data Privacy

If operating in GDPR or CCPA jurisdictions, ensure that supplier contact data is handled according to privacy regulations. The agent should only use contact information for its intended business purpose and provide unsubscribe/opt-out mechanisms.

### Record Retention

Maintain a complete record of every outbound message:

```python
email_record = {
    "message_id": "uuid",
    "sent_at": "ISO-8601 timestamp",
    "recipient_email": "maria.santos@midwestcomponents.com",
    "supplier_id": "SUP-00342",
    "invoice_ids": ["INV-48291"],
    "proposed_terms": {
        "discount_percent": 1.5,
        "payment_date": "2026-03-28",
        "expiry_date": "2026-03-21"
    },
    "template_version": "v2.3",
    "personalization_flags": ["strategic_segment", "returning_participant"],
    "approved_by": "James Chen",
    "full_message_text": "...",
}
```

This record serves auditing, dispute resolution, and continuous improvement. When the agent's A/B tests (covered in Lesson 3.4) show that one template outperforms another, you can trace exactly which version each supplier received.

## Testing Before Launch

Before the agent sends its first live email, validate the templates thoroughly:

1. **Legal review.** Have legal counsel review the template for compliance, especially anti-coercion language and contract implications.
2. **Supplier advisory board.** Share draft templates with 3-5 trusted suppliers and ask for feedback. Their reactions will surprise you — and improve the template.
3. **Internal stakeholder review.** Procurement and sales teams should see what suppliers will receive. No one likes being blindsided by a colleague's automated outreach.
4. **Rendering test.** Send the templates through the actual email system. Check formatting on desktop and mobile email clients. Broken formatting undermines credibility.

In the next lesson, we move from the message itself to the strategic framework behind it: how the agent conducts multi-round negotiations with defined strategies and ethical boundaries.
