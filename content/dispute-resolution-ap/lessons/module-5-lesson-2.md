# Updating Rules and Models from Feedback
## Module 5: Human-in-the-Loop Learning and Continuous Improvement | Lesson 2

**Learning Objectives:**
- Implement rule threshold adjustments based on accumulated override patterns
- Retrain anomaly detection models using labeled dispute outcomes
- Design A/B testing frameworks that compare updated logic against the current production version
- Implement safe rollout strategies (shadow mode, canary deployment) for model updates

---

## The Update Problem

Your feedback pipeline is running. Human decisions are being captured. Outcome data is flowing in. Now what?

The instinct is to update the agent immediately: if managers keep dismissing a particular rule flag, lower the threshold. The problem with immediate updates is that one week of feedback is noisy. A vendor had a legitimate price change. An AP manager was unusually lenient because of a supplier relationship issue. A batch of invoices all hit the same edge case. Acting on short-term patterns produces an agent that oscillates — tightening and loosening thresholds every week based on recent noise.

The correct approach is batched, validated, and deployed with guardrails. You update the agent on a schedule (weekly for rules, monthly for models), you validate that the update improves performance, and you deploy incrementally so that errors affect a small volume before they reach full scale.

## Rule Threshold Adjustment

Rules are the fastest layer to update. They have explicit thresholds: a pricing tolerance of 0.5%, a duplicate detection window of 30 days, a quantity variance ceiling of 2%. When human feedback consistently says those thresholds are wrong, adjust them.

### Detecting Adjustment-Worthy Patterns

```python
def identify_threshold_candidates(feedback_records, min_samples=20, override_rate_threshold=0.30):
    """
    Find rules where managers are consistently overriding the agent.
    A rule is a threshold candidate if:
      - At least min_samples feedback records reference it
      - Managers dismissed or rejected the flag more than override_rate_threshold of the time
    """
    rule_stats = defaultdict(lambda: {"total": 0, "overridden": 0, "approved": 0})

    for record in feedback_records:
        for rule_id in record.rule_flags:
            rule_stats[rule_id]["total"] += 1
            if record.human_action in [FeedbackAction.DISMISS, FeedbackAction.REJECT]:
                rule_stats[rule_id]["overridden"] += 1
            elif record.human_action in [FeedbackAction.APPROVE_AS_IS, FeedbackAction.MODIFY_AND_APPROVE]:
                rule_stats[rule_id]["approved"] += 1

    candidates = []
    for rule_id, stats in rule_stats.items():
        if stats["total"] < min_samples:
            continue

        override_rate = stats["overridden"] / stats["total"]
        if override_rate > override_rate_threshold:
            candidates.append({
                "rule_id": rule_id,
                "override_rate": override_rate,
                "sample_size": stats["total"],
                "direction": "loosen"  # Managers think this rule is too strict
            })

        # Also check for missed disputes: rule didn't fire but a dispute arose
        # (This requires a separate query against the outcome data)

    return candidates
```

### Threshold Adjustment Logic

When you identify a rule that needs loosening, calculate the new threshold from the distribution of dismissed invoices:

```python
def calculate_new_threshold(rule_id, dismissed_records, percentile_target=90):
    """
    For invoices where the rule fired but the manager dismissed the flag,
    look at the actual variance values. The new threshold should be above
    the 90th percentile of dismissed variances — so that 90% of future
    dismissed-pattern invoices don't trigger the rule.
    """
    variances = []
    for record in dismissed_records:
        if rule_id in record.rule_flags:
            variances.append(record.rule_variance_values[rule_id])

    if len(variances) < 10:
        return None  # Not enough data to calculate reliably

    new_threshold = percentile(variances, percentile_target)
    current_threshold = get_rule_threshold(rule_id)

    # Safety constraint: never loosen by more than 2x the current threshold
    max_allowed = current_threshold * 2.0
    proposed_threshold = min(new_threshold, max_allowed)

    return {
        "rule_id": rule_id,
        "current_threshold": current_threshold,
        "proposed_threshold": proposed_threshold,
        "change_pct": (proposed_threshold - current_threshold) / current_threshold * 100,
        "based_on_samples": len(variances),
        "approval_required": proposed_threshold > current_threshold * 1.5  # Flag large changes for human review
    }
```

