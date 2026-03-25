# The Causa Prima Agent-to-Agent Protocol
## Module 5: Agent-to-Agent Negotiation on Causa Prima | Lesson 1

**Learning Objectives:**
- Describe the Causa Prima agent-to-agent communication protocol and message format
- Explain how agent-to-agent negotiation differs from agent-to-human email negotiation
- Identify the advantages of direct negotiation (speed, consistency, reduced ambiguity)
- Configure an agent to detect when a supplier is also on Causa Prima and switch to direct negotiation

---

## From Email to Direct Negotiation

In Modules 3 and 4, we built an agent that negotiates with suppliers via email. Email works — it is transparent, auditable, and familiar. But email negotiation has inherent limitations:

- **Speed:** Email round-trips take hours or days. A negotiation with two counter-offers might take a week.
- **Ambiguity:** Natural language responses require parsing, and even good LLMs make classification errors 5-10% of the time.
- **Overhead:** Each email must be composed, sent, delivered, read, and responded to. The friction is significant at scale.
- **Limited expressiveness:** Email is a single-channel medium. Complex proposals involving multiple variables (discount rate, timing, volume, bundling) are hard to express clearly in prose.

When both the buyer and the supplier operate agents on the Causa Prima platform, all of these limitations disappear. Agent-to-agent negotiation uses structured messages, resolves in seconds instead of days, and eliminates ambiguity entirely.

## Causa Prima Platform Overview

Causa Prima provides shared infrastructure for AP and AR agents. Think of it as a marketplace where buyer agents and supplier agents find each other and transact directly.

### Platform Components

```
┌─────────────────────────────────────────────────────────┐
│                    Causa Prima Platform                   │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Discovery│    │ Negotiation  │    │ Settlement   │   │
│  │ Registry │    │ Protocol     │    │ Service      │   │
│  └──────────┘    └──────────────┘    └──────────────┘   │
│                                                          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Identity │    │ Audit        │    │ Analytics    │   │
│  │ & Trust  │    │ Service      │    │ Service      │   │
│  └──────────┘    └──────────────┘    └──────────────┘   │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ Buyer Agent (AP)     │  │ Supplier Agent (AR)      │ │
│  │ - Invoice ingestion  │  │ - Invoice tracking       │ │
│  │ - Discount scoring   │  │ - Cash flow optimization │ │
│  │ - Payment execution  │  │ - Discount policies      │ │
│  └──────────────────────┘  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Discovery Registry:** Maintains a directory of registered agents, their capabilities, and their organizations. This is how a buyer agent discovers whether a supplier also has an agent on the platform.

**Negotiation Protocol:** The structured message format and rules for conducting negotiations. Defines valid message types, sequencing, and timeouts.

**Settlement Service:** Coordinates payment execution between buyer and supplier after terms are agreed.

**Identity & Trust:** Manages agent credentials, organizational verification, and authorization scopes.

**Audit Service:** Records every message and decision for both parties' review.

**Analytics Service:** Provides cross-negotiation insights and benchmarking data.

## The Agent-to-Agent Protocol

The Causa Prima negotiation protocol uses structured JSON messages with strict semantics. There is no ambiguity — every field has a defined type and meaning.

### Message Types

The protocol defines five core message types:

```python
class MessageType(Enum):
    PROPOSAL = "proposal"        # Initial offer from either party
    COUNTER = "counter"          # Counter-offer with modified terms
    ACCEPT = "accept"            # Agreement to the current terms
    REJECT = "reject"            # Decline with optional reason
    WITHDRAW = "withdraw"        # Cancel a pending proposal
```

### Message Format

Every message follows a standard schema:

```json
{
  "protocol_version": "1.0",
  "message_id": "msg-uuid-here",
  "conversation_id": "conv-uuid-here",
  "timestamp": "2026-03-25T14:30:00Z",
  "sender": {
    "agent_id": "agent-buyer-apex-001",
    "organization_id": "org-apex-manufacturing",
    "role": "buyer"
  },
  "receiver": {
    "agent_id": "agent-supplier-midwest-001",
    "organization_id": "org-midwest-components",
    "role": "supplier"
  },
  "message_type": "proposal",
  "references": {
    "invoice_id": "INV-48291",
    "invoice_amount": 47500.00,
    "invoice_currency": "USD",
    "original_due_date": "2026-04-14",
    "in_reply_to": null
  },
  "terms": {
    "discount_percent": 2.0,
    "payment_date": "2026-03-28",
    "discounted_amount": 46550.00,
    "discount_amount": 950.00,
    "payment_method": "ACH"
  },
  "metadata": {
    "proposal_expiry": "2026-03-26T14:30:00Z",
    "is_final_offer": false,
    "round_number": 1,
    "notes": null
  },
  "signature": "base64-encoded-digital-signature"
}
```

### Protocol Rules

The protocol enforces sequencing rules:

1. **A conversation starts with a PROPOSAL** from either the buyer or supplier agent
2. **A PROPOSAL can be replied to with** ACCEPT, COUNTER, or REJECT
3. **A COUNTER is itself a proposal** and follows the same reply rules
4. **ACCEPT is terminal** — it ends the negotiation in agreement
5. **REJECT is terminal** — it ends the negotiation without agreement
6. **WITHDRAW cancels** the sender's most recent PROPOSAL or COUNTER
7. **Proposals expire** after the specified `proposal_expiry` timestamp
8. **Maximum rounds** are configurable per conversation (default: 6)

```python
class ProtocolValidator:
    VALID_RESPONSES = {
        MessageType.PROPOSAL: {MessageType.ACCEPT, MessageType.COUNTER, MessageType.REJECT},
        MessageType.COUNTER: {MessageType.ACCEPT, MessageType.COUNTER, MessageType.REJECT},
    }

    def validate_message(self, message, conversation_history):
        # Check: is this a valid response to the last message?
        if conversation_history:
            last_msg = conversation_history[-1]
            valid_types = self.VALID_RESPONSES.get(last_msg.message_type, set())
            if message.message_type not in valid_types:
                raise ProtocolViolation(
                    f"Cannot send {message.message_type} in response to {last_msg.message_type}"
                )

        # Check: has the previous proposal expired?
        if conversation_history:
            last_msg = conversation_history[-1]
            if last_msg.metadata.proposal_expiry < datetime.utcnow():
                raise ProtocolViolation("Previous proposal has expired")

        # Check: round limit
        round_count = sum(1 for m in conversation_history
                         if m.message_type in {MessageType.PROPOSAL, MessageType.COUNTER})
        if round_count >= self.max_rounds:
            raise ProtocolViolation(f"Maximum rounds ({self.max_rounds}) reached")

        return True
