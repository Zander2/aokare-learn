# Testing, Monitoring, and Deployment
## Module 4: Building the Early Payment Discount Agent | Lesson 5

**Learning Objectives:**
- Design an end-to-end test suite for the discount agent using simulated supplier interactions
- Set up monitoring and alerting for agent health and performance
- Implement a phased rollout strategy (shadow mode, limited pilot, full deployment)
- Define rollback procedures for agent misbehavior

---

## End-to-End Testing with Simulated Suppliers

Unit tests (covered in Lesson 4.2) verify individual components. Integration tests verify the entire pipeline by simulating realistic supplier interactions.

### The Simulated Supplier Framework

Create a test harness that mimics supplier behavior:

```python
class SimulatedSupplier:
    """A configurable mock supplier for end-to-end testing."""

    def __init__(self, behavior_profile: str, response_delay_hours: float = 4.0):
        self.profile = behavior_profile
        self.delay = response_delay_hours
        self.received_emails = []

    async def receive_email(self, email):
        self.received_emails.append(email)
        await asyncio.sleep(self.delay * 3600)  # Simulate response delay

        if self.profile == "always_accept":
            return self.generate_acceptance(email)
        elif self.profile == "always_reject":
            return self.generate_rejection(email)
        elif self.profile == "counter_once":
            if len(self.received_emails) == 1:
                return self.generate_counter(email, discount=1.0)
            else:
                return self.generate_acceptance(email)
        elif self.profile == "negotiate_hard":
            return self.generate_counter(email, discount=0.5)
        elif self.profile == "ignore":
            return None  # No response
        elif self.profile == "delayed_accept":
            await asyncio.sleep(72 * 3600)  # Wait 3 days
            return self.generate_acceptance(email)

    def generate_acceptance(self, email):
        return EmailResponse(
            body="We accept the proposed early payment terms. Please proceed.",
            in_reply_to=email.message_id
        )

    def generate_counter(self, email, discount):
        return EmailResponse(
            body=f"We appreciate the offer but can only agree to a {discount}% "
                 f"discount with payment within 7 days.",
            in_reply_to=email.message_id
        )

    def generate_rejection(self, email):
        return EmailResponse(
            body="Thank you for the offer, but we are not interested in "
                 "early payment discounts at this time.",
            in_reply_to=email.message_id
        )
```

### Test Scenarios

Define test scenarios that cover the critical paths:

```python
class TestEndToEnd:
    async def test_happy_path_existing_discount(self):
        """Invoice with existing 2/10 net 30 terms, sufficient cash."""
        invoice = create_test_invoice(amount=50000, terms="2/10 net 30")
        await agent.process_invoice(invoice)

        # Verify payment was scheduled
        payment = await get_payment_for_invoice(invoice.id)
        assert payment is not None
        assert payment.amount == Decimal("49000")
        assert payment.scheduled_date <= invoice.discount_deadline

    async def test_proactive_proposal_accepted(self):
        """Invoice without discount terms, supplier accepts proposal."""
        supplier = SimulatedSupplier("always_accept")
        invoice = create_test_invoice(amount=30000, terms="net 30", supplier=supplier)
        await agent.process_invoice(invoice)

        # Verify proposal was sent
        assert len(supplier.received_emails) == 1
        assert "early payment" in supplier.received_emails[0].subject.lower()

        # Process supplier response
        response = await supplier.receive_email(supplier.received_emails[0])
        await agent.process_response(response)

        # Verify payment was triggered
        payment = await get_payment_for_invoice(invoice.id)
        assert payment is not None

    async def test_negotiation_with_counter(self):
        """Supplier counters, agent negotiates, reaches agreement."""
        supplier = SimulatedSupplier("counter_once")
        invoice = create_test_invoice(amount=75000, terms="net 45", supplier=supplier)
        await agent.process_invoice(invoice)

        # Round 1: Agent proposes, supplier counters
        response_1 = await supplier.receive_email(supplier.received_emails[0])
        await agent.process_response(response_1)

        # Verify agent sent a counter
        assert len(supplier.received_emails) == 2

        # Round 2: Supplier accepts
        response_2 = await supplier.receive_email(supplier.received_emails[1])
        await agent.process_response(response_2)

        # Verify acceptance and payment
        negotiation = await get_negotiation_for_invoice(invoice.id)
        assert negotiation.state == NegotiationState.ACCEPTED

    async def test_cash_constraint_defers_opportunity(self):
        """When cash is insufficient, opportunities are deferred."""
        set_treasury_balance(Decimal("1000"))  # Very low cash
        invoice = create_test_invoice(amount=50000, terms="2/10 net 30")
        await agent.process_invoice(invoice)

        # Verify opportunity was deferred, not pursued
        opp = await get_opportunity_for_invoice(invoice.id)
        assert opp.status == "deferred_cash_constraint"

    async def test_non_response_follow_up_cadence(self):
        """Agent follows up twice then closes on non-response."""
        supplier = SimulatedSupplier("ignore")
        invoice = create_test_invoice(amount=25000, terms="net 30", supplier=supplier)
        await agent.process_invoice(invoice)

        # Advance time through follow-up cadence
        await advance_time(days=5)
        await agent.run_follow_ups()
        assert len(supplier.received_emails) == 2  # Original + follow-up 1

        await advance_time(days=5)
        await agent.run_follow_ups()
        assert len(supplier.received_emails) == 3  # + follow-up 2

        await advance_time(days=5)
        await agent.run_follow_ups()
        # No more follow-ups
        assert len(supplier.received_emails) == 3

        negotiation = await get_negotiation_for_invoice(invoice.id)
        assert negotiation.state == NegotiationState.CLOSED_NO_RESPONSE

    async def test_discount_window_expiry(self):
        """Agent does not attempt payment after discount window closes."""
        invoice = create_test_invoice(
            amount=40000, terms="2/10 net 30",
            invoice_date=date.today() - timedelta(days=12)  # Window already closed
        )
        await agent.process_invoice(invoice)

        payment = await get_payment_for_invoice(invoice.id)
        assert payment is None  # No payment attempted

    async def test_escalation_on_high_value(self):
        """Large discount triggers human escalation."""
        invoice = create_test_invoice(amount=500000, terms="2/10 net 30")
        await agent.process_invoice(invoice)

        # $10,000 discount should trigger escalation
        escalation = await get_escalation_for_invoice(invoice.id)
        assert escalation is not None
        assert "exceeds" in escalation.reason.lower()
```