### Rule Versioning

Every threshold change must be versioned. When you audit a decision made three months ago, you need to know which rule version was active at that time.

```yaml
# rules/PRICE_CHECK_001/v2.4.yaml
rule_id: PRICE_CHECK_001
version: "2.4"
effective_date: "2025-04-07"
previous_version: "2.3"

parameters:
  tolerance_pct: 0.8      # Loosened from 0.5% in v2.3
  high_value_threshold: 10000  # Apply stricter tolerance above this
  high_value_tolerance_pct: 0.3

change_reason: "Manager override rate was 38% over 6 weeks (n=84). Dismissed invoices had variances between 0.5% and 0.78%. New threshold set at 90th percentile of dismissed variances."
approved_by: "Sarah Chen, AP Director"
approved_at: "2025-04-06T14:22:00Z"
```

## Model Retraining Pipeline

Rules are updated frequently with small adjustments. Anomaly detection models are retrained less frequently but with a full pipeline.

### Retraining Cadence

- **Weekly rule threshold review:** Automated check on override rates; flags candidates for human approval
- **Monthly model retrain:** Full retraining of the anomaly detection models using the prior month's labeled feedback
- **Quarterly full audit:** Review all rule changes made in the quarter; compare model performance before and after retraining cycles

### The Retraining Pipeline

```python
def run_retraining_pipeline(cutoff_date):
    """Full pipeline: extract data → engineer features → train → validate → prepare for deployment."""

    # Step 1: Extract labeled training data
    training_data = build_training_dataset(
        start_date=cutoff_date - timedelta(days=365),  # 12 months of history
        end_date=cutoff_date,
        min_quality_score=0.6
    )
    print(f"Training samples: {len(training_data)}")

    # Step 2: Feature engineering
    X = [example["features"] for example in training_data]
    y = [example["label"] for example in training_data]
    weights = [example["sample_weight"] for example in training_data]

    # Apply same feature normalization as production
    scaler = load_production_scaler()
    X_scaled = scaler.transform(X)

    # Step 3: Train the new model
    from sklearn.ensemble import GradientBoostingClassifier
    new_model = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8
    )
    new_model.fit(X_scaled, y, sample_weight=weights)

    # Step 4: Validate against holdout set
    holdout_data = build_training_dataset(
        start_date=cutoff_date - timedelta(days=30),
        end_date=cutoff_date,
        min_quality_score=0.7
    )
    metrics = evaluate_model(new_model, holdout_data)

    # Step 5: Compare against current production model
    prod_model = load_production_model()
    prod_metrics = evaluate_model(prod_model, holdout_data)

    improvement = {
        "f1_delta": metrics["f1"] - prod_metrics["f1"],
        "recall_delta": metrics["recall"] - prod_metrics["recall"],
        "precision_delta": metrics["precision"] - prod_metrics["precision"]
    }

    return {
        "new_model": new_model,
        "metrics": metrics,
        "production_metrics": prod_metrics,
        "improvement": improvement,
        "ready_for_deployment": (
            metrics["recall"] >= 0.88 and
            metrics["precision"] >= 0.30 and
            improvement["f1_delta"] >= -0.02  # New model is not significantly worse
        )
    }
```

The key guard in the pipeline is the `ready_for_deployment` check. A retrained model is not automatically better. If the new training data happened to include a disproportionate number of unusual invoices from one vendor, the model might overfit to that vendor's patterns and perform worse everywhere else.

## A/B Testing: Validating Logic Changes

A/B testing lets you compare the updated logic against the current production version on live invoice traffic, without putting the whole operation at risk.

