# Agent Architecture and System Design
## Module 4: Building the Early Payment Discount Agent | Lesson 1

**Learning Objectives:**
- Diagram the end-to-end architecture of an early payment discount agent
- Identify the core components: invoice ingestion, opportunity scoring, outreach engine, negotiation state machine, payment execution
- Select appropriate integration points with ERP, email, and treasury systems
- Define the agent's decision loop and state transitions

---

## High-Level Architecture

An early payment discount agent is not a single monolithic program. It is a system of cooperating components, each responsible for a distinct function. Understanding the architecture is essential whether you are building an agent from scratch, customizing one on the Causa Prima platform, or evaluating vendor solutions.

### The Five Core Components

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Invoice    │───▶│  Opportunity │───▶│   Outreach   │───▶│ Negotiation  │───▶│   Payment    │
│  Ingestion   │    │   Scoring    │    │   Engine     │    │ State Machine│    │  Execution   │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
       ▲                  ▲                                        │                   │
       │                  │                                        │                   │
  ┌────┴────┐      ┌──────┴──────┐                          ┌─────┴─────┐       ┌─────┴─────┐
  │  ERP    │      │  Treasury   │                          │  Email    │       │  Banking  │
  │ System  │      │  System     │                          │  Service  │       │  Platform │
  └─────────┘      └─────────────┘                          └───────────┘       └───────────┘
```

**1. Invoice Ingestion** receives invoices from the ERP system, parses payment terms, and normalizes data into the canonical schema.

**2. Opportunity Scoring** evaluates each invoice against the scoring model (financial value, probability, relationship), checks cash availability with treasury, and produces a prioritized queue.

**3. Outreach Engine** generates and sends discount proposal emails based on templates, handles personalization, and manages send scheduling.

**4. Negotiation State Machine** tracks the state of each negotiation, parses supplier responses, makes counter-offer decisions, and handles escalation.

**5. Payment Execution** triggers early payments through the ERP or banking platform, confirms execution, and handles reconciliation.

### Supporting Infrastructure

Beyond the core components, the agent requires:

- **Data Store** — Persistent storage for invoice data, supplier profiles, negotiation history, and configuration
- **Event Bus** — Asynchronous message passing between components (invoice arrives, response received, payment confirmed)
- **Audit Log** — Immutable record of every decision and action
- **Monitoring & Alerting** — Health checks, performance metrics, anomaly detection
- **Configuration Service** — Centralized management of thresholds, templates, and business rules

## Component Breakdown

### Invoice Ingestion

The ingestion component is the agent's eyes. It must handle multiple input channels:

```python
class InvoiceIngestion:
    """
    Receives invoices from multiple sources, normalizes them,
    and publishes to the opportunity pipeline.
    """

    def __init__(self, erp_connector, ocr_service, event_bus):
        self.erp = erp_connector
        self.ocr = ocr_service
        self.bus = event_bus

    async def poll_erp(self):
        """Pull new invoices from ERP on a schedule."""
        new_invoices = await self.erp.get_invoices(
            status="pending",
            since=self.last_poll_timestamp
        )
        for invoice in new_invoices:
            normalized = self.normalize(invoice)
            await self.bus.publish("invoice.received", normalized)

    async def handle_webhook(self, payload):
        """Receive invoices pushed via webhook from ERP or supplier portal."""
        invoice = self.parse_webhook(payload)
        normalized = self.normalize(invoice)
        await self.bus.publish("invoice.received", normalized)

    async def process_email_invoice(self, email):
        """Extract invoice from email attachment using OCR + LLM."""
        attachment = email.get_pdf_attachment()
        raw_text = await self.ocr.extract(attachment)
        parsed = await self.llm_parse(raw_text)
        normalized = self.normalize(parsed)
        normalized.confidence = parsed.confidence
        await self.bus.publish("invoice.received", normalized)

    def normalize(self, raw_invoice):
        """Map source-specific fields to canonical schema."""
        return CanonicalInvoice(
            invoice_id=raw_invoice.id,
            source_system=raw_invoice.source,
            invoice_date=parse_date(raw_invoice.date),
            amount=Decimal(raw_invoice.amount),
            currency=raw_invoice.currency or "USD",
            supplier_id=raw_invoice.supplier_id,
            payment_terms=self.parse_terms(raw_invoice.terms),
            status="received"
        )
