# Handling Supplier Responses and Objections
## Module 3: Supplier Communication and Negotiation Strategy | Lesson 3

**Learning Objectives:**
- Classify supplier responses into actionable categories (acceptance, counter-offer, rejection, non-response)
- Configure agent behavior for each response type
- Design escalation paths for responses that require human judgment
- Set follow-up cadences that balance persistence with professionalism

---

## Response Taxonomy

When the agent sends a discount proposal, supplier responses fall into five categories. Each requires a distinct handling strategy.

### 1. Acceptance

The supplier agrees to the proposed terms. This is the simplest case and the desired outcome.

**Examples:**
- "Accepted."
- "We agree to the 1.5% discount for payment by March 28."
- "Please proceed with early payment."
- A click on the acceptance link in the email

**Agent action:** Immediately trigger payment scheduling. Send a confirmation email summarizing the agreed terms. Update the supplier profile with a successful outcome.

```python
def handle_acceptance(negotiation, response):
    # Validate the acceptance matches the active proposal
    if response.references_correct_invoice and response.references_correct_terms:
        schedule_early_payment(
            invoice_id=negotiation.invoice_id,
            amount=negotiation.discounted_amount,
            pay_by_date=negotiation.proposed_payment_date
        )
        send_confirmation_email(negotiation)
        update_supplier_history(negotiation.supplier_id, outcome="accepted")
        negotiation.transition_to("ACCEPTED")
    else:
        # Ambiguous acceptance — escalate
        flag_for_review(negotiation, reason="acceptance_terms_unclear")
```

### 2. Counter-Offer

The supplier proposes different terms — a lower discount rate, a different payment date, or both.

**Examples:**
- "We can offer 1% if you pay within 7 days."
- "2% is too steep. We'd agree to 1.25% with payment by April 1."
- "We'd prefer a 0.75% discount with payment within 15 days."

**Agent action:** Parse the counter-offer, evaluate it against the acceptable range, and respond with acceptance, a counter-counter, or a final offer.

### 3. Rejection

The supplier declines the proposal entirely.

**Examples:**
- "We're not interested in early payment discounts at this time."
- "Our policy does not allow discounting."
- "No, thank you."

**Agent action:** Acknowledge respectfully. Record the rejection and the reason (if provided). Start the cooldown timer before the next proposal.

### 4. Deferral

The supplier is interested but not ready to commit.

**Examples:**
- "Can we revisit this next quarter?"
- "I need to check with my manager."
- "We're interested but need more information about your program."

**Agent action:** Respond with requested information if applicable. Set a follow-up reminder for the requested timeframe. Do not count this as a rejection.

### 5. Non-Response

The supplier does not reply at all. This is the most common outcome, especially for first-time outreach.

**Agent action:** Follow the configured follow-up cadence. After exhausting follow-ups, close the negotiation and record it as "no response."

## Parsing Supplier Responses

The agent must read unstructured email replies and classify them accurately. This is a natural language understanding task that LLMs handle well, but it requires careful prompt design and validation.

### Classification Prompt

```python
classification_prompt = """
You are analyzing a supplier's response to an early payment discount proposal.

Original proposal: {proposal_summary}

Supplier response:
---
{response_text}
---

Classify this response into exactly one category:
1. ACCEPT — Supplier agrees to the proposed terms
2. COUNTER — Supplier proposes different terms (extract the proposed discount % and payment days)
3. REJECT — Supplier declines the proposal
4. DEFER — Supplier is interested but wants to discuss later or needs more information
5. UNRELATED — Response is not about the discount proposal

Return JSON:
{{
  "classification": "ACCEPT|COUNTER|REJECT|DEFER|UNRELATED",
  "confidence": 0.0-1.0,
  "counter_terms": {{"discount_percent": float, "payment_days": int}} or null,
  "rejection_reason": "string" or null,
  "defer_until": "ISO date" or null,
  "summary": "one-sentence summary of the response"
}}
"""
```

