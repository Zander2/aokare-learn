# Optimizing Agent-to-Agent Negotiation Outcomes
## Module 5: Agent-to-Agent Negotiation on Causa Prima | Lesson 3

**Learning Objectives:**
- Implement strategies that maximize mutual benefit in agent-to-agent negotiations
- Configure time-based negotiation tactics (urgency signals, deadline awareness)
- Analyze negotiation logs to identify patterns and refine agent behavior
- Explain how game-theoretic principles apply to repeated agent-to-agent interactions
- Design agents that build cooperative relationships over multiple negotiation rounds

---

## From Zero-Sum to Positive-Sum

A naive approach to negotiation treats it as zero-sum: every dollar the buyer saves on a discount is a dollar the supplier loses. This framing is technically accurate for a single transaction but strategically wrong for an ongoing relationship.

The reality is that early payment creates value for both parties:

- The buyer earns a return on capital that exceeds their cost of capital
- The supplier reduces their cost of financing by receiving cash earlier

The negotiation is about **dividing the surplus**, not about one party winning at the other's expense. When both sides understand this, negotiations converge faster and produce more total value.

### Quantifying Mutual Benefit

Consider a $100,000 invoice with net 30 terms:

| Scenario | Buyer Value | Supplier Value | Total Value Created |
|----------|-------------|---------------|-------------------|
| No discount (net 30) | $0 | $0 | $0 |
| 1.0% / day 10 | $1,000 earned on 18.43% annualized | Saves ~$550 in financing costs | $1,550 |
| 1.5% / day 10 | $1,500 earned | Saves ~$550 but gives up $1,500 | Net: $1,500 for buyer, $-950 for supplier |
| 1.0% / day 5 | $1,000 earned on 14.83% annualized | Saves ~$685 in financing costs | $1,685 |

The 1.0% at day 5 scenario creates the most total value because the supplier's financing cost savings from 25 days of acceleration exceed their savings from 20 days, and the buyer still earns a rate above their cost of capital.

An agent optimizing for mutual benefit would explore payment timing as a variable, not just the discount percentage.

### Implementing Positive-Sum Strategies

```python
class CooperativeNegotiator:
    def generate_proposal(self, invoice, supplier_profile, buyer_preferences):
        """
        Generate a proposal that maximizes joint surplus.
        """
        # Estimate supplier's cost of capital (from profile or industry default)
        supplier_financing_cost = supplier_profile.estimated_financing_rate or 0.12

        # Calculate buyer's minimum acceptable rate
        buyer_min_rate = buyer_preferences.cost_of_capital * 1.2  # 20% premium

        # Find the payment day that maximizes joint value
        best_day = None
        best_joint_value = 0

        for payment_day in range(5, invoice.net_days):
            days_accelerated = invoice.net_days - payment_day

            # Supplier value: financing cost avoided
            supplier_value = invoice.amount * (supplier_financing_cost / 365) * days_accelerated

            # Find the discount that splits the surplus fairly
            max_discount_pct = (supplier_value / invoice.amount) * 100
            proposed_discount = max_discount_pct * 0.5  # Split surplus 50/50

            # Verify buyer's return exceeds minimum
            annualized = (proposed_discount / (100 - proposed_discount)) * \
                         (365 / days_accelerated)
            if annualized < buyer_min_rate:
                continue

            buyer_value = invoice.amount * proposed_discount / 100
            joint_value = buyer_value + (supplier_value - buyer_value)

            if joint_value > best_joint_value:
                best_joint_value = joint_value
                best_day = payment_day
                best_discount = proposed_discount

        if best_day:
            return ProposalTerms(
                discount_percent=round(best_discount, 2),
                payment_day=best_day,
                rationale="positive_sum_optimization"
            )
        return None
```

## Repeated Games: Learning Over Time

The most powerful dynamic in agent-to-agent negotiation is **repetition**. Your buyer agent and a supplier's agent will negotiate dozens or hundreds of times per year. This transforms the game from a one-shot interaction to a repeated game, where cooperative strategies dominate.

### Tit-for-Tat and Beyond

