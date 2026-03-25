# System Architecture Design
## Module 6: Capstone — Building an End-to-End Dispute Resolution Agent | Lesson 1

**Learning Objectives:**
- Produce an end-to-end architecture diagram for a dispute resolution agent covering data ingestion, validation, anomaly detection, decision-making, communication, and learning
- Select appropriate technologies for each component based on scale, latency, and integration requirements
- Identify single points of failure and design for resilience

---

## From Components to System

The previous five modules covered each layer of the dispute resolution agent in isolation: three-way matching, rule-based detection, anomaly scoring, autonomous agent behavior, supplier communication, and human-in-the-loop learning. In a production system, all of these layers must work together reliably, at scale, with acceptable latency, and without creating a system so brittle that a single failure brings down the entire AP operation.

This lesson walks through the complete reference architecture — how the pieces connect, what technology choices apply at each layer, and where the fault lines are.

## The Reference Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  ERP System │  │  Vendor Portal│  │  Email/EDI   │  │  Contract DB│ │
│  │ (SAP/Oracle)│  │              │  │              │  │             │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │
└─────────┼───────────────┼──────────────────┼─────────────────┼─────────┘
          │               │                  │                 │
          ▼               ▼                  ▼                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     INGESTION LAYER                                       │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Message Queue (Kafka / SQS)                                        │  │
│  │  - Invoice events, PO events, GR events, contract updates           │  │
│  └──────────────────────────────┬─────────────────────────────────────┘  │
└─────────────────────────────────┼────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    VALIDATION LAYER                                       │
│  ┌─────────────────────┐    ┌──────────────────────┐                     │
│  │  Three-Way Match    │    │   Duplicate Detection │                     │
│  │  (Rule Engine v2.x) │    │   (Hash + Fuzzy Match)│                     │
│  └──────────┬──────────┘    └──────────┬───────────┘                     │
└─────────────┼────────────────────────────┼──────────────────────────────-┘
              │                            │
              ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   ANOMALY DETECTION LAYER                                 │
│  ┌─────────────────────┐    ┌──────────────────────┐                     │
│  │  Statistical Models │    │   ML Anomaly Scorer  │                     │
│  │  (z-score, IQR,     │    │   (Gradient Boosting)│                     │
│  │   temporal patterns)│    │                      │                     │
│  └──────────┬──────────┘    └──────────┬───────────┘                     │
└─────────────┼────────────────────────────┼──────────────────────────────-┘
              └────────────────┬───────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    DECISION ENGINE                                        │
│  ┌──────────────────────────────────────────────────────────┐            │
│  │  Signal Fusion → Composite Risk Score → Priority Routing │            │
│  │  auto_approve / queue_for_review / auto_dispute /        │            │
│  │  escalate_to_human                                        │            │
│  └──────────────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────────────-┘
              │                               │
              ▼                               ▼
┌──────────────────────┐         ┌─────────────────────────────────────────┐
│  AUTONOMOUS PATH     │         │       HUMAN REVIEW PATH                  │
│  (within guardrails) │         │  ┌──────────────────────────────────┐   │
│  ┌────────────────┐  │         │  │ Manager Dashboard + Alert System │   │
│  │ Draft message  │  │         │  └──────────────────┬───────────────┘   │
│  │ Send dispute   │  │         │                     │ approve/modify/    │
│  │ Track response │  │         │                     │ reject             │
│  └───────┬────────┘  │         └─────────────────────┼────────────────── ┘
└──────────┼───────────┘                               │
           └──────────────────────┬────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    FEEDBACK + LEARNING LAYER                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────────────────┐   │
│  │  Event Log     │  │  Feature Store  │  │  Retraining Pipeline     │   │
│  │  (Append-only) │  │  (Labeled data) │  │  (Weekly rules /         │   │
│  │                │  │                 │  │   Monthly models)        │   │
│  └────────────────┘  └─────────────────┘  └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Deep Dive

### Ingestion Layer

The ingestion layer is responsible for getting data from source systems into the pipeline reliably. This is where most production problems originate — not in the ML models or rule logic, but in data that arrives late, malformed, or out of order.

**Message queue (Kafka or AWS SQS/SNS):** Use an event-driven architecture. When an invoice is posted in the ERP, an event is published to the queue. When a goods receipt is recorded, another event. When a PO is amended, another event. Each downstream consumer subscribes to the events it needs.

```python
# Example event schema for an invoice-posted event
{
    "event_type": "invoice_posted",
    "event_id": "evt_8f3a2b1c",
    "timestamp": "2025-04-07T14:32:10Z",
    "source_system": "SAP_ERP_PROD",
    "payload": {
        "invoice_id": "INV-88432",
        "vendor_id": "V-10042",
        "invoice_date": "2025-04-05",
        "total_amount": 26500.00,
        "currency": "USD",
        "line_items": [...],
        "po_reference": "PO-2025-3847",
        "payment_terms": "2/10 NET30"
    }
}
```