```

The ingestion component must be resilient to failures. If the ERP API is temporarily unavailable, the poller should retry with exponential backoff. If OCR parsing fails on an invoice, the invoice should be queued for manual processing rather than silently dropped.

### Opportunity Scoring

The scoring component applies the model from Module 2, Lesson 2:

```python
class OpportunityScorer:
    def __init__(self, scoring_model, treasury_client, supplier_repo):
        self.model = scoring_model
        self.treasury = treasury_client
        self.suppliers = supplier_repo

    async def score(self, invoice):
        supplier = await self.suppliers.get(invoice.supplier_id)
        cash_position = await self.treasury.get_available_budget()

        score = self.model.calculate_score(
            invoice=invoice,
            supplier=supplier,
            cash_available=cash_position
        )

        return ScoredOpportunity(
            invoice=invoice,
            score=score,
            discount_value=invoice.amount * invoice.payment_terms.discount_percent / 100,
            annualized_rate=self.model.annualized_rate(invoice),
            recommended_action=self.determine_action(score, invoice, supplier)
        )

    def determine_action(self, score, invoice, supplier):
        if invoice.has_existing_discount_terms:
            if score >= 40:
                return "capture_existing_discount"
            else:
                return "skip"
        else:
            if score >= 60 and supplier.is_eligible_for_outreach():
                return "propose_discount"
            else:
                return "skip"
```

### Outreach Engine

The outreach engine handles email generation and delivery:

```python
class OutreachEngine:
    def __init__(self, template_service, email_client, ab_test_service):
        self.templates = template_service
        self.email = email_client
        self.ab_tests = ab_test_service

    async def send_proposal(self, opportunity):
        supplier = opportunity.supplier
        template = self.templates.get_template(
            segment=supplier.segment,
            history=supplier.negotiation_history,
            ab_variant=self.ab_tests.get_variant(supplier.id)
        )

        terms = self.calculate_opening_terms(opportunity)

        message = template.render(
            supplier=supplier,
            invoice=opportunity.invoice,
            terms=terms,
            accept_link=self.generate_accept_link(opportunity.id)
        )

        result = await self.email.send(
            to=supplier.ap_contact_email,
            subject=message.subject,
            body=message.body,
            reply_to=self.get_reply_address(opportunity.id)
        )

        return OutreachRecord(
            opportunity_id=opportunity.id,
            message_id=result.message_id,
            sent_at=datetime.utcnow(),
            terms_proposed=terms,
            template_version=template.version
        )
```

## Integration Patterns

### ERP Integration

The connection to the ERP is the most critical integration. Three patterns are common:

**Pattern 1: API-Based (Preferred)**
```
Agent ──REST/OData──▶ ERP API Gateway ──▶ ERP Database
                                         ◀──
