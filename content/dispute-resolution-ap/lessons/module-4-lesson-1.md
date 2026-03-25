# Designing Agent Decision Logic
## Module 4: Autonomous Agent Behavior and Supplier Communication | Lesson 1

**Learning Objectives:**
- Define the decision tree an agent follows when a discrepancy is detected (auto-resolve, escalate, or dispute)
- Configure confidence thresholds that determine when the agent acts autonomously vs. seeks approval
- Design fallback paths for edge cases the agent cannot classify
- Implement guardrails that prevent the agent from taking high-risk actions without oversight

---

## From Detection to Action

Modules 2 and 3 built the detection layer: rules catch known discrepancy patterns, anomaly detection catches unexpected behavior, and the composite scoring system ranks everything by risk. But detection without action is just a notification system. The value of an AP dispute resolution agent comes from what it does with those detections.

This lesson covers the decision logic layer — the rules that determine, for each detected discrepancy, whether the agent should resolve it automatically, recommend an action and wait for approval, or escalate to a human immediately.

## The Decision Matrix

Every detected discrepancy sits at the intersection of three dimensions:

1. **Discrepancy type:** Pricing, quantity, duplicate, quality, delivery
2. **Severity:** Low, medium, high, critical (from the composite scoring system)
3. **Confidence:** How certain is the system that this is a genuine discrepancy vs. a data quality issue or false positive?

The combination determines the action:

```
Action = f(discrepancy_type, severity, confidence)
```

### Decision Tree Structure

```python
def decide_action(discrepancy):
    dtype = discrepancy.type
    severity = discrepancy.severity
    confidence = discrepancy.confidence_score  # 0.0 to 1.0

    # Critical severity: always escalate to human
    if severity == "critical":
        return Action.ESCALATE_IMMEDIATE

    # High-confidence, low-severity: auto-resolve
    if confidence >= 0.95 and severity == "low":
        if dtype == "pricing" and discrepancy.total_variance <= 500:
            return Action.AUTO_ADJUST  # Apply PO price, log adjustment
        if dtype == "quantity" and discrepancy.shortage_qty <= 5:
            return Action.AUTO_ADJUST  # Accept received quantity
        if dtype == "duplicate" and confidence >= 0.99:
            return Action.AUTO_BLOCK  # Block duplicate, no payment

    # High-confidence, medium-severity: recommend and wait
    if confidence >= 0.85 and severity == "medium":
        return Action.RECOMMEND_AND_WAIT  # Agent proposes action, human approves

    # Medium confidence: always recommend, never auto-act
    if 0.50 <= confidence < 0.85:
        return Action.RECOMMEND_AND_WAIT

    # Low confidence: escalate for human judgment
    if confidence < 0.50:
        return Action.ESCALATE_FOR_REVIEW

    # Default fallback
    return Action.ESCALATE_FOR_REVIEW
```

## Confidence Thresholds

Confidence is the most important input to the decision logic. A pricing discrepancy that the system is 98% sure about can be auto-resolved. The same discrepancy at 60% confidence should be flagged for human review.

### What Determines Confidence?

Confidence is not a single number — it is derived from multiple factors:

```python
def calculate_confidence(discrepancy, context):
    base_confidence = 0.5

    # Data quality factors
    if context.po_exists and context.po_is_current:
        base_confidence += 0.2
    if context.grn_exists and context.grn_age_days < 5:
        base_confidence += 0.15
    if context.contract_on_file:
        base_confidence += 0.1

    # Match quality factors
    if discrepancy.match_type == "exact":  # Exact PO-invoice line match
        base_confidence += 0.1
    elif discrepancy.match_type == "fuzzy":
        base_confidence -= 0.1

    # Historical pattern
    if context.vendor_has_history_of_this_type:
        base_confidence += 0.1
    if context.this_is_first_dispute_with_vendor:
        base_confidence -= 0.05

    # Rule agreement
    if discrepancy.rule_flags_count >= 2:  # Multiple rules agree
        base_confidence += 0.1

    return min(base_confidence, 1.0)
```

### Threshold Configuration

```yaml
confidence_thresholds:
  auto_resolve:
    minimum: 0.95
    description: "Agent acts autonomously. Logs action for audit."
    applies_to: ["pricing_low", "quantity_low", "duplicate_high_confidence"]

  recommend:
    minimum: 0.70
    description: "Agent proposes action. Human approves or modifies."
    applies_to: ["pricing_medium", "quantity_medium", "duplicate_medium"]

  escalate:
    minimum: 0.0  # Everything below 'recommend' threshold
    description: "Agent flags issue with context. Human decides."
    applies_to: ["all_high_severity", "low_confidence_any"]
```

## Auto-Resolution Actions

When the agent is confident enough to act autonomously, these are the available actions:

### Tolerance Adjustment

The invoice is slightly outside tolerance, but the system knows it is a legitimate charge (e.g., rounding difference, known price index update).

```python
def auto_adjust_price(invoice_line, po_line, reason):
    adjustment = {
        "type": "price_adjustment",
        "invoice_line": invoice_line.id,
        "original_invoice_price": invoice_line.unit_price,
        "adjusted_to": po_line.effective_price,
        "variance_absorbed": invoice_line.unit_price - po_line.effective_price,
        "reason": reason,
        "authorized_by": "system_auto_resolve",
        "rule_reference": "AUTO_PRICE_ADJ_001 v2.1",
        "timestamp": now()
    }
    apply_adjustment(adjustment)
    log_audit_trail(adjustment)
    return adjustment
```

### Quantity Correction

The invoice quantity does not match the GRN, but the GRN is authoritative. The agent adjusts the payable amount to match what was received.

### Duplicate Blocking