**Why a queue, not direct API calls?** If the validation service is down for 5 minutes and invoices arrive via direct API, those invoices are lost or rejected. With a queue, they accumulate and are processed when the service comes back. The queue decouples producers (ERP) from consumers (validation service), which is essential for resilience.

### ERP Integration Patterns

ERP systems are where your data lives, and they are notoriously difficult to integrate with. Three common patterns:

**Direct API integration (preferred for cloud ERPs):** NetSuite, Sage Intacct, and modern SAP systems expose REST APIs. Use them to pull invoice and PO data in near-real-time. Implement webhook subscriptions where available.

**Database replication (for on-premise ERPs):** Many SAP and Oracle installations do not expose clean APIs. Use a replication tool (Oracle GoldenGate, Debezium) to stream database change events to your message queue without touching the production ERP directly.

**Batch file extraction (legacy fallback):** Some ERPs export data as flat files overnight. This is the worst option — you detect a $50,000 pricing dispute the morning after the payment run. Acceptable only as a temporary measure while the API integration is being built.

### Validation Layer

```python
class ValidationService:
    """Stateless microservice. Processes one invoice at a time."""

    def validate(self, invoice_event):
        invoice = parse_invoice(invoice_event)
        po = fetch_purchase_order(invoice.po_reference)
        receipts = fetch_goods_receipts(invoice.po_reference, invoice.vendor_id)

        results = {
            "three_way_match": self.run_three_way_match(invoice, po, receipts),
            "duplicate_check": self.run_duplicate_check(invoice),
            "rule_engine": self.rule_engine.evaluate(invoice, po, receipts)
        }

        return ValidationResult(
            invoice_id=invoice.id,
            passed=all(r.passed for r in results.values()),
            flags=collect_flags(results),
            raw_results=results
        )
```

The validation service should be stateless: it reads data from external sources (ERP, contract DB) but keeps nothing in memory between calls. This makes it horizontally scalable — you can run 10 instances in parallel to handle volume spikes.

### Anomaly Detection Layer

The anomaly detection layer requires state (vendor baselines, temporal patterns). Design it as a separate service that reads from a vendor profile store:

```python
class AnomalyDetectionService:
    def score(self, invoice, validation_flags):
        vendor_profile = self.profile_store.get(invoice.vendor_id)

        if not vendor_profile:
            # No history for this vendor — flag as new vendor
            return AnomalyScore(vendor_id=invoice.vendor_id,
                                new_vendor=True, score=0.5,
                                note="Insufficient history for anomaly scoring")

        signals = {
            "amount_z": compute_z_score(invoice.total_amount, vendor_profile),
            "iqr_outlier": check_iqr_outlier(invoice.total_amount, vendor_profile),
            "temporal": self.temporal_analyzer.score(invoice, vendor_profile),
            "peer_comparison": self.peer_analyzer.score(invoice, vendor_profile)
        }

        return build_anomaly_score(invoice, signals)
```

The vendor profile store should be updated on a rolling basis — not in the hot path of invoice processing. A background job updates profiles nightly from completed invoice data.

### Decision Engine

The decision engine is the system's brain. It combines rule flags and anomaly scores, calculates the composite risk score, and determines the routing action.

```python
def route_invoice(invoice, validation_result, anomaly_score):
    # Build signal vector
    signals = build_signal_vector(invoice, validation_result, anomaly_score)

    # Calculate composite risk score
    risk_score = calculate_risk_score(signals, current_weights())

    # Determine action based on autonomy level and guardrails
    autonomy_level = get_agent_autonomy_level()
    action = determine_action(risk_score, invoice, autonomy_level)

    # Log the decision for the feedback pipeline
    log_decision({
        "invoice_id": invoice.id,
        "risk_score": risk_score,
        "signals": signals,
        "action": action,
        "autonomy_level": autonomy_level,
        "timestamp": now()
    })

    return action
```

## Technology Selection

### By Scale

| Monthly Invoice Volume | Recommended Stack |
|----------------------|------------------|
| < 1,000 | Single server, PostgreSQL, simple Python service |
| 1,000 – 50,000 | Managed cloud (AWS/GCP/Azure), SQS + Lambda, RDS |
| 50,000 – 500,000 | Kafka + Kubernetes, scalable microservices, distributed DB |
| > 500,000 | Full data platform (Kafka, Spark streaming, multi-region) |

Most mid-market companies fall in the 1,000–50,000 range. A well-designed AWS serverless architecture (SQS + Lambda + RDS Aurora) handles this volume with minimal operational overhead and acceptable latency (sub-5-second invoice processing).

