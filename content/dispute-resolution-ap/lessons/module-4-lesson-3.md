# Managing the Dispute Lifecycle
## Module 4: Autonomous Agent Behavior and Supplier Communication | Lesson 3

**Learning Objectives:**
- Design state machines that track disputes from open through resolution
- Implement automated follow-up schedules with escalating urgency
- Handle supplier responses: acceptance, counter-proposal, rejection, no response
- Define resolution actions: credit note processing, price adjustment, quantity write-off, payment release

---

## The Dispute State Machine

A dispute is not a single event — it is a process with distinct stages, transitions, and outcomes. A state machine models this process explicitly, ensuring that every dispute is in a known state at all times and that transitions follow defined rules.

### Core States

```
┌──────────┐     ┌───────────────────┐     ┌─────────────────┐
│ DETECTED │────→│ AWAITING_SUPPLIER │────→│ SUPPLIER_RESPONDED│
└──────────┘     └───────────────────┘     └─────────────────┘
                         │                        │
                         │ (no response)           ├──→ ACCEPTED
                         ▼                        ├──→ COUNTER_PROPOSED
                  ┌──────────┐                    ├──→ REJECTED
                  │ ESCALATED│                    └──→ PARTIAL_ACCEPT
                  └──────────┘
                         │
                         ▼
                  ┌──────────┐     ┌────────┐
                  │ RESOLVED │────→│ CLOSED │
                  └──────────┘     └────────┘
```

### State Definitions

```python
class DisputeState:
    DETECTED = "detected"
    # Discrepancy identified; dispute case created

    AWAITING_SUPPLIER = "awaiting_supplier"
    # First notice sent; waiting for supplier response

    SUPPLIER_RESPONDED = "supplier_responded"
    # Supplier has replied; response needs evaluation

    COUNTER_PROPOSED = "counter_proposed"
    # Supplier disagrees with full claim; proposes alternative

    ESCALATED = "escalated"
    # No response or unresolved after negotiation; escalated to higher tier

    RESOLVED = "resolved"
    # Both parties agree on outcome; resolution action pending

    CLOSED = "closed"
    # Resolution action completed; dispute archived

    EXPIRED = "expired"
    # Dispute abandoned after exceeding maximum age (e.g., 120 days)
```

### Transition Rules

```python
VALID_TRANSITIONS = {
    "detected": ["awaiting_supplier", "resolved"],  # Can auto-resolve without contacting supplier
    "awaiting_supplier": ["supplier_responded", "escalated", "expired"],
    "supplier_responded": ["resolved", "counter_proposed", "escalated"],
    "counter_proposed": ["resolved", "escalated", "awaiting_supplier"],  # Can send counter-counter
    "escalated": ["resolved", "awaiting_supplier", "expired"],
    "resolved": ["closed"],
    "closed": []  # Terminal state
}

def transition(dispute, new_state, reason, actor):
    if new_state not in VALID_TRANSITIONS[dispute.state]:
        raise InvalidTransitionError(
            f"Cannot transition from {dispute.state} to {new_state}"
        )

    old_state = dispute.state
    dispute.state = new_state
    dispute.state_changed_at = now()

    log_transition(
        dispute_id=dispute.id,
        from_state=old_state,
        to_state=new_state,
        reason=reason,
        actor=actor,  # "system", "ap_reviewer", "supplier"
        timestamp=now()
    )
```

## Automated Follow-Up Schedules

When a dispute is in `AWAITING_SUPPLIER`, the agent should not wait passively. Automated follow-ups ensure disputes do not stall.

### Follow-Up Cadence

```yaml
follow_up_schedule:
  first_follow_up:
    days_after_initial: 5
    tone: "reminder"
    action: "Send reminder with original dispute details"

  second_follow_up:
    days_after_initial: 10
    tone: "elevated"
    action: "Send follow-up noting missed deadline"

  escalation_trigger:
    days_after_initial: 15
    tone: "escalation"
    action: "Escalate to Tier 2; notify supplier management"

  final_notice:
    days_after_initial: 25
    tone: "final"
    action: "Send final notice; warn of payment hold on all pending invoices"

  auto_close:
    days_after_initial: 60
    action: "Close dispute as expired; flag for write-off review"
```

### Follow-Up Implementation