A duplicate invoice with 99%+ confidence is automatically blocked. No payment is created. The supplier is notified.

### What the Agent Should Never Auto-Resolve

- **Discrepancies above a dollar threshold.** Set a ceiling — e.g., no auto-resolution on variances above $2,000. Every organization has a different ceiling based on risk appetite.
- **Discrepancies involving new vendors.** The first 5-10 invoices from a new vendor should always be human-reviewed, regardless of confidence.
- **Discrepancies involving flagged vendors.** If a vendor has a history of disputes or has been flagged by the anomaly detection system, auto-resolution is disabled.
- **Any action that creates a financial obligation.** Auto-resolving in the buyer's favor (adjusting down to PO price) is low-risk. Auto-resolving in the supplier's favor (accepting a higher price) is high-risk and requires human approval.

## Guardrails

Guardrails are hard limits that override the decision logic. They are the "break glass" controls that prevent the agent from making catastrophic errors.

```yaml
guardrails:
  max_auto_resolve_per_invoice: 2000.00    # USD
  max_auto_resolve_per_vendor_per_day: 10000.00
  max_auto_resolve_per_day_total: 50000.00

  blocked_actions:
    - "accept_price_above_po"       # Never auto-accept a higher price
    - "write_off_without_approval"  # Never write off without human sign-off
    - "modify_po"                    # Never change the PO automatically
    - "send_payment_above_po_value"  # Never pay more than PO total

  mandatory_human_review:
    - "vendor_risk_tier == 3"        # New or flagged vendors
    - "invoice_amount > 50000"       # High-value invoices
    - "dispute_count_this_vendor > 3_in_90_days"  # Pattern of disputes
    - "cross_border == true"         # International transactions
```

### Implementing Guardrail Checks

```python
def check_guardrails(proposed_action, invoice, context):
    violations = []

    # Dollar ceiling
    if proposed_action.auto_resolve_amount > config.max_auto_resolve_per_invoice:
        violations.append({
            "guardrail": "max_auto_resolve_per_invoice",
            "limit": config.max_auto_resolve_per_invoice,
            "attempted": proposed_action.auto_resolve_amount
        })

    # Daily vendor ceiling
    today_auto_resolved = get_today_auto_resolved(invoice.vendor_id)
    if today_auto_resolved + proposed_action.auto_resolve_amount > config.max_per_vendor_per_day:
        violations.append({
            "guardrail": "max_auto_resolve_per_vendor_per_day",
            "limit": config.max_per_vendor_per_day,
            "current_total": today_auto_resolved
        })

    # Mandatory human review triggers
    if invoice.vendor.risk_tier == 3:
        violations.append({"guardrail": "mandatory_review_new_vendor"})

    if invoice.total_amount > 50000:
        violations.append({"guardrail": "mandatory_review_high_value"})

    if violations:
        return {
            "allowed": False,
            "violations": violations,
            "override_action": "escalate_for_review"
        }
    return {"allowed": True}
```

## Edge Case Handling

The agent will encounter situations that do not fit cleanly into the decision tree. Designing for these edge cases prevents the system from stalling or making bad decisions.

### Unknown Vendor

An invoice arrives from a vendor not in your vendor master. The PO references a vendor ID that does not exist.

**Handling:** Do not attempt any matching. Route immediately to the AP team with a "vendor not found" flag. This may be a data entry error, a subsidiary invoicing under a parent company, or a fraudulent invoice.

### Missing PO

The invoice does not reference a PO, or the PO number does not exist in the system.

**Handling:** Check if this vendor is on a non-PO whitelist (e.g., utility companies, landlords). If whitelisted, route to the appropriate approval workflow. If not, flag as "no PO" and escalate. Non-PO invoices have a higher fraud risk and always require human review.

### Ambiguous Matches

The invoice could match against two different PO lines. Item descriptions are similar but not identical. Quantities could correspond to either PO.

**Handling:** Present both options to the reviewer with the match confidence for each. Let the human decide. Never guess when the confidence is below the auto-resolve threshold.

```python
def handle_ambiguous_match(invoice_line, candidate_po_lines):
    if len(candidate_po_lines) == 1:
        return candidate_po_lines[0]  # Single match

    if len(candidate_po_lines) == 0:
        return Action.ESCALATE("no_matching_po_line")

    # Multiple candidates: score each
    scored = []
    for po_line in candidate_po_lines:
        score = match_score(invoice_line, po_line)
        scored.append({"po_line": po_line, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)

    if scored[0]["score"] > 0.95 and scored[1]["score"] < 0.70:
        return scored[0]["po_line"]  # Clear winner

    # No clear winner — present to human
    return Action.HUMAN_CHOICE(candidates=scored)
```

## Decision Logging

Every decision the agent makes must be logged for auditability:

```python
def log_decision(invoice_id, decision):
    log_entry = {
        "timestamp": now(),
        "invoice_id": invoice_id,
        "discrepancy_type": decision.discrepancy_type,
        "severity": decision.severity,
        "confidence": decision.confidence,
        "signals": decision.signal_vector,
        "composite_score": decision.risk_score,
        "action_taken": decision.action,
        "guardrail_check": decision.guardrail_result,
        "rule_version": decision.rule_version,
        "model_version": decision.model_version
    }
    write_immutable_log(log_entry)
```

This log is the evidence that the agent made a reasonable decision based on the information available. When an auditor asks "why was this invoice auto-resolved?", the answer is in the log: "Because the pricing variance was $0.12 (0.08%), confidence was 0.97, the vendor is tier-1 strategic, and the total auto-resolved amount was within the $2,000 guardrail."

---

**Up next:** Lesson 4.2 covers how the agent drafts and sends dispute communications to suppliers — the messages that initiate and drive the resolution process.
