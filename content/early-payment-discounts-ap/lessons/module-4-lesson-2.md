# Implementing the Opportunity Pipeline
## Module 4: Building the Early Payment Discount Agent | Lesson 2

**Learning Objectives:**
- Implement an invoice ingestion pipeline that extracts discount-relevant fields
- Code a scoring function that ranks opportunities by expected value
- Integrate cash availability data to filter opportunities the organization can fund
- Write unit tests that validate scoring logic against known scenarios

---

## Invoice Ingestion Implementation

The pipeline starts when an invoice enters the system. We need to handle structured data from ERPs and unstructured data from email/PDF invoices.

### Webhook Listener

For ERP systems that support outbound events, a webhook listener provides real-time ingestion:

```python
from fastapi import FastAPI, HTTPException
from decimal import Decimal
from datetime import date, timedelta

app = FastAPI()

@app.post("/webhooks/invoices")
async def receive_invoice(payload: dict):
    """Receive invoice notifications from ERP webhook."""
    try:
        invoice = parse_erp_payload(payload)
        validated = validate_invoice(invoice)

        if validated.has_discount_terms:
            priority = "high" if validated.discount_deadline_days <= 5 else "normal"
            await queue.publish("invoice.eligible", validated, priority=priority)
        else:
            await queue.publish("invoice.no_terms", validated, priority="low")

        return {"status": "accepted", "invoice_id": validated.invoice_id}

    except ValidationError as e:
        await queue.publish("invoice.validation_failed", {
            "payload": payload,
            "error": str(e)
        })
        raise HTTPException(status_code=422, detail=str(e))
```

### Polling for ERP Systems Without Webhooks

Many ERPs require polling. Implement an efficient poller that tracks its last successful query:

```python
class ERPPoller:
    def __init__(self, erp_client, state_store, poll_interval_seconds=300):
        self.erp = erp_client
        self.state = state_store
        self.interval = poll_interval_seconds

    async def poll(self):
        last_timestamp = await self.state.get("last_poll_timestamp")
        if last_timestamp is None:
            last_timestamp = date.today() - timedelta(days=7)  # Initial lookback

        invoices = await self.erp.query_invoices(
            status="open",
            modified_since=last_timestamp,
            fields=["invoice_id", "date", "amount", "supplier_id",
                    "payment_terms", "currency", "po_number"]
        )

        processed = 0
        for raw in invoices:
            invoice = self.normalize(raw)
            if invoice and not await self.state.is_already_processed(invoice.invoice_id):
                await queue.publish("invoice.received", invoice)
                processed += 1

        await self.state.set("last_poll_timestamp", datetime.utcnow())
        return processed
```

### Field Extraction from Unstructured Invoices

For PDF and email invoices, the extraction pipeline combines OCR with LLM-based field extraction:

```python
class InvoiceExtractor:
    def __init__(self, ocr_service, llm_client):
        self.ocr = ocr_service
        self.llm = llm_client

    async def extract(self, document_bytes: bytes, mime_type: str) -> dict:
        # Step 1: OCR extraction
        ocr_result = await self.ocr.process(document_bytes, mime_type)
        raw_text = ocr_result.text
        layout = ocr_result.layout  # Spatial information for tables

        # Step 2: LLM-based field extraction
        extraction_prompt = f"""
        Extract the following fields from this invoice text. Return JSON.
        If a field cannot be found, set it to null.

        Required fields:
        - invoice_number (string)
        - invoice_date (YYYY-MM-DD)
        - total_amount (number, no currency symbols)
        - currency (3-letter ISO code)
        - supplier_name (string)
        - payment_terms_raw (the exact text describing payment terms)
        - discount_percent (number or null)
        - discount_days (integer or null)
        - net_days (integer or null)
        - po_number (string or null)

        Also provide a confidence score (0.0-1.0) for the overall extraction.

        Invoice text:
        {raw_text}
        """

        result = await self.llm.complete(extraction_prompt, response_format="json")
        return result

    async def parse_payment_terms(self, terms_raw: str) -> PaymentTerms:
        """Parse various payment term formats into structured data."""
        # Try regex patterns first (fast, reliable for standard formats)
        patterns = [
            r"(\d+(?:\.\d+)?)\s*/\s*(\d+)\s*net\s*(\d+)",  # 2/10 net 30
            r"(\d+(?:\.\d+)?)%\s*(\d+)\s*days?\s*net\s*(\d+)",  # 2% 10 days net 30
        ]

        for pattern in patterns:
            match = re.search(pattern, terms_raw, re.IGNORECASE)
            if match:
                return PaymentTerms(
                    discount_percent=Decimal(match.group(1)),
                    discount_days=int(match.group(2)),
                    net_days=int(match.group(3)),
                    source="regex",
                    confidence=0.95
                )

        # Fall back to LLM for non-standard formats
        return await self.llm_parse_terms(terms_raw)
```

