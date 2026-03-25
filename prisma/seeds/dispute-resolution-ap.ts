import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join } from "path"

const prisma = new PrismaClient()

const CONTENT_DIR = join(__dirname, "../../content/dispute-resolution-ap")

function readLesson(module: number, lesson: number): string {
  return readFileSync(
    join(CONTENT_DIR, "lessons", `module-${module}-lesson-${lesson}.md`),
    "utf-8"
  )
}

interface ResourceEntry {
  videoUrl: string
  articleUrl: string
  articleLabel: string
}

// Extracted from content/dispute-resolution-ap/resources.md
const RESOURCES: Record<string, ResourceEntry> = {
  "1-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+dispute+resolution+types+invoice+discrepancy+lifecycle",
    articleUrl: "https://ramp.com/blog/accounts-payable/invoice-discrepancies",
    articleLabel:
      "Invoice Discrepancies: Causes, Types & Solutions (Ramp) — covers pricing, quantity, and delivery dispute categories with resolution steps",
  },
  "1-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=three+way+match+accounts+payable+PO+invoice+goods+receipt+explained",
    articleUrl: "https://tipalti.com/resources/learn/3-way-match/",
    articleLabel:
      "What is a 3-Way Match? How It Works in the AP Process (Tipalti) — explains the PO, GRN, and invoice comparison process with tolerance thresholds",
  },
  "1-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+procurement+collaboration+roles+responsibilities+finance",
    articleUrl:
      "https://www.iofm.com/ask-the-expert/responsibilities-of-ap-vs-purchasing",
    articleLabel:
      "Responsibilities of AP vs. Purchasing (IOFM) — defines the boundary between AP and procurement stakeholders in the invoice and dispute process",
  },
  "1-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=SOX+compliance+accounts+payable+internal+controls+audit+trail",
    articleUrl:
      "https://tipalti.com/resources/learn/internal-controls-for-accounts-payable/",
    articleLabel:
      "Ultimate Guide to Accounts Payable Internal Controls (Tipalti) — covers SOX requirements, audit trail obligations, segregation of duties, and data retention",
  },
  "2-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=invoice+pricing+discrepancy+detection+tolerance+thresholds+AP+automation",
    articleUrl:
      "https://www.artsyltech.com/blog/invoice-exception-handling-in-ap-systems",
    articleLabel:
      "How Invoice Exception Handling Works in Automated AP Systems (Artsyl Technologies) — explains tolerance configuration, pricing variance detection, and exception routing logic",
  },
  "2-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=goods+receipt+quantity+reconciliation+partial+shipment+accounts+payable+three+way+match",
    articleUrl:
      "https://www.netsuite.com/portal/resource/articles/accounting/three-way-matching.shtml",
    articleLabel:
      "What Is Three-Way Matching & Why Is It Important? (NetSuite) — covers quantity matching across partial receipts, over-delivery tolerances, and time-window handling",
  },
  "2-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=duplicate+invoice+detection+prevention+accounts+payable+fuzzy+matching",
    articleUrl:
      "https://www.netsuite.com/portal/resource/articles/accounting/prevent-duplicate-payments.shtml",
    articleLabel:
      "How to Fix and Prevent Duplicate Payments (NetSuite) — covers exact-match and fuzzy-match detection strategies, recurring invoice whitelisting, and financial exposure measurement",
  },
  "2-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+automation+rule+engine+invoice+validation+workflow+architecture",
    articleUrl:
      "https://ibm-cloud-architecture.github.io/refarch-dba/use-cases/accounts-pay/",
    articleLabel:
      "Data & AI — Business Automation — Accounts Payable (IBM Cloud Architecture) — reference architecture covering rule engine design, pipeline composition, and output integration for AP validation",
  },
  "3-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=statistical+anomaly+detection+z-score+IQR+invoice+fraud+financial+data",
    articleUrl:
      "https://www.highradius.com/resources/Blog/transaction-data-anomaly-detection/",
    articleLabel:
      "Complete Guide to Data Anomaly Detection in Financial Transactions (HighRadius) — covers z-score and IQR methods, vendor profiling, seasonality adjustment, and threshold tuning for AP contexts",
  },
  "3-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=invoice+timing+anomaly+detection+split+invoice+fraud+pattern+recognition+accounts+payable",
    articleUrl:
      "https://www.netsuite.com/portal/resource/articles/accounting/accounts-payable-fraud.shtml",
    articleLabel:
      "Essential Guide to Accounts Payable Fraud (NetSuite) — covers invoice splitting detection, off-cycle submission patterns, price drift, and temporal manipulation schemes in AP",
  },
  "3-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=spend+analytics+vendor+benchmarking+category+management+procurement+anomaly",
    articleUrl: "https://tipalti.com/en-eu/procurement-hub/spend-analysis/",
    articleLabel:
      "Spend Analysis: Importance, Process & Examples (Tipalti) — explains peer-group comparison, category-level spend monitoring, and vendor behavior benchmarking",
  },
  "3-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=machine+learning+risk+scoring+invoice+fraud+detection+composite+score+accounts+payable",
    articleUrl:
      "https://www.mindbridge.ai/blog/ai-powered-anomaly-detection-going-beyond-the-balance-sheet/",
    articleLabel:
      "AI-Powered Anomaly Detection: Going Beyond the Balance Sheet (MindBridge) — covers signal fusion, composite risk scoring, weighting strategies, and performance evaluation using precision and recall",
  },
  "4-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=agentic+AI+accounts+payable+automation+decision+logic+confidence+threshold+guardrails",
    articleUrl:
      "https://ramp.com/blog/agentic-ai/best-practices-for-ap-agents",
    articleLabel:
      "What Are the Best Practices for Using AI Agents in AP? (Ramp) — covers decision tree design, confidence thresholds for auto-approval, dollar-amount guardrails, and escalation triggers",
  },
  "4-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+supplier+dispute+communication+email+template+invoice+discrepancy",
    articleUrl: "https://gmelius.com/templates/invoice-discrepancy-alert",
    articleLabel:
      "Free Email Template — Discrepancies in Invoice Notification (Gmelius) — ready-to-use AP dispute message template covering discrepancy details, evidence references, and requested supplier action",
  },
  "4-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+dispute+workflow+automation+state+machine+resolution+lifecycle",
    articleUrl:
      "https://www.openenvoy.com/newsroom/product-update-dispute-workflow",
    articleLabel:
      "Dispute Workflow (OpenEnvoy) — describes a real AP dispute state machine with open, disputed, resolved, and closed states, automated follow-ups, and SLA tracking",
  },
  "4-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+manager+dashboard+KPI+dispute+monitoring+executive+reporting",
    articleUrl:
      "https://tipalti.com/resources/learn/accounts-payable-management/",
    articleLabel:
      "Accounts Payable Management: Best Practices & Solutions (Tipalti) — covers AP manager dashboard design, real-time dispute monitoring, escalation workflows, and executive reporting on AP health",
  },
  "5-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=human+in+the+loop+machine+learning+feedback+AI+training+signal+finance+automation",
    articleUrl: "https://encord.com/blog/human-in-the-loop-ai/",
    articleLabel:
      "Human-in-the-Loop Machine Learning (HITL) Explained (Encord) — covers feedback taxonomy, data schema for labeling human decisions, signal quality assessment, and storage design for real-time and batch retraining",
  },
  "5-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=machine+learning+model+retraining+A+B+testing+shadow+mode+canary+deployment+production",
    articleUrl:
      "https://www.qwak.com/post/shadow-deployment-vs-canary-release-of-machine-learning-models",
    articleLabel:
      "Shadow Deployment vs. Canary Release of Machine Learning Models (JFrog ML / Qwak) — explains shadow mode, canary deployment, A/B testing, and rollback procedures for ML model updates",
  },
  "5-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=agentic+AI+autonomy+levels+governance+progressive+trust+financial+automation",
    articleUrl:
      "https://www.mckinsey.com/capabilities/risk-and-resilience/our-insights/trust-in-the-age-of-agents",
    articleLabel:
      "Agentic AI Governance for Autonomous Systems (McKinsey) — covers autonomy ladders, promotion criteria, performance monitoring, degradation detection, and governance policies for expanding AI agent autonomy",
  },
  "5-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+automation+ROI+cost+savings+calculation+metrics+benchmark",
    articleUrl:
      "https://www.netsuite.com/portal/resource/articles/accounting/ap-automation-roi.shtml",
    articleLabel:
      "AP Automation ROI: Benefits & How to Calculate (NetSuite) — covers direct cost savings from duplicate prevention, pricing corrections, efficiency gains per FTE, and business case construction for executive stakeholders",
  },
  "6-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+automation+system+architecture+ERP+integration+SAP+Oracle+NetSuite+data+pipeline",
    articleUrl: "https://www.sap.com/resources/what-is-ap-automation",
    articleLabel:
      "AP Automation: What It Is and How It Works (SAP) — covers end-to-end AP architecture including data ingestion, ERP integration, validation pipeline, decision engine, and resilience considerations",
  },
  "6-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=AP+automation+implementation+phased+rollout+change+management+shadow+mode+guide",
    articleUrl: "https://cevinio.com/ap-automation-implementation-tips/",
    articleLabel:
      "AP Automation Implementation Guide: Tips for a Smooth Rollout (Cevinio) — covers phase-by-phase deployment from shadow mode through full autonomy, go/no-go criteria, change management, and team training",
  },
  "6-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+automation+case+study+success+story+invoice+processing+results",
    articleUrl:
      "https://www.medius.com/resources/case-studies/lush-ap-automation/",
    articleLabel:
      "How LUSH Achieved Over 85% Touchless Accounts Payable Processing (Medius) — real-world case study of a large consumer brand reaching 85–90% auto-resolution, covering implementation approach, pitfalls, and outcomes",
  },
}

