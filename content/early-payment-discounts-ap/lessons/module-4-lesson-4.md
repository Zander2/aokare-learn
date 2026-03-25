# Payment Execution and Reconciliation
## Module 4: Building the Early Payment Discount Agent | Lesson 4

**Learning Objectives:**
- Trigger early payment execution through ERP or payment platform APIs
- Implement confirmation workflows that verify payment was made within the discount window
- Reconcile discount payments against original invoices
- Handle failure cases: missed windows, payment errors, disputed amounts

---

## Payment Execution

A negotiated discount is worthless until the payment actually lands in the supplier's account within the discount window. The payment execution module is where the agent's decisions become financial reality.

### Triggering Payments Through ERP APIs

Most organizations process payments through their ERP system. The agent creates a payment request that the ERP processes according to its payment run configuration.

```python
class PaymentExecutor:
    def __init__(self, erp_client, treasury_client, audit_logger):
        self.erp = erp_client
        self.treasury = treasury_client
        self.audit = audit_logger

    async def execute_early_payment(self, negotiation) -> PaymentResult:
        """Create and submit an early payment request to the ERP."""
        invoice = negotiation.invoice
        agreed_terms = negotiation.accepted_terms

        # Calculate payment amount
        discount_amount = invoice.amount * agreed_terms.discount_percent / 100
        payment_amount = invoice.amount - discount_amount

        # Pre-flight checks
        preflight = await self.preflight_checks(invoice, payment_amount, agreed_terms)
        if not preflight.passed:
            return PaymentResult(success=False, reason=preflight.failure_reason)

        # Create payment in ERP
        payment_request = {
            "vendor_id": invoice.supplier_id,
            "invoice_id": invoice.invoice_id,
            "payment_amount": float(payment_amount),
            "discount_amount": float(discount_amount),
            "payment_method": negotiation.supplier.preferred_payment_method,
            "requested_date": str(date.today()),
            "payment_terms_reference": str(agreed_terms),
            "early_payment_flag": True,
            "notes": f"Early payment discount: {agreed_terms.discount_percent}% "
                     f"per agreement dated {negotiation.acceptance_date}"
        }

        try:
            erp_response = await self.erp.create_payment(payment_request)

            await self.audit.log_event(negotiation.id, "payment_created", {
                "erp_payment_id": erp_response.payment_id,
                "amount": float(payment_amount),
                "discount": float(discount_amount),
                "method": payment_request["payment_method"],
                "requested_date": payment_request["requested_date"]
            })

            return PaymentResult(
                success=True,
                payment_id=erp_response.payment_id,
                expected_settlement_date=erp_response.estimated_settlement
            )

        except ERPError as e:
            await self.audit.log_event(negotiation.id, "payment_creation_failed", {
                "error": str(e),
                "error_code": e.code
            })
            return PaymentResult(success=False, reason=str(e))
```

### Pre-Flight Checks

Before triggering any payment, validate that conditions are met:

```python
async def preflight_checks(self, invoice, payment_amount, terms) -> PreflightResult:
    checks = []

    # 1. Is the discount window still open?
    deadline = terms.payment_deadline
    settlement_days = self.get_settlement_days(invoice.supplier.payment_method)
    latest_initiation = deadline - timedelta(days=settlement_days)

    if date.today() > latest_initiation:
        checks.append(("window_check", False,
            f"Too late to settle by {deadline}. "
            f"Need {settlement_days} days for {invoice.supplier.payment_method}."))
    else:
        checks.append(("window_check", True, None))

    # 2. Is cash still available?
    available = await self.treasury.get_available_budget()
    if payment_amount > available:
        checks.append(("cash_check", False,
            f"Insufficient cash: need ${payment_amount:,.2f}, "
            f"available ${available:,.2f}"))
    else:
        checks.append(("cash_check", True, None))

    # 3. Has the invoice already been paid?
    invoice_status = await self.erp.get_invoice_status(invoice.invoice_id)
    if invoice_status in ("paid", "in_progress"):
        checks.append(("duplicate_check", False,
            f"Invoice already {invoice_status}"))
    else:
        checks.append(("duplicate_check", True, None))

    # 4. Does the payment amount match the invoice less discount?
    expected = invoice.amount * (1 - terms.discount_percent / 100)
    if abs(payment_amount - expected) > Decimal("0.01"):
        checks.append(("amount_check", False,
            f"Amount mismatch: {payment_amount} vs expected {expected}"))
    else:
        checks.append(("amount_check", True, None))

    failures = [(name, msg) for name, passed, msg in checks if not passed]
    return PreflightResult(
        passed=len(failures) == 0,
        failure_reason=failures[0][1] if failures else None,
        all_checks=checks
    )
```

### Settlement Time by Payment Method

The time between initiating a payment and the supplier receiving funds varies by method:

| Method | Typical Settlement | Agent Buffer |
|--------|-------------------|-------------|
| Wire transfer | Same day | 1 business day |
| ACH | 1-2 business days | 3 business days |
| Virtual card | Immediate upon processing | 1 business day |
| Check | 5-7 business days | 10 business days |
| Cross-border wire | 2-5 business days | 5 business days |

The agent should account for these settlement times when deciding the latest date to initiate payment. For a discount deadline of March 28, an ACH payment should be initiated no later than March 25 (3 business day buffer). A check would need to be initiated by March 14.

```python
def get_settlement_days(self, payment_method: str) -> int:
    buffers = {
        "wire": 1,
        "ach": 3,
        "virtual_card": 1,
        "check": 10,
        "cross_border_wire": 5,
    }
    return buffers.get(payment_method, 5)  # Default to 5 days if unknown
```

## Confirmation Workflows

Payment initiation is not payment completion. The agent must verify that the payment was executed successfully and settled within the discount window.

### Payment Status Tracking

```python
class PaymentConfirmationTracker:
    def __init__(self, erp_client, audit_logger):
        self.erp = erp_client
        self.audit = audit_logger

    async def check_payment_status(self, payment_id: str) -> PaymentStatus:
        """Poll ERP for payment status."""
        status = await self.erp.get_payment_status(payment_id)

        return PaymentStatus(
            payment_id=payment_id,
            status=status.state,        # pending, processing, settled, failed, rejected
            settlement_date=status.settlement_date,
            confirmation_number=status.bank_reference,
            amount_settled=status.amount
        )

    async def monitor_pending_payments(self):
        """Periodic job: check status of all pending early payments."""
        pending = await self.get_pending_early_payments()

        for payment in pending:
            status = await self.check_payment_status(payment.erp_payment_id)

            if status.status == "settled":
                await self.confirm_settlement(payment, status)
            elif status.status == "failed":
                await self.handle_failure(payment, status)
            elif status.status == "rejected":
                await self.handle_rejection(payment, status)
            elif self.is_overdue(payment, status):
                await self.escalate_overdue(payment, status)

    async def confirm_settlement(self, payment, status):
        """Payment settled — verify timing and update records."""
        negotiation = await self.get_negotiation(payment.negotiation_id)

        within_window = status.settlement_date <= negotiation.discount_deadline
        amount_correct = abs(status.amount_settled - payment.expected_amount) < Decimal("0.01")

        if within_window and amount_correct:
            await self.audit.log_event(negotiation.id, "payment_confirmed", {
                "settlement_date": str(status.settlement_date),
                "amount": float(status.amount_settled),
                "within_discount_window": True,
                "bank_reference": status.confirmation_number
            })
            negotiation.state_machine.process_event(NegotiationEvent.PAYMENT_CONFIRMED)
        elif not within_window:
            # Payment landed late — discount may not apply
            await self.flag_late_settlement(payment, negotiation, status)
        elif not amount_correct:
            await self.flag_amount_discrepancy(payment, negotiation, status)
```

## Reconciliation

Reconciliation ties the agent's discount capture activity back to the general ledger. This is where finance teams verify that what the agent reports as savings actually appears in the books.

### Three-Way Match

For every early payment, reconcile across three records:

1. **Agent record** — What the agent agreed and triggered
2. **ERP payment record** — What the ERP actually paid
3. **Supplier statement** — What the supplier acknowledged

```python
class DiscountReconciliation:
    async def reconcile_payment(self, negotiation_id: str) -> ReconciliationResult:
        # Source 1: Agent's records
        negotiation = await self.negotiations.get(negotiation_id)
        agent_record = {
            "invoice_id": negotiation.invoice.invoice_id,
            "original_amount": negotiation.invoice.amount,
            "discount_percent": negotiation.accepted_terms.discount_percent,
            "expected_payment": negotiation.expected_payment_amount,
            "expected_discount": negotiation.expected_discount_amount,
        }

        # Source 2: ERP payment
        erp_payment = await self.erp.get_payment_details(negotiation.erp_payment_id)
        erp_record = {
            "payment_amount": erp_payment.amount,
            "discount_recorded": erp_payment.discount_amount,
            "settlement_date": erp_payment.settlement_date,
            "payment_status": erp_payment.status,
        }

        # Source 3: Supplier statement (if available)
        supplier_record = await self.get_supplier_confirmation(
            negotiation.supplier.id, negotiation.invoice.invoice_id
        )

        # Compare
        discrepancies = []

        if abs(agent_record["expected_payment"] - erp_record["payment_amount"]) > 0.01:
            discrepancies.append({
                "field": "payment_amount",
                "agent": agent_record["expected_payment"],
                "erp": erp_record["payment_amount"],
                "severity": "high"
            })

        if supplier_record and supplier_record.applied_discount != agent_record["discount_percent"]:
            discrepancies.append({
                "field": "discount_applied",
                "agent": agent_record["discount_percent"],
                "supplier": supplier_record.applied_discount,
                "severity": "high"
            })

        return ReconciliationResult(
            negotiation_id=negotiation_id,
            matched=len(discrepancies) == 0,
            discrepancies=discrepancies,
            verified_savings=erp_record["discount_recorded"] if not discrepancies else Decimal("0")
        )
```