## Scoring Function Implementation

With clean invoice data flowing in, the scoring function ranks opportunities. This is the implementation of the model designed in Module 2, Lesson 2.

```python
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

@dataclass
class ScoringConfig:
    financial_weight: float = 0.50
    probability_weight: float = 0.30
    relationship_weight: float = 0.20
    value_reference: Decimal = Decimal("5000")  # $5K = max value points
    rate_reference: float = 0.30  # 30% annualized = max rate points
    segment_scores: dict = None

    def __post_init__(self):
        if self.segment_scores is None:
            self.segment_scores = {
                "strategic": 90, "preferred": 70,
                "transactional": 40, "occasional": 20
            }

class OpportunityScoringEngine:
    def __init__(self, config: ScoringConfig, treasury_client, supplier_repo):
        self.config = config
        self.treasury = treasury_client
        self.suppliers = supplier_repo

    def calculate_annualized_rate(self, discount_pct: Decimal,
                                   discount_days: int, net_days: int) -> float:
        if net_days <= discount_days:
            return 0.0
        rate = (float(discount_pct) / (100 - float(discount_pct))) * \
               (365 / (net_days - discount_days))
        return rate

    def financial_score(self, discount_value: Decimal, annualized_rate: float) -> float:
        value_points = min(50.0, float(discount_value / self.config.value_reference) * 50)
        rate_points = min(50.0, (annualized_rate / self.config.rate_reference) * 50)
        return value_points + rate_points

    def probability_score(self, invoice, supplier) -> float:
        if invoice.has_existing_discount_terms:
            days_remaining = (invoice.discount_deadline - date.today()).days
            if days_remaining <= 0:
                return 0.0  # Expired
            return min(100.0, days_remaining * 15)
        else:
            # Proactive proposal: use predicted acceptance rate
            if supplier.historical_acceptance_rate is not None:
                return supplier.historical_acceptance_rate * 100
            # Fall back to segment default
            defaults = {"strategic": 50, "preferred": 40,
                       "transactional": 30, "occasional": 20}
            return defaults.get(supplier.segment, 25)

    def relationship_score(self, supplier) -> float:
        return float(self.config.segment_scores.get(supplier.segment, 30))

    async def score(self, invoice, supplier=None) -> ScoredOpportunity:
        if supplier is None:
            supplier = await self.suppliers.get(invoice.supplier_id)

        terms = invoice.payment_terms
        discount_value = invoice.amount * terms.discount_percent / 100
        annualized_rate = self.calculate_annualized_rate(
            terms.discount_percent, terms.discount_days, terms.net_days
        )

        fin_score = self.financial_score(discount_value, annualized_rate)
        prob_score = self.probability_score(invoice, supplier)
        rel_score = self.relationship_score(supplier)

        total = (
            self.config.financial_weight * fin_score +
            self.config.probability_weight * prob_score +
            self.config.relationship_weight * rel_score
        )

        # Cash availability check
        cash_available = await self.treasury.get_available_budget()
        if discount_value > cash_available:
            total *= 0.1

        return ScoredOpportunity(
            invoice_id=invoice.invoice_id,
            score=round(total, 2),
            discount_value=discount_value,
            annualized_rate=annualized_rate,
            financial_score=fin_score,
            probability_score=prob_score,
            relationship_score=rel_score,
            cash_constrained=discount_value > cash_available
        )
```

