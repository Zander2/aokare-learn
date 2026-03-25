# Capturing Human Decisions as Training Signal
## Module 5: Human-in-the-Loop Learning and Continuous Improvement | Lesson 1

**Learning Objectives:**
- Design data capture mechanisms that record every human override, approval, and rejection
- Structure feedback data so it links the agent's recommendation, the human decision, and the eventual outcome
- Identify which human decisions represent high-quality signal vs. noise
- Implement feedback storage that supports both real-time learning and batch retraining

---

## Why Human Decisions Are Your Most Valuable Data

The agent starts with rules and statistical baselines. Both are blunt instruments. Rules have fixed tolerances that cannot reflect every contract nuance. Anomaly scores flag statistical outliers but do not know whether an outlier is genuinely problematic or just an unusual-but-legitimate invoice.

The AP manager who approves or rejects the agent's recommendation knows the context. They know that TechSupply always rounds their prices up on the first invoice of the quarter. They know that a $50,000 invoice from a new vendor is expected because procurement just signed that contract last week. That institutional knowledge is embedded in their decisions — and it can be extracted.

Every time a human overrides the agent, modifies its recommendation, or confirms it was right, that interaction is a labeled training example. A system that captures these interactions systematically becomes smarter with every decision. One that ignores them stays exactly as accurate as it was on day one.

## Feedback Taxonomy

Not all human decisions carry the same information. Define a clear taxonomy before building the capture layer.

```python
class FeedbackAction:
    APPROVE_AS_IS = "approve_as_is"
    # Manager agrees with the agent's recommendation exactly.
    # Signal: agent was correct.

    MODIFY_AND_APPROVE = "modify_and_approve"
    # Manager changes something before approving: adjusts the dispute amount,
    # edits the message, or changes the resolution type.
    # Signal: agent was directionally right but missed a detail.

    REJECT = "reject"
    # Manager overrides the agent completely, choosing a different action.
    # Signal: agent was wrong. The rejection reason is the most valuable part.

    ESCALATE_FURTHER = "escalate_further"
    # Manager determines this dispute exceeds their authority or requires
    # specialist input (legal, tax, procurement).
    # Signal: dispute complexity is higher than the agent assessed.

    DISMISS = "dismiss"
    # Manager confirms there is no real issue; the agent raised a false alarm.
    # Signal: agent over-flagged this pattern.
```

Each action category tells you something different about the agent's performance and what needs to change.

## The Feedback Data Schema

The schema must link four things: what the agent saw, what the agent recommended, what the human decided, and what eventually happened.

```python
@dataclass
class FeedbackRecord:
    # Identifiers
    feedback_id: str           # UUID
    invoice_id: str
    dispute_id: str            # Null if no dispute was raised
    created_at: datetime

    # What the agent saw (input features at decision time)
    agent_input: dict          # Snapshot of the signal vector
    risk_score: float          # Composite risk score at decision time
    rule_flags: list[str]      # Which rules fired, with severity
    anomaly_signals: dict      # Anomaly scores by type

    # What the agent recommended
    agent_action: str          # "dispute", "auto_resolve", "escalate", "approve"
    agent_confidence: float    # Confidence level (0.0 to 1.0)
    agent_reasoning: str       # Summary of why the agent recommended this action
    agent_message_draft: str   # The message the agent drafted (if applicable)

    # What the human decided
    human_action: FeedbackAction
    human_actor_id: str        # Which user made the decision
    human_actor_role: str      # "ap_clerk", "ap_manager", "controller"
    human_decision_time: datetime
    time_to_decide_seconds: int  # How long the human took to decide
    human_modifications: dict  # If MODIFY_AND_APPROVE: what changed
    human_rejection_reason: str  # If REJECT: free-text reason (critical)

    # What eventually happened (filled in later)
    final_outcome: str         # "credit_note_received", "paid_as_is", "written_off", "pending"
    outcome_amount: float      # Actual amount recovered/written off
    outcome_recorded_at: datetime
    was_agent_correct: bool    # Derived field: did the human's decision match the agent's recommendation?
```

This schema is dense by design. The `agent_input` snapshot is particularly important — it freezes the feature values at decision time so that future retraining uses the same inputs the agent actually saw, not retroactively recalculated ones.

## Identifying High-Quality Signal vs. Noise

Not every feedback record is equally useful for training. Some human decisions reflect genuine disagreement with the agent's logic. Others are noise.

### High-Quality Signal

**Experienced AP managers acting in their area of expertise.** An AP manager with five years of experience at your company who rejects the agent's pricing dispute recommendation and explains why ("the contract was amended verbally and procurement hasn't uploaded the new version yet") is gold.

**Decisions made after careful review.** The `time_to_decide_seconds` field helps here. A manager who spent 4 minutes reviewing the dispute evidence before rejecting is more likely to be right than one who clicked "Dismiss" in 8 seconds.

**Rejections with detailed reasons.** A rejection with a free-text explanation that mentions a specific contract clause, a known vendor behavior, or a business context the agent didn't have is precisely the information you need to improve the agent.

**Consistent overrides across multiple reviewers.** If three different AP managers all dismiss the same type of flag, the rule is probably too sensitive.

### Low-Quality Signal (Treat with Caution)

**Rushed approvals.** If the manager approved 40 recommendations in 15 minutes, they were not reviewing — they were rubber-stamping. These approvals do not confirm the agent was right; they just confirm the human was busy.

**Overrides from users with limited authority.** An AP clerk approving something outside their scope (because the manager was on vacation) is not a reliable signal about the agent's accuracy.

**Inconsistent decisions on similar invoices.** If the same manager approves the agent's recommendation on Monday and rejects the same recommendation on Tuesday for the same vendor with the same discrepancy, something external is driving the decision — a phone call with the supplier, a business priority shift. This is noise for training.

