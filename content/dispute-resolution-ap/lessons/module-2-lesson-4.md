# Building a Rule Engine for AP Validation
## Module 2: Detecting Discrepancies with Rule-Based Logic | Lesson 4

**Learning Objectives:**
- Architect a configurable rule engine that combines pricing, quantity, and duplicate checks
- Define rule priority and conflict resolution when multiple rules fire
- Implement rule versioning so that logic changes are auditable
- Test rules against historical invoice data to measure precision and recall
- Configure rule outputs to feed into downstream dispute workflows

---

## Why You Need a Rule Engine, Not Just Rules

In Lessons 2.1 through 2.3, we built individual detection rules: pricing comparison, quantity reconciliation, duplicate detection. Each rule works independently. But in production, you need these rules to work together — sharing data, respecting priorities, and producing a unified output.

A rule engine is the orchestration layer. It decides which rules run, in what order, what happens when rules conflict, and what the combined output looks like. Without it, you have a collection of scripts. With it, you have a system.

## Architecture: Conditions, Actions, Priorities

Every rule in the engine follows the same structure:

```yaml
rule:
  id: "PRICE_CHECK_001"
  name: "Unit Price vs. PO Price"
  version: "2.3"
  priority: 100        # Lower number = higher priority
  enabled: true

  conditions:
    - field: "invoice_line.unit_price"
      operator: "differs_from"
      reference: "po_line.unit_price"
      tolerance:
        percentage: 2.0
        absolute: 1.00
        mode: "greater_of"

  actions:
    - type: "flag"
      severity: "calculated"  # Based on variance amount
      message_template: "Price variance of {variance_pct}% ({variance_amount}) on line {line_number}"
    - type: "hold_payment"
      condition: "severity >= high"
    - type: "notify"
      recipients: ["ap_reviewer"]
      condition: "severity >= medium"
```

This structure makes rules readable by both engineers and business users. The YAML format is deliberate — it is easier for an AP manager to review and approve a rule change in YAML than in Python code.

## Execution Models: Sequential vs. Parallel

### Sequential Pipeline

Rules execute in priority order. The output of one rule can influence the next.

```
Invoice received
  → Rule 1: Duplicate check (priority 10)
      If duplicate detected → STOP, flag as duplicate, do not run further rules
  → Rule 2: PO match validation (priority 20)
      If no PO found → STOP, route to non-PO workflow
  → Rule 3: Price check (priority 100)
  → Rule 4: Quantity check (priority 110)
  → Rule 5: Tax validation (priority 120)
  → Rule 6: Freight/charges check (priority 130)
  → Aggregate results → Generate discrepancy report
```

Sequential execution is appropriate when early rules can short-circuit processing. Why run a detailed price check if the invoice is a duplicate?

### Parallel Evaluation

All rules evaluate independently against the same invoice data. Results are collected and merged.

```python
def evaluate_all_rules(invoice, context):
    results = []
    for rule in get_enabled_rules():
        result = rule.evaluate(invoice, context)
        results.append(result)

    # Merge: combine all flags, take highest severity, aggregate messages
    return merge_results(results)
```

Parallel evaluation is faster (rules can run concurrently) and simpler (no inter-rule dependencies). But it cannot short-circuit — you pay the cost of every rule on every invoice.

### Hybrid Approach (Recommended)

Use a two-phase model:

**Phase 1 (Sequential):** Gate rules that can reject or redirect the invoice early. Duplicate check, PO validation, vendor status check.

**Phase 2 (Parallel):** All detailed validation rules run in parallel on invoices that pass Phase 1. Price, quantity, tax, freight checks.

```python
def process_invoice(invoice):
    # Phase 1: Gate rules (sequential, short-circuit)
    for rule in get_gate_rules():
        result = rule.evaluate(invoice)
        if result.action == "stop":
            return result  # Duplicate, no PO, blocked vendor, etc.

    # Phase 2: Validation rules (parallel)
    context = build_context(invoice)  # Load PO, GRN, contract data
    results = parallel_evaluate(get_validation_rules(), invoice, context)

    return aggregate_results(results)
```

## Rule Priority and Conflict Resolution

When multiple rules fire on the same invoice line, you need conflict resolution:

### Scenario: Conflicting Severities

Rule A (pricing check) says: "Line 3 is a medium severity discrepancy — $0.75 over tolerance."
Rule B (quantity check) says: "Line 3 is a low severity discrepancy — 2% under GRN quantity."

Which severity applies to line 3? Options:

1. **Highest severity wins:** Line 3 is medium. Simple, conservative.
2. **Priority-weighted:** Higher-priority rule's severity takes precedence.
3. **Aggregate:** Combine signals — a line with both a pricing and quantity discrepancy is worse than either alone. Bump severity up one level.

Option 3 is the most sophisticated and the most accurate. A line item with three independent discrepancies is more concerning than one with a single discrepancy, even if each individual discrepancy is minor.

### Scenario: Conflicting Actions

Rule A says: "Auto-approve this line (variance within tolerance)."
Rule B says: "Hold this line (quantity discrepancy detected)."

Resolution: **restrictive action wins.** If any rule says hold, the line is held. An invoice is only auto-approved if all rules agree on approval. This is the fail-safe approach appropriate for financial controls.

```python
ACTION_PRIORITY = {
    "block": 0,      # Most restrictive — always wins
    "hold": 1,
    "review": 2,
    "auto_approve": 3  # Least restrictive — only if nothing else fires
}

def resolve_actions(rule_results):
    actions = [r.action for r in rule_results if r.action is not None]
    if not actions:
        return "auto_approve"
    return min(actions, key=lambda a: ACTION_PRIORITY[a])
```