```python
def check_follow_ups():
    """Run daily: check all open disputes for follow-up actions."""
    open_disputes = get_disputes(state="awaiting_supplier")

    for dispute in open_disputes:
        days_open = (today() - dispute.initial_notice_date).days

        for step in follow_up_schedule:
            if (days_open >= step.days_after_initial and
                step.id not in dispute.completed_follow_ups):

                if step.action == "send_reminder":
                    message = generate_follow_up_message(dispute, step.tone)
                    queue_message(message, review_required=(step.tone == "escalation"))
                    dispute.completed_follow_ups.append(step.id)

                elif step.action == "escalate":
                    transition(dispute, "escalated",
                              reason=f"No response after {days_open} days",
                              actor="system")
                    notify_manager(dispute)

                elif step.action == "auto_close":
                    transition(dispute, "expired",
                              reason="Maximum dispute age exceeded",
                              actor="system")
                    flag_for_write_off_review(dispute)

                break  # Only execute the first applicable step
```

### Smart Follow-Up: Adjusting Based on Vendor Behavior

Not all vendors should get the same follow-up cadence. If a vendor historically responds within 3 days, send the first follow-up on day 5. If a vendor typically takes 10 days, do not escalate on day 15 — adjust to day 20.

```python
def get_vendor_response_profile(vendor_id):
    past_disputes = get_resolved_disputes(vendor_id=vendor_id, limit=20)
    response_times = [d.first_response_days for d in past_disputes if d.first_response_days]

    if len(response_times) < 3:
        return None  # Use default schedule

    return {
        "avg_response_days": statistics.mean(response_times),
        "p90_response_days": percentile(response_times, 90),
    }

def adjust_follow_up_schedule(base_schedule, vendor_profile):
    if vendor_profile is None:
        return base_schedule

    # Scale follow-up timing based on vendor's typical response time
    multiplier = max(vendor_profile["avg_response_days"] / 5, 0.8)  # Don't go below 80% of default
    adjusted = []
    for step in base_schedule:
        adjusted_step = step.copy()
        adjusted_step.days_after_initial = round(step.days_after_initial * multiplier)
        adjusted.append(adjusted_step)
    return adjusted
```

## Handling Supplier Responses

When the supplier responds, the agent must interpret the response and route it appropriately.

### Response Types

**Acceptance:** The supplier agrees with the discrepancy and will issue a credit note or revised invoice. This is the best outcome — transition to `resolved`.

**Counter-Proposal:** The supplier acknowledges a discrepancy but proposes a different resolution. Example: "We agree the price should have been lower, but it should be $12.80, not $12.50, because the Q3 price adjustment took effect." This requires evaluation and possibly negotiation.

**Rejection:** The supplier disputes the discrepancy entirely. "Our records show the price is correct per the amended contract signed on August 15." This requires evidence review and possible escalation.

**Partial Acceptance:** The supplier agrees on some line items but disputes others. Each line item may need separate handling.

**No Response:** After the follow-up schedule is exhausted, no response constitutes a default. Handle per policy — typically escalate or write off.

### Response Processing

```python
def process_supplier_response(dispute, response):
    transition(dispute, "supplier_responded",
              reason="Supplier response received",
              actor="supplier")

    if response.type == "full_acceptance":
        dispute.resolution_type = "credit_note_expected"
        dispute.expected_credit_amount = dispute.total_variance
        dispute.expected_credit_deadline = today() + business_days(10)
        transition(dispute, "resolved", reason="Supplier accepted", actor="system")

    elif response.type == "counter_proposal":
        transition(dispute, "counter_proposed",
                  reason=f"Supplier proposes: {response.proposal_summary}",
                  actor="supplier")
        # Route to reviewer with supplier's counter-proposal
        create_review_task(
            dispute=dispute,
            task_type="evaluate_counter_proposal",
            context={
                "original_claim": dispute.total_variance,
                "supplier_proposal": response.proposal_amount,
                "supplier_evidence": response.attachments,
                "supplier_rationale": response.explanation
            }
        )

    elif response.type == "rejection":
        create_review_task(
            dispute=dispute,
            task_type="evaluate_rejection",
            context={
                "supplier_evidence": response.attachments,
                "supplier_rationale": response.explanation
            },
            priority="high"
        )

    elif response.type == "partial_acceptance":
        # Split dispute: accepted lines resolve, disputed lines continue
        accepted_lines = response.accepted_lines
        disputed_lines = response.disputed_lines

        dispute.partial_credit_amount = sum(l.variance for l in accepted_lines)
        # Keep dispute open for remaining lines
        create_review_task(
            dispute=dispute,
            task_type="handle_partial_acceptance",
            context={
                "accepted_amount": dispute.partial_credit_amount,
                "remaining_amount": dispute.total_variance - dispute.partial_credit_amount,
                "disputed_lines": disputed_lines
            }
        )
```

