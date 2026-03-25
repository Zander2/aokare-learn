# Data Sources and Invoice Intelligence
## Module 2: Discount Identification and Opportunity Analysis | Lesson 1

**Learning Objectives:**
- Identify the data fields required to evaluate a discount opportunity (invoice amount, due date, terms, supplier history)
- Extract discount-relevant data from ERP systems and invoice management platforms
- Explain how OCR and AI-based invoice parsing surface discount terms
- Design a data pipeline that flags discount-eligible invoices automatically

---

## Critical Data Fields

Every discount opportunity evaluation requires a specific set of data. Missing even one field can make the difference between capturing a discount and missing it. Here is the minimum viable data set:

### Invoice-Level Fields

| Field | Why It Matters | Example |
|-------|---------------|---------|
| Invoice number | Unique identifier for tracking | INV-2026-04821 |
| Invoice date | Starting point for term calculations | 2026-03-15 |
| Invoice amount | Determines dollar value of the discount | $47,500.00 |
| Payment terms | Defines discount rate and windows | 2/10 net 30 |
| Due date | Full payment deadline | 2026-04-14 |
| Discount due date | Last day to qualify for discount | 2026-03-25 |
| Currency | Needed for multi-currency operations | USD |
| PO number | Links to purchase order for validation | PO-2026-1138 |

### Supplier-Level Fields

| Field | Why It Matters | Example |
|-------|---------------|---------|
| Supplier ID | Links to master record and history | SUP-00342 |
| Supplier name | For communication and reporting | Midwest Components LLC |
| Supplier segment | Strategic vs. transactional classification | Strategic |
| Payment method | Determines payment speed | ACH |
| Historical acceptance rate | Predicts receptiveness to discount proposals | 73% |
| Average invoice amount | Context for scoring | $38,200 |
| Annual spend | Supplier importance weighting | $1,240,000 |

### Treasury-Level Fields

| Field | Why It Matters | Example |
|-------|---------------|---------|
| Available cash balance | Can we fund the early payment? | $4,200,000 |
| Early payment budget remaining | Are we within treasury limits? | $850,000 |
| Forecasted cash position (30-day) | Will early payment create a squeeze? | Positive |

## Pulling Data from ERP Systems

Most of this data lives in your ERP system, but extracting it reliably requires understanding where each field is stored and how to access it.

### SAP S/4HANA

In SAP, invoice and payment term data is spread across several tables:

```
BSEG  — Accounting document line items (amounts, terms)
BKPF  — Accounting document headers (dates, document numbers)
LFA1  — Supplier master (general data)
LFB1  — Supplier master (company code data, payment terms)
T052  — Payment terms definitions
RBKP  — Invoice document headers
```

A typical extraction query joins these tables to produce a denormalized view:

```sql
SELECT
  bkpf.BELNR as invoice_number,
  bkpf.BUDAT as invoice_date,
  bseg.DMBTR as invoice_amount,
  lfb1.ZTERM as payment_terms,
  t052.ZTAG1 as discount_days,
  t052.ZPR01 as discount_percent,
  t052.ZTAG3 as net_days,
  lfa1.LIFNR as supplier_id,
  lfa1.NAME1 as supplier_name
FROM BKPF bkpf
JOIN BSEG bseg ON bkpf.BUKRS = bseg.BUKRS AND bkpf.BELNR = bseg.BELNR
JOIN LFA1 lfa1 ON bseg.LIFNR = lfa1.LIFNR
JOIN LFB1 lfb1 ON lfa1.LIFNR = lfb1.LIFNR
JOIN T052 t052 ON lfb1.ZTERM = t052.ZTERM
WHERE bkpf.BLART = 'RE'  -- Vendor invoices
  AND bseg.BSCHL = '31'  -- Vendor posting key
  AND t052.ZPR01 > 0     -- Has discount terms
```

For real-time integration, SAP offers OData APIs through the API Business Hub. The `API_SUPPLIERINVOICE_PROCESS_SRV` service provides invoice data, and custom CDS views can expose payment term details.

### Oracle Cloud and NetSuite

Oracle Cloud Financials exposes AP data through REST APIs:

```
GET /fscmRestApi/resources/latest/invoices
GET /fscmRestApi/resources/latest/suppliers
```

NetSuite uses SuiteQL for queries and REST/SOAP APIs for integration:

```sql
SELECT
  transaction.tranid,
  transaction.trandate,
  transaction.total,
  vendor.entityid,
  vendor.terms
FROM transaction
JOIN vendor ON transaction.entity = vendor.id
WHERE transaction.type = 'VendBill'
```

### Standardizing Across ERPs

If your organization runs multiple ERPs (common after acquisitions), you need a normalization layer. Define a canonical invoice schema:

```json
{
  "invoice_id": "string",
  "source_system": "string",
  "invoice_date": "ISO-8601 date",
  "amount": "decimal",
  "currency": "ISO-4217",
  "supplier_id": "string",
  "payment_terms": {
    "discount_percent": "decimal",
    "discount_days": "integer",
    "net_days": "integer",
    "terms_basis": "invoice_date | receipt_of_goods | end_of_month"
  },
  "status": "pending | approved | scheduled | paid",
  "po_number": "string | null"
}
```

