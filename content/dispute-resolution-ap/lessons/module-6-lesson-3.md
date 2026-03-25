# Case Study Analysis — Real-World Dispute Resolution Agents
## Module 6: Capstone — Building an End-to-End Dispute Resolution Agent | Lesson 3

**Learning Objectives:**
- Analyze real-world AP automation case studies and identify what made them succeed or fail
- Apply lessons learned to your own agent design
- Anticipate common implementation pitfalls and design mitigations

---

## Using Case Studies Effectively

Case studies are only useful if you extract transferable principles, not just outcomes. "Company X achieved 85% auto-resolution" tells you what happened. Why it happened — the specific decisions, conditions, and tradeoffs that produced that result — is what you can actually apply.

The three cases in this lesson cover different company sizes, industries, and problem types. Each illustrates distinct principles that apply across contexts.

---

## Case Study A: Large Manufacturer — 85% Auto-Resolution at Scale

**Company profile:** Industrial components manufacturer. $2.4B annual revenue. AP processes 52,000 invoices per month across 1,800 active vendors. Three ERPs (SAP for North America, Oracle JDE for EMEA, a legacy system for Asia-Pacific).

**Problem before automation:** Average dispute resolution time was 24 days. AP team of 18 FTEs spent roughly 40% of their time on dispute-related activity. Duplicate payments averaged $380,000 annually. Pricing discrepancies were frequently discovered only during quarterly reconciliations, well after the 30-day correction window allowed under most vendor contracts.

**What they built:** A centralized dispute resolution agent with separate ERP connectors feeding a unified ingestion pipeline. The rule engine was purpose-built for their contract structure, which included commodity pricing tied to published indexes (LME copper, steel futures). The anomaly detection layer used 36 months of historical data per vendor, which was sufficient to model both seasonal patterns and multi-year price escalation trends.

### What Made It Work

**1. Contract data as a first-class system.**

Before touching the agent architecture, this company spent 6 weeks loading all 1,800 vendor contracts into a structured contract database, with machine-readable price tables, escalation clauses, and payment terms. Prior to this effort, contracts lived as PDF attachments in an email system that nobody searched.

The agent's pricing rules were only as good as the contract data. Companies that skip this step end up with a rule engine that flags invoices correctly per the original contract price, then gets overridden by AP staff who know the price was amended — eroding trust in the agent.

Lesson: **The contract database is load-bearing infrastructure. Do not treat it as a data cleanup task to handle "later."**

**2. Commodity pricing integration.**

Many of their vendor contracts included escalation clauses linked to published commodity indexes (e.g., "invoice price = base price × LME copper index on date of shipment ÷ index at contract signing"). The agent pulled daily LME data via API and computed expected prices at invoice time.

Without this, the rule engine would have flagged 40% of raw material invoices as pricing discrepancies — all of them legitimate. With it, the false positive rate on commodity invoices dropped to 3%.

```python
def calculate_commodity_adjusted_price(base_price, contract_clause, invoice_date):
    if contract_clause.escalation_type == "index_linked":
        index_at_signing = get_commodity_index(
            index=contract_clause.index_name,
            date=contract_clause.signing_date
        )
        index_at_invoice = get_commodity_index(
            index=contract_clause.index_name,
            date=invoice_date
        )
        adjustment_factor = index_at_invoice / index_at_signing
        return base_price * adjustment_factor
    return base_price
```

Lesson: **Know your contract complexity before you design the rules. If your contracts include dynamic pricing clauses, the rule engine must implement that logic or it will generate noise.**

**3. Phased vendor onboarding.**

They did not onboard all 1,800 vendors on the same day. They started with the 50 highest-volume vendors (who represented 78% of AP spend), ran the full pipeline for 12 weeks, then expanded to the next 200 vendors, and so on.

By the time they onboarded smaller vendors, the rules were calibrated and the team was confident. The 85% auto-resolution rate they achieved is largely driven by the top 200 vendors — those with rich behavioral histories and clean contract data. The long tail of small vendors still requires more manual review.

Lesson: **Prioritize vendors by spend concentration. The top 20% of vendors often represent 80% of AP value. Get those right before worrying about the rest.**

**4. Monthly calibration cadence enforced as policy.**