function getResources(module: number, lesson: number): ResourceEntry {
  const key = `${module}-${lesson}`
  const resource = RESOURCES[key]
  if (!resource) {
    throw new Error(`No resource entry found for module ${module} lesson ${lesson}`)
  }
  return resource
}

function buildContentBody(
  module: number,
  lesson: number,
  title: string
): object {
  const content = readLesson(module, lesson)
  const resource = getResources(module, lesson)
  return {
    blocks: [
      { type: "text", content },
      { type: "video", url: resource.videoUrl, caption: title },
      {
        type: "link",
        url: resource.articleUrl,
        label: resource.articleLabel,
        description: "Recommended reading for this lesson",
      },
    ],
  }
}

interface QuizQuestion {
  text: string
  type: "MCQ" | "TRUEFALSE"
  options: string[]
  correctAnswer: string
  explanation?: string
}

interface QuizData {
  moduleOrder: number
  title: string
  passingScore: number
  questions: QuizQuestion[]
}

const quizzes: QuizData[] = [
  {
    moduleOrder: 1,
    title: "Module 1 Quiz: Foundations of AP Dispute Resolution",
    passingScore: 70,
    questions: [
      {
        text: "What is the key distinction between an AP correction and an AP dispute?",
        type: "MCQ",
        options: [
          "A) A correction involves amounts over $1,000; a dispute involves smaller amounts",
          "B) A correction is a unilateral fix requiring no supplier involvement; a dispute is bilateral and requires the supplier to act",
          "C) A correction is handled by the AP clerk; a dispute is always handled by a manager",
          "D) A correction is documented; a dispute is handled verbally",
        ],
        correctAnswer: "B",
        explanation:
          "A correction (e.g., fixing a wrong vendor ID) can be made unilaterally. A dispute requires the other party — the supplier — to investigate, acknowledge, and agree to a resolution, making it inherently bilateral.",
      },
      {
        text: "A supplier invoices for 300 cases of cleaning supplies, but your warehouse only received and accepted 288 cases. The remaining 12 were damaged in transit and rejected at the dock. Which dispute category best describes this scenario?",
        type: "MCQ",
        options: [
          "A) Pricing dispute",
          "B) Quality dispute",
          "C) Quantity dispute",
          "D) Delivery dispute",
        ],
        correctAnswer: "C",
        explanation:
          "The disagreement is over how many units should be paid for — the invoiced quantity (300) does not match what was received (288). This is a quantity dispute, even though the rejection was caused by transit damage.",
      },
      {
        text: "The three-way match process compares which three documents?",
        type: "MCQ",
        options: [
          "A) Invoice, credit note, and supplier statement",
          "B) Purchase order, goods receipt note, and invoice",
          "C) Purchase order, payment record, and invoice",
          "D) Goods receipt note, bank statement, and invoice",
        ],
        correctAnswer: "B",
        explanation:
          "The three-way match is the gold standard for invoice validation. It asks: Did we order it (PO)? Did we receive it (GRN)? Is the invoice correct? All three documents must align for an invoice to be approved for payment.",
      },
      {
        text: "Under the dispute lifecycle, which stage comes immediately after Detection?",
        type: "MCQ",
        options: [
          "A) Negotiation",
          "B) Escalation",
          "C) Documentation",
          "D) Resolution",
        ],
        correctAnswer: "C",
        explanation:
          "After a discrepancy is detected and the invoice is held, the AP team must gather supporting evidence — the PO, GRN, contract terms, and prior correspondence. This Documentation stage is the foundation for all subsequent communication with the supplier.",
      },
      {
        text: "A percentage-based tolerance threshold checks whether the price variance falls within a fixed dollar amount.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "A percentage-based tolerance checks whether the variance is within a percentage of the expected value (e.g., within 3% of the PO price). A fixed dollar amount describes an absolute tolerance threshold.",
      },
      {
        text: "An AP team processes 10,000 invoices per month with a 5% dispute rate. Each dispute takes an average of 4 hours of combined labor at a fully loaded cost of $50/hour. What is the approximate monthly cost of dispute resolution labor?",
        type: "MCQ",
        options: [
          "A) $50,000",
          "B) $100,000",
          "C) $200,000",
          "D) $500,000",
        ],
        correctAnswer: "B",
        explanation:
          "500 disputes per month (10,000 × 5%) × 4 hours × $50/hour = $100,000. This calculation illustrates why even modest improvements in dispute prevention or resolution speed have significant financial impact.",
      },
      {
        text: "Which of the following is a direct cost of unresolved AP disputes — not an indirect or operational cost?",
        type: "MCQ",
        options: [
          "A) Erosion of supplier relationship trust",
          "B) Cash flow forecasting uncertainty",
          "C) Late-payment penalties on invoices held past their due date",
          "D) Time spent by AP clerks writing dispute notifications",
        ],
        correctAnswer: "C",
        explanation:
          "Late-payment penalties are a direct, measurable financial charge that appears on the balance sheet. The other options are real costs, but they manifest as indirect or operational costs rather than charges directly attributable to a specific unresolved dispute.",
      },
    ],
  },
  {
    moduleOrder: 2,
    title: "Module 2 Quiz: Detecting Discrepancies with Rule-Based Logic",
    passingScore: 70,
    questions: [
      {
        text: "Your tolerance configuration is set to 'lesser_of: 1% or $2.00' for high-value items. A $250/unit item is invoiced at $253/unit. Should this discrepancy trigger a dispute flag?",
        type: "MCQ",
        options: [
          "A) No — $3 is only 1.2%, which is close to the 1% threshold",
          "B) Yes — the $3 variance exceeds the $2.00 absolute threshold, and lesser_of means both conditions must be satisfied",
          "C) No — lesser_of means only one threshold needs to pass, and the 1% percentage threshold passes",
          "D) Yes — any variance on high-value items automatically triggers a dispute",
        ],
        correctAnswer: "B",
        explanation:
          "'Lesser_of' means the tolerance applied is whichever threshold is more restrictive. For a $250 item, 1% = $2.50 and $2.00 is the lesser. The $3.00 variance exceeds the stricter $2.00 threshold, so this correctly triggers a flag.",
      },
      {
        text: "A contract specifies that unit prices are linked to the Consumer Price Index (CPI) and can escalate accordingly. The PO was created at $10.00/unit, but CPI has risen 2.3% since the PO date. The invoice arrives at $10.23/unit. What should the detection system do?",
        type: "MCQ",
        options: [
          "A) Flag as a pricing dispute since the invoice price does not match the PO price",
          "B) Auto-approve the line since the variance is within a typical 3% tolerance",
          "C) Apply the escalation clause logic to compute the effective price; the $10.23 invoice should not be flagged",
          "D) Reject the invoice and request the supplier reissue at the original PO price",
        ],
        correctAnswer: "C",
        explanation:
          "Price escalation clauses are contractually valid price changes. The detection system must apply escalation logic to compute the effective price for the invoice date. If the system only compares to the original PO price, it generates false disputes every time a valid escalation occurs.",
      },
      {
        text: "Which of the following best describes a 'near-duplicate' invoice in the context of duplicate detection?",
        type: "MCQ",
        options: [
          "A) An invoice from the same vendor for the exact same amount and invoice number, submitted on the same date",
          "B) An invoice from a different vendor for an identical amount",
          "C) An invoice from the same vendor for the same amount but with a slightly different invoice number (e.g., formatting variation) submitted within a short time window",
          "D) Any two invoices from the same vendor submitted within 7 days of each other",
        ],
        correctAnswer: "C",
        explanation:
          "Near-duplicate detection targets invoices that are likely the same invoice submitted twice but with minor variations — such as OCR errors, dash removal, or reformatting of the invoice number. Same vendor + same amount + close date + similar number = near-duplicate candidate.",
      },
      {
        text: "In a rule engine that evaluates multiple rules, 'rule priority' determines which rule fires when multiple rules could apply to the same invoice.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "When multiple rules fire simultaneously on the same invoice — for example, a pricing rule and a quantity rule both flag the same line — rule priority (and conflict resolution logic) determines which action takes precedence, preventing contradictory or duplicated actions.",
      },
      {
        text: "A rule engine is being backtested against 12 months of historical invoice data. The test shows that 92% of invoices the rules flagged were genuine disputes, and the rules caught 78% of all disputes that occurred. In precision-recall terms, what are these figures respectively?",
        type: "MCQ",
        options: [
          "A) Recall = 92%, Precision = 78%",
          "B) Precision = 92%, Recall = 78%",
          "C) F1 = 92%, Accuracy = 78%",
          "D) Specificity = 92%, Sensitivity = 78%",
        ],
        correctAnswer: "B",
        explanation:
          "Precision measures the proportion of flagged invoices that were genuine disputes (how accurate the flags are). Recall measures the proportion of actual disputes that were caught by the rules (how comprehensive the rules are). 92% precision and 78% recall is a strong result — high accuracy with reasonable coverage.",
      },
      {
        text: "A vendor's PO specifies 1,000 units of a product. The first shipment delivers 400 units, the second delivers 350. The invoice covers 750 units. The matching logic only looks for a 1-to-1 correspondence between a single GRN and the invoice. What problem will this cause?",
        type: "MCQ",
        options: [
          "A) The invoice will be auto-approved because 750 is less than 1,000",
          "B) The invoice will be incorrectly flagged as a dispute because no single GRN matches the 750-unit invoice quantity",
          "C) The system will auto-generate a credit note for the remaining 250 units",
          "D) The match will succeed because the system will default to the PO quantity",
        ],
        correctAnswer: "B",
        explanation:
          "Partial shipments generate multiple GRNs. If the matching logic requires a single GRN to match the invoice quantity, it cannot aggregate across GRNs and will falsely flag a legitimate invoice. Proper partial receipt handling requires aggregation logic that sums multiple GRNs against a single invoice.",
      },
      {
        text: "Which severity classification should be assigned to a pricing variance of 8% on a $3,000 total line variance?",
        type: "MCQ",
        options: [
          "A) Low",
          "B) Medium",
          "C) High",
          "D) Critical",
        ],
        correctAnswer: "C",
        explanation:
          "Using the severity matrix: 8% variance falls in the 5-15% range, and $3,000 total variance falls in the $500-$5,000 band. The intersection of 5-15% and $500-$5,000 is 'High' severity, triggering human review rather than auto-resolution.",
      },
      {
        text: "Rule versioning in a rule engine is primarily valuable because it allows business users to run multiple rules simultaneously without conflicts.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "The primary value of rule versioning is auditability — it allows you to know exactly which version of a rule was applied to a specific invoice at a specific time. When an auditor asks 'why was this invoice auto-resolved?', versioning provides a clear answer. Managing simultaneous rules is handled by priority and conflict resolution, not versioning.",
      },
    ],
  },
  {
    moduleOrder: 3,
    title: "Module 3 Quiz: Anomaly Detection and Pattern Recognition",
    passingScore: 70,
    questions: [
      {
        text: "A vendor's invoice amounts over the past year have a mean of $18,500 and a standard deviation of $3,200. A new invoice arrives for $32,100. What is the z-score, and how should the system treat this invoice?",
        type: "MCQ",
        options: [
          "A) Z-score = 4.25; flag as extreme outlier requiring investigation",
          "B) Z-score = 4.25; auto-approve because rule-based checks passed",
          "C) Z-score = 2.1; low-priority review flag",
          "D) Z-score = 1.7; within normal range, no action needed",
        ],
        correctAnswer: "A",
        explanation:
          "Z = ($32,100 - $18,500) / $3,200 = 4.25 standard deviations above the mean. Fewer than 0.001% of invoices fall this far from the mean naturally. Even if rule-based checks pass (correct unit price, matching quantities), this anomaly warrants investigation — something about this invoice is statistically extraordinary.",
      },
      {
        text: "The IQR method is preferred over the z-score method for anomaly detection when invoice amount distributions are right-skewed.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Z-scores assume a roughly symmetric, bell-shaped distribution. Invoice amounts are commonly right-skewed — many small invoices and occasional large ones. The IQR method uses percentiles (Q1, Q3) rather than mean and standard deviation, making it resistant to skew and outliers already in the historical data.",
      },
      {
        text: "A heating fuel supplier consistently invoices much more during winter months. If you build a single annual baseline without accounting for this pattern, what will happen every December?",
        type: "MCQ",
        options: [
          "A) The annual baseline will correctly accept December invoices because the mean accounts for all months",
          "B) December invoices will be flagged as anomalies even though they are expected seasonal behavior",
          "C) The system will automatically switch to a seasonal profile during winter months",
          "D) December invoices will be auto-approved because the system recognizes winter patterns",
        ],
        correctAnswer: "B",
        explanation:
          "Without seasonality adjustment, December invoices that are legitimately large will appear as outliers compared to the annual mean, which is dragged down by the low-volume summer months. Monthly or quarterly baselines prevent this class of false positives.",
      },
      {
        text: "An analyst notices that a vendor has been submitting three invoices of approximately $9,500 each over the past month, whereas previously they submitted a single invoice of $28,000. No individual invoice exceeds the $10,000 approval threshold. What anomaly pattern does this represent?",
        type: "MCQ",
        options: [
          "A) Price drift — gradual increases in unit prices across invoices",
          "B) Invoice splitting — breaking a larger invoice into smaller ones to stay below an approval threshold",
          "C) Duplicate invoicing — the same invoice submitted multiple times",
          "D) Change-point detection — a legitimate shift in the vendor's billing structure",
        ],
        correctAnswer: "B",
        explanation:
          "Invoice splitting is a pattern where one large transaction is divided into multiple smaller invoices, each designed to stay below a specific approval threshold. This pattern evades controls and requires temporal pattern analysis — looking at invoice frequency and total amounts over rolling windows — to detect.",
      },
      {
        text: "When building a vendor statistical profile, why should disputed invoices be excluded from the baseline data?",
        type: "MCQ",
        options: [
          "A) Disputed invoices are too large and would skew the mean upward",
          "B) Including disputed invoices would contaminate the baseline with the anomalies the system is trying to detect",
          "C) Disputed invoices do not have confirmed amounts, so their data is unreliable",
          "D) Regulatory requirements prohibit using disputed invoices in statistical models",
        ],
        correctAnswer: "B",
        explanation:
          "If disputed invoices (which may represent fraudulent, erroneous, or anomalous behavior) are included in the baseline, the 'normal' range incorporates abnormal data. Future anomalies will appear less extreme by comparison, reducing the system's ability to detect them.",
      },
      {
        text: "A composite scoring system combines rule-based flags with anomaly scores. Which of the following best describes how these two signal types complement each other?",
        type: "MCQ",
        options: [
          "A) Rules catch deviations from known expectations (PO price, GRN quantity); anomaly scores catch statistically unusual behavior that no specific rule covers",
          "B) Rules generate false positives; anomaly scores generate false negatives; together they cancel each other out",
          "C) Anomaly scores replace rules once enough data is available",
          "D) Rules handle high-value invoices; anomaly scores handle low-value invoices",
        ],
        correctAnswer: "A",
        explanation:
          "Rules are deterministic checks against known baselines — they fire when a specific condition is met. Anomaly detection catches unexpected behavior that would pass all rules but is statistically unusual. A vendor invoicing $85,000 when they normally charge $15-20,000 would pass all rules but score as a statistical anomaly.",
      },
      {
        text: "In a priority queue for invoice review, a 'composite risk score' should surface the highest-risk invoices first, regardless of when they arrived.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "A risk-ranked priority queue ensures AP reviewers tackle the highest-exposure items first, rather than reviewing invoices in chronological order. An invoice that arrived this morning with a composite score of 95 should be reviewed before a week-old invoice with a score of 40, because the risk of financial harm is greater.",
      },
    ],
  },
  {
    moduleOrder: 4,
    title:
      "Module 4 Quiz: Autonomous Agent Behavior and Supplier Communication",
    passingScore: 70,
    questions: [
      {
        text: "An agent detects a pricing discrepancy with a confidence score of 0.97 and low severity. The total variance is $320, which is below the $2,000 auto-resolve guardrail. According to the decision logic, what action should the agent take?",
        type: "MCQ",
        options: [
          "A) Escalate to human review — all discrepancies require human approval",
          "B) Auto-resolve by applying the PO price, logging the adjustment",
          "C) Recommend the adjustment and wait for manager approval",
          "D) Block the invoice and send a formal dispute to the supplier",
        ],
        correctAnswer: "B",
        explanation:
          "The decision logic for high-confidence (≥0.95), low-severity discrepancies within the dollar guardrail authorizes auto-resolution. The agent applies the PO price, logs the action in the audit trail, and releases the invoice — no human intervention needed for low-risk, high-certainty adjustments.",
      },
      {
        text: "Which of the following should a well-designed agent NEVER auto-resolve, regardless of confidence level?",
        type: "MCQ",
        options: [
          "A) A quantity discrepancy of 2 units on a $150 invoice",
          "B) An invoice that is slightly below the PO price",
          "C) An invoice from a new vendor on their first submission to your system",
          "D) A duplicate invoice that matches 100% on all fields",
        ],
        correctAnswer: "C",
        explanation:
          "New vendors should always receive human review for their first several invoices, regardless of confidence. The agent has no behavioral baseline for new vendors, and the risk of setting a wrong precedent is high. This is a non-negotiable guardrail, not a confidence threshold decision.",
      },
      {
        text: "A dispute message template includes which core structural elements?",
        type: "MCQ",
        options: [
          "A) Invoice number, requested payment, and bank details",
          "B) Header with discrepancy details, evidence package, requested action, and response deadline",
          "C) Vendor scorecard, compliance rating, and escalation history",
          "D) PO number, GRN date, and credit note template",
        ],
        correctAnswer: "B",
        explanation:
          "An effective dispute message template must communicate what the discrepancy is (header + details), why the buyer believes it is incorrect (evidence), what the buyer wants done (requested action such as a credit note or revised invoice), and by when (deadline). All four elements are required for actionable supplier communication.",
      },
      {
        text: "In a dispute state machine, the states 'open,' 'awaiting-supplier,' 'counter-proposed,' 'escalated,' 'resolved,' and 'closed' represent the full lifecycle of a dispute.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "These states capture every meaningful phase: the dispute is opened, the supplier is notified (awaiting-supplier), they may counter-propose, it may escalate to management, and ultimately reaches a resolved state before being closed with full documentation. Each state has defined entry conditions, actions, and transitions.",
      },
      {
        text: "A supplier sends a counter-proposal to a dispute, agreeing to a credit note for 50% of the disputed amount. What is the agent's appropriate next action?",
        type: "MCQ",
        options: [
          "A) Automatically reject the partial offer and demand the full credit note",
          "B) Automatically accept the partial credit note to close the dispute quickly",
          "C) Parse the response, evaluate whether the counter falls within acceptable resolution parameters, and either auto-accept, counter-propose, or escalate to a human",
          "D) Close the dispute as unresolved and open a new dispute for the remaining 50%",
        ],
        correctAnswer: "C",
        explanation:
          "Counter-proposal handling requires evaluation: if the partial credit is within acceptable resolution bounds (as defined by resolution policy), the agent may accept it. If it falls outside bounds, the agent counter-proposes or escalates. The response should be structured, not reflexive.",
      },
      {
        text: "An automated follow-up schedule uses a cadence of 3, 7, and 14 days after initial outreach. What triggers escalation if the supplier has not responded by the end of this cycle?",
        type: "MCQ",
        options: [
          "A) The dispute is automatically written off to avoid further supplier friction",
          "B) The invoice is auto-approved and released for payment to maintain supplier goodwill",
          "C) The dispute escalates to management on both sides, with the history of unanswered outreach as supporting evidence",
          "D) The agent begins a new dispute cycle with a different supplier contact",
        ],
        correctAnswer: "C",
        explanation:
          "When automated follow-up cadence is exhausted without a supplier response, the dispute escalates — typically to management on the buyer side (and potentially the supplier side too). The documented outreach history is important evidence: it shows good-faith efforts to resolve before escalating.",
      },
      {
        text: "A manager dashboard for dispute oversight should include which of the following elements?",
        type: "MCQ",
        options: [
          "A) Only the total dollar value of open disputes",
          "B) A queue filtered by risk, age, and value; alert notifications with agent-proposed actions and rationale; and one-click approve/reject capabilities",
          "C) A full audit trail of every invoice processed in the past 90 days",
          "D) A list of all vendor contacts with their phone numbers and email addresses",
        ],
        correctAnswer: "B",
        explanation:
          "An effective manager dashboard focuses on actionable information: what needs attention (filtered queue), what the agent recommends and why (context-rich alerts), and the ability to act efficiently (one-click decisions). Showing everything creates information overload; showing only totals is too thin for meaningful oversight.",
      },
      {
        text: "An agent that autonomously sends dispute communications should always notify humans of its actions, even at high autonomy levels.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Even at Level 3 autonomy ('act and notify'), the agent must notify humans of every autonomous action. This preserves oversight, allows for reversal within a defined window (e.g., 24 hours), and builds organizational trust. Full autonomy without any notification loop removes the human safety net.",
      },
    ],
  },
  {
    moduleOrder: 5,
    title:
      "Module 5 Quiz: Human-in-the-Loop Learning and Continuous Improvement",
    passingScore: 70,
    questions: [
      {
        text: "Which of the following represents the highest-quality training signal for improving agent decision logic?",
        type: "MCQ",
        options: [
          "A) A manager's rushed one-click approval during a busy quarter-end close",
          "B) A detailed override by an experienced AP director explaining why the agent's recommendation was wrong",
          "C) An automatic system rejection triggered by a guardrail dollar threshold",
          "D) A supplier acceptance of a dispute that the agent flagged at low confidence",
        ],
        correctAnswer: "B",
        explanation:
          "Signal quality depends on the expertise behind the decision and the explanation provided. An experienced AP director's override with explicit reasoning reveals exactly where the agent's logic fails, enabling precise corrections. Rushed approvals, guardrail triggers, and confidence-based actions carry much less diagnostic information.",
      },
      {
        text: "An agent consistently flags invoices with a 2.5% price variance as disputes, but managers approve them 85% of the time. What adjustment should the system make?",
        type: "MCQ",
        options: [
          "A) Retrain the model on fewer examples to reduce over-sensitivity",
          "B) Widen the pricing tolerance threshold so that 2.5% variances no longer trigger flags",
          "C) Add a new rule that blocks all invoices from these vendors",
          "D) Lower the confidence threshold so fewer invoices reach managers",
        ],
        correctAnswer: "B",
        explanation:
          "If managers consistently approve items the agent flags, the tolerance is too tight — the agent is creating false positives. The appropriate response is to widen the tolerance threshold so that the 2.5% variance band falls within the auto-approve range, reducing unnecessary escalations and saving manager time.",
      },
      {
        text: "In the autonomy ladder, what does Level 3 ('Act and Notify') allow the agent to do that Level 2 ('Act with Approval') does not?",
        type: "MCQ",
        options: [
          "A) Flag discrepancies without taking any action",
          "B) Send dispute communications autonomously and notify humans after the fact, rather than requiring pre-approval",
          "C) Propose resolutions for manager review",
          "D) Handle disputes with vendors at any dollar value without restrictions",
        ],
        correctAnswer: "B",
        explanation:
          "Level 2 requires human approval before any message is sent (one-click approval queue). Level 3 allows the agent to send communications autonomously within defined guardrails, then notifies humans with a 24-hour reversal window. This shift from pre-approval to post-notification is the key distinction.",
      },
      {
        text: "A shadow mode deployment means the new model version runs in parallel with the production model but does not take any autonomous actions — its recommendations are compared to the production model's for evaluation.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Shadow mode is a safe deployment strategy where the new model observes real invoice data and generates recommendations, but those recommendations do not trigger actions. By comparing the shadow model's outputs to the production model's outputs and eventual human decisions, teams can measure improvement before any live deployment.",
      },
      {
        text: "What is the primary purpose of an autonomy promotion request document ('governance pack')?",
        type: "MCQ",
        options: [
          "A) To request additional engineering resources for model retraining",
          "B) To provide evidence of sustained performance, document notable incidents, define proposed guardrails, and obtain approval from the required stakeholders",
          "C) To communicate to suppliers that the agent is being upgraded",
          "D) To satisfy regulatory requirements for AI audit trails",
        ],
        correctAnswer: "B",
        explanation:
          "The governance pack is an accountability document. It demonstrates that the agent has earned promotion through sustained performance evidence, shows that incidents have been investigated and resolved, specifies the guardrails that will apply at the new level, and ensures the right people (AP Director, CFO, CRO) explicitly accept the risk.",
      },
      {
        text: "Which of the following best describes the ROI calculation for a dispute resolution agent?",
        type: "MCQ",
        options: [
          "A) Total invoice volume divided by number of FTEs in the AP department",
          "B) Direct savings (duplicate payments prevented, pricing corrections captured) plus efficiency gains (resolution time reduction, FTE productivity) minus implementation and operating costs",
          "C) Number of disputes resolved per month multiplied by the average dispute value",
          "D) Dispute rate reduction multiplied by the company's cost of capital",
        ],
        correctAnswer: "B",
        explanation:
          "Agent ROI has two main components: direct financial savings (what was caught and corrected) and efficiency gains (what the team no longer needs to do manually). Both must be weighed against total cost of ownership. Measuring only one dimension — such as dispute count — significantly understates or misrepresents value.",
      },
      {
        text: "An agent's recall has averaged 91.2% for 90 days, with a standard deviation of 1.8%. The lower control limit on the performance chart is 85.8%. If recall drops to 84% in a given week, what automated response should this trigger?",
        type: "MCQ",
        options: [
          "A) No action — a single-week dip is within normal variation",
          "B) An alert to the AP team but no change to autonomy level",
          "C) An automatic rollback of the agent's autonomy level by one step",
          "D) A full stop of all agent activity pending a manual review",
        ],
        correctAnswer: "C",
        explanation:
          "A recall drop below the lower control limit (85.8%) signals statistically significant degradation, not random noise. The automated response protocol calls for rolling back the autonomy level by one step. This preserves safety while allowing investigation without entirely halting the agent's operations.",
      },
    ],
  },
  {
    moduleOrder: 6,
    title: "Capstone Quiz: Building an End-to-End Dispute Resolution Agent",
    passingScore: 70,
    questions: [
      {
        text: "Which of the five AP dispute categories accounts for the largest share — roughly 30-40% — of all disputes in most organizations?",
        type: "MCQ",
        options: [
          "A) Quality disputes",
          "B) Delivery disputes",
          "C) Duplicate invoice disputes",
          "D) Pricing disputes",
        ],
        correctAnswer: "D",
        explanation:
          "Pricing disputes — where the invoice unit price does not match the PO price — are the most common category, accounting for roughly 30-40% of all AP disputes. They range from minor rounding issues to large overcharges caused by contract misunderstandings.",
      },
      {
        text: "A four-way match adds which document to the standard three-way match process?",
        type: "MCQ",
        options: [
          "A) Supplier statement of account",
          "B) Quality inspection report",
          "C) Bank confirmation",
          "D) Contract amendment",
        ],
        correctAnswer: "B",
        explanation:
          "A four-way match adds a formal quality inspection report to the PO, GRN, and invoice. This variant is used in regulated industries (pharmaceuticals, aerospace) and for high-value raw materials where quality verification is a contractual or regulatory prerequisite for payment.",
      },
      {
        text: "For SOX compliance purposes, the dispute documentation audit trail should record which of the following?",
        type: "MCQ",
        options: [
          "A) The names of all AP clerks who processed invoices in the past year",
          "B) Every action taken on a disputed invoice, who took it, when, and based on what authority or rule version",
          "C) The supplier's credit rating and payment history",
          "D) The CFO's approval for each individual dispute resolution",
        ],
        correctAnswer: "B",
        explanation:
          "SOX compliance requires internal controls over financial reporting. For dispute resolution, this means a complete, immutable audit trail showing every decision, the identity of the decision-maker (human or automated rule version), and the timestamp. This trail must be retained and reviewable by external auditors.",
      },
      {
        text: "A rule engine applies a 'greater_of' mode for low-value items, meaning it accepts variances within either 5% OR $0.50 — whichever is larger. An item priced at $3.00 on the PO is invoiced at $3.45. Should this trigger a dispute?",
        type: "MCQ",
        options: [
          "A) Yes — the $0.45 variance exceeds the $0.50 absolute threshold",
          "B) No — 5% of $3.00 = $0.15, and $0.50 is larger; the $0.45 variance is within the $0.50 tolerance",
          "C) Yes — 15% variance always triggers a dispute regardless of item value",
          "D) No — the percentage variance of 15% is within the 5% threshold",
        ],
        correctAnswer: "B",
        explanation:
          "'Greater_of' applies the more lenient threshold. For a $3.00 item: 5% = $0.15, $0.50 absolute. The greater is $0.50. The $0.45 variance ($3.45 - $3.00) is below the $0.50 threshold, so the line auto-approves. This prevents trivial disputes on cheap items.",
      },
      {
        text: "An IQR analysis shows a vendor's Q1 invoice amount is $4,200 and Q3 is $9,800. A new invoice for $22,000 arrives. Classify this invoice using the IQR outlier definitions (standard: Q3 + 1.5 × IQR; extreme: Q3 + 3 × IQR).",
        type: "MCQ",
        options: [
          "A) Standard outlier — beyond Q3 + 1.5 × IQR but within Q3 + 3 × IQR",
          "B) Extreme outlier — beyond Q3 + 3 × IQR",
          "C) Within normal range — below the upper fence",
          "D) Low outlier — anomalously below the Q1 fence",
        ],
        correctAnswer: "A",
        explanation:
          "IQR = $9,800 - $4,200 = $5,600. Standard outlier fence = Q3 + (1.5 × IQR) = $9,800 + $8,400 = $18,200. Extreme outlier fence = Q3 + (3 × IQR) = $9,800 + $16,800 = $26,600. At $22,000, the invoice exceeds the standard fence ($18,200) but not the extreme fence ($26,600), making it a standard outlier. It should be flagged for review.",
      },
      {
        text: "A buyer agent detecting a discrepancy has a confidence score of 0.60. According to the decision logic, this confidence level maps to which action?",
        type: "MCQ",
        options: [
          "A) Auto-resolve immediately",
          "B) Recommend an action and wait for human approval",
          "C) Escalate to human review without a recommendation",
          "D) Block the vendor pending investigation",
        ],
        correctAnswer: "B",
        explanation:
          "A confidence score between 0.50 and 0.85 maps to 'Recommend and Wait' — the agent proposes an action with reasoning but does not act autonomously. The 0.50-0.85 range indicates meaningful signal but not enough certainty to act without oversight.",
      },
      {
        text: "When an agent drafts a dispute communication to a supplier, the message's tone should be identical for all suppliers regardless of the relationship type.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "Tone calibration is an explicit design requirement. A first notice to a strategic long-term partner should be collaborative and professional. An escalation to a vendor with a repeated dispute history or a transactional supplier can be firmer. The message's evidence and clarity should be consistent, but tone varies by relationship context and dispute severity.",
      },
      {
        text: "In what order do the dispute lifecycle stages occur?",
        type: "MCQ",
        options: [
          "A) Documentation → Detection → Communication → Negotiation → Resolution",
          "B) Detection → Documentation → Communication → Negotiation → Resolution",
          "C) Communication → Detection → Documentation → Escalation → Resolution",
          "D) Negotiation → Detection → Documentation → Communication → Resolution",
        ],
        correctAnswer: "B",
        explanation:
          "The dispute lifecycle follows a logical sequence: first the discrepancy is detected (Detection), then evidence is gathered to support the claim (Documentation), then the supplier is formally notified (Communication), then both parties work toward agreement (Negotiation), and finally the dispute reaches an outcome (Resolution).",
      },
      {
        text: "A Level 3 autonomous agent ('Act and Notify') is handling a dispute involving a strategic Tier-1 vendor for a $35,000 variance. According to guardrail design principles, how should this be handled?",
        type: "MCQ",
        options: [
          "A) Handled autonomously — Level 3 agents can resolve all disputes within their dollar limit",
          "B) Escalated to human review — strategic (Tier-1) vendors should always require human approval regardless of autonomy level",
          "C) Sent a standardized automated dispute message with the standard tone",
          "D) Auto-blocked pending a credit note from the vendor",
        ],
        correctAnswer: "B",
        explanation:
          "Guardrails at Level 3 explicitly specify 'strategic_vendor_handling: always_escalate.' No matter how high the agent's autonomy level, disputes involving strategic Tier-1 vendors require human involvement to protect critical supplier relationships. This is a deliberate guardrail, not a dollar-threshold decision.",
      },
      {
        text: "Which deployment phase comes immediately before the agent begins making recommendations that humans approve?",
        type: "MCQ",
        options: [
          "A) Phase 3 (supervised autonomy)",
          "B) Phase 1 (shadow mode — agent flags, humans act)",
          "C) Phase 0 (data integration and baseline measurement)",
          "D) Phase 2 (recommendation mode)",
        ],
        correctAnswer: "B",
        explanation:
          "The rollout sequence is: Phase 0 (data integration), Phase 1 (shadow mode — agent flags but humans act), Phase 2 (recommendation mode — agent proposes, humans approve), Phase 3 (supervised autonomy). Shadow mode immediately precedes recommendation mode because it establishes the accuracy baseline needed before the agent's suggestions carry weight.",
      },
      {
        text: "A company prevents $180,000 in duplicate payments, captures $95,000 in pricing corrections, and reduces dispute resolution time from 18 to 9 days (freeing 2 FTEs at $80,000/year each) through agent deployment. The agent implementation and operating cost is $120,000/year. What is the annual net benefit?",
        type: "MCQ",
        options: [
          "A) $275,000",
          "B) $315,000",
          "C) $395,000",
          "D) $435,000",
        ],
        correctAnswer: "B",
        explanation:
          "Annual benefits: $180,000 (duplicates) + $95,000 (pricing) + $160,000 (2 FTEs × $80,000) = $435,000. Net benefit = $435,000 - $120,000 (cost) = $315,000. This illustrates that the ROI calculation must include all benefit streams and subtract total costs.",
      },
      {
        text: "A company deploying an AP dispute agent across multiple ERP systems (SAP and Oracle) must consider which architectural challenge?",
        type: "MCQ",
        options: [
          "A) The agent cannot function in environments with more than one ERP",
          "B) Each ERP uses different data models, requiring adapter layers or middleware to normalize invoice and PO data before it reaches the detection engine",
          "C) Oracle invoices automatically take precedence over SAP invoices in the matching logic",
          "D) Multi-ERP environments require separate agent instances with no shared logic",
        ],
        correctAnswer: "B",
        explanation:
          "Different ERP systems use different field names, data formats, and relationship models for invoices and POs. A multi-ERP architecture requires adapter layers or an integration middleware that normalizes data into a common format before the detection engine processes it, enabling uniform rule application across all sources.",
      },
      {
        text: "A case study shows that a large manufacturer achieved 85% auto-resolution on a volume of 50,000+ invoices/month. Which factors most likely contributed to this success rate?",
        type: "MCQ",
        options: [
          "A) Immediate deployment at full autonomy with minimal human oversight",
          "B) Executive sponsorship, phased rollout starting with shadow mode, continuous measurement, and strong data quality as prerequisites",
          "C) Replacing the entire AP team with the agent from day one",
          "D) Applying the strictest possible tolerance thresholds to eliminate all edge cases",
        ],
        correctAnswer: "B",
        explanation:
          "Real-world AP automation success patterns consistently include: executive sponsorship (funding and priority), phased rollout (earning trust incrementally), continuous measurement (knowing what is working), and data quality (the agent is only as good as its data). Over-automation too early and ignoring change management are identified failure patterns.",
      },
      {
        text: "The feedback loop in a human-in-the-loop system captures human override decisions to improve future agent performance. Which data element is most critical in each feedback record?",
        type: "MCQ",
        options: [
          "A) The timestamp of the human decision",
          "B) The agent's input features, its recommendation, the human's action, and the eventual outcome",
          "C) The human reviewer's employee ID for accountability",
          "D) The total invoice amount involved in the decision",
        ],
        correctAnswer: "B",
        explanation:
          "The feedback record must link all four elements to enable learning: what information the agent used (input features), what it recommended (its output), what the human decided (the label), and what actually happened (outcome). Without all four, it is impossible to identify where the agent's logic diverged from correct behavior.",
      },
      {
        text: "When evaluating whether an agent is ready for promotion to the next autonomy level, the minimum sample size requirement ensures that performance metrics are statistically reliable before expanding autonomous authority.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Performance metrics computed on small samples are unreliable — a 95% accuracy rate over 20 feedback records could easily be 80% with a different 20 records. Minimum sample size requirements (e.g., 200 records for Level 2, 1,000 for Level 4) ensure that the metrics reflect true, stable performance before the agent is granted more independence.",
      },
    ],
  },
]

