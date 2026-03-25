# Surfacing Issues to Managers with Actionable Context
## Module 4: Autonomous Agent Behavior and Supplier Communication | Lesson 4

**Learning Objectives:**
- Design manager dashboards that summarize open disputes by risk, age, and value
- Create alert notifications that include the agent's proposed action and supporting rationale
- Implement one-click approve/reject/modify workflows for manager decisions
- Generate executive summaries of dispute trends for leadership reporting

---

## The Manager's Problem

An AP manager does not want to read every dispute detail. They want to know: What needs my attention right now? What is the agent handling on its own? Are things getting better or worse?

The agent must surface information at the right level of detail for the right audience. A manager needs operational intelligence — which disputes require their decision. An executive needs strategic intelligence — how much money are disputes costing, and is the trend improving?

## Dashboard Design: The Dispute Queue

The primary interface for the AP manager is the dispute queue — a filtered, sortable list of open disputes that require action.

### Key Dashboard Components

```
┌────────────────────────────────────────────────────────────┐
│ DISPUTE RESOLUTION DASHBOARD                     Mar 2025   │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ Summary Cards:                                               │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│ │ Open: 47 │ │ Value:   │ │ Avg Age: │ │ Overdue SLA: │   │
│ │          │ │ $234,800 │ │ 8.2 days │ │ 6 disputes   │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                                                              │
│ Awaiting My Decision: 12                                     │
│ ─────────────────────────────────────────────────────────    │
│ # │ Vendor         │ Type    │ Value   │ Age │ Action       │
│ 1 │ Acme Industrial│ Pricing │ $12,400 │ 3d  │ [Approve]    │
│ 2 │ Global Parts   │ Qty     │ $8,200  │ 7d  │ [Review]     │
│ 3 │ TechSupply Co  │ Dup     │ $23,450 │ 1d  │ [Approve]    │
│ ...                                                          │
│                                                              │
│ Agent Auto-Resolved Today: 34 disputes ($45,200 total)       │
│ Agent Recommendations Pending: 8 disputes                    │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

### Filters and Sorting

The dashboard must support filtering by:
- **Status:** Awaiting my decision, awaiting supplier, escalated, auto-resolved
- **Vendor:** Filter by specific vendor or vendor category
- **Dispute type:** Pricing, quantity, duplicate, quality, delivery
- **Value range:** Under $1,000, $1,000-$10,000, over $10,000
- **Age:** Created today, 1-7 days, 7-14 days, overdue
- **Risk score:** High risk (>70), medium (30-70), low (<30)

Sort options: by risk score (default), by value (highest first), by age (oldest first), by SLA deadline (closest first).

### Drill-Down View

When the manager clicks on a dispute, they see the full context:

```
Dispute DSC-2025-04821
═══════════════════════════════════════════════════════
Vendor: Acme Industrial Supply (V-10042) — Strategic Tier 1
Invoice: INV-88432 | Amount: $26,500.00 | Date: Mar 15, 2025
Risk Score: 67/100

DISCREPANCY DETAILS
Line 3: GASKET-4200
  PO Price: $12.50 | Invoice Price: $13.25 | Variance: $1,500.00 (6.0%)
  GRN-7891: 2,000 units received Mar 12 ✓

AGENT ANALYSIS
  Rule: PRICE_CHECK_001 v2.3 — Exceeds 0.5% tolerance for contracted goods
  Anomaly: Price drift of +4.8% annualized for this item (z=2.1)
  Peer comparison: Acme is 28% above category median for gaskets
  Confidence: 0.92

AGENT RECOMMENDATION
  Action: Dispute with supplier — request credit note for $1,500.00
  Rationale: PO price is backed by active contract CTR-V10042-2024
             (expires Dec 2025). No contract amendment on file.
  Draft message: [View Draft]

HISTORY
  Mar 15: Invoice received, auto-matched to PO-2025-3847
  Mar 15: Price discrepancy detected by PRICE_CHECK_001
  Mar 15: Anomaly score computed (composite: 67)
  Mar 15: Agent drafted dispute message, queued for review

YOUR DECISION
  [✓ Approve & Send]  [Edit Message]  [Reject]  [Escalate]