### Latency Requirements

| Use Case | Acceptable Latency | Technology Implication |
|----------|-------------------|----------------------|
| Initial duplicate check | < 500ms | In-memory cache (Redis) for recent invoice hashes |
| Full validation + anomaly score | < 30 seconds | Async processing with notification on completion |
| Supplier communication dispatch | < 5 minutes | Near-real-time, not instant |
| Model retraining | Hours (batch) | No real-time requirement |

Invoice processing does not need to be instant. An AP team reviewing disputes at 9am does not need a sub-second response to an invoice that arrived at 3am. Build for operational latency (minutes), not user-facing latency (milliseconds).

## Resilience Design

### Failure Mode Analysis

Identify every component that could fail and design a response:

| Component | Failure Mode | Impact | Mitigation |
|-----------|-------------|--------|------------|
| ERP API | Timeout / 500 error | Invoices not ingested | Retry with exponential backoff; fallback to batch export |
| Message queue | Consumer lag | Delayed processing | Auto-scaling consumers; alert on queue depth |
| Validation service | Crash | Invoices stuck in queue | Health checks + auto-restart; dead-letter queue for failed messages |
| Anomaly model | Corrupt model file | Scoring fails | Fallback to rule-only mode; alert engineering |
| Contract DB | Unavailable | Price comparison fails | Cache last-known contract prices; flag cached comparisons |
| Supplier email gateway | Bounce / block | Dispute not delivered | Retry queue; fallback to portal message; alert AP manager |

### Dead-Letter Queues

Every queue consumer should send messages it cannot process to a dead-letter queue (DLQ). Messages in the DLQ are not lost — they wait for human review and manual reprocessing.

```python
def process_invoice_event(event):
    try:
        result = validation_service.validate(event)
        publish_to_downstream(result)
    except PermanentError as e:
        # Invoice cannot be processed: send to DLQ for human review
        dead_letter_queue.send(event, error=str(e), retries_exhausted=True)
        alert_operations_team(event, error=e)
    except TransientError as e:
        # Temporary issue: retry up to 3 times with backoff
        raise RetryableError(original=e)
```

### Graceful Degradation

Design the system to degrade gracefully when components fail. The hierarchy:

1. **Full operation:** All layers active. Full validation, anomaly scoring, autonomous actions.
2. **Rules-only mode:** Anomaly detection unavailable. Validation and duplicate detection still run. All flagged invoices route to human review.
3. **Duplicate-only mode:** Rule engine unavailable. Only duplicate detection active. Everything else routes to manual review.
4. **Audit mode:** All components unavailable. All invoices hold for manual processing. Nothing is auto-approved or auto-disputed.

```python
def get_operating_mode():
    if all_services_healthy():
        return "full_operation"
    elif validation_service.healthy() and duplicate_service.healthy():
        return "rules_only"
    elif duplicate_service.healthy():
        return "duplicate_only"
    else:
        return "audit_mode"
```

The system should never silently skip checks. If it cannot run the full validation, it must route to human review, not auto-approve.

## Security Architecture

### Authentication and Authorization

```yaml
api_security:
  erp_integration:
    auth_method: "OAuth2 client credentials"
    scopes: ["invoices:read", "po:read", "gr:read"]
    token_rotation: "every 24 hours"

  agent_actions:
    auth_method: "Service account with signed JWTs"
    principle: "Least privilege — agent can only write to dispute queue, not directly to ERP"

  dashboard_access:
    auth_method: "SSO via corporate IdP (Okta, Azure AD)"
    roles: ["ap_reviewer", "ap_manager", "finance_controller", "executive_read_only"]
    mfa_required: true for roles with action authority
```

### Data Encryption

- **In transit:** TLS 1.3 for all API calls and queue messages
- **At rest:** AES-256 for the feedback store, feature store, and contract database
- **PII handling:** Vendor contact names and emails in dispute records are classified as PII — encrypt at field level and apply access controls

### Audit Trail

Every action the agent takes must be logged with a non-repudiable audit record:

```python
def log_agent_action(action_type, invoice_id, details, actor="agent"):
    audit_log.append({
        "timestamp": now(),
        "action_type": action_type,
        "invoice_id": invoice_id,
        "actor": actor,
        "agent_version": get_current_agent_version(),
        "rule_version": get_current_rule_version(),
        "details": details,
        "correlated_events": get_correlated_event_ids(invoice_id)
    }, immutable=True)  # Append-only; no update or delete
```

The audit log must be immutable and retained per your compliance requirements (typically 7 years for financial records under SOX).

---

**Up next:** Lesson 6.2 covers implementation planning — how to sequence the deployment across phases, define go/no-go criteria, and bring the AP team along through the change.