### Confidence Thresholds

The agent should only act autonomously on high-confidence classifications:

```python
def handle_parsed_response(classification_result, negotiation):
    confidence = classification_result["confidence"]

    if confidence >= 0.90:
        # High confidence: act autonomously
        dispatch_handler(classification_result, negotiation)
    elif confidence >= 0.70:
        # Medium confidence: act but flag for review
        dispatch_handler(classification_result, negotiation)
        flag_for_review(negotiation, reason="medium_confidence_classification")
    else:
        # Low confidence: escalate to human
        escalate_to_human(negotiation, reason="low_confidence_classification",
                         raw_response=classification_result)
```

Setting the threshold at 0.90 for autonomous action is conservative but appropriate for financial communications. A misclassified acceptance could trigger an unintended payment; a misclassified rejection could close a viable negotiation. Errors in either direction have real consequences.

## Counter-Offer Evaluation

When a supplier counter-proposes, the agent must evaluate the new terms against its acceptable range.

### Evaluation Logic

```python
def evaluate_counter_offer(counter_terms, negotiation_config, supplier):
    proposed_discount = counter_terms["discount_percent"]
    proposed_days = counter_terms["payment_days"]

    # Calculate annualized rate of the counter-offer
    net_days = negotiation_config.original_net_days
    annualized_rate = (proposed_discount / (100 - proposed_discount)) * \
                      (365 / (net_days - proposed_days))

    # Check against minimum thresholds
    min_rate = negotiation_config.segment_config[supplier.segment]["min_annualized_rate"]

    if annualized_rate >= negotiation_config.target_annualized_rate:
        return "ACCEPT"  # Better than or equal to our target
    elif annualized_rate >= min_rate:
        return "COUNTER"  # Within range, try to improve
    elif annualized_rate >= min_rate * 0.8:
        return "FINAL_OFFER"  # Close to minimum, make one last try
    else:
        return "REJECT"  # Below our floor
```

### Counter-Counter Strategy

When the agent decides to counter the supplier's counter, it should:

1. **Acknowledge the supplier's position.** "Thank you for your counter-proposal of 1.0% for payment within 7 days."
2. **Split the difference strategically.** If the agent proposed 2.0% and the supplier countered at 1.0%, the agent might counter at 1.5% (not 1.5% exactly — perhaps 1.6% to leave room for one more round).
3. **Introduce flexibility on secondary dimensions.** "We could agree to 1.4% if we extend the payment window to 12 days." Trading rate for time can unlock agreements that pure rate negotiation cannot.

```python
def generate_counter_counter(supplier_counter, our_last_offer, concession_ladder, round_number):
    # Find the next step on the concession ladder
    next_step = concession_ladder.get(f"round_{round_number + 1}")

    if next_step is None:
        return concession_ladder["walk_away"]  # Final offer

    # Adjust based on supplier's counter (don't concede more than the ladder suggests)
    offered_discount = max(
        next_step["discount"],
        (supplier_counter["discount_percent"] + our_last_offer["discount"]) / 2
    )

    return {
        "discount": round(offered_discount, 2),
        "payment_days": next_step["payment_days"]
    }
```

## Rejection Analysis

When a supplier rejects a proposal, the reason matters for future strategy.

### Common Rejection Reasons and Agent Responses

| Reason | Frequency | Agent Action |
|--------|-----------|-------------|
| "Corporate policy — no discounting" | 30% | Record permanently. Do not re-approach for 12+ months. |
| "Not interested at this time" | 25% | Record with cooldown. Re-approach in 60-90 days. |
| "Discount rate too high" | 20% | Counter with lower rate. Record price sensitivity. |
| "We have adequate cash flow" | 10% | Record. Re-approach during known cash-tight periods. |
| "Need to discuss internally" | 10% | Treat as deferral, not rejection. Follow up in 2 weeks. |
| "We prefer our existing terms" | 5% | Acknowledge. Check if existing terms offer a discount already. |