```

## Alert Design

Managers should not have to poll the dashboard. Critical items should come to them via alerts.

### Alert Structure

Every alert must answer four questions:
1. **What happened?** — A concise description of the issue
2. **Why does it matter?** — The financial impact and risk level
3. **What does the agent recommend?** — The proposed action
4. **What do you need to do?** — The specific decision required

```python
def generate_alert(dispute, agent_recommendation):
    return {
        "title": f"Dispute requires your approval: {dispute.vendor.name} — ${dispute.total_variance:,.0f}",
        "priority": "high" if dispute.risk_score >= 70 else "medium",
        "body": {
            "what": f"Pricing discrepancy of ${dispute.total_variance:,.2f} on invoice {dispute.invoice.number}",
            "why": f"Exceeds tolerance by {dispute.variance_pct:.1f}%. Vendor is Tier 1 strategic. "
                   f"This vendor has shown a {dispute.price_drift_pct:.1f}% annual price drift.",
            "recommendation": f"Send dispute notice requesting credit note for ${dispute.total_variance:,.2f}",
            "action_required": "Approve, edit, or reject the draft dispute message"
        },
        "actions": [
            {"label": "Approve", "action": "approve_recommendation", "dispute_id": dispute.id},
            {"label": "View Details", "action": "open_dashboard", "dispute_id": dispute.id},
            {"label": "Dismiss", "action": "dismiss_alert", "dispute_id": dispute.id}
        ],
        "channel": determine_channel(dispute)  # Email, Slack, Teams, SMS
    }
```

### Channel Selection

```yaml
alert_channels:
  critical_risk:  # Risk score > 85
    channels: ["sms", "slack", "email"]
    note: "Multi-channel for critical items"

  high_risk:  # Risk score 60-85
    channels: ["slack", "email"]

  medium_risk:  # Risk score 30-60
    channels: ["email"]
    batching: "hourly_digest"  # Combine into hourly summary

  low_risk:  # Risk score < 30
    channels: ["dashboard_only"]
    note: "Visible in dashboard but no push notification"
```

### Alert Fatigue Prevention

If the system sends 40 alerts per day, the manager will ignore all of them. Prevent alert fatigue:

- **Batch low-priority alerts** into a daily or hourly digest
- **Suppress duplicate alerts** — if the same dispute triggered an alert yesterday, do not alert again until the SLA is about to expire
- **Escalation-based alerting** — only alert when a dispute transitions to a new state or when an SLA deadline is approaching
- **Volume caps** — no more than 5 push notifications per day; everything else goes to dashboard or email digest

```python
def should_send_alert(dispute, manager, today_alerts):
    if len(today_alerts) >= 5:
        return False  # Daily cap reached; add to digest instead

    if dispute.id in [a.dispute_id for a in today_alerts]:
        return False  # Already alerted today

    if dispute.risk_score < 60 and dispute.age_days < 10:
        return False  # Not urgent enough for push notification

    return True
```

## One-Click Action Workflows

The faster a manager can act, the faster disputes resolve. One-click workflows reduce the decision from "read everything, open a new window, type a response" to "click Approve."

### Action Interface Design

```python
class ManagerActions:
    def approve(self, dispute_id):
        """Approve the agent's recommendation as-is."""
        dispute = get_dispute(dispute_id)
        execute_recommendation(dispute)
        log_decision(dispute, action="approved", actor=current_user())
        return {"status": "approved", "message": "Recommendation executed"}

    def approve_with_modification(self, dispute_id, modifications):
        """Approve with changes (e.g., adjust the credit amount, change the message)."""
        dispute = get_dispute(dispute_id)
        apply_modifications(dispute, modifications)
        execute_recommendation(dispute)
        log_decision(dispute, action="modified_and_approved",
                    actor=current_user(), modifications=modifications)

    def reject(self, dispute_id, reason, alternative_action=None):
        """Reject the agent's recommendation."""
        dispute = get_dispute(dispute_id)
        if alternative_action:
            execute_alternative(dispute, alternative_action)
        log_decision(dispute, action="rejected", actor=current_user(),
                    reason=reason, alternative=alternative_action)

    def escalate(self, dispute_id, escalate_to, notes):
        """Escalate to a higher authority."""
        dispute = get_dispute(dispute_id)
        transition(dispute, "escalated", reason=notes, actor=current_user())
        notify_escalation_target(dispute, escalate_to, notes)
```

### Batch Operations

For low-risk disputes where the agent's recommendation is consistently correct, batch approval saves significant time:

```python
def batch_approve(dispute_ids, manager):
    """Approve multiple agent recommendations at once."""
    results = []
    for dispute_id in dispute_ids:
        dispute = get_dispute(dispute_id)

        # Safety check: only allow batch approval for low-risk items
        if dispute.risk_score > 50 or dispute.total_variance > 5000:
            results.append({
                "dispute_id": dispute_id,
                "status": "skipped",
                "reason": "Above batch approval threshold"
            })
            continue

        execute_recommendation(dispute)
        log_decision(dispute, action="batch_approved", actor=manager)
        results.append({"dispute_id": dispute_id, "status": "approved"})

    return results
```

## Executive Reporting

Leadership needs a different view: not individual disputes but trends, financial impact, and agent performance.

### Monthly Executive Summary

```
DISPUTE RESOLUTION — EXECUTIVE SUMMARY — March 2025
════════════════════════════════════════════════════════