### A/B Test Setup

```python
class ABTestConfig:
    test_id: str
    description: str
    control: str       # Current production model version
    treatment: str     # New model/rule version being tested
    traffic_split: float = 0.10  # 10% of invoices go to treatment
    minimum_sample: int = 500    # Minimum invoices before evaluating results
    primary_metric: str = "dispute_accuracy"  # What we're optimizing for
    guardrail_metrics: list = ["false_negative_rate", "auto_approve_accuracy"]
    # Guardrail metrics must not degrade — they stop the test if violated

def assign_invoice_to_variant(invoice_id, test_config):
    """Deterministic assignment: same invoice always goes to the same variant."""
    hash_value = hash(invoice_id + test_config.test_id) % 100
    if hash_value < test_config.traffic_split * 100:
        return "treatment"
    return "control"
```

### Evaluating A/B Test Results

```python
def evaluate_ab_test(test_id, min_days=14):
    test = get_ab_test(test_id)
    control_outcomes = get_outcomes(test_id=test_id, variant="control")
    treatment_outcomes = get_outcomes(test_id=test_id, variant="treatment")

    # Ensure minimum sample sizes
    if len(control_outcomes) < test.minimum_sample or len(treatment_outcomes) < test.minimum_sample / 10:
        return {"status": "insufficient_data", "control_n": len(control_outcomes),
                "treatment_n": len(treatment_outcomes)}

    # Calculate metrics for both variants
    control_metrics = calculate_dispute_metrics(control_outcomes)
    treatment_metrics = calculate_dispute_metrics(treatment_outcomes)

    # Statistical significance check
    p_value = chi_square_test(
        control_disputes=control_metrics["true_disputes"],
        control_total=len(control_outcomes),
        treatment_disputes=treatment_metrics["true_disputes"],
        treatment_total=len(treatment_outcomes)
    )

    # Check guardrail metrics
    guardrail_violations = []
    for metric in test.guardrail_metrics:
        if treatment_metrics[metric] > control_metrics[metric] * 1.10:  # 10% degradation threshold
            guardrail_violations.append({
                "metric": metric,
                "control": control_metrics[metric],
                "treatment": treatment_metrics[metric]
            })

    return {
        "test_id": test_id,
        "control_metrics": control_metrics,
        "treatment_metrics": treatment_metrics,
        "p_value": p_value,
        "statistically_significant": p_value < 0.05,
        "guardrail_violations": guardrail_violations,
        "recommendation": "promote" if (
            p_value < 0.05 and
            treatment_metrics["dispute_accuracy"] > control_metrics["dispute_accuracy"] and
            len(guardrail_violations) == 0
        ) else "do_not_promote"
    }
```

**Example A/B test result:**

```
A/B Test: PRICE_MODEL_v2.4 vs v2.3
════════════════════════════════════════
Invoices: Control=4,820 | Treatment=512
Duration: 21 days

Metric                  Control (v2.3)  Treatment (v2.4)  Delta
──────────────────────────────────────────────────────────────
Dispute accuracy            87.3%           89.1%         +1.8%
False positive rate         14.2%           11.8%         -2.4%
False negative rate          6.1%            6.4%         +0.3%
Auto-approve accuracy       99.4%           99.6%         +0.2%

Statistical significance:   p = 0.031  ✓ Significant
Guardrail violations:        None
Recommendation:              PROMOTE to production
```

## Safe Rollout Strategies

Once a model or rule update passes A/B testing, you still do not flip it to 100% of traffic immediately.

### Shadow Mode

Shadow mode runs the new logic in parallel with production but without taking action. Both the old and new logic evaluate every invoice. Only the old logic's decision is executed. The new logic's decision is logged.

Use shadow mode for brand-new models or major logic changes — before A/B testing, not as a replacement for it.

