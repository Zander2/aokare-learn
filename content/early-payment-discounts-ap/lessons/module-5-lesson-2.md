# Trust, Verification, and Security in Agent Negotiation
## Module 5: Agent-to-Agent Negotiation on Causa Prima | Lesson 2

**Learning Objectives:**
- Explain the trust model used in Causa Prima agent-to-agent transactions
- Implement identity verification for agent counterparts
- Describe how cryptographic signatures ensure message integrity
- Configure authorization boundaries so agents cannot exceed their mandates

---

## Why Trust Matters More Without Humans

When two humans negotiate, trust is built through personal interaction, reputation, and the friction of face-to-face communication. If something feels wrong, a human can pause, ask questions, and apply judgment. These natural safeguards do not exist in agent-to-agent negotiation.

An autonomous agent operating at speed could:

- Accept terms from an impersonator claiming to represent a legitimate supplier
- Process a tampered message with altered discount amounts
- Exceed its authorized spending limits through rapid sequential transactions
- Bind its organization to terms that no human has reviewed

The Causa Prima trust model addresses each of these risks through four mechanisms: identity, integrity, authorization, and dispute prevention.

## Identity and Authentication

Every agent on the Causa Prima platform is bound to a verified organization. The identity chain runs from the organization through its administrator to the agent.

### The Identity Chain

```
Organization (Apex Manufacturing, verified by Causa Prima)
    └── Administrator (Jane Smith, CFO, verified by organization)
        └── Agent (agent-buyer-apex-001, provisioned by administrator)
            └── Credentials (API keys, certificates, scoped to agent)
```

### Organization Verification

Before any organization can register agents on Causa Prima, it must complete verification:

1. **Legal entity verification** — Business registration documents, tax ID validation
2. **Banking verification** — Confirming the organization controls the bank accounts associated with its agents
3. **Administrator verification** — Multi-factor authentication for the human who provisions and manages agents

This verification happens once during onboarding. After that, the organization's agents inherit its verified identity.

### Agent Credentials

Each agent receives a unique credential set:

```python
class AgentCredentials:
    def __init__(self):
        self.agent_id = "agent-buyer-apex-001"
        self.organization_id = "org-apex-manufacturing"
        self.api_key = "cp_live_..."  # For API authentication
        self.signing_key_pair = generate_ed25519_keypair()  # For message signing
        self.certificate = platform_issued_certificate()  # X.509 cert binding agent to org

    def authenticate(self, request):
        """Authenticate an API request using the agent's credentials."""
        return {
            "Authorization": f"Bearer {self.api_key}",
            "X-Agent-ID": self.agent_id,
            "X-Organization-ID": self.organization_id
        }
```

### Verifying Counterparts

When your buyer agent receives a message from a supplier agent, it must verify the sender's identity:

```python
class CounterpartVerifier:
    def __init__(self, registry_client, trust_store):
        self.registry = registry_client
        self.trust_store = trust_store

    async def verify_sender(self, message) -> VerificationResult:
        # 1. Verify the agent exists and is active on the platform
        agent_info = await self.registry.get_agent(message.sender.agent_id)
        if not agent_info or not agent_info.is_active:
            return VerificationResult(verified=False, reason="Unknown or inactive agent")

        # 2. Verify the agent belongs to the claimed organization
        if agent_info.organization_id != message.sender.organization_id:
            return VerificationResult(verified=False, reason="Agent-org mismatch")

        # 3. Verify the organization is the supplier we expect
        org_info = await self.registry.get_organization(message.sender.organization_id)
        expected_supplier = await self.get_expected_supplier(message.references.invoice_id)
        if org_info.tax_id != expected_supplier.tax_id:
            return VerificationResult(verified=False, reason="Organization does not match supplier")

        # 4. Verify the message signature (see next section)
        sig_valid = self.verify_signature(message, agent_info.public_key)
        if not sig_valid:
            return VerificationResult(verified=False, reason="Invalid signature")

        return VerificationResult(verified=True, agent_info=agent_info, org_info=org_info)
```

## Message Signing and Verification

Every message on the Causa Prima protocol is digitally signed by the sending agent. This ensures two properties:

1. **Authenticity** — The message genuinely came from the claimed sender
2. **Integrity** — The message has not been modified in transit

### Signing Process

```python
import nacl.signing
import json

class MessageSigner:
    def __init__(self, signing_key: nacl.signing.SigningKey):
        self.signing_key = signing_key

    def sign_message(self, message: dict) -> str:
        """
        Create a digital signature for the message content.
        Signs the canonical JSON representation of the message body.
        """
        # Create canonical representation (sorted keys, no whitespace)
        content_to_sign = self.canonicalize(message)

        # Sign using Ed25519
        signed = self.signing_key.sign(content_to_sign.encode())
        signature = base64.b64encode(signed.signature).decode()

        return signature

    def canonicalize(self, message: dict) -> str:
        """
        Produce a canonical string representation for signing.
        Excludes the 'signature' field itself.
        """
        signable = {k: v for k, v in message.items() if k != "signature"}
        return json.dumps(signable, sort_keys=True, separators=(',', ':'))
```

### Verification Process

```python
class MessageVerifier:
    async def verify_signature(self, message: dict, sender_public_key: bytes) -> bool:
        """Verify that the message was signed by the claimed sender."""
        try:
            verify_key = nacl.signing.VerifyKey(sender_public_key)
            content = self.canonicalize(message)
            signature = base64.b64decode(message["signature"])
            verify_key.verify(content.encode(), signature)
            return True
        except nacl.exceptions.BadSignatureError:
            return False
```

### What Signing Prevents

Without signing, an attacker could:

