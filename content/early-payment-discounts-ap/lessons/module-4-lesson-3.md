# Building the Negotiation Engine
## Module 4: Building the Early Payment Discount Agent | Lesson 3

**Learning Objectives:**
- Implement a negotiation state machine with configurable strategies
- Build email generation and response parsing capabilities using LLMs
- Code concession logic that adjusts offers within defined boundaries
- Implement logging that captures every negotiation step for audit purposes
- Add human-in-the-loop checkpoints at configurable decision points

---

## State Machine Implementation

The negotiation state machine is the brain of the agent's communication flow. Every negotiation exists in exactly one state at any time, and transitions are triggered by events (supplier responses, timeouts, human decisions).

### Defining States and Transitions

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Optional, Callable

class NegotiationState(Enum):
    READY = "ready"
    PROPOSED = "proposed"
    AWAITING_RESPONSE = "awaiting_response"
    FOLLOW_UP_1 = "follow_up_1"
    FOLLOW_UP_2 = "follow_up_2"
    EVALUATING_COUNTER = "evaluating_counter"
    COUNTER_PROPOSED = "counter_proposed"
    FINAL_OFFER = "final_offer"
    ACCEPTED = "accepted"
    PAYMENT_SCHEDULED = "payment_scheduled"
    PAYMENT_EXECUTED = "payment_executed"
    DISCOUNT_CAPTURED = "discount_captured"
    REJECTED = "rejected"
    CLOSED_NO_RESPONSE = "closed_no_response"
    CLOSED_EXPIRED = "closed_expired"
    ESCALATED = "escalated"

class NegotiationEvent(Enum):
    SEND_PROPOSAL = "send_proposal"
    PROPOSAL_SENT = "proposal_sent"
    RESPONSE_ACCEPT = "response_accept"
    RESPONSE_COUNTER = "response_counter"
    RESPONSE_REJECT = "response_reject"
    RESPONSE_DEFER = "response_defer"
    NO_RESPONSE_TIMEOUT = "no_response_timeout"
    COUNTER_ACCEPTABLE = "counter_acceptable"
    COUNTER_NEGOTIABLE = "counter_negotiable"
    COUNTER_BELOW_FLOOR = "counter_below_floor"
    COUNTER_NEEDS_HUMAN = "counter_needs_human"
    PAYMENT_TRIGGERED = "payment_triggered"
    PAYMENT_CONFIRMED = "payment_confirmed"
    DISCOUNT_WINDOW_EXPIRED = "discount_window_expired"
    MAX_FOLLOW_UPS_REACHED = "max_follow_ups_reached"