Their AP Director mandated a monthly calibration review: look at the previous month's false positives and false negatives, identify patterns, adjust rules or model parameters as needed. This was not optional — it was a standing meeting on the calendar with a defined output (a calibration report signed off by the AP Director).

The difference between a system that improves and one that stagnates is this disciplined cadence. Without it, the agent drifts.

**Outcomes after 18 months:**
- Auto-resolution rate: 85% (from 0% pre-deployment)
- Average resolution time: 5.8 days (from 24 days)
- AP FTE hours on disputes: reduced by 55%
- Duplicate payments: $18,000 annually (from $380,000)
- Net annual savings: $2.1M

---

## Case Study B: Mid-Market Company — A Change Management Failure

**Company profile:** B2B distributor. $180M annual revenue. AP processes 8,200 invoices per month with a team of 6 FTEs. One ERP (NetSuite).

**What they built:** A technically sound dispute resolution agent. Rule engine with solid pricing and duplicate detection logic. Anomaly scoring based on 18 months of historical data. Clean ERP integration. Well-designed approval workflow.

**What happened:** 14 months after deployment, auto-resolution rate was 22% — far below the 55-65% benchmark for their invoice profile. The AP team was rejecting 71% of agent recommendations. The engineering team had retrained the model four times. Performance metrics on the holdout set showed a model that should be achieving 88% recall. Yet in production, a different story.

### What Went Wrong

**The AP manager was bypassed during design.**

The agent was built by the IT department and handed to the AP team with training documentation and a go-live date. The AP manager, Maria, had not been consulted on the rules, the message templates, or the approval workflow. She had concerns — which she had raised informally before the project started — about the agent's ability to handle their largest vendor, a strategic distributor that routinely sent complex split invoices with back-order adjustments.

Her concerns were correct. The agent struggled with that vendor's invoice format. But because she had been excluded from the design, she had no stake in making the agent succeed. Her team mirrored her skepticism.

Lesson: **The AP manager is a project stakeholder, not just a user. Their domain knowledge is essential for rule design, and their endorsement is essential for team adoption.**

**The "override everything" culture.**

When the agent was first deployed in Recommendation Mode, the team found it easier to reject recommendations and handle disputes the old way than to evaluate the agent's reasoning and modify the message. There was no guidance on what criteria to use when evaluating a recommendation. "Doesn't look right" became the default rejection reason.

Within 8 weeks, the team had developed a habit of treating the agent as a nuisance — a source of review tasks that slowed them down rather than a tool that reduced their workload.

No one intervened. The IT team saw a high rejection rate and assumed a model quality issue. The AP manager saw an agent that wasn't useful. The loop closed with neither side understanding the other's perspective.

Lesson: **Define review criteria before Phase 2 launch. Reviewers need to know what "good" looks like and what "reject" means. Without that, rejection becomes a default rather than a signal.**

**Metrics were tracked but not acted upon.**

The system had dashboards. The rejection rate was visible. The false negative analysis was available. But no one was accountable for acting on these numbers. The monthly calibration meeting that should have happened never got scheduled.

**The Recovery Plan**

After 14 months, the company brought in an AP automation consultant who diagnosed the change management gap. The recovery steps:

1. Maria was brought in retroactively to audit every rule and rewrite the message templates. She found 11 rules that were misconfigured for their specific vendor contracts.
2. A joint AP/IT calibration committee met weekly for 8 weeks to work through rejection reasons systematically.
3. Rejection reasons were restructured into coded categories: "contract not in system," "partial shipment not reflected," "agent reasoning correct but message needs edit." This turned rejections from noise into signal.
4. After 8 weeks of active recalibration, the auto-resolution rate climbed from 22% to 54%.

The agent that emerged from this process was essentially the same one built in month 1, with better-calibrated rules and a team that understood how to use it. Fourteen months of underperformance were the cost of skipping the change management work upfront.

Lesson: **Technical correctness is necessary but not sufficient. The agent performs at the level its organization operates it.**

---

## Case Study C: Global Enterprise — Multi-Currency, Multi-ERP Dispute Resolution