### Updating the Supplier Profile

Every rejection enriches the supplier profile, improving future predictions:

```python
def process_rejection(negotiation, rejection_reason):
    supplier = get_supplier(negotiation.supplier_id)

    supplier.update_history(
        outcome="rejected",
        reason=rejection_reason,
        proposed_terms=negotiation.current_offer,
        date=today()
    )

    # Adjust cooldown based on reason
    if rejection_reason == "corporate_policy":
        supplier.set_cooldown(days=365)
        supplier.set_flag("policy_no_discount")
    elif rejection_reason == "not_interested_now":
        supplier.set_cooldown(days=90)
    elif rejection_reason == "rate_too_high":
        supplier.set_price_ceiling(negotiation.current_offer["discount"] * 0.7)
        supplier.set_cooldown(days=30)

    save_supplier(supplier)
```

## Non-Response Strategy

Non-response is the most frustrating outcome because it provides no information. The supplier may have missed the email, may be considering it, or may have silently declined.

### Follow-Up Cadence

```
Day 0:   Initial proposal sent
Day 5:   First follow-up (shorter, emphasizes deadline)
Day 10:  Second follow-up (final reminder)
Day 12:  Close negotiation if no response
```

### Follow-Up Message Design

Follow-ups should be brief and add new information or urgency:

**First follow-up:**
```
Subject: Re: Early Payment Opportunity — Invoice #48291

Hi [Name],

Following up on our early payment proposal for Invoice #48291. The
discount window closes on [date]. If you'd like to take advantage of
the 1.5% discount ($712.50 savings), please reply or click the link below.

[Accept Proposal]

If the proposed terms don't work, we're open to discussing alternatives.
```

**Second follow-up:**
```
Subject: Final Reminder — Early Payment for Invoice #48291

Hi [Name],

This is a final reminder that the early payment discount for Invoice
#48291 expires on [date]. After this date, we'll process payment at
standard terms.

No action needed if you prefer standard payment terms.

[Accept Proposal]
```

The second follow-up explicitly states "no action needed" to reduce pressure. The supplier should never feel harassed.

### When to Stop

Two follow-ups is the maximum for most supplier segments. Three feels like spam. The agent should track its follow-up count per supplier across all negotiations, not just the current one. If a supplier has been non-responsive to the last three separate proposals (each with follow-ups), reduce future outreach frequency or pause entirely.

## Human-in-the-Loop Escalation

Certain situations exceed the agent's mandate and require human judgment.

### Escalation Triggers

```python
escalation_triggers = [
    "supplier_expresses_frustration",
    "negotiation_exceeds_4_rounds",
    "counter_offer_involves_non_standard_terms",  # e.g., "We'll give 2% if you increase order volume"
    "supplier_raises_contract_dispute",
    "discount_amount_exceeds_approval_threshold",
    "classification_confidence_below_0.70",
    "supplier_requests_phone_call",
    "supplier_copies_legal_department",
]
```

### Escalation Package

When escalating, the agent provides the human with a complete briefing:

```python
escalation_package = {
    "supplier": supplier_profile,
    "negotiation_history": full_conversation_log,
    "current_offer": last_proposed_terms,
    "supplier_counter": latest_counter_terms,
    "financial_analysis": {
        "discount_value": dollar_amount,
        "annualized_rate": rate,
        "cash_availability": available_budget
    },
    "escalation_reason": "supplier expressed frustration in response",
    "recommended_action": "Accept supplier's counter of 1.0% to preserve relationship",
    "deadline": "Response needed by March 25 to maintain discount window"
}
```

The human can accept the recommendation, override it, or take over the negotiation entirely. When the human resolves the escalation, their decision feeds back into the agent's learning: if the human consistently accepts counter-offers the agent would have rejected, the agent's thresholds may need adjustment.

In the next lesson, we will look at how to track all of this activity, measure program performance, and continuously improve the agent's effectiveness through systematic analysis.
