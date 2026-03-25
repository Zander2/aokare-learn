# Implementation Planning and Phased Rollout
## Module 6: Capstone — Building an End-to-End Dispute Resolution Agent | Lesson 2

**Learning Objectives:**
- Create a phased implementation plan that starts with shadow mode and graduates to full autonomy
- Define success criteria and go/no-go checkpoints for each phase
- Design a change management plan that addresses AP team concerns about automation
- Estimate timeline and resource requirements for each phase

---

## Why Phased Rollout Matters

A dispute resolution agent handles financial transactions that affect supplier relationships, working capital, and audit trails. Getting it wrong costs real money and erodes trust with vendors your company depends on. The risk of moving too fast is not theoretical.

Phased rollout limits blast radius. In Phase 0, a data integration bug affects only the reporting dashboard — no payments are impacted. In Phase 1, a false positive in the flagging logic is annoying but correctable — a human catches it before any supplier communication goes out. By the time the agent is acting autonomously in Phase 3, you have 6+ months of evidence that it is reliable in your specific environment with your specific vendors and contracts.

Each phase generates the data and confidence needed to justify the next phase. The phases are not just risk management — they are an evidence-building process.

## Phase Overview

```
Phase 0: Data Integration & Baseline (Weeks 1-6)
  Goal: Get data flowing. Establish the pre-deployment performance baseline.
  Risk: Zero. Agent exists only as a data pipeline; takes no actions.

Phase 1: Shadow Mode (Weeks 7-14)
  Goal: Validate the detection logic against real invoice data.
  Risk: Near-zero. Agent flags but humans act; no supplier communications.

Phase 2: Recommendation Mode (Weeks 15-26)
  Goal: Reduce manual effort with 1-click human approval.
  Risk: Low. Every action is human-approved before execution.

Phase 3: Supervised Autonomy (Week 27+)
  Goal: Agent acts autonomously within defined guardrails.
  Risk: Medium, managed. Guardrails limit financial exposure.
```

## Phase 0: Data Integration and Baseline (Weeks 1–6)

### Objectives

1. Connect the ERP (SAP, Oracle, NetSuite) to the ingestion pipeline
2. Backfill 12 months of historical invoice and dispute data
3. Establish the pre-deployment baseline metrics (dispute rate, resolution time, duplicate payment rate)
4. Identify data quality issues before they contaminate the agent's logic

### Key Activities

**Week 1-2: ERP integration**

Stand up the message queue and build the ERP connectors. Test that invoice events, PO events, and GR events are flowing correctly. Validate that the data schema matches expectations — in practice, you will find mismatches (PO line items encoded differently than expected, currency not always in ISO 4217 format, date fields in local formats).

**Week 3-4: Data quality audit**

```python
def run_data_quality_audit(invoices, pos, receipts):
    issues = []

    # Check PO reference completeness
    missing_po = [i for i in invoices if not i.po_reference]
    if len(missing_po) / len(invoices) > 0.05:
        issues.append({
            "type": "missing_po_reference",
            "severity": "high",
            "count": len(missing_po),
            "pct": len(missing_po) / len(invoices) * 100,
            "impact": "Three-way match impossible for these invoices"
        })

    # Check GR timeliness
    orphaned_invoices = [i for i in invoices if not get_matching_receipts(i, receipts)]
    if len(orphaned_invoices) > 0:
        issues.append({
            "type": "no_goods_receipt",
            "count": len(orphaned_invoices),
            "note": "Expected — some are services invoices. Verify ratio."
        })

    # Check price field consistency
    price_mismatches = [
        i for i in invoices
        if abs(sum(l.unit_price * l.quantity for l in i.line_items) - i.total_amount) > 0.01
    ]
    if price_mismatches:
        issues.append({
            "type": "line_item_total_mismatch",
            "count": len(price_mismatches),
            "severity": "medium",
            "impact": "Rule-based price checks will be unreliable for affected invoices"
        })

    return issues
```

Data quality issues discovered in Phase 0 are fixed before the agent ever touches a live invoice. Common findings:
- Contract prices not loaded into the ERP for all vendor-item combinations
- GR records arriving 2-3 days after invoice due to warehouse processing lag
- Vendor IDs inconsistent between the ERP and the contract database