- **Intercept and modify** a proposal message, changing the discount from 1% to 5%
- **Impersonate** a supplier agent and send acceptance messages for discounts the real supplier never agreed to
- **Replay** an old acceptance message to trigger an unauthorized payment

With signing, any modification to the message invalidates the signature, and the receiving agent rejects the message.

## Authorization Boundaries

Even with verified identity and signed messages, an agent must operate within its authorized scope. Authorization boundaries prevent an agent from exceeding its mandate, whether through a bug, misconfiguration, or adversarial exploitation.

### Defining Authorization Scopes

The organization administrator configures what the agent can do:

```python
authorization_config = {
    "agent_id": "agent-buyer-apex-001",

    "negotiation_limits": {
        "max_discount_percent": 3.0,          # Cannot agree to > 3% discount
        "max_single_payment": 250_000,         # Cannot commit > $250K per payment
        "max_daily_commitment": 1_000_000,     # Cannot commit > $1M per day
        "max_payment_acceleration_days": 50,   # Cannot pay > 50 days early
        "allowed_payment_methods": ["ACH", "wire"],
        "allowed_currencies": ["USD", "EUR", "GBP"],
    },

    "supplier_restrictions": {
        "excluded_suppliers": ["SUP-BLOCKED-001"],
        "requires_human_approval": {
            "supplier_segments": ["strategic"],
            "invoice_amount_above": 100_000,
        }
    },

    "operational_limits": {
        "max_concurrent_negotiations": 100,
        "max_proposals_per_hour": 50,
        "max_rounds_per_negotiation": 6,
    }
}
```

### Enforcement at Multiple Layers

Authorization is enforced at three layers to provide defense in depth:

**Layer 1: Agent Self-Check.** Before sending any message, the agent validates against its own configuration:

```python
class AuthorizationGuard:
    def __init__(self, config):
        self.config = config
        self.daily_commitment = Decimal("0")

    def authorize_proposal(self, terms, invoice) -> AuthResult:
        # Check discount limit
        if terms.discount_percent > self.config.max_discount_percent:
            return AuthResult(authorized=False,
                reason=f"Discount {terms.discount_percent}% exceeds max {self.config.max_discount_percent}%")

        # Check payment amount
        payment = invoice.amount * (1 - terms.discount_percent / 100)
        if payment > self.config.max_single_payment:
            return AuthResult(authorized=False,
                reason=f"Payment ${payment:,.2f} exceeds single-payment max")

        # Check daily commitment
        if self.daily_commitment + payment > self.config.max_daily_commitment:
            return AuthResult(authorized=False,
                reason="Would exceed daily commitment limit")

        return AuthResult(authorized=True)
```

**Layer 2: Platform Enforcement.** The Causa Prima platform validates every message against the agent's registered authorization scope before delivering it to the counterpart. A message that exceeds the agent's scope is rejected by the platform, not by the counterpart — preventing even accidental overcommitment.

**Layer 3: Post-Transaction Audit.** Every completed negotiation is logged and available for review. Automated alerts flag any transaction that approaches authorization limits.

### Why Three Layers?

A single enforcement point is a single point of failure. If the agent's self-check has a bug that allows a $500K payment when the limit is $250K, the platform enforcement catches it. If both have the same bug (unlikely but possible), the post-transaction audit catches it within hours. Defense in depth is standard practice for financial systems.

## Dispute Prevention Through Protocol Design

The structured protocol itself prevents many common disputes:

### Explicit Terms

Every PROPOSAL and COUNTER message contains exact numeric terms. There is no "around 1.5%" or "approximately $46,000." The protocol requires:

```json
{
  "discount_percent": 1.50,
  "discounted_amount": 46787.50,
  "discount_amount": 712.50,
  "payment_date": "2026-03-28"
}
```

Both agents can verify that the arithmetic is correct (`47500.00 * 0.015 = 712.50` and `47500.00 - 712.50 = 46787.50`). An inconsistency in the numbers triggers an automatic rejection.

### Mutual Record

Both the buyer agent and supplier agent receive identical copies of every message through the platform. Neither party can claim "I never received that message" or "my message said something different." The audit service provides a neutral third-party record.

### Expiration Timestamps

Every proposal has an explicit expiry. After expiration, the proposal is void — no agent can accept expired terms. This prevents scenarios where a supplier agent accepts a stale proposal after market conditions have changed.

### Sequence Numbers

Messages within a conversation are sequentially numbered. The protocol rejects out-of-order messages, preventing replay attacks and ensuring both agents are responding to the same negotiation state.

```python
def validate_sequence(self, message, conversation):
    expected_seq = len(conversation.messages) + 1
    if message.sequence_number != expected_seq:
        raise ProtocolViolation(
            f"Expected sequence {expected_seq}, got {message.sequence_number}"
        )
```

## Practical Configuration

When setting up a buyer agent on Causa Prima, configure these trust-related settings:

1. **Auto-verify mode:** Accept messages from any platform-verified agent, or require pre-registered counterpart relationships?
2. **Signature algorithm:** Ed25519 (recommended) or RSA-2048?
3. **Key rotation schedule:** How frequently to rotate signing keys (recommended: quarterly)?
4. **Authorization review cadence:** How often does the administrator review and update authorization limits?
5. **Fallback behavior:** What happens when verification fails? Reject silently, reject with reason, or escalate to human?

For most organizations starting with agent-to-agent negotiation, a conservative configuration is appropriate: pre-registered counterparts only, quarterly key rotation, and escalation on verification failure. As comfort grows, the configuration can be relaxed.

In the next lesson, we will move from the mechanics of trust and security to the strategic question: how do you optimize negotiation outcomes when both parties are intelligent, adaptive agents?