interface ModuleConfig {
  order: number
  title: string
  description: string
  lessons: { order: number; title: string; moduleNum: number; lessonNum: number }[]
}

const MODULE_CONFIGS: ModuleConfig[] = [
  {
    order: 1,
    title: "Foundations of AP Dispute Resolution",
    description:
      "Establish the core concepts of accounts payable disputes, their root causes, and the business impact of unresolved discrepancies. This module builds the shared vocabulary and mental models needed for the rest of the course.",
    lessons: [
      { order: 1, title: "The Anatomy of an AP Dispute", moduleNum: 1, lessonNum: 1 },
      {
        order: 2,
        title: "The Three-Way Match as a Dispute Prevention Framework",
        moduleNum: 1,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Stakeholders, Roles, and Communication Flows",
        moduleNum: 1,
        lessonNum: 3,
      },
      {
        order: 4,
        title: "Regulatory and Compliance Considerations",
        moduleNum: 1,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 2,
    title: "Detecting Discrepancies with Rule-Based Logic",
    description:
      "Learn how to design and implement deterministic rule-based systems that catch pricing, quantity, and receipt discrepancies before they become disputes. This module covers the logic layer that forms the foundation of an AP dispute-resolution agent.",
    lessons: [
      { order: 1, title: "Pricing Discrepancy Detection", moduleNum: 2, lessonNum: 1 },
      {
        order: 2,
        title: "Quantity and Goods Receipt Reconciliation",
        moduleNum: 2,
        lessonNum: 2,
      },
      { order: 3, title: "Duplicate Invoice Detection", moduleNum: 2, lessonNum: 3 },
      {
        order: 4,
        title: "Building a Rule Engine for AP Validation",
        moduleNum: 2,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 3,
    title: "Anomaly Detection and Pattern Recognition",
    description:
      "Move beyond static rules to statistical and ML-based anomaly detection that identifies unusual invoice patterns, vendor behavior shifts, and emerging fraud signals across time.",
    lessons: [
      {
        order: 1,
        title: "Statistical Baselines for Invoice Behavior",
        moduleNum: 3,
        lessonNum: 1,
      },
      { order: 2, title: "Temporal Pattern Analysis", moduleNum: 3, lessonNum: 2 },
      {
        order: 3,
        title: "Cross-Vendor and Cross-Category Anomalies",
        moduleNum: 3,
        lessonNum: 3,
      },
      { order: 4, title: "Combining Rules and Anomaly Scores", moduleNum: 3, lessonNum: 4 },
    ],
  },
  {
    order: 4,
    title: "Autonomous Agent Behavior and Supplier Communication",
    description:
      "Design the agent's autonomous behaviors: drafting dispute communications, proposing resolution actions, and managing the supplier interaction lifecycle from initial outreach through closure.",
    lessons: [
      { order: 1, title: "Designing Agent Decision Logic", moduleNum: 4, lessonNum: 1 },
      { order: 2, title: "Drafting Supplier Dispute Messages", moduleNum: 4, lessonNum: 2 },
      { order: 3, title: "Managing the Dispute Lifecycle", moduleNum: 4, lessonNum: 3 },
      {
        order: 4,
        title: "Surfacing Issues to Managers with Actionable Context",
        moduleNum: 4,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 5,
    title: "Human-in-the-Loop Learning and Continuous Improvement",
    description:
      "Implement feedback loops that allow the agent to learn from human decisions, improving its accuracy and expanding its autonomy over time through supervised reinforcement.",
    lessons: [
      {
        order: 1,
        title: "Capturing Human Decisions as Training Signal",
        moduleNum: 5,
        lessonNum: 1,
      },
      {
        order: 2,
        title: "Updating Rules and Models from Feedback",
        moduleNum: 5,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Expanding Agent Autonomy Over Time",
        moduleNum: 5,
        lessonNum: 3,
      },
      {
        order: 4,
        title: "Measuring Agent ROI and Operational Impact",
        moduleNum: 5,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 6,
    title: "Capstone — Building an End-to-End Dispute Resolution Agent",
    description:
      "Synthesize all prior modules by designing, evaluating, and defending a complete dispute resolution agent system. The capstone tests the learner's ability to integrate rule-based detection, anomaly scoring, autonomous communication, and human-in-the-loop learning into a production-ready architecture.",
    lessons: [
      { order: 1, title: "System Architecture Design", moduleNum: 6, lessonNum: 1 },
      {
        order: 2,
        title: "Implementation Planning and Phased Rollout",
        moduleNum: 6,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Case Study Analysis — Real-World Dispute Resolution Agents",
        moduleNum: 6,
        lessonNum: 3,
      },
    ],
  },
]

export async function seedDisputeResolutionCourse(): Promise<void> {
  console.log("  Upserting course: Dispute Resolution in Accounts Payable...")

  const course = await prisma.course.upsert({
    where: { slug: "dispute-resolution-ap" },
    update: {
      title: "Dispute Resolution in Accounts Payable",
      status: "PUBLISHED",
    },
    create: {
      title: "Dispute Resolution in Accounts Payable",
      slug: "dispute-resolution-ap",
      description:
        "Master the detection, communication, and resolution of invoice discrepancies. Learn to build rule-based and AI-driven AP dispute agents that reduce resolution time, prevent duplicate payments, and improve supplier relationships.",
      status: "PUBLISHED",
    },
  })

  console.log(`  Course upserted: ${course.id}`)

  for (const moduleConfig of MODULE_CONFIGS) {
    console.log(`  Creating module ${moduleConfig.order}: ${moduleConfig.title}`)

    // Delete existing module (cascade deletes lessons and quiz)
    await prisma.module.deleteMany({
      where: { courseId: course.id, order: moduleConfig.order },
    })

    const module = await prisma.module.create({
      data: {
        courseId: course.id,
        title: moduleConfig.title,
        description: moduleConfig.description,
        order: moduleConfig.order,
      },
    })

    // Create lessons
    for (const lessonConfig of moduleConfig.lessons) {
      const contentBody = buildContentBody(
        lessonConfig.moduleNum,
        lessonConfig.lessonNum,
        lessonConfig.title
      )

      await prisma.lesson.create({
        data: {
          moduleId: module.id,
          title: lessonConfig.title,
          order: lessonConfig.order,
          contentType: "MIXED",
          contentBody,
        },
      })
    }

    console.log(`    Created ${moduleConfig.lessons.length} lessons`)

    // Create quiz for this module
    const quizData = quizzes.find((q) => q.moduleOrder === moduleConfig.order)
    if (quizData) {
      await prisma.quiz.create({
        data: {
          moduleId: module.id,
          title: quizData.title,
          passingScore: quizData.passingScore,
          questions: {
            create: quizData.questions.map((q) => ({
              text: q.text,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
            })),
          },
        },
      })
      console.log(`    Created quiz with ${quizData.questions.length} questions`)
    }
  }

  const totalModules = MODULE_CONFIGS.length
  const totalLessons = MODULE_CONFIGS.reduce((sum, m) => sum + m.lessons.length, 0)
  const totalQuestions = quizzes.reduce((sum, q) => sum + q.questions.length, 0)

  console.log(
    `  Done: ${totalModules} modules, ${totalLessons} lessons, ${totalModules} quizzes, ${totalQuestions} questions`
  )
}

// Allow running directly
if (require.main === module) {
  seedDisputeResolutionCourse()
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