### Ledger Updates

When a discount is captured, the accounting entries are:

```
Debit:  Accounts Payable        $47,500.00  (clear the full invoice)
Credit: Cash                    $46,787.50  (actual payment)
Credit: Purchase Discounts       $   712.50  (discount captured)
```

The agent should verify that the ERP created these entries correctly. Some ERP configurations post discounts differently (as a reduction to COGS, as other income, etc.). Confirm with your accounting team which treatment applies and validate accordingly.

## Handling Failure Cases

### Missed Discount Windows

Despite the agent's best efforts, payments sometimes miss the discount window:

```python
async def handle_missed_window(self, negotiation, payment_status):
    """Payment settled after the discount deadline."""
    await self.audit.log_event(negotiation.id, "discount_window_missed", {
        "discount_deadline": str(negotiation.discount_deadline),
        "actual_settlement": str(payment_status.settlement_date),
        "days_late": (payment_status.settlement_date - negotiation.discount_deadline).days,
        "discount_at_risk": float(negotiation.expected_discount_amount)
    })

    # Determine course of action
    days_late = (payment_status.settlement_date - negotiation.discount_deadline).days

    if days_late <= 1:
        # One day late: contact supplier, many will honor the discount
        await self.send_goodwill_request(negotiation)
    elif days_late <= 3:
        # Few days late: contact supplier, may honor
        await self.send_goodwill_request(negotiation)
        await self.alert_ap_team(negotiation, "window_missed_by_days")
    else:
        # Significantly late: the discount is lost
        await self.record_missed_discount(negotiation)
        await self.alert_ap_team(negotiation, "window_missed_significantly")

    # Root cause analysis
    await self.analyze_miss_cause(negotiation, payment_status)
```

### Payment Errors

Payment failures require immediate attention:

- **Insufficient funds** — The cash availability check should prevent this, but if it happens, recheck cash and retry or defer
- **Invalid bank details** — Route to AP for supplier bank account verification
- **ERP processing error** — Retry once, then escalate to IT
- **Bank rejection** — Investigate reason code, correct the issue, retry if within window

### Disputed Amounts

Sometimes the supplier disputes the discounted amount — they expected full payment, or they expected a different discount rate. The reconciliation process catches these cases:

```python
async def handle_amount_dispute(self, negotiation, supplier_claim):
    """Supplier claims the discount was not agreed or the amount is wrong."""
    # Pull the audit trail
    proposal_log = await self.audit.get_events(
        negotiation.id, event_type="proposal_sent"
    )
    acceptance_log = await self.audit.get_events(
        negotiation.id, event_type="response_received",
        filter={"classification": "ACCEPT"}
    )

    dispute_package = {
        "negotiation_id": negotiation.id,
        "our_position": {
            "agreed_discount": negotiation.accepted_terms.discount_percent,
            "proposal_sent": proposal_log[0]["timestamp"],
            "acceptance_received": acceptance_log[0]["timestamp"],
            "email_evidence": proposal_log[0]["details"]["email_message_id"]
        },
        "supplier_claim": supplier_claim,
        "recommended_action": "Review email exchange and resolve"
    }

    await self.escalate_to_ap_manager(dispute_package)
```

The audit trail created in the previous lesson becomes invaluable here. When a supplier disputes a discount, you can produce the exact email sent, the exact response received, the classification, and the timestamp — resolving disputes quickly and factually.

## Closing the Loop

After payment is confirmed and reconciled, the pipeline closes:

```python
async def close_discount_capture(self, negotiation):
    """Mark the opportunity as successfully captured."""
    # Update the opportunity record
    negotiation.status = "discount_captured"
    negotiation.actual_savings = negotiation.confirmed_discount_amount
    negotiation.closed_at = datetime.utcnow()

    # Release any cash reservations
    if negotiation.cash_reservation_id:
        await self.treasury.release_reservation(negotiation.cash_reservation_id)

    # Update supplier profile
    supplier = negotiation.supplier
    supplier.update_discount_history(
        outcome="captured",
        terms=negotiation.accepted_terms,
        savings=negotiation.actual_savings
    )

    # Update running totals
    await self.metrics.increment("total_savings", negotiation.actual_savings)
    await self.metrics.increment("invoices_discounted", 1)

    # Final audit entry
    await self.audit.log_event(negotiation.id, "discount_captured", {
        "savings": float(negotiation.actual_savings),
        "original_amount": float(negotiation.invoice.amount),
        "paid_amount": float(negotiation.confirmed_payment_amount),
        "cycle_time_days": (negotiation.closed_at - negotiation.created_at).days
    })
```

This closes the full cycle: invoice received, opportunity scored, proposal sent, terms negotiated, payment executed, discount confirmed, and savings recorded. In the next lesson, we will cover testing this entire system and deploying it safely into production.