## Cash Constraint Filtering

Beyond penalizing unfundable opportunities in the score, the agent must actively manage its cash budget across the day's opportunities.

```python
class CashConstraintFilter:
    def __init__(self, treasury_client):
        self.treasury = treasury_client

    async def filter_and_allocate(self, scored_opportunities: list) -> list:
        """
        Given a list of scored opportunities, select those that fit
        within the available cash budget, prioritizing highest scores.
        """
        budget = await self.treasury.get_available_budget()
        sorted_opps = sorted(scored_opportunities, key=lambda x: x.score, reverse=True)

        selected = []
        remaining = budget

        for opp in sorted_opps:
            payment_amount = opp.invoice.amount - opp.discount_value
            if payment_amount <= remaining:
                selected.append(opp)
                remaining -= payment_amount
                # Reserve these funds in treasury
                reservation = await self.treasury.reserve_funds(
                    payment_amount, opp.invoice_id
                )
                opp.cash_reservation_id = reservation
            else:
                opp.status = "deferred_cash_constraint"

        return selected
```

## Testing the Scoring Logic

Unit tests are essential for financial logic. The scoring function must produce correct, predictable results across a range of scenarios.

```python
import pytest
from decimal import Decimal
from datetime import date, timedelta

class TestOpportunityScoringEngine:

    @pytest.fixture
    def engine(self):
        config = ScoringConfig()
        treasury = MockTreasuryClient(available_budget=Decimal("500000"))
        suppliers = MockSupplierRepo()
        return OpportunityScoringEngine(config, treasury, suppliers)

    def test_high_value_existing_discount(self, engine):
        """A $100K invoice with 2/10 net 30 and 7 days remaining should score high."""
        invoice = make_invoice(
            amount=Decimal("100000"),
            terms=PaymentTerms(discount_percent=Decimal("2"), discount_days=10, net_days=30),
            discount_deadline=date.today() + timedelta(days=7)
        )
        supplier = make_supplier(segment="preferred")

        result = engine.score_sync(invoice, supplier)

        assert result.score > 70, f"Expected >70, got {result.score}"
        assert result.annualized_rate == pytest.approx(0.3724, rel=0.01)
        assert result.discount_value == Decimal("2000")

    def test_expired_discount_scores_zero_probability(self, engine):
        """An expired discount window should yield a probability score of 0."""
        invoice = make_invoice(
            amount=Decimal("50000"),
            terms=PaymentTerms(discount_percent=Decimal("2"), discount_days=10, net_days=30),
            discount_deadline=date.today() - timedelta(days=1)
        )
        supplier = make_supplier(segment="transactional")

        result = engine.score_sync(invoice, supplier)
        assert result.probability_score == 0.0

    def test_cash_constrained_penalty(self, engine):
        """When discount value exceeds available cash, score should be heavily penalized."""
        engine.treasury.available_budget = Decimal("100")  # Very low budget

        invoice = make_invoice(
            amount=Decimal("50000"),
            terms=PaymentTerms(discount_percent=Decimal("2"), discount_days=10, net_days=30),
            discount_deadline=date.today() + timedelta(days=7)
        )
        supplier = make_supplier(segment="preferred")

        result = engine.score_sync(invoice, supplier)
        assert result.cash_constrained is True
        assert result.score < 10  # Severely penalized

    def test_strategic_supplier_bonus(self, engine):
        """Strategic suppliers should score higher than transactional for same invoice."""
        invoice = make_invoice(
            amount=Decimal("30000"),
            terms=PaymentTerms(discount_percent=Decimal("1.5"), discount_days=10, net_days=30),
            discount_deadline=date.today() + timedelta(days=5)
        )

        strategic = make_supplier(segment="strategic")
        transactional = make_supplier(segment="transactional")

        score_strategic = engine.score_sync(invoice, strategic)
        score_transactional = engine.score_sync(invoice, transactional)

        assert score_strategic.score > score_transactional.score

    def test_proactive_proposal_uses_acceptance_rate(self, engine):
        """Invoices without existing terms should use supplier acceptance rate."""
        invoice = make_invoice(
            amount=Decimal("40000"),
            terms=PaymentTerms(discount_percent=Decimal("1.5"), discount_days=10, net_days=30),
            has_existing_terms=False
        )
        supplier = make_supplier(
            segment="preferred",
            historical_acceptance_rate=0.65
        )

        result = engine.score_sync(invoice, supplier)
        assert result.probability_score == pytest.approx(65.0)

    def test_annualized_rate_calculation(self, engine):
        """Verify annualized rate formula across multiple term structures."""
        test_cases = [
            (Decimal("2"), 10, 30, 0.3724),
            (Decimal("1"), 10, 30, 0.1843),
            (Decimal("2"), 10, 45, 0.2128),
            (Decimal("3"), 10, 60, 0.2256),
        ]

        for discount, disc_days, net_days, expected_rate in test_cases:
            rate = engine.calculate_annualized_rate(discount, disc_days, net_days)
            assert rate == pytest.approx(expected_rate, rel=0.02), \
                f"Terms {discount}/{disc_days} net {net_days}: expected {expected_rate}, got {rate}"
```

