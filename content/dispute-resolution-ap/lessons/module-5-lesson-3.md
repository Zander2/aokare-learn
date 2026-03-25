# Expanding Agent Autonomy Over Time
## Module 5: Human-in-the-Loop Learning and Continuous Improvement | Lesson 3

**Learning Objectives:**
- Define autonomy levels and the criteria for promoting an agent from one level to the next
- Implement graduated trust: starting with recommendations-only and progressing to auto-resolution within defined boundaries
- Design monitoring systems that detect agent performance degradation and trigger autonomy rollback
- Create governance policies that define who can approve autonomy expansion

---

## The Autonomy Problem

Deploying an AP dispute resolution agent is not a binary choice between "human does everything" and "agent does everything." Both extremes are wrong.

A fully manual process is slow, expensive, and inconsistent. Your AP team processes 10,000 invoices a month. Asking a human to review every discrepancy flag — even correct ones — wastes time that should go to genuinely complex disputes.

A fully autonomous agent with no human oversight is dangerous. A model trained on 18 months of data has never seen a pandemic-era supply chain disruption, a regulatory change, or a new category of vendor fraud. If it encounters something outside its training distribution and acts autonomously, the errors compound before anyone notices.

The answer is graduated autonomy: the agent earns the right to act independently by demonstrating consistent accuracy on low-stakes decisions before it is trusted with high-stakes ones.

## The Autonomy Ladder

Define five levels of autonomy, each with progressively greater independent authority:

```
Level 0 — Flag Only
  Agent: Identifies discrepancies and generates a risk score.
  Human: Reviews every flagged invoice. Makes all decisions.
  When: Initial deployment. No outcome data yet.

Level 1 — Recommend
  Agent: Flags discrepancies AND drafts recommended actions with reasoning.
  Human: Approves or rejects the recommendation for every flagged invoice.
  When: After 4-8 weeks of shadow operation. Agent accuracy baseline established.

Level 2 — Act with Approval
  Agent: Drafts the dispute message and queues it for one-click approval.
  Human: Approves (1 click) or modifies before sending. All messages reviewed.
  When: Recall ≥ 85%, precision ≥ 30%, min 200 feedback records.

Level 3 — Act and Notify
  Agent: Sends dispute communications autonomously within defined guardrails.
         Notifies humans of actions taken; humans can reverse within 24 hours.
  Human: Reviews the daily action summary. Intervenes only when needed.
  When: Recall ≥ 90%, precision ≥ 40%, agent accuracy ≥ 92% over 90 days.

Level 4 — Fully Autonomous Within Bounds
  Agent: Handles the full dispute lifecycle — detection, communication, resolution
         tracking, and closure — for invoices within defined boundaries.
  Human: Reviews dashboards and exception reports. Involved only for escalations.
  When: Recall ≥ 93%, precision ≥ 45%, accuracy ≥ 95% over 180 days,
        executive governance approval.
```

Most organizations reach Level 3 within 6-12 months of deployment. Level 4 requires sustained excellent performance and organizational confidence built over time.

## Promotion Criteria

Promotion between levels is not automatic. It requires evidence and approval.

### Quantitative Criteria

```python
@dataclass
class AutonomyPromotionCriteria:
    target_level: int
    min_feedback_records: int     # Minimum sample size before evaluation
    min_recall: float             # Agent catches at least this % of true disputes
    min_precision: float          # At least this % of agent flags are real disputes
    min_auto_approve_accuracy: float  # Of invoices auto-approved, this % had no issue
    min_accuracy: float           # Overall correctness on reviewed decisions
    evaluation_window_days: int   # Performance must hold over this window

LEVEL_CRITERIA = {
    1: AutonomyPromotionCriteria(
        target_level=1, min_feedback_records=100,
        min_recall=0.80, min_precision=0.25,
        min_auto_approve_accuracy=0.99, min_accuracy=0.80,
        evaluation_window_days=30
    ),
    2: AutonomyPromotionCriteria(
        target_level=2, min_feedback_records=200,
        min_recall=0.85, min_precision=0.30,
        min_auto_approve_accuracy=0.992, min_accuracy=0.85,
        evaluation_window_days=45
    ),
    3: AutonomyPromotionCriteria(
        target_level=3, min_feedback_records=500,
        min_recall=0.90, min_precision=0.40,
        min_auto_approve_accuracy=0.995, min_accuracy=0.92,
        evaluation_window_days=90
    ),
    4: AutonomyPromotionCriteria(
        target_level=4, min_feedback_records=1000,
        min_recall=0.93, min_precision=0.45,
        min_auto_approve_accuracy=0.997, min_accuracy=0.95,
        evaluation_window_days=180
    )
}

def evaluate_promotion_readiness(current_level, performance_metrics):
    criteria = LEVEL_CRITERIA[current_level + 1]
    checks = {
        "sample_size": performance_metrics["feedback_count"] >= criteria.min_feedback_records,
        "recall": performance_metrics["recall"] >= criteria.min_recall,
        "precision": performance_metrics["precision"] >= criteria.min_precision,
        "auto_approve_accuracy": performance_metrics["auto_approve_accuracy"] >= criteria.min_auto_approve_accuracy,
        "accuracy": performance_metrics["accuracy"] >= criteria.min_accuracy,
        "window": performance_metrics["days_evaluated"] >= criteria.evaluation_window_days
    }
    return {
        "eligible": all(checks.values()),
        "checks": checks,
        "shortfalls": {k: v for k, v in checks.items() if not v}
    }
```