VOLUME & VALUE
  Invoices processed:              14,200
  Disputes identified:                428 (3.0% dispute rate)
  Total disputed value:          $1.84M
  Resolved this month:               395
  Carried forward:                     33

FINANCIAL IMPACT
  Credits recovered:             $312,400
  Duplicate payments prevented:  $187,200
  Early-payment discounts saved:  $45,800
  Total savings:                 $545,400
  Agent operating cost:           $12,000
  Net ROI:                         4,445%

RESOLUTION PERFORMANCE
  Avg resolution time:            7.8 days (target: < 15)
  First-contact resolution:         62%   (target: > 50%)
  Escalation rate:                  8.2%  (target: < 10%)
  Write-off rate:                   3.1%  (target: < 5%)

AGENT AUTONOMY
  Auto-resolved (no human):         287 disputes (67%)
  Human-approved recommendation:     108 disputes (25%)
  Fully human-handled:                33 disputes (8%)
  Agent accuracy (confirmed correct): 94.2%

TRENDS (3-month)
  Dispute rate:     3.4% → 3.2% → 3.0%  ▼ Improving
  Resolution time: 11.2d → 9.5d → 7.8d  ▼ Improving
  Auto-resolve %:    54% →  61% →  67%   ▲ Improving
  Write-off rate:   4.8% → 3.9% → 3.1%  ▼ Improving

VENDOR SPOTLIGHT
  Most disputes:     Global Parts Inc (18 disputes, $42K)
  Highest value:     TechSupply Co (3 disputes, $89K)
  Best improvement:  Acme Industrial (12→4 disputes, -67%)
  Needs attention:   FastShip LLC (new vendor, 100% dispute rate on 5 invoices)
```

### Vendor Scorecards

For procurement review meetings, generate vendor-specific dispute reports:

```python
def generate_vendor_scorecard(vendor_id, period="quarter"):
    disputes = get_disputes(vendor_id=vendor_id, period=period)
    invoices = get_invoices(vendor_id=vendor_id, period=period)

    return {
        "vendor": get_vendor(vendor_id),
        "total_invoices": len(invoices),
        "total_spend": sum(i.total_amount for i in invoices),
        "dispute_count": len(disputes),
        "dispute_rate": len(disputes) / len(invoices) * 100,
        "dispute_value": sum(d.total_variance for d in disputes),
        "avg_resolution_days": statistics.mean([d.resolution_days for d in disputes if d.resolved]),
        "credits_received": sum(d.credit_amount for d in disputes if d.credit_received),
        "dispute_types": Counter(d.type for d in disputes),
        "trend": calculate_trend(vendor_id, metric="dispute_rate", periods=4),
        "peer_comparison": compare_to_peers(vendor_id, metric="dispute_rate"),
        "recommendation": generate_vendor_recommendation(vendor_id)
    }
```

The vendor scorecard feeds into supplier performance reviews and contract renegotiations. A vendor with a 12% dispute rate is a vendor that needs either process improvement or replacement.

### Trend Visualization Data

Provide data formatted for the dashboard charting library:

```python
def get_trend_data(metric, granularity="monthly", periods=12):
    """Generate time-series data for dashboard charts."""
    data_points = []
    for period in get_periods(granularity, count=periods):
        value = calculate_metric(metric, period)
        target = get_target(metric)
        data_points.append({
            "period": period.label,
            "value": value,
            "target": target,
            "status": "on_track" if value <= target else "off_track"
        })
    return data_points
```

Key charts for the executive dashboard:
1. **Dispute rate trend** — monthly dispute rate with target line
2. **Resolution time distribution** — histogram showing how quickly disputes are resolved
3. **Savings waterfall** — credits recovered + duplicates prevented + discounts saved
4. **Agent autonomy progression** — percentage of disputes auto-resolved over time
5. **Top dispute vendors** — Pareto chart showing which vendors generate the most disputes

## Connecting Dashboards to Action

A dashboard that only reports is a dashboard that gets ignored. Every metric should link to an action:

| Metric Deviation | Suggested Action | Dashboard Link |
|------------------|------------------|----------------|
| Dispute rate rising | Review vendor onboarding process | Drill into new vendor disputes |
| Resolution time increasing | Check for bottlenecks in the review queue | View aging disputes sorted by assignee |
| Agent accuracy dropping | Audit recent auto-resolutions | View rejected agent recommendations |
| Vendor dispute rate spiking | Initiate vendor performance review | Open vendor scorecard |
| Write-off rate above target | Review write-off approvals | View write-offs by approver |

This connection between data and action is what makes the dashboard a management tool rather than a reporting artifact.

---

**Up next:** Module 5 focuses on how the agent learns from human decisions. Lesson 5.1 covers capturing human decisions as training signal for continuous improvement.