### Performance Testing

The agent must handle production volumes without degradation:

```python
async def test_high_volume_processing(self):
    """Process 1,000 invoices within 5 minutes."""
    invoices = [
        create_test_invoice(
            amount=random.randint(1000, 200000),
            terms=random.choice(["2/10 net 30", "1/10 net 45", "net 30"]),
            supplier=random.choice(test_suppliers)
        )
        for _ in range(1000)
    ]

    start = time.time()
    results = await asyncio.gather(*[agent.process_invoice(inv) for inv in invoices])
    elapsed = time.time() - start

    assert elapsed < 300  # Under 5 minutes
    assert all(r.status != "error" for r in results)

    scored = [r for r in results if r.status == "scored"]
    assert len(scored) > 0  # Some should have been scored
```

## Monitoring and Alerting

Once in production, the agent needs continuous monitoring across three dimensions: health, performance, and anomalies.

### Health Monitoring

```python
health_checks = {
    "erp_connection": {
        "check": "ping ERP API",
        "interval": "60 seconds",
        "alert_on": "2 consecutive failures",
        "severity": "critical"
    },
    "email_service": {
        "check": "verify SMTP connection",
        "interval": "300 seconds",
        "alert_on": "1 failure",
        "severity": "high"
    },
    "treasury_feed": {
        "check": "verify cash position data freshness",
        "interval": "300 seconds",
        "alert_on": "data older than 4 hours",
        "severity": "medium"
    },
    "queue_depth": {
        "check": "count unprocessed invoices",
        "interval": "300 seconds",
        "alert_on": "depth > 500",
        "severity": "medium"
    },
    "agent_loop": {
        "check": "verify agent heartbeat",
        "interval": "60 seconds",
        "alert_on": "no heartbeat for 5 minutes",
        "severity": "critical"
    }
}
```

### Performance Metrics

Track these metrics in real-time (using Prometheus, Datadog, or similar):

```
# Counter metrics
agent_invoices_processed_total
agent_proposals_sent_total
agent_responses_received_total{classification}
agent_payments_triggered_total
agent_payments_confirmed_total
agent_payments_failed_total
agent_escalations_total{reason}

# Gauge metrics
agent_queue_depth
agent_active_negotiations
agent_cash_budget_remaining
agent_cash_budget_utilization_percent

# Histogram metrics
agent_scoring_duration_seconds
agent_email_generation_duration_seconds
agent_response_parsing_duration_seconds
agent_payment_settlement_duration_days
```

### Anomaly Detection

Set up alerts for unusual patterns:

```python
anomaly_rules = [
    {
        "name": "acceptance_rate_drop",
        "condition": "7-day rolling acceptance rate < 50% of 30-day average",
        "action": "alert AP manager, pause proactive outreach",
        "severity": "high"
    },
    {
        "name": "unusual_discount_amount",
        "condition": "single discount > 2x the 90th percentile historical discount",
        "action": "hold payment, flag for review",
        "severity": "high"
    },
    {
        "name": "payment_failure_spike",
        "condition": "> 3 payment failures in 24 hours",
        "action": "alert IT and AP, pause payment execution",
        "severity": "critical"
    },
    {
        "name": "response_parsing_errors",
        "condition": "> 10% of responses classified as UNRELATED in 24 hours",
        "action": "alert agent operators, review LLM classification",
        "severity": "medium"
    },
    {
        "name": "budget_exhaustion",
        "condition": "daily budget consumed before noon",
        "action": "notify treasury, request budget review",
        "severity": "low"
    }
]
```