```

## Discovery: Finding Supplier Agents

Before the buyer agent can use the direct protocol, it must discover whether the supplier has an agent on Causa Prima.

### The Discovery Flow

```python
class SupplierDiscovery:
    def __init__(self, registry_client):
        self.registry = registry_client

    async def find_supplier_agent(self, supplier_id: str,
                                   supplier_name: str,
                                   supplier_tax_id: str = None) -> Optional[AgentInfo]:
        """
        Look up whether a supplier has a registered agent on Causa Prima.
        Uses multiple identifiers for matching reliability.
        """
        # Try exact match on organization ID first
        result = await self.registry.lookup(
            organization_id=supplier_id,
            agent_type="supplier"
        )

        if result:
            return result

        # Fall back to tax ID matching
        if supplier_tax_id:
            result = await self.registry.lookup_by_tax_id(supplier_tax_id)
            if result:
                return result

        # Fall back to fuzzy name matching (requires verification)
        candidates = await self.registry.search(
            organization_name=supplier_name,
            agent_type="supplier"
        )

        if len(candidates) == 1:
            return candidates[0]
        elif len(candidates) > 1:
            # Ambiguous: return None, fall back to email
            return None

        return None  # Not on platform
```

### Channel Selection Logic

The agent decides which negotiation channel to use based on discovery results:

```python
class ChannelSelector:
    async def select_channel(self, supplier, opportunity) -> str:
        # Check if supplier has an agent on Causa Prima
        agent_info = await self.discovery.find_supplier_agent(
            supplier.id, supplier.name, supplier.tax_id
        )

        if agent_info and agent_info.is_active and agent_info.supports_discount_negotiation:
            # Direct agent-to-agent negotiation
            return "causa_prima_direct"

        elif supplier.has_email_contact:
            # Email-based negotiation
            return "email"

        else:
            # No contact method available
            return "manual_outreach_required"
```

When the channel is `causa_prima_direct`, the agent uses the structured protocol. When it is `email`, the agent uses the email-based approach from Modules 3-4. The scoring, strategy, and business logic remain the same — only the communication mechanism changes.

## Advantages of Direct Negotiation

### Speed

An email negotiation with one counter-offer might take 5-7 days:
- Day 1: Send proposal
- Day 3: Receive counter
- Day 3: Evaluate and send counter-counter
- Day 5: Receive acceptance
- Day 5-7: Trigger and confirm payment

The same negotiation via the Causa Prima protocol completes in seconds:

```
T+0.0s:  Buyer agent sends PROPOSAL
T+0.5s:  Supplier agent evaluates and sends COUNTER
T+1.0s:  Buyer agent evaluates and sends COUNTER
T+1.5s:  Supplier agent evaluates and sends ACCEPT
T+2.0s:  Settlement service initiates payment
```

Sub-second response times mean the entire negotiation, including multiple rounds, finishes before a human would have finished reading the first email.

### Consistency

Structured messages eliminate parsing errors. When a supplier agent sends `"discount_percent": 1.25`, there is no ambiguity about whether they mean 1.25% or $1.25 or 1.25 basis points. The schema defines the field's type and semantics precisely.

### Reduced Ambiguity

No more interpreting whether "we could consider something around 1%" is a firm counter-offer or a soft expression of interest. The protocol forces clear semantics: PROPOSAL, COUNTER, ACCEPT, REJECT. The terms are explicit and machine-readable.

### Multi-Variable Negotiation

The structured format supports negotiation across multiple dimensions simultaneously:

```json
{
  "terms": {
    "discount_percent": 1.5,
    "payment_date": "2026-03-28",
    "payment_method": "wire",
    "volume_commitment": {
      "min_invoices_per_quarter": 10,
      "min_spend_per_quarter": 200000
    },
    "relationship_terms": {
      "preferred_supplier_status": true,
      "payment_guarantee": "net_30_max"
    }
  }
}
```

Expressing this in a professional email would require paragraphs. In the protocol, it is a single structured message that both agents can evaluate programmatically.

### Audit Quality

Both agents automatically log every message through the platform's audit service. The audit trail is complete, tamper-evident, and immediately available to both parties. No need to search through email archives or reconstruct conversations from forwarded threads.

In the next lesson, we will examine how trust and security work in this direct agent-to-agent model — ensuring that both parties can rely on the integrity of the negotiation.