## Rule Configuration for Business Users

The value of a rule engine depends on how easily business users can modify it. If every threshold change requires a code deployment, the system is too rigid.

### Configuration Schema

```json
{
  "rule_sets": {
    "pricing": {
      "default_tolerance_pct": 3.0,
      "default_tolerance_abs": 5.00,
      "overrides": [
        {
          "vendor_category": "strategic",
          "tolerance_pct": 5.0,
          "reason": "Strategic vendors get wider tolerance per policy AP-2024-007"
        },
        {
          "item_category": "services",
          "tolerance_pct": 0.0,
          "reason": "Service rates must exactly match contract"
        }
      ]
    },
    "quantity": {
      "grace_period_days": 5,
      "over_delivery_tolerance_pct": 5.0,
      "severity_thresholds": {
        "low_max_pct": 5.0,
        "medium_max_pct": 15.0
      }
    },
    "duplicate": {
      "date_window_days": 90,
      "similarity_threshold": 0.85,
      "recurring_auto_whitelist": true
    }
  }
}
```

This configuration should be stored in a versioned repository (not in a database field) with approval workflows for changes. When the AP manager wants to change the pricing tolerance from 3% to 4%, they submit a change request, it gets reviewed by the finance controller, and the change is logged with who, when, and why.

## Rule Versioning and Change Management

Every rule must be versioned. When you look at a dispute from 6 months ago, you need to know exactly which version of the rules was in effect when the invoice was processed.

```python
class RuleVersion:
    rule_id: str         # "PRICE_CHECK_001"
    version: str         # "2.3"
    effective_from: date  # "2025-01-15"
    effective_to: date    # None (current) or "2025-03-01"
    approved_by: str      # "j.smith@company.com"
    change_reason: str    # "Widened tolerance for commodity items per ticket AP-2025-042"
    config: dict          # The full rule configuration

# When evaluating an invoice, use the version effective on the invoice receipt date
def get_active_rule(rule_id, evaluation_date):
    return (RuleVersion.objects
            .filter(rule_id=rule_id)
            .filter(effective_from__lte=evaluation_date)
            .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=evaluation_date))
            .first())
```

This is not optional. Auditors will ask: "Why was this invoice auto-approved when it had a 4% price variance?" Your answer must be: "Because rule PRICE_CHECK_001 version 2.3, effective from January 15, approved by J. Smith, had a tolerance of 5% for commodity items. Here is the approval record."

## Backtesting: Measuring Rule Performance

Before deploying new rules or changing thresholds, run them against historical data. This is backtesting.

### Process

1. **Extract historical data:** Pull 6-12 months of invoices with their final outcomes (paid as-is, disputed, credit note received, written off).
2. **Replay invoices through the rule engine:** Run each historical invoice through the new rules.
3. **Compare rule output to actual outcomes:**

```python
def backtest_rules(historical_invoices, new_rules):
    results = {"true_pos": 0, "false_pos": 0, "true_neg": 0, "false_neg": 0}

    for invoice in historical_invoices:
        rule_flags = evaluate_rules(new_rules, invoice)
        was_actually_disputed = invoice.outcome in ["disputed", "credit_note", "write_off"]

        would_be_flagged = any(r.action in ["hold", "review"] for r in rule_flags)

        if would_be_flagged and was_actually_disputed:
            results["true_pos"] += 1
        elif would_be_flagged and not was_actually_disputed:
            results["false_pos"] += 1
        elif not would_be_flagged and was_actually_disputed:
            results["false_neg"] += 1
        else:
            results["true_neg"] += 1

    precision = results["true_pos"] / (results["true_pos"] + results["false_pos"])
    recall = results["true_pos"] / (results["true_pos"] + results["false_neg"])

    return {**results, "precision": precision, "recall": recall}
```

### Interpreting Backtest Results

| Metric | Target | Interpretation |
|--------|--------|---------------|
| Precision | > 40% | At least 40% of flagged invoices would have been true disputes |
| Recall | > 90% | Rules catch 90%+ of invoices that actually became disputes |
| False negative rate | < 10% | Less than 10% of real disputes would be missed |

For AP, recall matters more than precision. Missing a real dispute (false negative) costs more than investigating a false alarm (false positive). A precision of 40% means 60% of investigations find nothing — but each investigation is cheap. A missed duplicate payment is expensive.

## Output Integration

The rule engine's output must flow into downstream systems:

```json
{
  "invoice_id": "INV-88432",
  "evaluation_timestamp": "2025-07-15T09:23:41Z",
  "rule_engine_version": "3.1.0",
  "overall_action": "hold",
  "overall_severity": "high",
  "flags": [
    {
      "rule_id": "PRICE_CHECK_001",
      "rule_version": "2.3",
      "line": 3,
      "severity": "high",
      "message": "Price variance of 6.0% ($0.75/unit, $1,500 total) on line 3",
      "action": "hold"
    }
  ],
  "routing": {
    "dispute_queue": true,
    "assigned_to": "ap_team_queue",
    "sla_deadline": "2025-07-22T17:00:00Z",
    "notifications": ["ap_reviewer@company.com"]
  }
}
```

This output feeds into the dispute workflow (Module 4), the anomaly detection layer (Module 3), and the reporting dashboard. The rule engine is not the end of the process — it is the beginning of the intelligent resolution pipeline.

---

**Up next:** Module 3 moves beyond static rules to statistical anomaly detection. Lesson 3.1 covers building statistical baselines for vendor invoice behavior.