```python
def evaluate_in_shadow(invoice, new_model, old_model):
    old_decision = old_model.evaluate(invoice)
    new_decision = new_model.evaluate(invoice)

    # Log the comparison but only execute the old decision
    log_shadow_comparison({
        "invoice_id": invoice.id,
        "old_recommendation": old_decision,
        "new_recommendation": new_decision,
        "agree": old_decision.action == new_decision.action,
        "timestamp": now()
    })

    return old_decision  # Only this gets executed
```

Shadow mode is especially useful for understanding disagreement patterns before risking production impact. If the new model disagrees with the old model 40% of the time, you need to understand why before you give it any live authority.

### Canary Deployment

A canary deployment routes a small fixed percentage (typically 1-5%) of live traffic to the new version. Unlike A/B testing, canary deployment is not an experiment — it is a phased rollout. The goal is not to compare performance but to detect regressions before they affect the full operation.

```yaml
canary_deployment:
  model_version: "price_anomaly_v2.4"
  traffic_percentage: 5
  ramp_schedule:
    - day: 0
      percentage: 5
    - day: 3
      percentage: 20
      gate: "error_rate < 0.02 AND accuracy_delta > -0.01"
    - day: 7
      percentage: 50
      gate: "error_rate < 0.02 AND accuracy_delta > -0.01"
    - day: 14
      percentage: 100
      gate: "error_rate < 0.02 AND accuracy_delta > -0.01"

rollback_triggers:
  - condition: "auto_approve_accuracy < 0.990"
    action: "immediate_rollback"
  - condition: "false_negative_rate > prior_version * 1.15"
    action: "pause_and_alert"
```

Each gate in the ramp schedule is a go/no-go checkpoint. If the canary hits the Day 3 checkpoint with an error rate of 3%, it does not advance to 20% — an alert fires and a human reviews before any further expansion.

### Rollback Procedures

Every deployment must have a rollback path defined before it goes live.

```python
def rollback_deployment(model_version, reason):
    # 1. Stop routing traffic to the new version
    update_routing(model_version=model_version, traffic_pct=0)

    # 2. Restore previous version routing to 100%
    previous_version = get_previous_stable_version()
    update_routing(model_version=previous_version, traffic_pct=100)

    # 3. Log the rollback
    audit_log.record({
        "event": "model_rollback",
        "rolled_back_version": model_version,
        "restored_version": previous_version,
        "reason": reason,
        "initiated_by": "system" if automated else current_user(),
        "timestamp": now()
    })

    # 4. Alert the engineering and AP operations teams
    send_rollback_alert(
        subject=f"Model {model_version} rolled back",
        body=f"Reason: {reason}. Restored to {previous_version}. Review required before re-deploying."
    )
```

The key design principle: rollback should be faster than the original deployment. You should be able to restore the previous version in under 5 minutes, ideally with a single command or button click.

## Putting It Together: The Update Cycle

The complete update cycle looks like this:

```
Weekly:
  1. Run identify_threshold_candidates() on last week's feedback
  2. Flag candidates for AP manager review
  3. Approved changes → update rule YAML, bump version, redeploy rules layer

Monthly:
  1. Run retraining pipeline on last 12 months of labeled feedback
  2. If ready_for_deployment: launch A/B test (10% treatment traffic)
  3. After minimum sample: evaluate A/B test
  4. If recommendation == "promote": start canary deployment
  5. Monitor canary gates; ramp up over 14 days if all gates pass

Quarterly:
  1. Full audit of all rule and model changes
  2. Review signal quality distribution — is feedback quality improving?
  3. Review A/B test history — what percentage of updates improved performance?
  4. Update autonomy thresholds if performance metrics warrant it (see Lesson 5.3)
```

This structured cadence prevents the agent from being over-updated based on noise while ensuring it continuously learns from the data accumulating in the feedback pipeline.

---

**Up next:** Lesson 5.3 covers how to expand the agent's autonomy over time — moving from recommendations to auto-resolution within defined boundaries, with the governance structures that make it safe.
