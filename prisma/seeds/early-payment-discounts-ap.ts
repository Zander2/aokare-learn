import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { join } from "path"

const prisma = new PrismaClient()

const CONTENT_DIR = join(__dirname, "../../content/early-payment-discounts-ap")

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

// Extracted from content/early-payment-discounts-ap/resources.md
const RESOURCES: Record<string, ResourceEntry> = {
  "1-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=early+payment+discount+annualized+cost+calculation+2%2F10+net+30+accounts+payable",
    articleUrl:
      "https://www.highradius.com/resources/Blog/early-payment-discount/",
    articleLabel:
      "What Is Early Payment Discount: Benefits & How To Calculate (HighRadius) — covers the annualized rate formula, worked examples, and the opportunity-cost framing for both buyer and supplier.",
  },
  "1-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=dynamic+discounting+vs+supply+chain+finance+payment+terms+explained",
    articleUrl: "https://taulia.com/glossary/what-is-dynamic-discounting/",
    articleLabel:
      "What Is Dynamic Discounting? (SAP Taulia) — clearly differentiates static vs. dynamic discounting, sliding-scale mechanics, and the relationship to supply chain finance with real-world buyer/supplier context.",
  },
  "1-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=AP+automation+early+payment+discount+capture+missed+discounts+accounts+payable",
    articleUrl:
      "https://rossum.ai/blog/early-payment-discounts-in-accounts-payable/",
    articleLabel:
      "How to Automate Early Payment Discounts in Accounts Payable (Rossum) — quantifies the cost of missed discounts, documents typical manual failure points, and explains how automation shifts capture rates from ~58% to 85–95%.",
  },
  "1-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=early+payment+discount+program+business+case+implementation+stakeholder+alignment",
    articleUrl:
      "https://www.coupa.com/blog/how-succeed-early-payment-discount-programs/",
    articleLabel:
      "How to Succeed with Early Payment Discount Programs (Coupa) — covers prerequisites, stakeholder roles, supplier segmentation, KPIs, and the change-management considerations for launching an EPD program at scale.",
  },
  "2-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=invoice+OCR+AI+data+extraction+ERP+SAP+Oracle+accounts+payable+automation",
    articleUrl:
      "https://www.artsyltech.com/blog/sap-invoice-processing-automation-2025-guide",
    articleLabel:
      "SAP Invoice Processing: 2025 Automation Guide (Artsyl Technologies) — explains how OCR, AI parsing, and ERP connectors (SAP, Oracle, NetSuite) work together to extract discount-relevant fields and build automated flagging pipelines.",
  },
  "2-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+working+capital+optimization+payment+terms+prioritization+treasury",
    articleUrl:
      "https://www.jpmorgan.com/insights/treasury/trade-working-capital/working-capital-optimization-in-accounts-payables",
    articleLabel:
      "Working Capital Optimization in Accounts Payables (J.P. Morgan) — covers supplier segmentation, cash constraint integration, prioritization frameworks, and how treasury-approved guardrails shape AP decision rules.",
  },
  "2-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=machine+learning+supplier+payment+prediction+logistic+regression+accounts+payable",
    articleUrl:
      "https://www.researchgate.net/publication/366303491_A_MACHINE-LEARNING_APPROACH_TOWARDS_SOLVING_THE_INVOICE_PAYMENT_PREDICTION_PROBLEM",
    articleLabel:
      "A machine-learning approach towards solving the invoice payment prediction problem (ResearchGate) — academic paper covering logistic regression, feature engineering on payment history, and feedback loops for improving acceptance prediction accuracy.",
  },
  "2-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=days+payable+outstanding+DPO+cash+flow+treasury+early+payment+working+capital",
    articleUrl:
      "https://www.jpmorgan.com/insights/treasury/receivables/dso-and-dpo-how-they-can-improve-your-cash-flow",
    articleLabel:
      "DSO & DPO: How They Can Improve Your Cash Flow (J.P. Morgan) — explains the DPO/cash conversion cycle impact of early payment decisions and how treasury teams set guardrails for working capital management.",
  },
  "3-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=supplier+discount+proposal+email+template+accounts+payable+best+practices",
    articleUrl:
      "https://www.phoenixstrategy.group/blog/how-to-negotiate-supplier-payment-terms",
    articleLabel:
      "How to Negotiate Supplier Payment Terms (Phoenix Strategy Group) — covers email communication structure, documenting agreed terms, tone calibration, and the compliance requirements (clear terms, opt-out language) for professional discount proposals.",
  },
  "3-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=AI+agent+negotiation+BATNA+anchoring+concession+strategy+autonomous+procurement",
    articleUrl:
      "https://www.gep.com/blog/technology/autonomous-negotiation-agents",
    articleLabel:
      "Autonomous Negotiation Agents for Savings (GEP) — describes how AI agents apply anchoring, BATNA-based thresholds, and concession ladders in real procurement negotiations, with guardrails preventing manipulative tactics.",
  },
  "3-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=vendor+negotiation+objection+handling+counter+offer+accounts+payable+escalation",
    articleUrl: "https://www.sastrify.com/blog/handle-vendor-negotiations",
    articleLabel:
      "Vendor Negotiations: How to Handle & Overcome Objections (Sastrify) — classifies vendor response types, explains counter-offer parsing, documents escalation paths requiring human judgment, and covers follow-up cadence strategy.",
  },
  "3-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+KPI+dashboard+discount+capture+rate+A/B+testing+AP+metrics",
    articleUrl: "https://www.medius.com/blog/top-5-most-useful-ap-kpis/",
    articleLabel:
      "Top KPIs for Accounts Payable: The Best AP Metrics to Track (Medius) — covers outreach-to-capture funnel metrics, discount capture rate as a KPI, dashboard design for stakeholders, and segment-level analysis frameworks.",
  },
  "4-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=AI+agent+architecture+accounts+payable+automation+state+machine+invoice+processing+design",
    articleUrl:
      "https://chatfin.ai/blog/step-by-step-guide-building-ai-agents-for-accounts-payable-automation/",
    articleLabel:
      "Step-by-Step Guide: Building AI Agents for Accounts Payable Automation (ChatFin) — diagrams the end-to-end agent architecture, component breakdown (ingestion, scoring, outreach, payment), integration patterns with ERP/email/treasury, and the agent decision loop.",
  },
  "4-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=invoice+processing+pipeline+python+ERP+integration+scoring+function+AP+automation+developer",
    articleUrl:
      "https://nanonets.com/blog/automate-accounts-payable-using-multi-agent-systems/",
    articleLabel:
      "How to automate Accounts Payable using LLM-Powered Multi Agent Systems (Nanonets) — walks through invoice ingestion (webhook/polling/batch), field extraction from structured and unstructured data, scoring function implementation, cash constraint filtering, and unit testing with realistic invoice data.",
  },
  "4-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=LLM+negotiation+engine+email+generation+NLP+response+parsing+state+machine+AI+agent",
    articleUrl:
      "https://medium.com/@kiranchowdhary/revolutionizing-enterprise-deal-negotiations-with-ai-how-llms-and-mcp-are-transforming-pricing-6399998a8c80",
    articleLabel:
      "Revolutionizing Enterprise Deal Negotiations with AI: How LLMs and MCP Are Transforming Pricing (Medium / Kiran R) — covers LLM-powered email generation, prompt design for tone control, NLP-based response classification, concession logic implementation, and audit logging for negotiation state machines.",
  },
  "4-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=ERP+payment+API+reconciliation+accounts+payable+automation+discount+window+early+payment",
    articleUrl:
      "https://tipalti.com/ap-automation/automated-payment-reconciliation/",
    articleLabel:
      "Automated Payment Reconciliation for Effortless Financial Accuracy (Tipalti) — details payment execution via ERP/banking APIs, timing controls for discount windows, confirmation and receipt workflows, reconciliation of early payments to invoices, and error-handling/retry strategies.",
  },
  "4-5": {
    videoUrl:
      "https://www.youtube.com/results?search_query=AI+agent+shadow+mode+deployment+monitoring+rollback+phased+rollout+ML+testing",
    articleUrl: "https://cobbai.com/blog/ai-rollout-post-launch-review",
    articleLabel:
      "Post-Launch Reviews: How to Use Shadow Mode, Gradual Autonomy, and QA in AI Rollouts (Cobbai) — describes shadow mode deployment (agent recommends, human acts), phased autonomy increases, monitoring/alerting setup, anomaly detection, and rollback procedures for AI agent misbehavior.",
  },
  "5-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=agent+to+agent+negotiation+protocol+B2B+commerce+inter-agent+communication+agentic",
    articleUrl:
      "https://www.b2bnn.com/2026/01/how-agentic-commerce-is-being-restructured-inside-the-architecture-of-agent-mediated-transactions/",
    articleLabel:
      "How Agentic Commerce Is Changing Ecommerce: UCP and Agent-Mediated Transactions (B2B News Network) — covers emerging agent-to-agent protocols (A2A, AITP, UCP), structured proposal/counter/accept/reject message semantics, channel selection logic, and the discovery mechanisms that let a buyer agent detect a supplier agent on a shared platform.",
  },
  "5-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=AI+agent+identity+verification+cryptographic+trust+autonomous+financial+negotiation+security",
    articleUrl:
      "https://www.dock.io/post/ai-agent-digital-identity-verification",
    articleLabel:
      "AI Agent Digital Identity Verification: How to Trust Autonomous Decisions (Dock Labs) — explains the trust model for autonomous agents, cryptographic credential binding, delegated-authority scopes (spend limits, merchant scope, expiry), message integrity verification, and dispute prevention through structured protocols.",
  },
  "5-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=game+theory+repeated+games+tit+for+tat+cooperative+strategy+automated+negotiation",
    articleUrl:
      "https://medium.com/@fabioherle/building-autonomous-negotiations-that-actually-work-lessons-from-180-098-ai-negotiations-805a2f8798a4",
    articleLabel:
      "AI Negotiation Agents: What Actually Works (Medium / Fabio Herle) — analyzes patterns from 180,000 autonomous negotiations, covering mutual-benefit design, time dynamics, tit-for-tat and cooperative strategies, log analysis for winning patterns, and reciprocity signals for relationship building.",
  },
  "5-4": {
    videoUrl:
      "https://www.youtube.com/results?search_query=supply+chain+finance+platform+scaling+supplier+onboarding+network+effects+procurement+future",
    articleUrl:
      "https://tasconnect.com/supply-chain-finance-scale-digital-platforms/",
    articleLabel:
      "Supply Chain Finance Interoperability: The Key to Scale (TAS Connect) — covers supplier onboarding strategies, network effects on platform value, emerging open standards for inter-agent financial protocols, regulatory considerations for autonomous agreements, and the maturity model from email-first to fully autonomous negotiation.",
  },
  "6-1": {
    videoUrl:
      "https://www.youtube.com/results?search_query=accounts+payable+automation+case+study+early+payment+discount+enterprise+deployment+ROI",
    articleUrl:
      "https://www.procuredesk.com/accounts-payable-automation-case-study/",
    articleLabel:
      "6 Real-World Accounts Payable Automation Case Studies (ProcureDesk) — presents concrete enterprise deployments (covering architecture review, scoring model evaluation, negotiation strategy assessment, and treasury integration), deliberately seeded issues, and lessons for improving discount capture rates.",
  },
  "6-2": {
    videoUrl:
      "https://www.youtube.com/results?search_query=ethical+AI+autonomous+negotiation+supplier+fairness+power+asymmetry+responsible+deployment",
    articleUrl:
      "https://ctl.mit.edu/news/how-ai-reshaping-supplier-negotiations",
    articleLabel:
      "How AI Is Reshaping Supplier Negotiations (MIT Center for Transportation and Logistics) — examines power dynamics between large buyers and small suppliers in AI-mediated negotiations, fairness constraints, transparency obligations, regulatory compliance (EU AI Act), and responsible deployment frameworks for autonomous negotiation agents.",
  },
  "6-3": {
    videoUrl:
      "https://www.youtube.com/results?search_query=end+to+end+accounts+payable+process+early+payment+discount+lifecycle+automation+synthesis",
    articleUrl:
      "https://www.mineraltree.com/blog/end-to-end-accounts-payable-process/",
    articleLabel:
      "What is the End-to-End Accounts Payable Process? (MineralTree) — connects every stage of the AP lifecycle — invoice capture, approval, discount identification, negotiation, payment execution, and reconciliation — into a single coherent workflow, covering trade-offs between email-based and agent-to-agent approaches and common pitfalls from real deployments.",
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
    title: "Module 1 Quiz: Foundations of Early Payment Discounts",
    passingScore: 70,
    questions: [
      {
        text: "A supplier invoice shows terms of '2/10 net 30.' Using the standard annualized rate formula, what is the approximate annualized cost of forgoing this discount?",
        type: "MCQ",
        options: ["A) 12.0%", "B) 24.3%", "C) 37.24%", "D) 43.5%"],
        correctAnswer: "C",
        explanation:
          "The formula is (Discount% / (1 - Discount%)) × (365 / (Full Terms - Discount Period)) = (0.02 / 0.98) × (365 / 20) = 0.02041 × 18.25 = 37.24%. This means forgoing a 2% discount over a 20-day window is equivalent to paying 37.24% annualized — an extraordinarily expensive decision for most organizations.",
      },
      {
        text: "A company's cost of capital is 8% and its best short-term investment returns 5.25%. A supplier offers 2/10 net 30 terms (annualized rate ~37.24%). Should the company take the discount?",
        type: "MCQ",
        options: [
          "A) No — the company should invest the cash at 5.25% instead",
          "B) Yes — the 37.24% annualized discount rate exceeds both the cost of capital and investment returns",
          "C) Only if the company has surplus cash with no other uses",
          "D) No — the discount percentage (2%) is lower than the cost of capital (8%)",
        ],
        correctAnswer: "B",
        explanation:
          "The decision rule is: take the discount when the annualized discount rate exceeds your cost of capital or best alternative return. At 37.24%, this discount beats both alternatives (8% cost of capital and 5.25% investment return) by a wide margin. Even drawing on a credit line at 8% to fund early payment yields a net benefit of ~29%.",
      },
      {
        text: "Dynamic discounting allows buyers to offer different discount rates depending on how early they pay, with larger discounts for faster payment.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Dynamic discounting (or sliding-scale discounting) links the discount rate to the payment date: the earlier the payment, the greater the discount offered. This differs from static early payment discounts where a single rate applies to any payment within the discount window.",
      },
      {
        text: "From a supplier's perspective, which of the following is the primary financial benefit of offering early payment discounts?",
        type: "MCQ",
        options: [
          "A) Reducing the supplier's cost of goods sold",
          "B) Improving accounts receivable turnover by reducing Days Sales Outstanding (DSO)",
          "C) Avoiding late-payment penalties from the buyer",
          "D) Increasing the invoice amount to offset the discount cost",
        ],
        correctAnswer: "B",
        explanation:
          "Suppliers offer early payment discounts to accelerate cash collection, reducing DSO. For a supplier with $20M in annual revenue, reducing DSO by 10 days frees roughly $548,000 in working capital. This freed cash can be deployed in operations, reducing reliance on expensive credit facilities or invoice factoring.",
      },
      {
        text: "Which of the following is NOT one of the four key variables that determine whether taking an early payment discount is financially advantageous?",
        type: "MCQ",
        options: [
          "A) The discount percentage offered by the supplier",
          "B) The length of the acceleration period",
          "C) The buyer's credit rating with the bank",
          "D) The buyer's internal cost of capital",
        ],
        correctAnswer: "C",
        explanation:
          "The four variables are: discount percentage (set by supplier), acceleration period (set by supplier), cost of capital (internal to buyer), and cash availability (internal to buyer). The buyer's credit rating with a bank may affect the cost of capital indirectly, but it is not itself one of the four decision variables in the discount evaluation framework.",
      },
    ],
  },
  {
    moduleOrder: 2,
    title: "Module 2 Quiz: Discount Identification and Opportunity Analysis",
    passingScore: 70,
    questions: [
      {
        text: "In the opportunity scoring model, which three dimensions are combined to rank discount opportunities?",
        type: "MCQ",
        options: [
          "A) Invoice age, supplier size, and payment method",
          "B) Financial value, probability of success, and relationship value",
          "C) Invoice amount, supplier location, and payment terms length",
          "D) Annualized rate, ERP system, and invoice currency",
        ],
        correctAnswer: "B",
        explanation:
          "The scoring model combines three dimensions: financial value (how much is the discount worth in dollars and annualized rate), probability of success (likelihood the supplier will accept, or ability to fund in time for existing terms), and relationship value (how strategically important is this supplier). These three factors are weighted and combined into a composite score.",
      },
      {
        text: "An opportunity scoring model assigns a financial weight of 50%, probability weight of 30%, and relationship weight of 20%. A 'strategic' supplier receives a relationship score of 90. If a buyer wants to de-emphasize financial return and focus more on relationship investment, they should increase the relationship weight and decrease the financial weight.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "The scoring weights directly encode organizational strategy. A CFO who prioritizes supplier relationships translates that priority into a higher relationship weight in the model. This is not just an abstract concept — it changes which invoices get selected for early payment and how aggressively the agent pursues discounts with strategic suppliers.",
      },
      {
        text: "A company has a daily early payment budget of $200,000. Invoice A ($83,300, score 80.5) and Invoice C ($147,750, score 55.1) cannot both fit in the budget. Invoice D ($44,100, score 49.5) has only 2 days remaining before its discount deadline. What should the agent do?",
        type: "MCQ",
        options: [
          "A) Select Invoice C because it has the higher absolute discount value",
          "B) Select Invoice A and Invoice D — A has the highest score and D has an urgent deadline, and both fit within the $200,000 budget",
          "C) Wait for tomorrow's budget to handle all three invoices",
          "D) Select only Invoice A and hold the budget for other opportunities",
        ],
        correctAnswer: "B",
        explanation:
          "Invoice A ($83,300, score 80.5) is the highest priority. Invoice C ($147,750) would exceed the remaining $116,700 budget. Invoice D ($44,100, score 49.5) fits, and its 2-day deadline creates urgency — a missed deadline cannot be recovered tomorrow. The agent selects A + D ($127,400 total), preserving $72,600 for later use.",
      },
      {
        text: "Which of the following signals would lead a predictive model to rate a supplier as HIGHLY receptive to an early payment discount proposal?",
        type: "MCQ",
        options: [
          "A) The supplier has $500M in annual revenue and a AAA credit rating",
          "B) The supplier has consistently rejected previous discount proposals and pays its own suppliers on extended terms",
          "C) The supplier has a history of accepting discount proposals, is a smaller business, and is in a cash-intensive industry with seasonal revenue patterns",
          "D) The supplier recently raised prices and extended its payment terms to 60 days",
        ],
        correctAnswer: "C",
        explanation:
          "Receptiveness is highest when a supplier has a weak BATNA — they need cash more than they need to wait for full payment. A smaller supplier in a cash-intensive industry with seasonal patterns likely has tighter cash flow and will value early payment. Historical acceptance is the strongest direct predictor; supplier size and seasonality are enrichment signals.",
      },
      {
        text: "When an agent determines the daily budget for early payments, it should commit up to 100% of the available cash balance to maximize savings capture.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "Committing 100% of available cash to early payments is dangerous — it leaves no buffer for unexpected outflows (emergencies, payroll, debt service). Best practice applies a safety multiplier (e.g., 50% of truly available cash) and applies a hard daily cap set by treasury. The agent must balance savings maximization against operational liquidity needs.",
      },
      {
        text: "Early payment programs affect which key working capital metric by reducing the time invoices remain unpaid?",
        type: "MCQ",
        options: [
          "A) Days Sales Outstanding (DSO) for the buyer",
          "B) Days Payable Outstanding (DPO) for the buyer",
          "C) Inventory Days for the buyer",
          "D) Current Ratio for the supplier",
        ],
        correctAnswer: "B",
        explanation:
          "When a buyer pays invoices earlier than their standard payment terms, their Days Payable Outstanding (DPO) decreases — they are holding payables for fewer days. This is a working capital trade-off: the buyer accepts lower DPO in exchange for the discount savings. Treasury must model this impact when setting early payment budgets.",
      },
    ],
  },
  {
    moduleOrder: 3,
    title: "Module 3 Quiz: Supplier Communication and Negotiation Strategy",
    passingScore: 70,
    questions: [
      {
        text: "Why do AI agents begin discount negotiations via email rather than immediately using direct automated protocols?",
        type: "MCQ",
        options: [
          "A) Email is faster than all other communication channels",
          "B) Email provides transparency, an audit trail, and is the familiar, trust-building channel for suppliers who may not use automated platforms",
          "C) Regulatory requirements mandate email as the first communication channel for financial negotiations",
          "D) Email is the only channel that supports multi-language communication",
        ],
        correctAnswer: "B",
        explanation:
          "Email is the initial channel because it is transparent, creates a clear audit trail, and is universally accessible to suppliers who may not be on any automation platform. Starting with email respects the existing supplier relationship and builds trust before attempting more automated or direct negotiation approaches.",
      },
      {
        text: "In the anchoring negotiation framework, an agent should open with its minimum acceptable discount to increase the chance of acceptance.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "Anchoring theory shows that the first number in a negotiation disproportionately influences the outcome. The agent should open at the upper end of its acceptable range (e.g., 2.0% if the minimum is 1.0%), not at the minimum. Opening conservatively makes it harder to achieve good outcomes, while opening ambitiously (but defensibly) sets a favorable anchor.",
      },
      {
        text: "An agent's concession ladder shows decreasing concession sizes across rounds (0.25%, 0.25%, 0.15%, 0.10%). Why is decreasing concession size a deliberate strategy?",
        type: "MCQ",
        options: [
          "A) Decreasing concessions confuse the supplier and prevent them from calculating the walk-away point",
          "B) Decreasing concessions signal that the agent is approaching its limit, making each step feel more costly and valuable",
          "C) Decreasing concessions are required by fair negotiation regulations",
          "D) Decreasing concessions ensure the agent always ends up at the midpoint between the opening offer and the minimum",
        ],
        correctAnswer: "B",
        explanation:
          "In negotiation, equal or increasing concession sizes signal there is plenty more room to negotiate. Decreasing concession sizes — getting smaller with each round — credibly signal that the agent is nearing its hard limit. This makes the final concession feel significant to the supplier even if the absolute amount is small.",
      },
      {
        text: "A small supplier with less than $5M in annual revenue counters the agent's 2.5% discount proposal with an offer of 1.0%. The agent's ethical rules cap discount requests at 1.5% for small suppliers. What should the agent do?",
        type: "MCQ",
        options: [
          "A) Accept the 1.0% counter-offer, as it is below the ethical cap and above the cost of capital",
          "B) Reject the counter-offer and re-open at 2.5% citing market norms",
          "C) Counter with 2.0%, ignoring the small supplier cap",
          "D) Immediately escalate to a human negotiator since the supplier counter-offered",
        ],
        correctAnswer: "A",
        explanation:
          "The ethical rules cap discount requests at 1.5% for suppliers under $5M in revenue to prevent large buyers from exploiting power asymmetries. The supplier's counter of 1.0% is below this cap and above the cost of capital threshold. Accepting it is the correct action — it is financially beneficial and ethically aligned with fair supplier treatment.",
      },
      {
        text: "A supplier has not responded to the agent's initial discount proposal after 5 business days. What is the appropriate next step according to the follow-up cadence?",
        type: "MCQ",
        options: [
          "A) Close the negotiation and mark the opportunity as failed",
          "B) Send a follow-up message and restart the waiting period",
          "C) Immediately escalate to the CFO",
          "D) Automatically accept any prior counter-offer on file",
        ],
        correctAnswer: "B",
        explanation:
          "Non-response is the most common outcome in discount negotiations. The agent follows its defined follow-up cadence (typically 2 follow-ups, 3-5 days apart) before closing. A single non-response does not end the opportunity — it triggers the first follow-up, maintaining professionalism while maintaining persistence.",
      },
      {
        text: "Which metric directly measures the effectiveness of discount proposal message templates across the supplier population?",
        type: "MCQ",
        options: [
          "A) Days Payable Outstanding",
          "B) Invoice processing time",
          "C) Acceptance rate — the percentage of proposals the supplier agrees to",
          "D) Discount capture rate — the percentage of eligible invoices that result in an early payment",
        ],
        correctAnswer: "C",
        explanation:
          "Acceptance rate measures how often suppliers agree to the agent's proposals. It is the direct measure of whether the outreach message, proposal terms, and negotiation strategy are effective. A low acceptance rate signals that messages need to be tested (A/B testing), terms calibrated, or supplier targeting improved. Discount capture rate is a downstream metric that depends on acceptance rate.",
      },
      {
        text: "A/B testing of discount negotiation message templates involves sending version A to all suppliers for one month, then switching to version B the next month, and comparing results.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "Time-based testing (version A one month, version B the next) is vulnerable to confounding variables — seasonal patterns, supplier behavior changes, or cash position differences between months. True A/B testing splits the supplier population simultaneously, sending version A to one group and version B to another in the same time period, isolating the template effect from other variables.",
      },
    ],
  },
  {
    moduleOrder: 4,
    title: "Module 4 Quiz: Building the Early Payment Discount Agent",
    passingScore: 70,
    questions: [
      {
        text: "In the agent's observe-orient-decide-act (OODA) loop, what does the 'orient' stage specifically accomplish in the context of early payment discounts?",
        type: "MCQ",
        options: [
          "A) Sending the discount proposal to the supplier",
          "B) Triggering the payment through the ERP system",
          "C) Scoring and ranking newly ingested invoices to identify discount opportunities worth pursuing",
          "D) Parsing supplier responses and updating the negotiation state machine",
        ],
        correctAnswer: "C",
        explanation:
          "In the agent loop for early payment discounts: Observe = new invoices arrive; Orient = score invoices to determine which opportunities to pursue (financial value, probability, cash availability); Decide = should the agent negotiate for this invoice?; Act = send proposal or execute payment. The 'orient' stage transforms raw invoice data into actionable ranked opportunities.",
      },
      {
        text: "When ingesting invoices for discount opportunity analysis, what is the most critical action when payment terms are missing or ambiguous in the invoice data?",
        type: "MCQ",
        options: [
          "A) Assume standard net-30 terms and proceed with processing",
          "B) Route the invoice to the discount opportunity queue with a default 2% discount",
          "C) Flag the invoice for data quality review rather than proceeding with incomplete information",
          "D) Skip the invoice entirely and move to the next one",
        ],
        correctAnswer: "C",
        explanation:
          "Missing or ambiguous payment terms undermine the entire discount analysis — you cannot correctly score an opportunity if you do not know the actual terms. Flagging for data quality review prevents the agent from making decisions based on assumed or incorrect terms, which could lead to missed real opportunities or miscalculated proposals.",
      },
      {
        text: "The negotiation state machine in the discount agent has a 'FINAL_OFFER' state. What distinguishes a final offer from a regular counter-offer in the machine's logic?",
        type: "MCQ",
        options: [
          "A) A final offer is always higher than the opening offer",
          "B) After a final offer is sent, the agent will not make further concessions — the next move is ACCEPTED or the negotiation closes",
          "C) A final offer is sent only after the supplier has rejected three previous proposals",
          "D) A final offer requires CFO approval before it can be sent",
        ],
        correctAnswer: "B",
        explanation:
          "The FINAL_OFFER state signals that the agent has reached the bottom of its concession ladder — this is the minimum acceptable offer. If the supplier accepts, the negotiation moves to ACCEPTED. If they reject or counter below the minimum, the negotiation closes (CLOSED_NO_DEAL). The agent does not counter further below its configured walk-away point.",
      },
      {
        text: "An early payment discount agent executes payment through the ERP API after a supplier accepts a proposal. What must happen BEFORE the payment is marked as complete?",
        type: "MCQ",
        options: [
          "A) The agent must wait 30 days to confirm no disputes arise",
          "B) The payment must be confirmed as received by the supplier and the transaction must be reconciled against the original invoice within the discount window",
          "C) The CFO must manually approve all payments above $10,000",
          "D) The agent must send a second follow-up email to the supplier confirming acceptance",
        ],
        correctAnswer: "B",
        explanation:
          "Payment execution is only complete when: (1) the payment lands within the discount window, (2) the supplier confirms receipt, and (3) the payment is reconciled against the original invoice in both the buyer's and supplier's systems. A payment triggered but not confirmed within the window does not earn the discount — timing control is critical.",
      },
      {
        text: "In the shadow mode deployment phase, the agent's recommendations are sent directly to suppliers without human review.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "In shadow mode, the agent observes real invoices and generates recommendations, but humans continue to make all decisions. The agent's outputs are compared to human decisions for evaluation purposes only. No autonomous actions are taken. This phase establishes the accuracy baseline needed to justify moving to the pilot phase.",
      },
      {
        text: "When setting up monitoring and alerting for a deployed discount agent, which of the following would be the most concerning alert to receive?",
        type: "MCQ",
        options: [
          "A) Invoice processing volume is 10% higher than last week",
          "B) Acceptance rate has dropped from 45% to 12% over 3 consecutive days",
          "C) Two suppliers have opted out of the program",
          "D) The agent sent 3 follow-up emails in one day",
        ],
        correctAnswer: "B",
        explanation:
          "A sudden drop in acceptance rate from 45% to 12% over three days is a strong signal that something is wrong — perhaps the agent's proposals are misconfigured, a negotiation strategy has been corrupted, or there is a systematic targeting error. This level of degradation warrants immediate investigation and potentially agent suspension. Small volume fluctuations and opt-outs are expected operational events.",
      },
      {
        text: "An agent's concession engine must enforce a minimum acceptable threshold, sometimes called the 'walk-away point.' What happens if a supplier's counter-offer falls below this threshold?",
        type: "MCQ",
        options: [
          "A) The agent automatically accepts to preserve the supplier relationship",
          "B) The agent ignores the counter-offer and resends the original proposal",
          "C) The agent sends a FINAL_OFFER at the minimum threshold or closes the negotiation",
          "D) The agent escalates immediately to a senior AP manager to override the threshold",
        ],
        correctAnswer: "C",
        explanation:
          "The walk-away point is a hard floor — below this discount rate, paying early would destroy value (the discount is worth less than the cost of deploying cash early). When a supplier counters below this threshold, the agent either sends a final offer at the minimum or closes the negotiation. Accepting below the walk-away point would be financially irrational.",
      },
      {
        text: "The audit log for the discount negotiation engine must capture every outbound message, inbound response, and agent decision. Which principle makes this log trustworthy as an audit artifact?",
        type: "MCQ",
        options: [
          "A) The log is stored in the same database as the negotiation state machine for easy access",
          "B) The log entries are immutable — once written, they cannot be modified or deleted",
          "C) The log is reviewed by a human auditor before each negotiation round",
          "D) The log is encrypted end-to-end and accessible only to the CFO",
        ],
        correctAnswer: "B",
        explanation:
          "Immutability is the critical property for audit logs. If log entries could be modified after the fact, they would not be reliable evidence of what the agent actually did. An immutable log — written once and append-only — provides a tamper-evident record that can be trusted by auditors, regulators, and both parties in any dispute.",
      },
    ],
  },
  {
    moduleOrder: 5,
    title: "Module 5 Quiz: Agent-to-Agent Negotiation on Causa Prima",
    passingScore: 70,
    questions: [
      {
        text: "What is the primary advantage of the Causa Prima agent-to-agent protocol over email-based negotiation?",
        type: "MCQ",
        options: [
          "A) Agent-to-agent negotiation eliminates the need for any audit trail",
          "B) Structured message semantics eliminate ambiguity, and round-trip speed drops from days to seconds",
          "C) Agent-to-agent negotiation allows discount requests above the ethical cap for strategic suppliers",
          "D) Email is prohibited for financial negotiations under most regulatory frameworks",
        ],
        correctAnswer: "B",
        explanation:
          "The two key advantages are speed (seconds vs. days per round) and consistency (structured JSON fields with strict semantics eliminate the ambiguity inherent in natural language emails). A negotiation with two counter-offers that takes 5-7 days via email can complete in under 2 seconds on the Causa Prima platform.",
      },
      {
        text: "In the Causa Prima negotiation protocol, which message type is always terminal — ending the negotiation without an agreement?",
        type: "MCQ",
        options: ["A) COUNTER", "B) WITHDRAW", "C) REJECT", "D) PROPOSAL"],
        correctAnswer: "C",
        explanation:
          "REJECT is a terminal message — it ends the negotiation without agreement. ACCEPT is the other terminal message, ending in agreement. COUNTER and PROPOSAL both create new opportunities for the other party to respond. WITHDRAW cancels a pending proposal but does not terminate the entire conversation.",
      },
      {
        text: "When a buyer agent cannot find a supplier in the Causa Prima Discovery Registry, it should immediately close the discount opportunity as 'not pursuable.'",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "If a supplier is not found in the Causa Prima registry, the channel selection logic falls back to email-based negotiation. The discount opportunity remains pursuable via the email channel. Only if the supplier has no email contact and is not on the platform should the opportunity be routed to manual outreach — not automatically closed.",
      },
      {
        text: "How does the concept of 'BATNA' apply to the supplier side of an agent-to-agent negotiation on Causa Prima?",
        type: "MCQ",
        options: [
          "A) The supplier's BATNA is receiving a higher price on their next PO",
          "B) The supplier's BATNA is receiving full payment at standard net terms — the fallback if no discount agreement is reached",
          "C) The supplier's BATNA is filing a dispute against the buyer",
          "D) The supplier's BATNA is switching to a different buyer agent platform",
        ],
        correctAnswer: "B",
        explanation:
          "The supplier's Best Alternative to a Negotiated Agreement is simply receiving full payment at the original due date — no discount, no acceleration. A supplier with strong cash flow has a good BATNA and less incentive to accept a discount proposal. A supplier with tight cash flow has a weaker BATNA and higher incentive. Understanding the supplier's BATNA helps the buyer agent calibrate the right offer.",
      },
      {
        text: "Cryptographic signatures in the Causa Prima protocol serve which primary purpose?",
        type: "MCQ",
        options: [
          "A) Encrypting the discount amount to prevent competitors from seeing terms",
          "B) Ensuring that each message came from the claimed sender and has not been tampered with since it was sent",
          "C) Authorizing the settlement service to release funds without ERP confirmation",
          "D) Replacing the need for human approval at any autonomy level",
        ],
        correctAnswer: "B",
        explanation:
          "Digital signatures in the protocol serve two purposes: authentication (confirming the message came from the claimed agent/organization) and integrity (confirming the message has not been modified in transit). This is especially critical in autonomous financial negotiations where no human is reviewing each message in real time.",
      },
      {
        text: "In game-theoretic terms, a 'tit-for-tat' strategy in repeated agent-to-agent negotiations means the buyer agent cooperates with suppliers who have been cooperative, and responds to defection with matching behavior in subsequent rounds.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation:
          "Tit-for-tat is a cooperative strategy in repeated games: start with cooperation, then mirror the other party's last move. In the context of discount negotiations, a supplier that consistently accepts reasonable proposals gets favorable treatment in future negotiations. A supplier that repeatedly defects (rejects all proposals or counters aggressively) triggers a more conservative strategy. This builds long-term cooperative relationships.",
      },
      {
        text: "As the Causa Prima platform gains more participants, the value of agent-to-agent negotiation increases for all existing users. This effect is best described as:",
        type: "MCQ",
        options: [
          "A) Economies of scale",
          "B) Network effects — each new participant expands the potential set of counterparties, increasing the platform's utility for everyone",
          "C) First-mover advantage",
          "D) Platform lock-in",
        ],
        correctAnswer: "B",
        explanation:
          "Network effects describe how a platform's value grows with each additional participant. When more suppliers join Causa Prima, buyer agents can route more negotiations directly (avoiding email's friction and delays), and those buyers' participation attracts more suppliers. This positive feedback loop is a core competitive dynamic of marketplace platforms.",
      },
    ],
  },
  {
    moduleOrder: 6,
    title:
      "Capstone Quiz: Designing and Evaluating a Complete Discount Agent Program",
    passingScore: 70,
    questions: [
      {
        text: "A supplier offers '1/15 net 45' terms. Using the annualized rate formula, approximately what is the annualized cost of forgoing this discount?",
        type: "MCQ",
        options: ["A) 6.2%", "B) 12.29%", "C) 18.5%", "D) 24.3%"],
        correctAnswer: "B",
        explanation:
          "Annualized Rate = (0.01 / (1 - 0.01)) × (365 / (45 - 15)) = (0.01 / 0.99) × (365 / 30) = 0.01010 × 12.17 = 12.29%. The shorter the net term relative to the discount period, the more valuable the discount on an annualized basis. At 12.29%, this discount likely exceeds most organizations' cost of capital.",
      },
      {
        text: "A company processes $80 million in annual invoices where 40% of suppliers offer 2/10 net 30 terms. If the discount capture rate improves from 30% to 75% through automation, what is the annual savings improvement?",
        type: "MCQ",
        options: [
          "A) $288,000",
          "B) $360,000",
          "C) $480,000",
          "D) $576,000",
        ],
        correctAnswer: "A",
        explanation:
          "Eligible spend = $80M × 40% = $32M. Total available discount savings = $32M × 2% = $640,000. Previously captured: $640,000 × 30% = $192,000. After automation: $640,000 × 75% = $480,000. Improvement = $480,000 - $192,000 = $288,000. This incremental savings represents the direct financial case for automating discount capture.",
      },
      {
        text: "A company's opportunity scoring model has been running for 3 months. The historical acceptance rate for 'transactional' suppliers is 22%, but the model has been using a default 40% acceptance rate for all suppliers. What impact does this have on opportunity prioritization?",
        type: "MCQ",
        options: [
          "A) No impact — the acceptance rate is only used for reporting",
          "B) Transactional supplier opportunities are over-scored, causing the agent to pursue them too aggressively and waste outreach on low-probability targets",
          "C) The model will automatically correct itself as it learns over time",
          "D) Transactional suppliers are under-scored, causing the agent to miss their opportunities",
        ],
        correctAnswer: "B",
        explanation:
          "If the probability component in the score uses 40% (overestimate) instead of 22% (actual) for transactional suppliers, those invoices score higher than they should. The agent over-invests in outreach to suppliers unlikely to accept, consuming cash budget and negotiation resources that could be better directed at higher-probability targets like strategic or preferred suppliers.",
      },
      {
        text: "An agent's negotiation state machine has been in the AWAIT_RESPONSE state for 5 days with no supplier reply. According to the protocol, what transition should fire?",
        type: "MCQ",
        options: [
          "A) ACCEPTED — assume silence implies consent",
          "B) ESCALATE — non-response always requires human intervention",
          "C) FOLLOW_UP — the timeout transitions to a follow-up message",
          "D) CLOSED_NO_DEAL — close the negotiation after any non-response",
        ],
        correctAnswer: "C",
        explanation:
          "The AWAIT_RESPONSE state has a timeout transition to FOLLOW_UP, not immediate closure. Non-response is the most common outcome and should not end the opportunity — the agent sends a follow-up (up to a configured maximum, typically 2 follow-ups) before eventually transitioning to CLOSED_NO_RESPONSE. Assuming consent from silence would be both legally problematic and operationally wrong.",
      },
      {
        text: "When deploying an early payment discount agent, which stakeholder group must provide treasury-approved spending limits for early payments?",
        type: "MCQ",
        options: [
          "A) The AP team, because they manage invoice workflows",
          "B) Treasury, because they own cash visibility and working capital decisions",
          "C) Procurement, because they negotiate supplier contracts",
          "D) IT, because they implement the cash availability API",
        ],
        correctAnswer: "B",
        explanation:
          "Treasury owns the organization's cash position, working capital targets (including DPO), and risk tolerance for early cash deployment. The daily and weekly caps for early payments must come from treasury to ensure the agent does not compromise liquidity or DPO targets. AP can operate the agent, but spending limits are a treasury governance decision.",
      },
      {
        text: "A buyer agent is configured with ethical rules including a 30-day cooldown after a supplier rejection. Why is this rule important for supplier relationship management?",
        type: "MCQ",
        options: [
          "A) It is required by financial regulations governing automated negotiations",
          "B) It prevents the agent from being marked as spam by the supplier's email system",
          "C) It respects the supplier's decision, prevents harassment, and protects the commercial relationship from feeling pressured",
          "D) It gives the agent time to retrain its model with the rejection data",
        ],
        correctAnswer: "C",
        explanation:
          "Repeatedly re-proposing immediately after a rejection feels aggressive and damages the commercial relationship. A 30-day cooldown signals that the buyer respects the supplier's position, maintains professionalism, and builds goodwill. Suppliers who feel harassed by automated systems may escalate complaints to account managers or terminate relationships.",
      },
      {
        text: "Which Causa Prima platform component is responsible for maintaining the identity and authorization credentials of agents on the platform?",
        type: "MCQ",
        options: [
          "A) Discovery Registry",
          "B) Settlement Service",
          "C) Identity and Trust Service",
          "D) Audit Service",
        ],
        correctAnswer: "C",
        explanation:
          "The Identity and Trust Service manages agent credentials, organizational binding (confirming which organization an agent represents), and authorization scopes (what the agent is permitted to agree to). This component prevents unauthorized agents from participating and ensures that every negotiated agreement is within the agent's authorized mandate.",
      },
      {
        text: "A mid-sized manufacturer with 200 suppliers is evaluating its early payment discount program. Only 15 suppliers are currently on Causa Prima. For the remaining 185 suppliers, what should the agent use as its primary negotiation channel?",
        type: "MCQ",
        options: [
          "A) Phone calls, because they are more personal",
          "B) Email-based outreach, with escalation to direct protocol if suppliers later join Causa Prima",
          "C) Only propose discounts to the 15 Causa Prima suppliers",
          "D) Wait until all 200 suppliers are on Causa Prima before activating the program",
        ],
        correctAnswer: "B",
        explanation:
          "Email-based negotiation is the fallback channel for suppliers not on Causa Prima. The channel selection logic automatically directs proposals to email for non-platform suppliers. The agent can identify and switch to the direct protocol if a supplier later joins the platform. Waiting for universal adoption would forfeit the entire program's benefits indefinitely.",
      },
      {
        text: "An organization discovers that its early payment agent has been sending discount proposals to the same small supplier every 2 weeks for 6 months, despite repeated rejections. What governance failure does this represent?",
        type: "MCQ",
        options: [
          "A) A treasury constraint violation — the agent is spending too much cash",
          "B) A missing or improperly configured ethical guardrail — the cooldown after rejection was not enforced",
          "C) A model accuracy problem — the receptiveness score for this supplier was too high",
          "D) An ERP integration failure — the supplier's opt-out was not recorded correctly",
        ],
        correctAnswer: "B",
        explanation:
          "Ethical guardrails including rejection cooldown periods (e.g., 30 days) and maximum annual proposal limits exist specifically to prevent this behavior. Repeatedly proposing to a supplier who has rejected the offer is aggressive, damages the relationship, and may constitute supplier harassment. The root cause is a missing or misconfigured ethical constraint, not a data or financial error.",
      },
      {
        text: "In a phased rollout, shadow mode deployment achieves which specific goal before moving to the pilot phase?",
        type: "MCQ",
        options: [
          "A) Generating revenue to fund the full deployment",
          "B) Training the supplier population on the new discount program",
          "C) Establishing an accuracy baseline by comparing the agent's recommendations to human decisions without the agent taking any action",
          "D) Integrating the agent with all ERP systems before any live negotiations",
        ],
        correctAnswer: "C",
        explanation:
          "Shadow mode's specific goal is establishing the accuracy baseline — running the agent on real invoices, generating recommendations, but not acting on them. By comparing shadow recommendations to what humans actually decide, teams measure the agent's precision and identify systematic errors before any live supplier interactions occur.",
      },
      {
        text: "A strategic supplier that represents 18% of the buyer's total annual spend rejects a 2% discount proposal, saying they prefer payment at standard net-45 terms. The agent should immediately re-propose at a lower discount rate.",
        type: "TRUEFALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation:
          "For a strategic supplier representing 18% of total spend, relationship preservation takes priority. An immediate re-proposal after rejection risks damaging the relationship and could prompt the supplier to escalate to executive management. Ethical guardrails include a cooldown period after rejection (typically 30 days), and for strategic suppliers, a human account manager should review the supplier's feedback before the agent makes any further contact.",
      },
      {
        text: "Which of the following best describes the 'maturity model' for discount agent deployment from the Causa Prima course perspective?",
        type: "MCQ",
        options: [
          "A) Start with direct agent-to-agent negotiation, then add email as a fallback for legacy suppliers",
          "B) Email-first → hybrid (email + some agent-to-agent) → fully autonomous agent-to-agent as supplier platform adoption grows",
          "C) Deploy the agent only for suppliers above $100,000 in annual spend",
          "D) Use manual negotiation for strategic suppliers and the agent only for transactional ones",
        ],
        correctAnswer: "B",
        explanation:
          "The maturity model progresses from email-first (accessible to all suppliers, familiar, audit-ready) through a hybrid phase (email for non-platform suppliers, direct protocol for Causa Prima suppliers) to eventually a fully autonomous agent-to-agent network as platform adoption grows. This progression respects supplier readiness and builds the agent's track record incrementally.",
      },
      {
        text: "An organization wants to evaluate whether its early payment discount agent is treating all suppliers fairly. Which monitoring approach best identifies potential power-imbalance issues?",
        type: "MCQ",
        options: [
          "A) Track total savings captured per month",
          "B) Analyze proposal terms and acceptance rates segmented by supplier size (revenue), checking whether small suppliers consistently receive more aggressive proposals",
          "C) Count the number of proposals sent to each supplier",
          "D) Review CFO approval records for large payments",
        ],
        correctAnswer: "B",
        explanation:
          "Power asymmetry manifests when a large buyer's agent treats small suppliers more aggressively than large ones — higher discount requests, shorter windows, more follow-ups. Segmenting proposal terms and acceptance rates by supplier size reveals these patterns. If small suppliers receive systematically different (harsher) treatment, the ethical guardrails need adjustment.",
      },
      {
        text: "A discount agent program has been running for 6 months. The capture rate is 68%, acceptance rate is 41%, average discount is 1.8%, and annualized savings total $420,000 against a program cost of $95,000. What is the net ROI percentage?",
        type: "MCQ",
        options: [
          "A) 242%",
          "B) 342%",
          "C) 342% — net savings of $325,000 on a $95,000 investment",
          "D) 441%",
        ],
        correctAnswer: "C",
        explanation:
          "Net savings = $420,000 - $95,000 = $325,000. ROI = ($325,000 / $95,000) × 100 = 342%. This means every dollar invested in the program returns $3.42 in net benefit. This is a strong ROI that justifies continued and expanded investment, and communicates clearly to executive stakeholders.",
      },
      {
        text: "When a discount agent operates at full autonomy for a 'preferred' supplier segment, which of the following is the most important safeguard to maintain?",
        type: "MCQ",
        options: [
          "A) The agent must use email for every communication to maintain an audit trail",
          "B) The agent must stay within configured authorization scopes (max discount, max payment amount) and log every decision immutably",
          "C) The agent must escalate all negotiations above $50,000 to a human manager",
          "D) The agent must receive supplier opt-in consent before each individual negotiation",
        ],
        correctAnswer: "B",
        explanation:
          "Even at full autonomy, agents must operate strictly within their authorization scopes — the maximum discount they can offer, the maximum payment they can commit, and the relationship-specific rules (e.g., strategic vendors). Immutable logging of every decision is equally critical: it creates the audit trail that enables oversight, satisfies compliance requirements, and provides the evidence needed if any decision is later questioned.",
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
    title: "Foundations of Early Payment Discounts",
    description:
      "Establishes the financial logic behind early payment discounts, standard payment terms, and how discount programs create value for both buyers and suppliers.",
    lessons: [
      { order: 1, title: "The Economics of Early Payment", moduleNum: 1, lessonNum: 1 },
      {
        order: 2,
        title: "Payment Terms and Discount Structures in Practice",
        moduleNum: 1,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "The AP Discount Landscape — Manual vs. Automated",
        moduleNum: 1,
        lessonNum: 3,
      },
      {
        order: 4,
        title: "Organizational Readiness and Stakeholder Alignment",
        moduleNum: 1,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 2,
    title: "Discount Identification and Opportunity Analysis",
    description:
      "Teaches how to systematically identify discount-eligible invoices, score opportunities by financial impact, and prioritize supplier outreach using data-driven methods.",
    lessons: [
      { order: 1, title: "Data Sources and Invoice Intelligence", moduleNum: 2, lessonNum: 1 },
      {
        order: 2,
        title: "Opportunity Scoring and Prioritization",
        moduleNum: 2,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Predicting Supplier Receptiveness",
        moduleNum: 2,
        lessonNum: 3,
      },
      {
        order: 4,
        title: "Cash Flow Integration and Treasury Coordination",
        moduleNum: 2,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 3,
    title: "Supplier Communication and Negotiation Strategy",
    description:
      "Covers how AI agents initiate contact with suppliers, structure discount proposals, and execute negotiation strategies — starting with email-based outreach for transparency and auditability.",
    lessons: [
      { order: 1, title: "Designing the Outreach Message", moduleNum: 3, lessonNum: 1 },
      {
        order: 2,
        title: "Negotiation Frameworks for AI Agents",
        moduleNum: 3,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Handling Supplier Responses and Objections",
        moduleNum: 3,
        lessonNum: 3,
      },
      {
        order: 4,
        title: "Tracking, Reporting, and Continuous Improvement",
        moduleNum: 3,
        lessonNum: 4,
      },
    ],
  },
  {
    order: 4,
    title: "Building the Early Payment Discount Agent",
    description:
      "A technical, hands-on module that walks through the architecture and implementation of an AI agent that identifies discount opportunities, contacts suppliers, and executes negotiations autonomously.",
    lessons: [
      {
        order: 1,
        title: "Agent Architecture and System Design",
        moduleNum: 4,
        lessonNum: 1,
      },
      {
        order: 2,
        title: "Implementing the Opportunity Pipeline",
        moduleNum: 4,
        lessonNum: 2,
      },
      { order: 3, title: "Building the Negotiation Engine", moduleNum: 4, lessonNum: 3 },
      {
        order: 4,
        title: "Payment Execution and Reconciliation",
        moduleNum: 4,
        lessonNum: 4,
      },
      {
        order: 5,
        title: "Testing, Monitoring, and Deployment",
        moduleNum: 4,
        lessonNum: 5,
      },
    ],
  },
  {
    order: 5,
    title: "Agent-to-Agent Negotiation on Causa Prima",
    description:
      "Explores the advanced scenario where both buyer and supplier operate on the Causa Prima platform, enabling direct agent-to-agent negotiation — covering protocols, trust models, and optimization strategies.",
    lessons: [
      {
        order: 1,
        title: "The Causa Prima Agent-to-Agent Protocol",
        moduleNum: 5,
        lessonNum: 1,
      },
      {
        order: 2,
        title: "Trust, Verification, and Security in Agent Negotiation",
        moduleNum: 5,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Optimizing Agent-to-Agent Negotiation Outcomes",
        moduleNum: 5,
        lessonNum: 3,
      },
      { order: 4, title: "Scaling and Future Directions", moduleNum: 5, lessonNum: 4 },
    ],
  },
  {
    order: 6,
    title: "Capstone — Designing and Evaluating a Complete Discount Agent Program",
    description:
      "The capstone module ties together all prior modules by having learners evaluate a realistic end-to-end early payment discount agent program, demonstrating mastery of financial analysis, agent design, negotiation strategy, and platform-level optimization.",
    lessons: [
      {
        order: 1,
        title: "Capstone Case Study and Program Design Review",
        moduleNum: 6,
        lessonNum: 1,
      },
      {
        order: 2,
        title: "Ethical Considerations and Responsible Agent Deployment",
        moduleNum: 6,
        lessonNum: 2,
      },
      {
        order: 3,
        title: "Course Synthesis and Capstone Preparation",
        moduleNum: 6,
        lessonNum: 3,
      },
    ],
  },
]

export async function seedEarlyPaymentDiscountsCourse(): Promise<void> {
  console.log(
    "  Upserting course: Early Payment Discounts in Accounts Payable..."
  )

  const course = await prisma.course.upsert({
    where: { slug: "early-payment-discounts-ap" },
    update: {
      title: "Early Payment Discounts in Accounts Payable",
      status: "PUBLISHED",
    },
    create: {
      title: "Early Payment Discounts in Accounts Payable",
      slug: "early-payment-discounts-ap",
      description:
        "Learn to identify, negotiate, and capture early payment discounts at scale. Build AI agents that analyze discount opportunities, communicate with suppliers, and execute autonomous negotiations — from email outreach to agent-to-agent protocols on the Causa Prima platform.",
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
  seedEarlyPaymentDiscountsCourse()
    .then(async () => {
      await prisma.$disconnect()
    })
    .catch(async (e) => {
      console.error(e)
      await prisma.$disconnect()
      process.exit(1)
    })
}