### Dollar-Value Guardrails by Level

Even at high autonomy levels, the agent should operate within dollar-value ceilings. A Level 3 agent that autonomously disputes every invoice could create serious supplier relationship damage if it misfires on a $500,000 invoice.

```yaml
autonomy_guardrails:
  level_1:
    max_auto_dispute_value: 0       # Recommends only; no auto-disputes
    required_human_review: all

  level_2:
    max_auto_dispute_value: 0       # Still requires approval; queue with 1-click
    batch_approval_max_value: 2000  # Manager can batch-approve below this amount

  level_3:
    max_auto_dispute_value: 10000   # Can send disputes autonomously below $10K
    notify_after_action: true       # Always notify humans of autonomous actions
    high_value_threshold: 25000     # Disputes above $25K always require approval

  level_4:
    max_auto_dispute_value: 50000
    max_auto_resolution_value: 25000  # Can process credit notes below this
    executive_approval_threshold: 100000  # CFO approval above $100K
    strategic_vendor_handling: "always_escalate"  # Tier 1 vendors: always human-reviewed
```

## Monitoring for Degradation

The agent's performance is not static. New vendors arrive with unfamiliar invoice patterns. Procurement renegotiates contracts. Tax rules change. If nothing watches for degradation, you will not know the agent is failing until a significant error surfaces.

### Performance Control Charts

Statistical process control (SPC) charts detect shifts in performance metrics over time. Use them to distinguish normal variation from genuine degradation.

```python
def compute_control_chart(metric_name, recent_values, baseline_period=90):
    """
    Compute control limits for a performance metric.
    Uses the baseline period to establish the expected range.
    Signals a degradation if recent values fall outside the control limits.
    """
    baseline = recent_values[:baseline_period]
    mean = statistics.mean(baseline)
    std = statistics.stdev(baseline)

    ucl = mean + 3 * std   # Upper control limit
    lcl = max(mean - 3 * std, 0)  # Lower control limit (floored at 0 for rates)

    recent = recent_values[baseline_period:]
    violations = [
        {"day": i, "value": v, "type": "above_ucl" if v > ucl else "below_lcl"}
        for i, v in enumerate(recent)
        if v > ucl or v < lcl
    ]

    # Western Electric rules: signal if 2 of 3 consecutive points are beyond 2σ
    two_sigma = 2 * std
    consecutive_violations = 0
    for i in range(len(recent) - 2):
        window = recent[i:i+3]
        beyond_2sigma = sum(1 for v in window if abs(v - mean) > two_sigma)
        if beyond_2sigma >= 2:
            consecutive_violations += 1

    return {
        "metric": metric_name,
        "mean": mean, "std": std,
        "ucl": ucl, "lcl": lcl,
        "point_violations": violations,
        "consecutive_violations": consecutive_violations,
        "signal_degradation": len(violations) > 0 or consecutive_violations > 0
    }
```

**Example:** If the agent's recall has averaged 91.2% (±1.8%) for 90 days, the lower control limit is 91.2% - (3 × 1.8%) = 85.8%. If recall drops to 84% on a given day, the control chart fires an alert.

### Automated Degradation Checks

```python
def run_daily_degradation_check():
    agent = get_current_agent()
    metrics = compute_rolling_metrics(window_days=7)

    alerts = []

    # Check each key metric against its control chart
    for metric in ["recall", "precision", "auto_approve_accuracy", "false_positive_rate"]:
        chart = agent.control_charts[metric]
        current_value = metrics[metric]

        if chart.signal_degradation:
            alerts.append({
                "type": "performance_degradation",
                "metric": metric,
                "current_value": current_value,
                "expected_range": (chart.lcl, chart.ucl),
                "severity": "high" if current_value < chart.lcl * 0.95 else "medium"
            })

    # Check for distribution shift in incoming invoices
    current_distribution = compute_invoice_distribution(window_days=7)
    if distribution_shift_detected(current_distribution, agent.training_distribution):
        alerts.append({
            "type": "distribution_shift",
            "details": "Invoice patterns diverging from training data",
            "severity": "medium"
        })

    if alerts:
        trigger_degradation_response(agent, alerts)

    return alerts

def trigger_degradation_response(agent, alerts):
    high_severity = [a for a in alerts if a["severity"] == "high"]

    if high_severity:
        # Auto-trigger autonomy rollback
        rollback_autonomy_level(agent, steps=1, reason="Automated degradation detection")

    # Always notify the AP manager and engineering team
    send_degradation_alert(alerts)
```

### Rollback Triggers