**Week 5-6: Baseline measurement**

Pull 12 months of historical dispute data to establish pre-deployment benchmarks:

```python
def establish_baseline(historical_start, historical_end):
    invoices = get_invoices(historical_start, historical_end)
    disputes = get_disputes(historical_start, historical_end)

    return {
        "period": f"{historical_start} – {historical_end}",
        "total_invoices": len(invoices),
        "dispute_rate_pct": len(disputes) / len(invoices) * 100,
        "avg_resolution_days": statistics.mean([d.resolution_days for d in disputes if d.resolved]),
        "median_resolution_days": statistics.median([d.resolution_days for d in disputes if d.resolved]),
        "duplicate_payment_count": count_confirmed_duplicates(historical_start, historical_end),
        "credits_recovered": sum(d.credit_amount for d in disputes if d.credit_received),
        "unresolved_writeoff_value": sum(d.writeoff_amount for d in disputes if d.written_off),
        "ftes_in_ap": get_fte_count_at_date(historical_end)
    }
```

This baseline is your counterfactual. Every future ROI calculation compares against these numbers.

### Go/No-Go for Phase 1

| Criterion | Requirement | Rationale |
|-----------|-------------|-----------|
| Data completeness | ≥ 95% of invoices have PO references | Three-way match requires PO links |
| Contract data loaded | ≥ 80% of spend by vendor has contract prices in system | Price checks require contract baseline |
| GR timeliness | ≥ 85% of GRs recorded within 5 days of delivery | Time-window matching needs timely GR data |
| Baseline established | 12-month historical dataset available | ROI calculation requires pre-deployment baseline |

If any criterion is not met, address the data quality issue before advancing. A Phase 1 built on incomplete data will produce misleading detection results and undermine confidence in the agent.

## Phase 1: Shadow Mode (Weeks 7–14)

### Objectives

1. Run the detection logic (rules + anomaly scoring) against live invoices
2. Measure the agent's precision and recall against human-reviewed outcomes
3. Identify rule miscalibrations and data edge cases before supplier communications start

### Operations in Shadow Mode

The agent processes every invoice but takes no action. It produces a parallel stream of recommendations that the AP team reviews:

```python
def shadow_mode_process(invoice):
    # Run full detection pipeline
    validation = run_validation(invoice)
    anomaly = run_anomaly_detection(invoice)
    decision = run_decision_engine(invoice, validation, anomaly)

    # Log the shadow recommendation — do NOT execute it
    log_shadow_recommendation({
        "invoice_id": invoice.id,
        "agent_recommendation": decision.action,
        "risk_score": decision.risk_score,
        "flags": decision.flags,
        "shadow_mode": True  # Mark clearly: this is not a live action
    })

    # The human AP process runs in parallel, unmodified
    return None  # Agent does nothing to the invoice
```

At the end of each week, the AP manager reviews the shadow recommendations against what the humans actually did:

```
Shadow Mode Weekly Review — Week 10
════════════════════════════════════════════════
Invoices processed this week: 218
Agent recommendations generated: 31 (14.2% flag rate)

Human actions on same 218 invoices:
  Disputes raised: 24
  Paid without dispute: 194

Comparison:
  Agent flagged + Human disputed:   21  (True Positives)
  Agent flagged + Human paid:        10  (False Positives)
  Agent didn't flag + Human disputed: 3  (False Negatives)
  Agent didn't flag + Human paid:   184  (True Negatives)

Precision: 21/(21+10) = 67.7%
Recall:    21/(21+3)  = 87.5%

Notable misses:
  3 false negatives: all three were quality disputes (damaged goods reported
  by receiving but not in the ERP). Root cause: quality dispute type not yet
  implemented in rule engine.

Notable false positives:
  7 of 10 were from Acme Industrial — price is per the verbal amendment to
  Contract CTR-V10042-2024. Loading amendment into system now.
```

This weekly review process is the most important activity in Phase 1. It is not just monitoring — it is active model improvement. Every false negative and false positive is a signal that leads to a rule adjustment, a data fix, or a new feature.

### Go/No-Go for Phase 2