**Company profile:** Global logistics company. Operations in 34 countries. AP processes 180,000 invoices per month across 6 ERP instances (SAP in different regional configurations, a legacy Oracle system in APAC). Invoices arrive in 22 currencies. Many vendors operate across multiple regions, creating cross-entity disputes.

**The distinctive challenge:** Disputes in this context are not just about price and quantity — they are about which legal entity is being invoiced, under which contract, in which currency, and subject to which local tax regime. A dispute resolution that works correctly in Germany may produce an illegal output in Brazil due to different rules around credit note issuance and NF-e (Nota Fiscal Eletrônica) handling.

### Architectural Decisions

**Multi-ERP normalization layer.**

Rather than building separate rule engines for each ERP, they built a normalization layer that translated all ERP-specific data formats into a canonical invoice schema. The rule engine operated on the canonical schema.

```python
@dataclass
class CanonicalInvoice:
    """Normalized invoice schema — ERP-agnostic."""
    invoice_id: str
    source_erp: str           # "SAP_DE", "SAP_US", "ORACLE_APAC"
    legal_entity: str         # Which legal entity is being invoiced
    vendor_id: str            # Global vendor ID (mapped across ERPs)
    invoice_date: date
    currency: str             # ISO 4217 (always)
    amount_local: Decimal     # Amount in invoice currency
    amount_usd: Decimal       # Normalized to USD for cross-entity comparison
    fx_rate_used: Decimal     # Documented FX rate (for audit)
    line_items: list[CanonicalLineItem]
    payment_terms: PaymentTerms
    tax_jurisdiction: str     # ISO country code + state/province
    tax_amount: Decimal
    local_invoice_reference: str  # NF-e for Brazil, etc.
```

The normalization layer required 4 months to build and test across all 6 ERP configurations. It was the hardest part of the project and the most valuable. Once complete, every downstream component — rules, anomaly detection, decision engine, supplier communication — worked identically regardless of which ERP the invoice came from.

Lesson: **In multi-ERP environments, invest in normalization first. The business logic is the same everywhere; the data formats are what differ.**

**Jurisdiction-aware rule configuration.**

Dispute resolution rules that are valid in one country may be illegal or unenforceable in another. A blanket "request credit note within 30 days" rule is fine in the US and Germany. In some countries, credit note timelines are regulated by tax authority requirements.

```yaml
# Rules are jurisdiction-aware
dispute_rules:
  credit_note_request:
    default:
      deadline_days: 30
      format: "standard_credit_note"

    jurisdiction_overrides:
      BR:
        deadline_days: 15
        format: "nota_fiscal_complementar"
        note: "Brazil NF-e requirements; credit note must reference original NF-e number"
      MX:
        deadline_days: 30
        format: "nota_de_credito_cfdi"
        note: "Mexico CFDI electronic credit note required"
      IN:
        deadline_days: 14
        format: "credit_note_gst"
        note: "India GST credit note must include GSTIN references"
```

Building these jurisdiction rules required dedicated tax and legal review in each major country. This is not optional — an automated dispute message to a Brazilian supplier that does not comply with NF-e format requirements is not just ineffective; it creates tax compliance exposure.

**Global vendor deduplication.**

The same physical vendor might appear under different vendor IDs in different ERPs: "Siemens AG" in SAP Germany, "Siemens Corp" in SAP US, "Siemens Ltd" in the APAC Oracle instance. Without deduplication, the anomaly detection system would see three different vendors with 60,000 invoices each instead of one vendor with 180,000 invoices. The behavioral baselines would be useless.

They built a vendor master data management (MDM) layer that mapped ERP-specific vendor IDs to global vendor entities using a combination of exact matching (VAT number, DUNS number) and fuzzy matching (vendor name, address).

```python
def build_global_vendor_profile(global_vendor_id):
    # Collect all ERP-local vendor records for this global entity
    local_records = mdm.get_local_vendors(global_vendor_id)
    all_invoices = []

    for local_record in local_records:
        invoices = get_invoices(
            vendor_id=local_record.erp_vendor_id,
            erp=local_record.source_erp
        )
        all_invoices.extend(invoices)

    # Build a unified profile from all regional invoice history
    return build_vendor_profile(all_invoices, global_vendor_id)
```

