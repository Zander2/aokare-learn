# Negotiation Frameworks for AI Agents
## Module 3: Supplier Communication and Negotiation Strategy | Lesson 2

**Learning Objectives:**
- Describe three negotiation strategies an agent can employ (anchoring, BATNA-based, concession ladders)
- Configure an agent's negotiation parameters (opening offer, walk-away point, concession steps)
- Explain how agents adapt strategy based on supplier responses
- Set ethical boundaries that prevent aggressive or manipulative negotiation tactics
- Design a multi-round negotiation flow with defined escalation rules

---

## Negotiation Theory for Autonomous Agents

When a human negotiates a discount with a supplier over lunch, they rely on intuition, body language, relationship history, and improvisation. An AI agent has none of these. What it has instead is consistency, speed, and the ability to follow a well-designed strategy across thousands of parallel negotiations without fatigue or bias.

The challenge is encoding negotiation wisdom into rules the agent can execute. Three frameworks from negotiation theory translate well to autonomous agents.

## Framework 1: Anchoring

Anchoring is the principle that the first number in a negotiation disproportionately influences the outcome. In experimental studies, negotiators who open with ambitious (but defensible) first offers consistently achieve better results than those who open conservatively.

### How Agents Use Anchoring

The agent's opening discount proposal serves as the anchor. If the agent's acceptable range is 1.0% to 2.0%, it opens at 2.0% — the upper end of the acceptable range.

```python
def calculate_opening_offer(target_discount, acceptable_minimum, anchor_factor=1.3):
    """
    anchor_factor > 1.0 means opening above target.
    Capped at reasonable maximum to avoid appearing unreasonable.
    """
    opening = target_discount * anchor_factor
    max_reasonable = acceptable_minimum * 3  # Never ask for 3x the minimum
    return min(opening, max_reasonable)

# Example:
# Target: 1.5%, Minimum: 1.0%
# Opening: 1.5% * 1.3 = 1.95% → rounded to 2.0%
```

The anchor must be defensible. An opening offer of 5% when industry norms are 1-2% will be dismissed immediately. The agent should calibrate its anchor based on:

- Industry benchmarks for the supplier's sector
- Historical terms the supplier has accepted
- The annualized equivalent rate (to ensure the offer is still attractive for the buyer)

## Framework 2: BATNA-Based Negotiation

BATNA — Best Alternative to a Negotiated Agreement — is the fallback position if negotiation fails. For the buyer agent, the BATNA is simply paying at standard terms (no discount). For the supplier, the BATNA is receiving full payment on the regular due date.

### Applying BATNA in Agent Design

The agent's BATNA is always clear: pay at net terms and earn 0% discount. Any accepted discount is better than the BATNA. This means the agent should be willing to accept even modest discounts — a 0.5% discount is better than 0%.

But BATNA awareness also prevents the agent from overpaying for early payment:

```python
def evaluate_against_batna(proposed_discount, payment_acceleration_days, cost_of_capital):
    """
    Ensure the discount exceeds the cost of deploying capital early.
    """
    annualized_rate = (proposed_discount / (100 - proposed_discount)) * \
                      (365 / payment_acceleration_days)

    # BATNA threshold: discount must exceed cost of capital
    if annualized_rate < cost_of_capital:
        return "reject"  # We'd be paying more for early payment than it's worth
    else:
        return "acceptable"
```

If your cost of capital is 8%, a 0.3% discount for 20-day acceleration yields an annualized rate of about 5.5% — below your cost of capital. The agent should reject or counter-propose, because paying early under these terms actually destroys value.

### Understanding the Supplier's BATNA

The supplier's BATNA — receiving full payment at net terms — helps the agent assess negotiating leverage. A supplier with strong cash flow has a good BATNA and less incentive to discount. A supplier with tight cash flow has a poor BATNA and more incentive.

The receptiveness prediction model from Lesson 2.3 indirectly captures BATNA strength. Suppliers with high predicted acceptance rates likely have weaker BATNAs (they need the cash), while those with low acceptance rates have stronger BATNAs (they can afford to wait).

## Framework 3: Concession Ladders

A concession ladder is a predefined sequence of offers the agent makes across multiple rounds of negotiation. Each step reduces the agent's ask by a calculated amount, signaling willingness to compromise while protecting the bottom line.

### Designing the Ladder

```python
concession_ladder = {
    "round_1": {"discount": 2.0, "payment_days": 10},   # Opening offer
    "round_2": {"discount": 1.75, "payment_days": 10},   # First concession
    "round_3": {"discount": 1.5, "payment_days": 12},    # Concede on both dimensions
    "round_4": {"discount": 1.25, "payment_days": 15},   # Final offer
    "walk_away": {"discount": 1.0, "payment_days": 15},  # Minimum acceptable
}
```

Key principles for ladder design:

**Decreasing concession sizes.** The first concession is 0.25%, the second 0.25%, and subsequent ones are smaller. This signals that the agent is approaching its limit. Large equal-sized concessions signal there is more room to negotiate.

**Concede on secondary dimensions.** Notice round 3 concedes on payment timing (10 to 12 days) while also reducing the discount. This creates the impression of a meaningful concession while actually reducing the cost — paying on day 12 instead of day 10 saves 2 days of cash deployment.

**Firm walk-away.** The agent must have a hard floor. Below 1.0% in this example, the agent walks away. This prevents the negotiation from drifting to terms that do not serve the buyer.

## The Multi-Round Negotiation Flow

Real negotiations rarely conclude in one round. The agent must handle a back-and-forth conversation over days or weeks.

### State Machine Design