In game theory, the tit-for-tat strategy (cooperate first, then mirror the opponent's last move) is remarkably effective in repeated games. Adapted for discount negotiation:

```python
class RepeatedGameStrategy:
    def __init__(self, history_store):
        self.history = history_store

    async def select_strategy(self, supplier_agent_id):
        past_negotiations = await self.history.get_negotiations(
            counterpart=supplier_agent_id, limit=20
        )

        if not past_negotiations:
            # First interaction: cooperate (make a fair opening offer)
            return "cooperative_opening"

        # Analyze the supplier agent's pattern
        outcomes = [n.outcome for n in past_negotiations]
        last_outcome = outcomes[0]

        # Calculate cooperation score
        accepted = sum(1 for o in outcomes if o == "accepted")
        cooperation_rate = accepted / len(outcomes)

        if cooperation_rate > 0.7:
            # Highly cooperative counterpart: maintain cooperation
            return "generous_offer"
        elif cooperation_rate > 0.4:
            # Mixed signals: standard approach
            return "standard_offer"
        elif last_outcome == "accepted":
            # Reciprocate recent cooperation
            return "standard_offer"
        else:
            # Low cooperation: reduce investment but don't punish
            return "conservative_offer"

    def apply_strategy(self, strategy, base_terms):
        adjustments = {
            "generous_offer": {"discount_adjustment": -0.15},  # Ask for less (more generous to supplier)
            "cooperative_opening": {"discount_adjustment": 0.0},  # Neutral
            "standard_offer": {"discount_adjustment": 0.0},
            "conservative_offer": {"discount_adjustment": +0.10},  # Ask for more (less generous)
        }

        adj = adjustments[strategy]
        return ProposalTerms(
            discount_percent=base_terms.discount_percent + adj["discount_adjustment"],
            payment_day=base_terms.payment_day
        )
```

### Building Cooperative Relationships

Beyond tit-for-tat, agents can signal cooperative intent through several mechanisms:

**Consistency.** Always making fair proposals, even when leverage is high, builds trust. A supplier agent that consistently sees reasonable offers will be more likely to accept quickly.

**Reciprocity signals.** The Causa Prima protocol supports metadata fields where agents can express relationship intent:

```json
{
  "metadata": {
    "relationship_signals": {
      "preferred_partner": true,
      "reliability_score": 0.95,
      "historical_on_time_payment_rate": 0.98,
      "willing_to_commit_volume": true
    }
  }
}
```

These signals are not binding — they are informational. But a supplier agent that sees `on_time_payment_rate: 0.98` has a data-driven reason to accept a slightly lower discount, knowing that the buyer is reliable.

**Reliability scoring.** Both agents can track the other's reliability — did they follow through on agreed terms? Was payment made on time? Was the correct amount paid? High reliability scores lead to faster, more favorable negotiations.

## Time Dynamics

Payment timing creates urgency dynamics that both agents can exploit or respond to.

### Urgency from the Buyer Side

When the discount deadline is approaching, the buyer agent becomes more willing to accept lower discounts. A sophisticated supplier agent can detect this urgency and hold for better terms.

Counter-strategy: never reveal urgency through negotiation behavior. The buyer agent should maintain consistent timing in its messages regardless of the deadline:

```python
def calculate_response_delay(self, negotiation, suppress_urgency=True):
    """
    Maintain consistent response timing regardless of internal urgency.
    """
    if suppress_urgency:
        # Always respond in 2-4 hours, regardless of deadline pressure
        return timedelta(hours=random.uniform(2, 4))
    else:
        # Urgency-aware timing (reveals information)
        days_to_deadline = (negotiation.discount_deadline - date.today()).days
        if days_to_deadline <= 2:
            return timedelta(minutes=30)
        else:
            return timedelta(hours=random.uniform(2, 8))
```

### Urgency from the Supplier Side

Suppliers also have cash flow deadlines. A supplier agent at month-end with payroll obligations may be more willing to accept a lower discount for immediate payment. The buyer agent can detect this pattern over time:

```python
async def detect_supplier_urgency(self, supplier_agent_id, current_date):
    """
    Analyze historical patterns to detect if the supplier agent
    shows increased acceptance around certain dates.
    """
    history = await self.get_negotiation_history(supplier_agent_id)

    monthly_acceptance_rates = {}
    for neg in history:
        day_of_month = neg.resolution_date.day
        bucket = "early" if day_of_month <= 10 else "mid" if day_of_month <= 20 else "late"
        monthly_acceptance_rates.setdefault(bucket, []).append(neg.outcome == "accepted")

    rates = {k: sum(v) / len(v) for k, v in monthly_acceptance_rates.items()}
    # rates might be: {"early": 0.45, "mid": 0.50, "late": 0.72}

    current_bucket = "early" if current_date.day <= 10 else "mid" if current_date.day <= 20 else "late"
    return rates.get(current_bucket, 0.5)
```

## Log Analysis: Identifying Winning Patterns

Agent-to-agent negotiations produce structured logs that are ideal for analytical mining.

### Outcome Analysis by Strategy

```python
async def analyze_strategy_effectiveness(self, time_period_days=90):
    """
    Which negotiation strategies produce the best outcomes?
    """
    negotiations = await self.get_completed_negotiations(days=time_period_days)

    strategy_results = {}
    for neg in negotiations:
        strategy = neg.strategy_used
        if strategy not in strategy_results:
            strategy_results[strategy] = {
                "count": 0, "accepted": 0, "avg_discount": [],
                "avg_rounds": [], "avg_time_seconds": []
            }

        results = strategy_results[strategy]
        results["count"] += 1
        if neg.outcome == "accepted":
            results["accepted"] += 1
            results["avg_discount"].append(neg.final_discount_percent)
        results["avg_rounds"].append(neg.round_count)
        results["avg_time_seconds"].append(neg.duration_seconds)

    # Summarize
    for strategy, data in strategy_results.items():
        print(f"\nStrategy: {strategy}")
        print(f"  Acceptance rate: {data['accepted']/data['count']:.1%}")
        print(f"  Avg discount when accepted: {sum(data['avg_discount'])/len(data['avg_discount']):.2f}%"
              if data['avg_discount'] else "  No acceptances")
        print(f"  Avg rounds: {sum(data['avg_rounds'])/len(data['avg_rounds']):.1f}")
        print(f"  Avg duration: {sum(data['avg_time_seconds'])/len(data['avg_time_seconds']):.0f}s")
```

### Counterpart Behavior Clustering

Group supplier agents by behavior patterns to optimize strategy selection:

```python
async def cluster_counterpart_behavior(self):
    """
    Identify supplier agent behavior patterns.
    """
    counterparts = await self.get_all_counterparts()

    profiles = []
    for agent_id in counterparts:
        history = await self.get_negotiation_history(agent_id)
        if len(history) < 5:
            continue

        profile = {
            "agent_id": agent_id,
            "acceptance_rate": sum(1 for n in history if n.outcome == "accepted") / len(history),
            "avg_rounds_to_accept": avg([n.round_count for n in history if n.outcome == "accepted"]),
            "typical_counter_discount": avg([n.first_counter_discount for n in history
                                            if n.first_counter_discount]),
            "response_speed_seconds": avg([n.avg_response_time for n in history]),
            "concession_pattern": self.analyze_concession_pattern(history),
        }
        profiles.append(profile)

    # Cluster into behavior groups
    # Group A: Quick accepters (high rate, low rounds)
    # Group B: Negotiators (medium rate, multiple rounds, makes concessions)
    # Group C: Hard bargainers (low rate, many rounds, small concessions)
    # Group D: Non-participants (very low rate, frequent rejections)

    return self.assign_clusters(profiles)
```

### Diagnosing Suboptimal Outcomes

When negotiations fail or produce poor results, log analysis identifies the cause:

```python
async def diagnose_failed_negotiation(self, negotiation_id):
    messages = await self.get_conversation(negotiation_id)

    diagnosis = {
        "opening_too_aggressive": messages[0].terms.discount_percent > self.market_rate * 1.5,
        "concessions_too_slow": self.analyze_concession_speed(messages),
        "missed_signal": self.check_for_missed_acceptance_signals(messages),
        "expired_before_resolution": any(
            m.metadata.proposal_expiry < messages[-1].timestamp for m in messages
        ),
        "round_limit_reached": len(messages) >= self.max_rounds,
    }

    return diagnosis
```

## Designing for Long-Term Relationships

The most sophisticated agent-to-agent strategies think beyond individual negotiations:

### Preferred Partner Status

After sustained cooperative interaction, agents can establish preferred partner relationships:

```python
class PartnershipManager:
    async def evaluate_partnership(self, counterpart_agent_id):
        history = await self.get_full_history(counterpart_agent_id)

        metrics = {
            "total_negotiations": len(history),
            "acceptance_rate": sum(1 for n in history if n.outcome == "accepted") / len(history),
            "avg_rounds": sum(n.round_count for n in history) / len(history),
            "total_value_transacted": sum(n.invoice_amount for n in history if n.outcome == "accepted"),
            "payment_reliability": await self.get_payment_reliability(counterpart_agent_id),
            "dispute_count": await self.get_dispute_count(counterpart_agent_id),
            "relationship_months": (date.today() - history[-1].date).days / 30,
        }

        # Partnership threshold
        if (metrics["total_negotiations"] >= 20 and
            metrics["acceptance_rate"] >= 0.65 and
            metrics["payment_reliability"] >= 0.95 and
            metrics["dispute_count"] == 0 and
            metrics["relationship_months"] >= 6):

            return PartnershipRecommendation(
                eligible=True,
                benefits={
                    "faster_negotiation": True,  # Skip to mutual best terms
                    "volume_discounts": True,     # Bundle invoices for better rates
                    "priority_payment": True,      # Guaranteed payment within 5 days of agreement
                }
            )

        return PartnershipRecommendation(eligible=False)
```

With preferred partner status, negotiations can skip the multi-round dance entirely. Both agents know each other's approximate ranges from history and converge on mutually beneficial terms in a single round. This is the efficiency dividend of long-term cooperative behavior.

In the next lesson, we will look at scaling these agent-to-agent interactions across an entire supplier portfolio, along with emerging standards and regulatory considerations.