```

### The State Machine Engine

```python
class NegotiationStateMachine:
    TRANSITIONS = {
        (NegotiationState.READY, NegotiationEvent.SEND_PROPOSAL):
            NegotiationState.PROPOSED,
        (NegotiationState.PROPOSED, NegotiationEvent.PROPOSAL_SENT):
            NegotiationState.AWAITING_RESPONSE,
        (NegotiationState.AWAITING_RESPONSE, NegotiationEvent.RESPONSE_ACCEPT):
            NegotiationState.ACCEPTED,
        (NegotiationState.AWAITING_RESPONSE, NegotiationEvent.RESPONSE_COUNTER):
            NegotiationState.EVALUATING_COUNTER,
        (NegotiationState.AWAITING_RESPONSE, NegotiationEvent.RESPONSE_REJECT):
            NegotiationState.REJECTED,
        (NegotiationState.AWAITING_RESPONSE, NegotiationEvent.NO_RESPONSE_TIMEOUT):
            NegotiationState.FOLLOW_UP_1,
        (NegotiationState.FOLLOW_UP_1, NegotiationEvent.RESPONSE_ACCEPT):
            NegotiationState.ACCEPTED,
        (NegotiationState.FOLLOW_UP_1, NegotiationEvent.RESPONSE_COUNTER):
            NegotiationState.EVALUATING_COUNTER,
        (NegotiationState.FOLLOW_UP_1, NegotiationEvent.RESPONSE_REJECT):
            NegotiationState.REJECTED,
        (NegotiationState.FOLLOW_UP_1, NegotiationEvent.NO_RESPONSE_TIMEOUT):
            NegotiationState.FOLLOW_UP_2,
        (NegotiationState.FOLLOW_UP_2, NegotiationEvent.NO_RESPONSE_TIMEOUT):
            NegotiationState.CLOSED_NO_RESPONSE,
        (NegotiationState.FOLLOW_UP_2, NegotiationEvent.RESPONSE_ACCEPT):
            NegotiationState.ACCEPTED,
        (NegotiationState.EVALUATING_COUNTER, NegotiationEvent.COUNTER_ACCEPTABLE):
            NegotiationState.ACCEPTED,
        (NegotiationState.EVALUATING_COUNTER, NegotiationEvent.COUNTER_NEGOTIABLE):
            NegotiationState.COUNTER_PROPOSED,
        (NegotiationState.EVALUATING_COUNTER, NegotiationEvent.COUNTER_BELOW_FLOOR):
            NegotiationState.FINAL_OFFER,
        (NegotiationState.EVALUATING_COUNTER, NegotiationEvent.COUNTER_NEEDS_HUMAN):
            NegotiationState.ESCALATED,
        (NegotiationState.COUNTER_PROPOSED, NegotiationEvent.PROPOSAL_SENT):
            NegotiationState.AWAITING_RESPONSE,
        (NegotiationState.FINAL_OFFER, NegotiationEvent.PROPOSAL_SENT):
            NegotiationState.AWAITING_RESPONSE,
        (NegotiationState.ACCEPTED, NegotiationEvent.PAYMENT_TRIGGERED):
            NegotiationState.PAYMENT_SCHEDULED,
        (NegotiationState.PAYMENT_SCHEDULED, NegotiationEvent.PAYMENT_CONFIRMED):
            NegotiationState.PAYMENT_EXECUTED,
        (NegotiationState.PAYMENT_EXECUTED, NegotiationEvent.PAYMENT_CONFIRMED):
            NegotiationState.DISCOUNT_CAPTURED,
    }

    def __init__(self, negotiation_id: str, initial_state=NegotiationState.READY):
        self.negotiation_id = negotiation_id
        self.current_state = initial_state
        self.history = []

    def process_event(self, event: NegotiationEvent, metadata: dict = None) -> NegotiationState:
        key = (self.current_state, event)
        new_state = self.TRANSITIONS.get(key)

        if new_state is None:
            raise InvalidTransitionError(
                f"No transition from {self.current_state} on event {event}"
            )

        self.history.append({
            "from_state": self.current_state,
            "event": event,
            "to_state": new_state,
            "timestamp": datetime.utcnow(),
            "metadata": metadata or {}
        })

        self.current_state = new_state
        return new_state

    def is_terminal(self) -> bool:
        terminal_states = {
            NegotiationState.DISCOUNT_CAPTURED,
            NegotiationState.REJECTED,
            NegotiationState.CLOSED_NO_RESPONSE,
            NegotiationState.CLOSED_EXPIRED,
        }
        return self.current_state in terminal_states
```

### Guards: Preventing Invalid Actions

Guards are conditions that must be true for a transition to proceed:

```python
class TransitionGuard:
    @staticmethod
    def can_send_follow_up(negotiation) -> bool:
        last_sent = negotiation.last_outbound_timestamp
        min_wait = timedelta(days=3)
        return datetime.utcnow() - last_sent >= min_wait

    @staticmethod
    def is_within_discount_window(negotiation) -> bool:
        if negotiation.invoice.discount_deadline:
            return date.today() <= negotiation.invoice.discount_deadline
        return True

    @staticmethod
    def is_within_round_limit(negotiation, max_rounds=4) -> bool:
        return negotiation.round_count < max_rounds