| Criterion | Requirement | Rationale |
|-----------|-------------|-----------|
| Recall | ≥ 80% | Agent must catch most real disputes before getting approval authority |
| Precision | ≥ 25% | At least 1 in 4 flags must be real — otherwise the review burden is too high |
| False negative analysis | All missed disputes investigated | Team must understand every miss before advancing |
| AP team confidence | Manager sign-off that flag quality is acceptable | Social contract for adoption |

## Phase 2: Recommendation Mode (Weeks 15–26)

### Objectives

1. Reduce AP review time with pre-drafted dispute messages
2. Build AP team comfort with agent-generated communications
3. Establish the one-click approval workflow in production

### Operations in Recommendation Mode

The agent now drafts dispute messages and queues them for human approval. Nothing is sent to suppliers without a human clicking "Approve."

```python
def recommendation_mode_process(invoice):
    validation = run_validation(invoice)
    anomaly = run_anomaly_detection(invoice)
    decision = run_decision_engine(invoice, validation, anomaly)

    if decision.action == "dispute":
        # Draft the message and queue for approval
        draft = draft_dispute_message(invoice, decision)
        create_review_task({
            "invoice_id": invoice.id,
            "agent_recommendation": decision,
            "draft_message": draft,
            "risk_score": decision.risk_score,
            "requires_approval": True,  # Phase 2: always requires approval
            "sla": "approve within 2 business days"
        })

    elif decision.action == "auto_approve":
        # Approval still logged; human can still review
        log_auto_approval(invoice, decision)
        # In Phase 2, do NOT auto-approve — route to monitoring queue
        create_monitoring_task(invoice, decision)
```

Even auto-approvals should be routed to a monitoring queue in Phase 2. You want the AP team to be able to spot-check that the agent is not approving invoices it should be disputing.

### Managing Adoption

Phase 2 is where the AP team starts to feel the change. Their workflow changes: instead of building disputes from scratch, they review and click. Some team members will embrace this. Others will resist — they will want to rewrite every message, or they will default to rejecting agent recommendations rather than learning to evaluate them quickly.

Address resistance directly:

- **Training session before Phase 2 launch.** Walk the team through what the agent does, how it decides, and what the messages look like. Demystify it.
- **Weekly review sessions in the first month.** AP manager reviews a sample of approved and rejected recommendations together with the team. Build shared calibration on what "good" looks like.
- **Track rejection rate with reason codes.** If a reviewer is rejecting 80% of recommendations with "doesn't look right" as the reason, have a conversation. If it is because the recommendations genuinely are wrong, that is signal. If it is because the reviewer is uncomfortable with automation, that is a training issue.
- **Celebrate wins publicly.** When the agent catches a $25,000 duplicate that the team would have missed, share that story. The team needs to see the agent as an ally, not a replacement.

### Go/No-Go for Phase 3

| Criterion | Requirement | Rationale |
|-----------|-------------|-----------|
| Recall | ≥ 88% | Higher bar now that autonomous actions are next |
| Precision | ≥ 35% | Better signal quality needed for unsupervised dispatch |
| Approval rate | ≥ 60% of recommendations approved unchanged | Agent quality must be high enough that humans trust it |
| Message quality | ≤ 10% of messages require significant rewrites | Low rewrite rate indicates drafting quality is production-ready |
| CFO + Controller sign-off | Required | Autonomy expansion needs executive buy-in |

## Phase 3: Supervised Autonomy (Week 27+)

### Scope Boundaries on Day One

Do not expand autonomy uniformly across all invoice types on the first day of Phase 3. Start with the lowest-risk category and expand from there.

```yaml
phase_3_initial_scope:
  in_scope_for_autonomy:
    - type: "duplicate"
      max_value: 5000
      rationale: "Duplicate detection has 97% precision. Low risk."
    - type: "pricing"
      max_value: 2000
      vendor_tier: "transactional"  # Not Tier 1 strategic vendors
      rationale: "Pricing disputes with transactional vendors have 89% precision."

  out_of_scope_initially:
    - vendor_tier: "strategic_tier_1"
      reason: "Relationship risk too high for autonomous dispute without management review"
    - type: "quality"
      reason: "Quality disputes require physical inspection context agent doesn't have"
    - any_invoice_value: "> 10000"
      reason: "Dollar ceiling guardrail for initial Phase 3"
    - vendor_age: "< 90 days"
      reason: "New vendors have no behavioral baseline"
```