Map each ERP's data model to this schema. The agent works against the canonical schema, insulated from ERP-specific quirks.

## AI-Powered Invoice Parsing

Not all invoices arrive as structured data. Paper invoices, PDF attachments, and email-embedded invoices require parsing before the agent can evaluate them.

### The OCR + LLM Pipeline

Modern invoice parsing combines optical character recognition (OCR) with large language models:

1. **Document ingestion** — Invoice arrives as PDF, image, or email attachment
2. **OCR extraction** — Tools like Azure Document Intelligence or Google Document AI extract raw text and layout information
3. **LLM interpretation** — A language model identifies and extracts structured fields from the raw text

The LLM step is where real value is added. Consider this raw OCR output from an invoice:

```
INVOICE #48291
Date: March 15, 2026
Terms: Two percent ten days, net thirty
Amount Due: $47,500.00
```

A rule-based parser would struggle with "Two percent ten days, net thirty" — it is not in the standard "2/10 net 30" format. An LLM handles this naturally:

```python
prompt = f"""
Extract payment terms from this invoice text.
Return as JSON: {{"discount_percent": float, "discount_days": int, "net_days": int}}

Invoice text:
{ocr_text}
"""

# LLM returns: {"discount_percent": 2.0, "discount_days": 10, "net_days": 30}
```

### Handling Ambiguity

Real-world invoices present challenges:

- **Missing terms:** Invoice says nothing about discounts. The agent should fall back to the supplier master record or flag for human review.
- **Conflicting terms:** Invoice says "1/10 net 30" but the supplier agreement says "2/10 net 30." The agent should flag the conflict and apply the contractual terms.
- **Non-standard language:** "Please pay within 10 days for a 2% reduction" means the same as "2/10" but requires natural language understanding to parse.
- **Multiple line items with different terms:** Rare but possible. The agent must handle per-line-item terms.

Build confidence scoring into the extraction pipeline. If the LLM's confidence in extracted terms falls below a threshold (say 85%), route the invoice for human verification rather than acting on uncertain data.

## Building the Discount Opportunity Queue

With data flowing reliably, the next step is building an automated pipeline that flags discount-eligible invoices and routes them for evaluation.

### Pipeline Architecture

```
Invoice Arrives → Extract/Parse → Enrich with Supplier Data → Check Terms → Score → Queue
```

Each stage is a discrete processing step:

**1. Extract/Parse.** Structured data goes straight to enrichment. Unstructured invoices go through the OCR + LLM pipeline.

**2. Enrich.** Join invoice data with supplier master records: historical acceptance rate, segment classification, annual spend, preferred payment method.

**3. Check Terms.** Does this invoice have discount terms? If yes, calculate the discount deadline and annualized rate. If no, flag for potential proactive negotiation (covered in Module 3).

**4. Score.** Apply the opportunity scoring model (covered in the next lesson) to rank this invoice against all other open opportunities.

**5. Queue.** Add to the discount opportunity queue, prioritized by score. The agent picks up opportunities from the top of the queue.

### Real-Time vs. Batch Processing

The processing model matters because discount windows are time-sensitive:

- **Real-time processing** (event-driven): Each invoice is evaluated as it arrives. Best for organizations where discount windows are short (10 days or fewer) and invoice volume is manageable.
- **Batch processing** (scheduled): Invoices are evaluated in hourly or daily batches. Acceptable when discount windows are 15+ days and volume is very high.
- **Hybrid**: Real-time for high-value invoices (above a dollar threshold), batch for the rest.

For most organizations, a hybrid approach works best. Process invoices above $10,000 in real-time and batch-process smaller invoices every 4-6 hours. This balances responsiveness with system efficiency.

## Data Quality: The Ongoing Challenge

Data quality is not a one-time fix. It requires continuous monitoring and remediation.

### Common Data Quality Issues

**Missing payment terms.** The supplier master record has no terms defined, or the terms field defaults to "net 30" regardless of the actual agreement. Solution: build a reconciliation process that compares invoice-stated terms against master data and flags mismatches.

**Duplicate suppliers.** The same supplier appears under multiple IDs (e.g., "Acme Corp", "ACME Corporation", "Acme Corp."). Solution: implement fuzzy matching on supplier name, address, and tax ID to identify and merge duplicates.

**Stale data.** A supplier renegotiated terms six months ago, but the master record was never updated. Solution: when the agent detects invoice terms that differ from master data, it triggers an update workflow.

**Currency and amount discrepancies.** Foreign currency invoices may have amounts in the supplier's currency, your functional currency, or both. The discount calculation must use the correct amount. Solution: standardize all amounts to the invoice currency and convert at time of payment.

### Monitoring Data Quality

Track these metrics weekly:

- **Terms match rate:** Percentage of invoices where invoice-stated terms match master data
- **Parse success rate:** Percentage of unstructured invoices successfully parsed by the OCR + LLM pipeline
- **Enrichment completeness:** Percentage of invoices with all required fields populated
- **Correction rate:** Percentage of agent decisions that required human correction due to data issues

In the next lesson, we will take the clean data flowing through this pipeline and apply a scoring model to prioritize the opportunities that deliver the most value.