```

## LLM-Powered Email Generation

The negotiation engine generates emails for each outbound communication: initial proposals, counter-offers, follow-ups, and final offers.

### Prompt Design for Email Generation

```python
class EmailGenerator:
    def __init__(self, llm_client, template_store):
        self.llm = llm_client
        self.templates = template_store

    async def generate_proposal(self, negotiation, terms) -> Email:
        template = self.templates.get("initial_proposal",
                                      segment=negotiation.supplier.segment)

        # Use template for structure, LLM for natural language
        prompt = f"""
        Write a professional email proposing early payment discount terms.
        Use this template structure but make the language natural and professional.

        Template: {template.text}

        Variables:
        - Supplier contact: {negotiation.supplier.contact_name}
        - Supplier company: {negotiation.supplier.company_name}
        - Our company: {negotiation.buyer_company}
        - Invoice number: {negotiation.invoice.invoice_id}
        - Invoice amount: ${negotiation.invoice.amount:,.2f}
        - Original due date: {negotiation.invoice.due_date}
        - Proposed discount: {terms.discount_percent}%
        - Proposed payment date: {terms.payment_date}
        - Discounted amount: ${terms.discounted_amount:,.2f}
        - Savings for supplier (days accelerated): {terms.days_accelerated}

        Tone: {template.tone_guidance}
        Max length: 200 words for the body (excluding headers/footers)
        Include accept link placeholder: [ACCEPT_LINK]
        """

        email_body = await self.llm.complete(prompt)

        # Post-process: inject actual accept link, verify no hallucinated terms
        email_body = self.post_process(email_body, terms, negotiation)

        return Email(
            subject=f"Early Payment Opportunity — Invoice #{negotiation.invoice.invoice_id}",
            body=email_body,
            to=negotiation.supplier.contact_email,
            reply_to=f"epd-{negotiation.id}@{REPLY_DOMAIN}"
        )

    def post_process(self, body, terms, negotiation):
        """Verify the LLM didn't hallucinate different terms."""
        # Check that the stated discount matches the actual terms
        if f"{terms.discount_percent}%" not in body:
            raise TermsMismatchError("LLM generated email with incorrect discount rate")
        if f"${terms.discounted_amount:,.2f}" not in body:
            raise TermsMismatchError("LLM generated email with incorrect amount")
        return body
```

The `post_process` step is critical. LLMs occasionally generate plausible but incorrect numbers. A verification check ensures the email always contains the exact terms the agent intends to propose.

## Response Parsing with NLP

When a supplier replies, the agent must classify the response and extract any counter-terms:

```python
class ResponseParser:
    def __init__(self, llm_client):
        self.llm = llm_client

    async def parse(self, email_body: str, negotiation_context: dict) -> ParsedResponse:
        prompt = f"""
        A supplier responded to our early payment discount proposal.

        Our proposal: {negotiation_context['last_offer_summary']}

        Their response:
        ---
        {email_body}
        ---

        Classify the response and extract information. Return JSON:
        {{
            "classification": "ACCEPT" | "COUNTER" | "REJECT" | "DEFER" | "UNRELATED",
            "confidence": 0.0 to 1.0,
            "counter_terms": {{
                "discount_percent": number or null,
                "payment_days": integer or null
            }} if classification is COUNTER else null,
            "rejection_reason": string or null if REJECT,
            "defer_until": "YYYY-MM-DD" or null if DEFER,
            "sentiment": "positive" | "neutral" | "negative",
            "requires_human_review": boolean,
            "summary": "one-sentence summary"
        }}
        """

        result = await self.llm.complete(prompt, response_format="json")
        parsed = ParsedResponse(**result)

        # Apply confidence thresholds
        if parsed.confidence < 0.70:
            parsed.requires_human_review = True

        return parsed
```

## Concession Engine

The concession engine determines what to offer in each round of negotiation:

```python
class ConcessionEngine:
    def __init__(self, config: NegotiationConfig):
        self.config = config

    def calculate_next_offer(self, negotiation, supplier_counter=None) -> OfferTerms:
        round_num = negotiation.round_count + 1
        ladder = self.config.concession_ladder

        # Get the ladder step for this round
        step_key = f"round_{round_num}"
        if step_key not in ladder:
            step_key = "walk_away"

        base_offer = ladder[step_key]

        # If supplier made a counter, factor it in
        if supplier_counter:
            adjusted_discount = self.adjust_for_counter(
                our_offer=base_offer["discount"],
                their_counter=supplier_counter.discount_percent,
                minimum=self.config.minimum_discount
            )
            base_offer = {
                "discount": adjusted_discount,
                "payment_days": base_offer["payment_days"]
            }

        # Verify the offer is above our floor
        if base_offer["discount"] < self.config.minimum_discount:
            return None  # Walk away

        return OfferTerms(
            discount_percent=base_offer["discount"],
            payment_days=base_offer["payment_days"],
            is_final=(step_key == "walk_away" or round_num >= self.config.max_rounds)
        )

    def adjust_for_counter(self, our_offer, their_counter, minimum):
        """
        Split the difference, but never go below minimum.
        Bias slightly toward our position (60/40 split).
        """
        midpoint = their_counter + (our_offer - their_counter) * 0.6
        return max(round(midpoint, 2), minimum)