```
[IDENTIFY] → [PROPOSE] → [AWAIT_RESPONSE] → [EVALUATE] → [COUNTER/ACCEPT/WALK_AWAY]
                                                    ↓
                                              [ESCALATE_TO_HUMAN]
```

Each state has defined entry conditions, actions, and transitions:

```python
negotiation_states = {
    "PROPOSE": {
        "entry_action": "send_proposal_email",
        "timeout_days": 5,
        "timeout_transition": "FOLLOW_UP"
    },
    "AWAIT_RESPONSE": {
        "entry_action": None,
        "on_accept": "ACCEPTED",
        "on_reject": "EVALUATE_REJECT",
        "on_counter": "EVALUATE_COUNTER",
        "on_timeout": "FOLLOW_UP"
    },
    "FOLLOW_UP": {
        "entry_action": "send_follow_up_email",
        "max_follow_ups": 2,
        "follow_up_interval_days": 3,
        "on_max_reached": "CLOSED_NO_RESPONSE"
    },
    "EVALUATE_COUNTER": {
        "entry_action": "evaluate_counter_offer",
        "on_acceptable": "ACCEPTED",
        "on_within_range": "COUNTER_PROPOSE",
        "on_below_minimum": "FINAL_OFFER",
        "on_needs_human": "ESCALATE"
    },
    "COUNTER_PROPOSE": {
        "entry_action": "send_counter_offer",
        "next_state": "AWAIT_RESPONSE",
        "max_rounds": 4
    },
    "FINAL_OFFER": {
        "entry_action": "send_final_offer",
        "next_state": "AWAIT_FINAL_RESPONSE"
    },
    "ACCEPTED": {
        "entry_action": "schedule_early_payment",
        "final": True
    },
    "CLOSED_NO_RESPONSE": {
        "entry_action": "record_no_response",
        "final": True
    },
    "ESCALATE": {
        "entry_action": "notify_human_negotiator",
        "final": False  # Human takes over
    }
}
```

### Timing Between Rounds

The agent must pace its responses appropriately. Responding to a counter-offer in 30 seconds feels robotic and does not give the supplier time to consider. Responding after 3 days loses momentum.

Recommended timing:

| Action | Response Time |
|--------|--------------|
| Initial proposal | Within 1 business day of opportunity identification |
| Response to supplier acceptance | Within 2 hours (trigger payment) |
| Response to counter-offer | 4-8 business hours |
| Follow-up on no response | 3-5 business days |
| Second follow-up | 5-7 business days after first |

These delays are intentional. They make the agent feel like a responsive but thoughtful counterpart, not an impatient algorithm.

## Adapting Strategy Based on Responses

The agent should not mechanically follow the concession ladder regardless of context. It should adapt based on what the supplier communicates:

### Supplier Signals Warmth

If the supplier responds with something like "We're interested but 2% is too high — could you do 1.5%?", the agent has valuable information:

- The supplier is engaged (positive signal)
- They have a specific threshold (1.5%)
- They did not reject outright

The agent should respond with a offer close to but slightly above the supplier's stated preference — say 1.6% — to find the real ceiling.

### Supplier Signals Resistance

If the supplier says "We don't typically offer discounts," the agent should:

1. Acknowledge the response respectfully
2. Make one alternative proposal with adjusted terms (e.g., lower discount, shorter acceleration)
3. If still rejected, close gracefully and update the supplier profile

### Supplier Ignores

Non-response is the most common outcome. The agent follows its follow-up cadence, then closes. Some suppliers do not respond to email-based proposals but will engage on the Causa Prima platform directly (Module 5).

## Ethical Guardrails

An autonomous negotiation agent operates without real-time human oversight for most interactions. Ethical boundaries must be built into the system, not left to case-by-case judgment.

### Fairness Constraints

```python
ethical_rules = {
    # Never exploit information asymmetry
    "max_discount_request": 0.03,     # Never ask for more than 3%
    "min_payment_days": 5,            # Never propose payment faster than 5 days

    # Relationship preservation
    "max_proposals_per_year": 4,      # Don't over-solicit
    "cooldown_after_rejection": 30,   # 30-day wait after a rejection
    "respect_opt_out": True,          # Permanent, no exceptions

    # Power imbalance awareness
    "small_supplier_discount_cap": 0.015,  # Max 1.5% for suppliers < $5M revenue
    "no_bundle_pressure": True,       # Don't tie discount to future business
}
```

### Why Small Supplier Caps Matter

A $500M buyer negotiating with a $2M supplier has enormous leverage. The supplier may feel pressured to accept unfavorable terms to maintain the relationship. Capping the discount request for small suppliers prevents the agent from extracting value disproportionately. This is not just ethical — it is strategic. Small suppliers who feel squeezed become unreliable suppliers.

### Transparency Requirements

The agent should never misrepresent itself. Suppliers must know they are interacting with an automated system if they ask, and the proposals must come from an authorized business representative. The line between "AI-assisted communication" and "AI-impersonating a human" matters — stay clearly on the right side.

### Escalation Triggers

Certain situations should always trigger human review:

- Supplier expresses frustration or threatens to terminate the relationship
- Counter-offer terms are outside the agent's configured range
- The supplier raises a question the agent cannot answer from its knowledge base
- A negotiation has been ongoing for more than 4 rounds without resolution
- The discount amount exceeds the single-payment approval threshold

The escalation should include full context: the negotiation history, the supplier's profile, the proposed terms, and a recommended action. The human picks up where the agent left off, with complete visibility.

In the next lesson, we will dive deeper into handling the specific types of supplier responses the agent will encounter and designing the response logic for each.