```python
def compute_signal_quality(feedback_record):
    score = 1.0

    # Penalize fast decisions
    if feedback_record.time_to_decide_seconds < 30:
        score *= 0.5

    # Reward experienced reviewers
    if feedback_record.human_actor_role == "ap_manager":
        score *= 1.2
    elif feedback_record.human_actor_role == "ap_clerk":
        score *= 0.7

    # Reward rejections with explanations
    if feedback_record.human_action == FeedbackAction.REJECT:
        if len(feedback_record.human_rejection_reason) > 50:
            score *= 1.5  # Detailed reason
        else:
            score *= 0.8  # Vague rejection — harder to learn from

    # Penalize authority mismatches
    if feedback_record.decision_outside_authority:
        score *= 0.3

    return min(score, 2.0)  # Cap at 2.0 to prevent outlier records from dominating
```

## Connecting Decisions to Outcomes

A human's decision tells you what they thought was right. The eventual outcome tells you whether they were right. Both pieces of information are needed.

If a manager rejects the agent's recommendation to dispute a $12,000 pricing discrepancy and instructs the team to pay the invoice as-is, then the supplier issues a credit note 30 days later, two things are true: the manager was wrong, and the agent was right. That outcome should reinforce the agent's original signal.

```python
def link_outcome_to_feedback(dispute_id, outcome):
    """Called when a dispute is closed."""
    feedback = get_feedback_record(dispute_id=dispute_id)
    if not feedback:
        return

    feedback.final_outcome = outcome.type
    feedback.outcome_amount = outcome.amount
    feedback.outcome_recorded_at = now()

    # Determine correctness
    agent_was_right = evaluate_agent_correctness(
        agent_action=feedback.agent_action,
        human_action=feedback.human_action,
        final_outcome=feedback.final_outcome
    )
    feedback.was_agent_correct = agent_was_right

    save(feedback)

def evaluate_agent_correctness(agent_action, human_action, final_outcome):
    # Agent recommended dispute; human approved; credit note received → correct
    if agent_action == "dispute" and final_outcome == "credit_note_received":
        return True

    # Agent recommended dispute; human dismissed; invoice paid as-is → agent was right, human was wrong
    if agent_action == "dispute" and human_action == FeedbackAction.DISMISS and final_outcome == "paid_as_is":
        return True  # Agent was right to flag it (even if overridden)

    # Agent auto-approved; no dispute arose → correct
    if agent_action == "approve" and final_outcome == "paid_as_is":
        return True

    # Agent auto-approved; dispute arose later (supplier-initiated or audit-found) → incorrect
    if agent_action == "approve" and final_outcome in ["credit_note_received", "written_off"]:
        return False

    return None  # Ambiguous — exclude from training
```

## Storage Design

Feedback data serves two different consumers with different latency requirements.

### Real-Time Event Log

Every feedback action is written immediately to an append-only event log. This log is the source of truth.

```python
def record_feedback(feedback_record):
    # Write to immutable event log
    event_log.append({
        "event_type": "feedback_recorded",
        "payload": asdict(feedback_record),
        "written_at": now()
    })

    # Trigger real-time threshold check
    check_threshold_adjustment(
        rule_id=extract_rule_id(feedback_record),
        feedback=feedback_record
    )
```

### Feature Store for Batch Retraining

For periodic model retraining (weekly or monthly), the raw event log is too unstructured. Transform it into a labeled dataset in a feature store:

```python
def build_training_dataset(start_date, end_date, min_quality_score=0.6):
    """Extract a labeled training set from the feedback event log."""
    records = event_log.query(
        event_type="feedback_recorded",
        date_range=(start_date, end_date)
    )

    training_examples = []
    for record in records:
        quality_score = compute_signal_quality(record)
        if quality_score < min_quality_score:
            continue  # Exclude low-quality signal

        if record.was_agent_correct is None:
            continue  # Outcome not yet known or ambiguous

        training_examples.append({
            "features": record.agent_input,
            "label": 1 if record.was_agent_correct else 0,
            "sample_weight": quality_score,
            "feedback_id": record.feedback_id
        })

    return training_examples
```

The `sample_weight` field carries the quality score into the model training loop. High-quality feedback records (experienced managers, deliberate decisions, clear outcomes) influence the model more than low-quality ones.

### Privacy and Access Control

Feedback records contain sensitive data: the specific decisions individual employees made, their decision speeds, and potentially their rationale text. Protect this data:

```yaml
access_control:
  feedback_raw_records:
    read: ["ap_manager", "data_engineer", "compliance_officer"]
    write: ["system"]
    note: "Individual records reveal employee behavior — restrict access"

  aggregated_feedback_metrics:
    read: ["ap_manager", "executive", "data_engineer"]
    note: "Aggregated metrics are safe to share broadly"

  training_datasets:
    read: ["ml_engineer", "data_engineer"]
    write: ["system"]
    note: "Must be anonymized before sharing outside the organization"

data_retention:
  raw_feedback: 7 years  # SOX compliance requirement
  training_datasets: 3 years
  anonymized_aggregates: indefinite
```

## The Compounding Effect

The value of the feedback loop compounds over time. In month 1, you have 200 feedback records — enough to spot a few obvious threshold miscalibrations. In month 6, you have 5,000+ records with outcome data — enough to retrain the anomaly model meaningfully. In month 18, you have data across seasonal cycles, multiple vendor cohorts, and business condition changes — enough to build a genuinely robust system.

An organization that captures feedback diligently for two years will have an agent that performs dramatically better than one that was never updated. The capture infrastructure you build now is the foundation for everything in the rest of this module.

---

**Up next:** Lesson 5.2 covers how to act on this feedback data — adjusting rule thresholds, retraining models, and safely deploying updates to production.