```

## Audit Logging

Every action the negotiation engine takes must be logged immutably. This is non-negotiable for financial systems.

```python
class AuditLogger:
    def __init__(self, log_store):
        self.store = log_store

    async def log_event(self, negotiation_id: str, event_type: str,
                        details: dict, actor: str = "agent"):
        entry = {
            "id": generate_uuid(),
            "negotiation_id": negotiation_id,
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "actor": actor,
            "details": details,
            "checksum": self.compute_checksum(details)
        }

        await self.store.append(entry)  # Append-only — no updates or deletes
        return entry

    def compute_checksum(self, details):
        """SHA-256 hash for tamper detection."""
        import hashlib, json
        content = json.dumps(details, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()
```

### What Gets Logged

Every significant event produces an audit entry:

```python
# Proposal sent
await audit.log_event(neg.id, "proposal_sent", {
    "invoice_id": neg.invoice.invoice_id,
    "supplier_id": neg.supplier.id,
    "proposed_terms": {"discount": 2.0, "payment_days": 10},
    "email_message_id": email_result.message_id,
    "template_version": "v2.3"
})

# Response received
await audit.log_event(neg.id, "response_received", {
    "classification": parsed.classification,
    "confidence": parsed.confidence,
    "raw_response_hash": hash_email(response),
    "counter_terms": parsed.counter_terms
})

# Decision made
await audit.log_event(neg.id, "decision_made", {
    "decision": "counter_propose",
    "reasoning": "Counter of 1.0% is within range; offering 1.4%",
    "new_terms": {"discount": 1.4, "payment_days": 12},
    "round_number": 2
})

# Payment triggered
await audit.log_event(neg.id, "payment_triggered", {
    "payment_amount": 46787.50,
    "payment_method": "ACH",
    "expected_settlement": "2026-03-28",
    "erp_payment_id": "PAY-20260325-0047"
})
```

An auditor reviewing a negotiation can reconstruct every step: what was proposed, what was received, how the agent decided, and what action was taken. The checksums make it detectable if any log entry is modified after the fact.

## Human-in-the-Loop Checkpoints

The agent must know when to stop and ask a human:

```python
class HumanEscalationManager:
    def __init__(self, notification_service, config):
        self.notify = notification_service
        self.config = config

    async def check_escalation_needed(self, negotiation, event) -> bool:
        triggers = [
            self.check_amount_threshold(negotiation),
            self.check_round_limit(negotiation),
            self.check_sentiment(event),
            self.check_unusual_terms(event),
            self.check_strategic_supplier(negotiation),
        ]

        for trigger in triggers:
            if trigger.should_escalate:
                await self.escalate(negotiation, trigger.reason)
                return True
        return False

    def check_amount_threshold(self, negotiation):
        discount_value = negotiation.current_discount_value
        if discount_value > self.config.human_approval_threshold:
            return EscalationTrigger(
                should_escalate=True,
                reason=f"Discount value ${discount_value:,.2f} exceeds "
                       f"${self.config.human_approval_threshold:,.2f} threshold"
            )
        return EscalationTrigger(should_escalate=False)

    async def escalate(self, negotiation, reason):
        package = {
            "negotiation_id": negotiation.id,
            "supplier": negotiation.supplier.summary(),
            "conversation_history": negotiation.state_machine.history,
            "current_terms": negotiation.current_offer,
            "reason": reason,
            "recommended_action": self.generate_recommendation(negotiation),
            "deadline": negotiation.discount_deadline
        }

        await self.notify.send_escalation(
            to=self.config.escalation_recipients,
            package=package
        )
        negotiation.state_machine.process_event(NegotiationEvent.COUNTER_NEEDS_HUMAN)
```

The escalation package gives the human everything they need to make an informed decision without digging through systems. When the human responds, their decision feeds back into the state machine, and the agent continues execution.

In the next lesson, we will close the loop with payment execution and reconciliation — ensuring that negotiated discounts actually translate into captured savings.