### Parsing Structured vs. Unstructured Responses

Responses through a supplier portal are structured — the supplier fills in a form with defined fields. Parsing is trivial.

Responses via email are unstructured. The agent needs to classify the email:

```python
def classify_supplier_email(email_text, dispute_context):
    """Classify a supplier email response to a dispute."""
    # Look for key phrases indicating response type
    acceptance_signals = ["credit note", "will issue", "agree with", "our apologies",
                          "correction forthcoming"]
    rejection_signals = ["our records show", "price is correct", "contract amendment",
                        "disagree", "no discrepancy"]
    counter_signals = ["propose", "suggest", "alternative", "partial", "compromise",
                      "we can offer"]

    # Score each category
    scores = {
        "acceptance": count_matches(email_text, acceptance_signals),
        "rejection": count_matches(email_text, rejection_signals),
        "counter_proposal": count_matches(email_text, counter_signals)
    }

    best_match = max(scores, key=scores.get)

    if scores[best_match] == 0:
        return {"classification": "unknown", "confidence": 0.0,
                "action": "route_to_human"}

    confidence = scores[best_match] / sum(scores.values())

    if confidence < 0.6:
        return {"classification": best_match, "confidence": confidence,
                "action": "route_to_human_with_suggestion"}

    return {"classification": best_match, "confidence": confidence}
```

For production systems, use an LLM-based classifier with the dispute context for more accurate email classification. The keyword approach above is a baseline.

## Resolution Types and Accounting Treatment

When a dispute is resolved, the resolution has accounting implications:

| Resolution | Accounting Action | Journal Entry |
|-----------|-------------------|---------------|
| Credit note received | Reduce AP liability | Dr. Accounts Payable / Cr. Inventory or Expense |
| Revised invoice (lower amount) | Adjust AP to new amount | Dr. Accounts Payable / Cr. Expense |
| Price adjustment accepted (supplier wins) | Pay full invoice | None — standard payment |
| Quantity write-off | Accept received qty, adjust invoice | Dr. Accounts Payable / Cr. Inventory |
| Full write-off (accept and pay) | Pay original invoice | None — standard payment |
| Debit note issued | Create receivable from supplier | Dr. Accounts Receivable / Cr. Expense |

Each resolution type must trigger the correct accounting entries. The agent should generate the journal entry proposal, but a human should approve non-standard entries.

## SLA Tracking

Track time-to-resolution by dispute type and vendor:

```python
def calculate_dispute_sla_metrics(disputes):
    metrics = {}
    for dispute in disputes:
        if dispute.state != "closed":
            continue

        key = (dispute.type, dispute.vendor_id)
        if key not in metrics:
            metrics[key] = []

        resolution_days = (dispute.closed_date - dispute.detected_date).days
        metrics[key].append(resolution_days)

    summary = {}
    for key, days_list in metrics.items():
        summary[key] = {
            "dispute_type": key[0],
            "vendor_id": key[1],
            "count": len(days_list),
            "avg_days": round(statistics.mean(days_list), 1),
            "median_days": statistics.median(days_list),
            "p90_days": percentile(days_list, 90),
            "within_sla": sum(1 for d in days_list if d <= 15) / len(days_list) * 100
        }
    return summary
```

**Example output:**

```
SLA Performance — Q1 2025
═════════════════════════
Dispute Type    Avg Days    Median    P90    Within SLA (15d)
──────────────────────────────────────────────────────────────
Pricing           8.3         6       14        82%
Quantity          6.1         5       11        91%
Duplicate         3.2         2        7        97%
Quality          18.7        16       32        41%
Delivery         12.4        10       22        68%
```

Quality disputes take the longest because they require physical inspection, lab results, or third-party verification. This is expected, and the SLA target for quality disputes should be longer (30 days vs. 15 days for pricing).

---

**Up next:** Lesson 4.4 covers how to surface dispute information to managers with actionable context — dashboards, alerts, and executive reporting.