Define explicit triggers for each rollback severity:

```yaml
rollback_triggers:
  immediate_rollback_to_level_0:
    condition: "auto_approve_accuracy < 0.98 for any 3-day window"
    action: "Stop all autonomous actions. Route everything to human review."
    rationale: "Agent is approving invoices that should be disputed at unacceptable rate"

  rollback_one_level:
    condition: "recall < (baseline - 2*std) for 5 consecutive days"
    action: "Reduce autonomy by one level. Increase human oversight."
    rationale: "Agent is missing true disputes at above-normal rate"

  pause_and_review:
    condition: "false_positive_rate > (baseline + 2*std) for 3 consecutive days"
    action: "Pause autonomous actions above $5K. Alert team for review."
    rationale: "Agent is over-flagging — creating operational burden"

  new_vendor_pause:
    condition: "New vendor onboarded with no training data"
    action: "Hold new vendor at Level 1 autonomy for 60 days regardless of overall level"
    rationale: "Agent has no behavioral baseline for new vendors"
```

## Governance: Who Approves Autonomy Expansion

Autonomy expansion is a governance decision, not a technical one. The agent may be ready from a metrics perspective, but the organization must also be ready.

### Approval Authority by Level

```
Level 0 → Level 1:    AP Manager approval
Level 1 → Level 2:    AP Manager + Finance Controller approval
Level 2 → Level 3:    AP Director + CFO approval
Level 3 → Level 4:    CFO + Chief Risk Officer + Board notification
```

For Levels 3 and 4, promotion is not just an internal AP decision. The CFO is taking on organizational risk that an autonomous agent might send an incorrect dispute to a key supplier. That risk must be explicitly accepted.

### The Governance Pack

When requesting an autonomy promotion, the AP team should prepare a governance pack:

```
Autonomy Promotion Request — Level 2 → Level 3
================================================
Date: April 7, 2025
Requested by: Sarah Chen, AP Director
Requesting promotion for: Invoice Dispute Agent v2.4

PERFORMANCE EVIDENCE
  Evaluation period: Jan 1, 2025 – Apr 1, 2025 (90 days)
  Invoices processed: 28,400
  Feedback records: 612 (all high-quality signal)

  Recall: 91.8%          (required: 90%)  ✓
  Precision: 43.2%       (required: 40%)  ✓
  Auto-approve accuracy: 99.6%  (required: 99.5%)  ✓
  Overall accuracy: 92.9% (required: 92%)  ✓

NOTABLE INCIDENTS IN EVALUATION PERIOD
  1. Feb 14: False positive on Acme Industrial (contract amendment lag).
     Root cause identified. Rule v2.4 mitigates. No recurrence.
  2. Mar 3: Missed duplicate on GlobalParts (same amount, 32-day gap).
     Detection window extended to 45 days in rule v2.5.

PROPOSED GUARDRAILS AT LEVEL 3
  - Max autonomous dispute value: $10,000
  - Tier 1 strategic vendors: always require approval
  - All autonomous actions notify AP Manager within 1 hour
  - 24-hour reversal window on all autonomous disputes

ROLLBACK PLAN
  Automated: if auto-approve accuracy < 99.5% over any 3-day window
  Manual: AP Manager can trigger rollback at any time via dashboard

SIGN-OFF REQUIRED
  [ ] Sarah Chen, AP Director
  [ ] Michael Torres, CFO
```

### Documentation Requirements

Every autonomy level change must be documented and retained. This documentation serves two purposes: it creates accountability, and it is required evidence if a dispute is ever challenged in an audit.

```python
def record_autonomy_change(from_level, to_level, reason, approvers):
    audit_log.record({
        "event": "autonomy_level_change",
        "from_level": from_level,
        "to_level": to_level,
        "change_type": "promotion" if to_level > from_level else "rollback",
        "reason": reason,
        "approvers": approvers,
        "effective_date": now(),
        "performance_evidence_snapshot": get_current_metrics(),
        "guardrails_in_effect": get_current_guardrails()
    })
```

## The Long-Term Trajectory

A well-managed autonomy expansion follows a predictable trajectory:

```
Month 1-2:   Level 0 → Level 1. Agent flags, humans act. Baseline measured.
Month 3-4:   Level 1 → Level 2. Agent recommends, 1-click approval.
Month 6-8:   Level 2 → Level 3. Agent acts autonomously on low-value disputes.
Month 12-18: Level 3 → Level 4 (optional). Full autonomy within bounds.
```

Not every organization will reach Level 4, and that is fine. The goal is not maximum autonomy — it is optimal autonomy for your risk appetite, your vendor relationships, and your AP team's capacity. An agent operating at Level 3 that handles 70% of disputes autonomously while routing the complex 30% to humans is an extremely good outcome.

The autonomy ladder ensures that expansion is earned through demonstrated performance, governed through documented approvals, and reversible at any time when the evidence warrants it.

---

**Up next:** Lesson 5.4 covers how to measure the ROI and operational impact of the dispute resolution agent — quantifying the business case for continued investment.