### Edge Case Tests

```python
    def test_zero_discount_returns_zero_rate(self, engine):
        rate = engine.calculate_annualized_rate(Decimal("0"), 10, 30)
        assert rate == 0.0

    def test_same_discount_and_net_days(self, engine):
        """Edge case: discount period equals net period (meaningless terms)."""
        rate = engine.calculate_annualized_rate(Decimal("2"), 30, 30)
        assert rate == 0.0  # No acceleration = no annualized benefit

    def test_very_small_invoice(self, engine):
        """Small invoices should still score, just low on value component."""
        invoice = make_invoice(
            amount=Decimal("50"),
            terms=PaymentTerms(discount_percent=Decimal("2"), discount_days=10, net_days=30),
            discount_deadline=date.today() + timedelta(days=7)
        )
        supplier = make_supplier(segment="occasional")

        result = engine.score_sync(invoice, supplier)
        assert result.score > 0
        assert result.discount_value == Decimal("1.00")
```

## Putting It Together: The Pipeline Flow

The complete pipeline from invoice arrival to scored, prioritized queue:

```python
class OpportunityPipeline:
    def __init__(self, ingestion, scorer, cash_filter, opportunity_store):
        self.ingestion = ingestion
        self.scorer = scorer
        self.cash_filter = cash_filter
        self.store = opportunity_store

    async def process_invoice(self, invoice_event):
        """Full pipeline: ingest → score → filter → queue."""
        invoice = invoice_event.data

        # Enrich with supplier data
        supplier = await self.scorer.suppliers.get(invoice.supplier_id)
        if supplier is None:
            await self.store.save_unmatched(invoice)
            return

        # Score
        scored = await self.scorer.score(invoice, supplier)

        # Skip low-value or ineligible opportunities
        if scored.score < 20:
            await self.store.save_skipped(scored, reason="below_threshold")
            return

        # Save to opportunity queue
        await self.store.save_opportunity(scored)

    async def run_daily_allocation(self):
        """Once daily: apply cash constraints and select today's opportunities."""
        pending = await self.store.get_pending_opportunities()
        selected = await self.cash_filter.filter_and_allocate(pending)

        for opp in selected:
            if opp.invoice.has_existing_discount_terms:
                await self.event_bus.publish("opportunity.capture", opp)
            else:
                await self.event_bus.publish("opportunity.propose", opp)

        return len(selected)
```

This pipeline is the backbone of the agent. In the next lesson, we will build the negotiation engine that takes these prioritized opportunities and conducts supplier communications.