```
Real-time, bidirectional. The agent reads invoice data and writes payment instructions. This is the cleanest approach but requires the ERP to expose stable APIs.

**Pattern 2: Middleware/iPaaS**
```
Agent ──▶ Integration Platform (MuleSoft, Boomi, Workato) ──▶ ERP
```
The middleware handles protocol translation, error handling, and data mapping. Useful when the ERP's native APIs are limited or when multiple ERPs must be integrated.

**Pattern 3: File-Based**
```
Agent ──reads──▶ Shared File System ◀──writes── ERP Batch Export
Agent ──writes──▶ Shared File System ──reads──▶ ERP Batch Import
```
Legacy approach. The ERP exports invoice data as CSV/XML files on a schedule; the agent reads them. The agent writes payment instructions as files; the ERP imports them. Simple but introduces latency (typically daily batch cycles).

### Email Integration

The agent needs both outbound (sending proposals) and inbound (receiving responses) email capabilities:

**Outbound:** SMTP relay, SendGrid, or similar transactional email service. The agent should send from a domain-verified address to avoid spam filters. Implement SPF, DKIM, and DMARC records for the sending domain.

**Inbound:** The agent monitors a dedicated mailbox (e.g., early-payment@company.com) for supplier responses. Integration options include IMAP polling, Microsoft Graph API for Office 365, or Gmail API for Google Workspace. Response parsing (covered in Module 3, Lesson 3) extracts structured data from unstructured replies.

### Treasury Integration

The treasury connection provides cash availability data and receives early payment notifications:

```python
class TreasuryConnector:
    async def get_available_budget(self) -> Decimal:
        """Returns the cash available for early payments today."""
        position = await self.api.get_cash_position()
        committed = await self.api.get_committed_outflows(horizon_days=1)
        reserve = await self.api.get_minimum_reserve()
        daily_cap = await self.api.get_early_payment_daily_cap()

        available = position.balance - committed - reserve
        return min(max(Decimal("0"), available), daily_cap)

    async def reserve_funds(self, amount: Decimal, invoice_id: str) -> str:
        """Temporarily reserve funds for a pending early payment."""
        reservation = await self.api.create_reservation(
            amount=amount,
            purpose=f"early_payment_{invoice_id}",
            expiry_hours=48
        )
        return reservation.id

    async def release_reservation(self, reservation_id: str):
        """Release funds if negotiation fails or payment is cancelled."""
        await self.api.release_reservation(reservation_id)
```

## The Agent Decision Loop

The agent operates on a continuous loop, conceptually following the OODA model (Observe, Orient, Decide, Act):

```
OBSERVE: New invoices arrive, supplier responses come in, cash position updates
    │
ORIENT: Score opportunities, update negotiation states, check constraints
    │
DECIDE: Which opportunities to pursue? What offer to make? Accept or counter?
    │
  ACT: Send emails, trigger payments, escalate to humans, log decisions
    │
    └──────────────── FEEDBACK ───────────────────────────────────────┘
```

In implementation, this is event-driven rather than a literal loop:

```python
class AgentOrchestrator:
    async def on_invoice_received(self, event):
        invoice = event.data
        scored = await self.scorer.score(invoice)

        if scored.recommended_action == "capture_existing_discount":
            await self.payment_executor.schedule(invoice)
        elif scored.recommended_action == "propose_discount":
            await self.outreach_engine.send_proposal(scored)

    async def on_response_received(self, event):
        response = event.data
        negotiation = await self.negotiations.get(response.negotiation_id)
        classification = await self.response_parser.classify(response)

        action = negotiation.state_machine.process(classification)
        await self.execute_action(action, negotiation)

    async def on_cash_position_updated(self, event):
        # Re-evaluate paused opportunities when cash becomes available
        paused = await self.opportunities.get_paused()
        for opp in paused:
            rescored = await self.scorer.score(opp.invoice)
            if rescored.recommended_action != "skip":
                await self.outreach_engine.send_proposal(rescored)
```

## State Machine Design

Every invoice in the system exists in one of several states:

```
RECEIVED → SCORED → PROPOSED → AWAITING_RESPONSE → EVALUATING
                                                       │
                                    ┌──────────────────┼──────────────┐
                                    ▼                  ▼              ▼
                               ACCEPTED          COUNTERING      REJECTED
                                    │                  │              │
                                    ▼                  │              ▼
                            PAYMENT_SCHEDULED          │         CLOSED_REJECTED
                                    │                  │
                                    ▼                  ▼
                            PAYMENT_EXECUTED     (back to AWAITING_RESPONSE)
                                    │
                                    ▼
                            DISCOUNT_CAPTURED
```

Additional terminal states include `CLOSED_NO_RESPONSE`, `CLOSED_EXPIRED` (discount window passed), and `ESCALATED` (human took over).

Each state transition is logged with a timestamp, the triggering event, and any associated data. This creates a complete audit trail for every invoice from receipt to resolution.

In the next lesson, we will implement the opportunity pipeline — the code that takes raw invoices and produces a scored, prioritized queue of discount opportunities.