Lesson: **Global vendor deduplication is a prerequisite for meaningful anomaly detection in multi-entity organizations. Skipping it means your baselines are wrong from day one.**

**Outcomes after 24 months:**
- Auto-resolution rate: 61% (lower than Case A; complexity justifies this)
- 22 currencies handled automatically with correct FX-adjusted comparisons
- Tax compliance maintained across 8 high-complexity jurisdictions with no regulatory incidents
- Resolution time: 11.2 days (from 31.4 days pre-deployment)

---

## Common Pitfalls Across All Cases

These patterns appear in failed or underperforming implementations consistently:

**1. Poor data quality treated as someone else's problem.**

The agent will be blamed for false positives that are actually caused by missing contract data, stale price tables, or unrecorded goods receipts. Before deployment, audit your data. Fix what you can. Accept what you cannot fix and design rules that handle data gaps gracefully (treat missing contract price as "cannot validate" rather than "discrepancy").

**2. Over-automating before earning trust.**

Organizations that skip shadow mode and recommendation mode, jumping directly to autonomous action within weeks of deployment, consistently report lower adoption and higher error rates 12 months later. The phases exist not just to catch technical errors but to build the organizational muscle for working with an autonomous agent.

**3. Ignoring the supplier experience.**

The agent is not just an internal tool — it interacts with your suppliers. Automated dispute communications that are unclear, incorrectly formatted, or that arrive at the wrong contact create supplier complaints that end up undermining the project at the leadership level. Test your outbound messages with a sample of key suppliers before Phase 2. Get their feedback. A supplier who says "I don't understand what you're asking for" is telling you your message template needs work.

**4. Inadequate monitoring after go-live.**

Many implementations invest heavily in the build and deploy phases, then move on to the next project. The agent degrades silently: new vendors arrive with unfamiliar patterns, contract amendments accumulate without being loaded, seasonal variations cause drift in the anomaly baselines. The monitoring and calibration work described in Modules 3-5 is not a nice-to-have — it is what distinguishes a system that improves over time from one that quietly declines.

**5. No clear owner for ongoing improvement.**

The most underperforming agents are ones where ownership is ambiguous: the IT team built it but considers it "live," and the AP team uses it but considers system improvements to be IT's job. Define a named owner — ideally a senior AP operations person with data skills or a dedicated AP automation analyst — who is accountable for the agent's performance metrics and has authority to request engineering changes.

## Success Patterns

The successful implementations share these characteristics regardless of company size or complexity:

- **Executive sponsor actively involved.** A CFO or VP Finance who reviews the monthly savings dashboard and asks questions about the numbers in leadership meetings.
- **Phased rollout with genuine gates.** Not phases as a formality, but real go/no-go decisions based on evidence.
- **Continuous measurement.** Defined KPIs, reviewed monthly, with an owner accountable for each metric.
- **Vendor collaboration.** Key suppliers informed about the new dispute process before it goes live. Their buy-in on the communication format and response channel reduces friction significantly.
- **Investment in data quality.** Contract data, vendor master data, and ERP integration quality treated as first-class concerns, not afterthoughts.

## Applying These Lessons to Your Own Deployment

Before finalizing your implementation plan, ask these questions:

1. What is the state of your contract data? Could a rule engine reliably compare your invoice prices to contracted prices today?
2. Who on the AP team will be the internal champion? Have they been involved in the design?
3. What are your top 10 vendors by spend? What are their invoice complexity characteristics? Are they commodity-priced? Do they submit split invoices? Have their dispute rates been above or below average historically?
4. What are the two or three failure modes that would create the most serious business impact — a false positive that disrupts a critical supplier, a false negative that misses a systematic fraud pattern, an autonomous action that violates a regulatory requirement?
5. Who will own the agent's ongoing performance after go-live? Is that person named, resourced, and empowered?

Answering these questions honestly before you finalize your architecture and timeline will save you from the most common and expensive mistakes.

---

**Congratulations on completing the course.** You now have the conceptual framework, the implementation patterns, and the practical context to design, deploy, and continuously improve a production-grade AP dispute resolution agent. The technical skills are learnable; the judgment about when to automate, how to earn trust incrementally, and how to measure real impact honestly — that is what separates systems that transform AP operations from systems that get quietly turned off after 18 months.