## Phased Deployment Strategy

Never deploy a financial agent directly into full production. A phased approach reduces risk and builds organizational confidence.

### Phase 1: Shadow Mode (Weeks 1-4)

The agent runs in parallel with existing processes. It identifies opportunities, scores them, and generates proposed actions — but takes no action. Humans review every recommendation.

**What you learn:**
- Does the scoring model produce reasonable rankings?
- Are the email templates appropriate?
- Does the cash constraint filtering align with treasury's view?
- How many opportunities does the agent find that humans missed?

**Success criteria to advance:** 90%+ agreement between agent recommendations and human judgment. No critical data quality issues.

### Phase 2: Limited Pilot (Weeks 5-10)

The agent operates autonomously but on a restricted scope:

- Only transactional suppliers (not strategic or preferred)
- Only invoices under $25,000
- Only suppliers in one geographic region or business unit
- Daily early payment budget capped at $50,000

**What you learn:**
- Does autonomous operation produce the expected savings?
- How do suppliers respond to agent-generated emails?
- Are there failure modes that testing did not uncover?

**Success criteria to advance:** 70%+ capture rate on eligible invoices. No supplier complaints. Reconciliation matches within tolerance. Zero payment errors.

### Phase 3: Expanded Pilot (Weeks 11-16)

Increase the scope:

- All supplier segments
- Invoice amounts up to $100,000
- Multiple business units
- Daily budget increased to $200,000

**What you learn:**
- Does performance hold at higher volume?
- How do strategic suppliers respond differently?
- Are escalation paths effective for complex situations?

**Success criteria to advance:** Sustained performance metrics. Positive feedback from pilot participants. Treasury comfortable with working capital impact.

### Phase 4: Full Deployment (Week 17+)

Remove artificial restrictions. The agent operates across the full supplier portfolio within its configured guardrails. Monitoring continues indefinitely.

## Rollback Procedures

Define rollback procedures before you need them.

### Kill Switch

An immediate stop mechanism that halts all agent activity:

```python
class KillSwitch:
    async def activate(self, reason: str, activated_by: str):
        """Immediately halt all agent operations."""
        # 1. Stop processing new invoices
        await self.agent.pause_ingestion()

        # 2. Cancel pending proposals (not yet sent)
        await self.agent.cancel_pending_outreach()

        # 3. DO NOT cancel scheduled payments (these are committed)
        # Instead, flag them for human review

        # 4. Notify stakeholders
        await self.notify_all_stakeholders(
            f"Agent kill switch activated by {activated_by}. Reason: {reason}"
        )

        # 5. Log
        await self.audit.log_event("SYSTEM", "kill_switch_activated", {
            "reason": reason,
            "activated_by": activated_by,
            "pending_negotiations": await self.agent.count_active_negotiations(),
            "scheduled_payments": await self.agent.count_scheduled_payments()
        })
```

### Graceful Degradation

For less severe issues, the agent can degrade gracefully:

| Issue | Degradation Response |
|-------|---------------------|
| Email service down | Pause outreach, continue scoring and payment of existing agreements |
| ERP API intermittent | Switch to batch polling, reduce processing frequency |
| Treasury feed stale | Reduce early payment budget to 50% of last known value |
| LLM service degraded | Fall back to template-only emails (no LLM personalization) |
| Classification accuracy dropping | Route all responses to human review |

### Manual Override

Any individual negotiation or payment can be overridden by an authorized human at any time:

```python
async def manual_override(self, negotiation_id, action, override_by, reason):
    negotiation = await self.negotiations.get(negotiation_id)

    await self.audit.log_event(negotiation_id, "manual_override", {
        "action": action,
        "override_by": override_by,
        "reason": reason,
        "previous_state": negotiation.state.value
    })

    if action == "cancel":
        await self.cancel_negotiation(negotiation)
    elif action == "pause":
        await self.pause_negotiation(negotiation)
    elif action == "force_accept":
        await self.accept_and_pay(negotiation)
    elif action == "reassign_to_human":
        await self.escalate(negotiation, reason=f"Manual reassignment: {reason}")
```

This completes Module 4. You now have a comprehensive understanding of the agent architecture, from ingestion through scoring, negotiation, payment, reconciliation, testing, and deployment. In Module 5, we advance to the scenario where both buyer and supplier operate agents on the Causa Prima platform.