### Phase 3 Expansion Schedule

Expand scope based on performance evidence, not calendar dates:

```
Initial scope (Week 27):
  Duplicate disputes < $5K (any vendor)
  Pricing disputes < $2K (transactional vendors only)

Expansion A (after 60 days + 92% accuracy on initial scope):
  Pricing disputes < $5K (transactional vendors)
  Add: Quantity disputes < $2K

Expansion B (after 90 days + 93% accuracy on Expansion A scope):
  Pricing disputes < $10K (include Tier 2 strategic vendors)
  All duplicate disputes (no value ceiling)

Expansion C (after 180 days + 95% accuracy + CFO re-approval):
  All dispute types < $10K
  Pricing disputes < $25K (with notification to AP manager)
```

## Resource Planning

### Engineering Resources

| Phase | Engineering FTE-Weeks | Primary Tasks |
|-------|----------------------|---------------|
| Phase 0 | 8-12 | ERP integration, data pipeline, baseline infrastructure |
| Phase 1 | 4-6 | Rule engine tuning, shadow mode logging, weekly calibration |
| Phase 2 | 4-6 | Dashboard, approval workflow, message drafting |
| Phase 3 | 2-4/month | Ongoing monitoring, model retraining, scope expansion |

Typical total: 3-4 engineers for 6 months to reach Phase 3, then 1-2 engineers for ongoing maintenance and improvement.

### AP Operations Resources

The AP team's role evolves across phases:

| Phase | AP Team Activities | Time Impact |
|-------|-------------------|-------------|
| Phase 0 | Data audit, baseline documentation | +10% (temporary) |
| Phase 1 | Weekly shadow review meetings | +5% (temporary) |
| Phase 2 | Training, message review, rejection logging | -10% (start seeing time savings) |
| Phase 3 | Exception handling, supplier escalations, governance | -30% to -50% on dispute-related tasks |

The time savings in Phase 3 are real but require redeployment. Plan ahead for what the AP team will do with recovered capacity — vendor relationship management, process improvement, contract compliance monitoring.

### Timeline Summary

```
Weeks 1-6:    Phase 0 — Data integration, baseline
Weeks 7-14:   Phase 1 — Shadow mode, calibration
Weeks 15-26:  Phase 2 — Recommendation mode, adoption
Weeks 27+:    Phase 3 — Supervised autonomy, expansion

Total to Phase 3: ~26 weeks (6 months)
Total to full steady state: 12-18 months
```

This timeline assumes a dedicated engineering team and an AP management sponsor who actively drives adoption. Organizations that understaff the project or lack executive sponsorship commonly spend 12 months reaching what should take 6.

## Change Management Essentials

The biggest risk in this project is not technical — it is organizational. AP teams that feel threatened by automation will find ways to undermine it: inflated rejection rates, passive non-adoption, workarounds that keep the agent out of the process.

Three things prevent this:

**Honest communication from the start.** Tell the AP team what the agent is designed to do (handle routine disputes faster), what it is not designed to do (eliminate their jobs), and how their role will change (more complex work, less repetitive manual review). Uncertainty is more corrosive than difficult truths.

**Involve the AP team in calibration.** The weekly shadow review sessions in Phase 1 give the AP team genuine input into the agent's behavior. When an AP specialist points out that the agent keeps flagging Acme Industrial because of a verbal contract amendment, that specialist's knowledge improves the system. This is participation, not rubber-stamping.

**Measure and communicate wins continuously.** Post the monthly savings dashboard where the team can see it. Attribute wins specifically: "The agent caught a $12,400 overcharge on TechSupply that our manual review would have missed." When the team sees concrete evidence that the agent is doing valuable work, resistance transforms into advocacy.

---

**Up next:** Lesson 6.3 analyzes three real-world case studies — a successful high-volume deployment, a failed change management effort, and a global multi-ERP implementation — drawing out the lessons that apply to your own deployment.
