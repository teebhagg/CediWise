/**
 * Lesson Quiz Bank — Phase 3
 *
 * 3 questions per lesson, 9 lessons = 27 total questions.
 * Each question carries: options, correctIndex, explanation (always shown),
 * did_you_know (shown only on correct first-attempt), and an optional source.
 *
 * FR-QZ-002, FR-QZ-013, FR-QZ-020, FR-QZ-021
 */

import type { QuizQuestion } from "@/types/literacy";

export const LESSON_QUIZZES: Record<string, QuizQuestion[]> = {
  // ─── MOD-01: Understanding Your Money ──────────────────────────────────────

  "mod01-budgeting-01": [
    {
      id: "qz_m01_l01_001",
      question: "What is a personal budget?",
      options: [
        "A plan showing how you will spend and save your income",
        "A type of bank account for emergencies",
        "A loan limit set by your bank",
        "A government tax document",
      ],
      correctIndex: 0,
      explanation:
        "A budget is simply a written plan for your money. It shows how much you earn, what you plan to spend, and how much you intend to save — giving you control before money leaves your hands.",
      did_you_know:
        "People who write down their budgets are 2× more likely to achieve their savings goals than those who don't, according to financial psychology research.",
      source: { label: "Bank of Ghana — Consumer Education Series" },
    },
    {
      id: "qz_m01_l01_002",
      question: "Income minus total expenses equals what?",
      options: [
        "Your savings (or debt, if negative)",
        "Your tax obligation",
        "Your gross salary",
        "Your credit score",
      ],
      correctIndex: 0,
      explanation:
        "Income − Expenses = Surplus (savings) or Deficit (debt). If the result is positive, you have money left to save or invest. If negative, you are spending more than you earn — a warning sign.",
      did_you_know:
        "In Ghana, household surveys show that over 60% of urban workers spend more than they earn in at least 3 months of every year — mostly due to unplanned expenses.",
    },
    {
      id: "qz_m01_l01_003",
      question: "What is the BEST first step when building a budget?",
      options: [
        "List all sources of income after tax",
        "Cut all non-essential spending immediately",
        "Open a new savings account",
        "Ask your employer for a salary advance",
      ],
      correctIndex: 0,
      explanation:
        "You cannot plan spending without knowing your starting point. List every income source — salary, side income, remittances — and use the after-tax (take-home) figure so your plan is realistic.",
      did_you_know:
        "For GHS-earners on PAYE, your take-home is roughly 75–85% of gross salary after PAYE, SSNIT, and other statutory deductions.",
      source: { label: "Ghana Revenue Authority — PAYE Guidelines" },
    },
  ],

  "mod01-budgeting-02": [
    {
      id: "qz_m01_l02_001",
      question: "In the 50/30/20 rule, what percentage goes to NEEDS?",
      options: ["50%", "30%", "20%", "40%"],
      correctIndex: 0,
      explanation:
        "50% of take-home pay covers needs — rent, food, transport, utilities, and SSNIT. 30% funds wants (entertainment, eating out), and 20% goes to savings or debt repayment.",
      did_you_know:
        "The 50/30/20 rule was popularised by US Senator Elizabeth Warren in her book 'All Your Worth' (2005), but it translates well to Ghanaian household budgets when adapted for local cost structures.",
    },
    {
      id: "qz_m01_l02_002",
      question: "Which of these is a WANT, not a NEED?",
      options: [
        "Cinema tickets on Saturday",
        "Monthly rent",
        "Electricity bill",
        "School fees for your child",
      ],
      correctIndex: 0,
      explanation:
        "Needs are things you cannot safely live without: shelter, food, utilities, education for dependants. Wants are things that improve life but are optional — like cinema tickets, takeaways, or new clothes beyond necessity.",
      did_you_know:
        "Classifying every expense as a need or want for just one month is enough for most people to find 10–15% of spending they can redirect to savings.",
    },
    {
      id: "qz_m01_l02_003",
      question:
        "Ama earns GHS 3,000 take-home per month. Using 50/30/20, how much should she save?",
      options: ["GHS 600", "GHS 900", "GHS 1,500", "GHS 300"],
      correctIndex: 0,
      explanation:
        "20% of GHS 3,000 = GHS 600. This goes toward savings, an emergency fund, or paying off debt. Even if Ama cannot save 20% right away, the rule gives her a clear target to work toward.",
      did_you_know:
        "If Ama saves GHS 600/month for 12 months, she builds a GHS 7,200 emergency fund — enough to cover 2–3 months of expenses for the average Ghanaian household.",
    },
  ],

  "mod01-budgeting-03": [
    {
      id: "qz_m01_l03_001",
      question: "What is the most effective way to track daily spending?",
      options: [
        "Record every transaction at the time it happens",
        "Estimate your spending at the end of the month",
        "Only track big purchases over GHS 500",
        "Review your bank statement once a year",
      ],
      correctIndex: 0,
      explanation:
        "Small, frequent purchases — transport, snacks, airtime — add up fast. Recording each one immediately (via a notes app, spreadsheet, or CediWise) prevents 'mystery spending' that derails budgets.",
      did_you_know:
        "Research in behavioural finance shows that the mere act of writing down a purchase makes people 30% less likely to make impulsive buys.",
    },
    {
      id: "qz_m01_l03_002",
      question: "What is a spending 'category'?",
      options: [
        "A label grouping similar expenses (e.g., Food, Transport)",
        "A type of bank account",
        "A monthly income target",
        "A government spending code",
      ],
      correctIndex: 0,
      explanation:
        "Categories group similar expenses so you can see patterns. Common Ghanaian budget categories: Food & Groceries, Transport, Rent & Utilities, School Fees, Mobile Money, Entertainment.",
      did_you_know:
        "Mobile money fees (e-Levy, withdrawal charges) are their own hidden category for many Ghanaians — they can add up to GHS 50–200/month without notice.",
    },
    {
      id: "qz_m01_l03_003",
      question:
        "Kofi buys breakfast for GHS 15 and lunch for GHS 20 every working day (22 days/month). What is his monthly food spend?",
      options: ["GHS 770", "GHS 660", "GHS 550", "GHS 880"],
      correctIndex: 0,
      explanation:
        "(GHS 15 + GHS 20) × 22 days = GHS 35 × 22 = GHS 770. Small daily habits have a big monthly impact. Packing lunch even 2 days a week could save Kofi over GHS 170/month.",
      did_you_know:
        "Packing your own lunch just twice a week for a year can save the average Accra worker over GHS 2,000 — enough for a small emergency fund.",
    },
  ],

  // ─── MOD-02: Savings & Emergency Funds ─────────────────────────────────────

  "mod01-savings-02": [
    {
      id: "qz_m02_l01_001",
      question: "Which of these counts as a TRUE financial emergency?",
      options: [
        "A sudden hospital bill after an accident",
        "A flash sale at a clothing store",
        "A friend's birthday party",
        "Upgrading your phone",
      ],
      correctIndex: 0,
      explanation:
        "A genuine emergency is unexpected, urgent, and necessary — like medical expenses, emergency home repairs, or sudden job loss. Lifestyle wants — sales, upgrades, celebrations — should come from a planned budget, not your emergency fund.",
      did_you_know:
        "Without an emergency fund, Ghanaians typically rely on mobile money loans (at 8–15% monthly interest) or family networks — both of which carry significant financial and social costs.",
    },
    {
      id: "qz_m02_l01_002",
      question:
        "How many months of expenses should an emergency fund ideally cover?",
      options: ["3–6 months", "1 month", "12 months", "2 weeks"],
      correctIndex: 0,
      explanation:
        "Financial experts recommend 3–6 months of living expenses. 3 months is the minimum safety net; 6 months provides stronger protection for those with irregular income (like traders or freelancers). Start small — even 1 month is better than zero.",
      did_you_know:
        "A study by the University of Ghana found that over 70% of households surveyed could not cover one month of expenses from savings alone, making them highly vulnerable to financial shocks.",
      source: { label: "University of Ghana — Household Finance Survey" },
    },
    {
      id: "qz_m02_l01_003",
      question: "Where is the BEST place to keep your emergency fund?",
      options: [
        "A dedicated savings account (easy to access, earns interest)",
        "Under your mattress at home",
        "Invested in stocks or cryptocurrency",
        "Lent to a trusted friend",
      ],
      correctIndex: 0,
      explanation:
        "Your emergency fund must be liquid (instantly accessible), safe, and separate from your regular spending account. A savings account earns some interest while keeping funds available. Stocks and crypto can lose value right when you need the money most.",
      did_you_know:
        "Several Ghanaian banks offer dedicated savings accounts with no withdrawal fees and monthly interest of 8–14% per annum — far better than keeping cash at home, which loses value to inflation.",
    },
  ],

  "mod01-savings-01": [
    {
      id: "qz_m02_l02_001",
      question: "What does 'pay yourself first' mean?",
      options: [
        "Transfer money to savings before spending on anything else",
        "Pay your own salary from your business first",
        "Treat yourself to a reward before paying bills",
        "Invest in your own education before saving",
      ],
      correctIndex: 0,
      explanation:
        "'Pay yourself first' means treating savings like a non-negotiable bill. On payday, immediately move your savings amount to a separate account before any other expense. This removes the temptation to spend first and save 'whatever is left' (which is often nothing).",
      did_you_know:
        "Automating your savings — setting up a standing order on payday — increases the likelihood of actually saving by over 300%, according to behavioural economics research.",
    },
    {
      id: "qz_m02_l02_002",
      question:
        "Akua saves GHS 50 every week without fail. How much will she have after one year?",
      options: ["GHS 2,600", "GHS 2,400", "GHS 1,200", "GHS 3,000"],
      correctIndex: 0,
      explanation:
        "GHS 50 × 52 weeks = GHS 2,600. This simple weekly habit — less than GHS 8/day — builds a meaningful safety net. If her bank pays 10% annual interest, she earns an extra ~GHS 130 on top.",
      did_you_know:
        "GHS 2,600 is more than the average Ghanaian emergency fund and would cover a typical hospitalisation cost without needing to borrow.",
    },
    {
      id: "qz_m02_l02_003",
      question: "Which savings goal strategy is most likely to succeed?",
      options: [
        "A specific goal with a target amount and deadline (e.g., 'GHS 5,000 by December')",
        "Saving 'as much as possible' with no fixed target",
        "Saving only when you have money left over at month-end",
        "Keeping savings in cash to avoid bank fees",
      ],
      correctIndex: 0,
      explanation:
        "Specific, time-bound goals — like SMART goals — give you a measurable target and a sense of progress. Vague goals ('save more') are almost always abandoned because there's no clear finish line or accountability.",
      did_you_know:
        "Writing your savings goal on paper (or a savings app) and reviewing it weekly makes you 42% more likely to achieve it, according to research from the Dominican University of California.",
    },
  ],

  // ─── MOD-03: Digital Payments & Mobile Money ────────────────────────────────

  "mod04-mobile-01": [
    {
      id: "qz_m03_l01_001",
      question: "Which institution regulates mobile money in Ghana?",
      options: [
        "Bank of Ghana (BOG)",
        "MTN Ghana",
        "Ghana Revenue Authority (GRA)",
        "National Communications Authority (NCA)",
      ],
      correctIndex: 0,
      explanation:
        "The Bank of Ghana licenses and supervises all Payment Service Providers (PSPs), including MTN MoMo, Vodafone Cash, and AirtelTigo Money, under the Payment Systems and Services Act, 2019 (Act 987).",
      did_you_know:
        "Ghana's mobile money ecosystem is one of the most advanced in Africa. By 2024, mobile money accounts outnumbered traditional bank accounts by more than 3 to 1.",
      source: { label: "Bank of Ghana — Payment Systems Oversight" },
    },
    {
      id: "qz_m03_l01_002",
      question: "What is the e-Levy introduced in Ghana's 2022 budget?",
      options: [
        "A 1% tax on electronic money transfers above GHS 100/day",
        "A monthly fee charged by mobile money providers",
        "A government subsidy for digital payment users",
        "An interest charge on mobile loans",
      ],
      correctIndex: 0,
      explanation:
        "The e-Levy (Electronic Transaction Levy), introduced in 2022, applies a levy on electronic transfers — initially 1.5%, later reduced to 1% — on amounts above the daily threshold. It affects mobile money, bank transfers, and merchant payments.",
      did_you_know:
        "The e-Levy rate was reduced from 1.5% to 1% in the 2023 budget after significant public debate about its impact on financial inclusion.",
      source: { label: "Ghana Revenue Authority — e-Levy Guidelines" },
    },
    {
      id: "qz_m03_l01_003",
      question:
        "Which of these is a legitimate feature of Ghana's mobile money system?",
      options: [
        "Sending money to any network instantly using a mobile number",
        "Earning 30% monthly returns on your MoMo balance",
        "Withdrawing unlimited cash without fees",
        "Using your MoMo PIN to access other people's accounts",
      ],
      correctIndex: 0,
      explanation:
        "Interoperability — sending money across networks (e.g., MTN to Vodafone) using just a phone number — is a genuine, regulated feature introduced by the Bank of Ghana. Any claim of unusually high returns or free unlimited withdrawals is a red flag for fraud.",
      did_you_know:
        "Ghana was one of the first countries in Africa to implement full mobile money interoperability in 2018, allowing seamless transfers between all major networks.",
      source: { label: "Bank of Ghana — Mobile Money Interoperability Report" },
    },
  ],

  "mod04-mobile-02": [
    {
      id: "qz_m03_l02_001",
      question:
        "What should you NEVER share with anyone — not even mobile money agents?",
      options: [
        "Your mobile money PIN or OTP (One-Time Password)",
        "Your phone number",
        "Your wallet transaction history",
        "Your network provider's name",
      ],
      correctIndex: 0,
      explanation:
        "Your PIN and OTP are the keys to your wallet. Legitimate agents, MTN staff, or bank employees will NEVER ask for them. Anyone who does is attempting fraud. Sharing them — even with family — creates serious security risk.",
      did_you_know:
        "The most common mobile money fraud in Ghana begins with a call impersonating a network employee asking for your 'verification OTP'. The caller already has your number and name — the OTP is the only thing they lack.",
    },
    {
      id: "qz_m03_l02_002",
      question:
        "Someone calls claiming to be from MTN and says your account will be blocked unless you share your OTP. What do you do?",
      options: [
        "Hang up immediately and report to MTN on their official line",
        "Share your OTP to avoid your account being blocked",
        "Give them only half the OTP",
        "Wait and see if your account is actually blocked",
      ],
      correctIndex: 0,
      explanation:
        "This is a classic social engineering scam. MTN, Vodafone, and AirtelTigo will never call you to ask for your OTP or PIN. Hang up, then call the network's official customer care line (e.g., MTN: 0244300000) to report the attempt.",
      did_you_know:
        "In Ghana, mobile money fraud causes estimated losses of GHS hundreds of millions annually. Reporting suspicious calls to your network provider helps block the fraudster's SIM.",
    },
    {
      id: "qz_m03_l02_003",
      question:
        "If mobile money fraud occurs, which is the CORRECT sequence of actions?",
      options: [
        "Report to your mobile money provider first, then escalate to Bank of Ghana if unresolved",
        "Go directly to the police and wait for an arrest",
        "Post about it on social media to warn others",
        "Accept the loss — nothing can be done",
      ],
      correctIndex: 0,
      explanation:
        "Step 1: Report to your provider (MTN, Vodafone, etc.) immediately — they can sometimes freeze transactions. Step 2: File a report with Ghana Police Service. Step 3: Escalate to Bank of Ghana Consumer Protection if the provider is unresponsive. Keep records of all communications.",
      did_you_know:
        "Bank of Ghana has a dedicated Consumer Complaints unit. You can reach them via their website or by visiting their offices. Response times have improved significantly since 2022.",
      source: { label: "Bank of Ghana — Consumer Protection Department" },
    },
  ],

  // ─── MOD-07: Consumer Protection & Fraud ────────────────────────────────────

  "mod07-fraud-01": [
    {
      id: "qz_m07_l01_001",
      question: "Which of these is a UNIVERSAL red flag for financial fraud?",
      options: [
        "You are urged to act immediately or the offer expires",
        "A company provides their physical office address",
        "The offer includes a written contract with terms",
        "You can verify the company with Bank of Ghana's registry",
      ],
      correctIndex: 0,
      explanation:
        "Artificial urgency ('Act now!', 'Offer expires in 1 hour!') is the #1 pressure tactic used by fraudsters. Legitimate financial institutions give you time to review offers, consult others, and verify credentials. Pressure to decide immediately is always a red flag.",
      did_you_know:
        "The five universal fraud red flags apply across cultures: (1) Unrealistic returns, (2) Urgency, (3) Secrecy, (4) Upfront fees, (5) Unregistered operators. Memorising these five protects you from 95% of known scams.",
    },
    {
      id: "qz_m07_l01_002",
      question:
        "A stranger offers you GHS 50,000 if you help 'move funds' through your bank account. What type of scam is this?",
      options: [
        "Advance fee fraud (a variation of '419 scam')",
        "A legitimate investment opportunity",
        "A government grant programme",
        "A bank error in your favour",
      ],
      correctIndex: 0,
      explanation:
        "This is advance fee fraud — one of the oldest scams globally. The fraudster will ask you to pay 'processing fees' or 'taxes' upfront to release the promised funds, which never materialise. Participating also makes you legally complicit in money laundering.",
      did_you_know:
        "Advance fee fraud (named after Section 419 of Nigeria's Criminal Code) generates an estimated $12.7 billion globally each year. Ghana's EOCO (Economic and Organised Crime Office) actively investigates these cases.",
      source: { label: "EOCO Ghana — Annual Fraud Report" },
    },
    {
      id: "qz_m07_l01_003",
      question: "Which of these is NOT a common scam targeting Ghanaians?",
      options: [
        "A licensed bank sending a loan offer letter by post",
        "A Facebook investment scheme promising 200% returns in 2 weeks",
        "A WhatsApp message claiming you won a lottery you didn't enter",
        "A stranger calling to say you have unclaimed funds at a bank",
      ],
      correctIndex: 0,
      explanation:
        "A letter from a licensed bank offering a loan product is a legitimate marketing activity — especially if you can verify the bank's licence on the Bank of Ghana website. The other three options are classic scam patterns.",
      did_you_know:
        "You can verify any bank or financial institution's licence for free on the Bank of Ghana's official website (bog.gov.gh). Always check before sending money to any financial entity.",
      source: { label: "Bank of Ghana — Financial Institutions Registry" },
    },
  ],

  "mod07-fraud-02": [
    {
      id: "qz_m07_l02_001",
      question:
        "As a financial consumer in Ghana, which is a right you are legally guaranteed?",
      options: [
        "The right to clear information about fees, terms, and risks before signing",
        "The right to a refund on any investment that loses money",
        "The right to a guaranteed interest rate on savings",
        "The right to a bank account without identity verification",
      ],
      correctIndex: 0,
      explanation:
        "Ghana's Banks and Specialised Deposit-Taking Institutions Act (Act 930) and BOG's Consumer Protection Directive guarantee your right to transparent pricing, clear terms, and fair treatment. Banks are legally required to disclose all fees before you enter a product.",
      did_you_know:
        "Many Ghanaians unknowingly sign contracts with hidden fees because they do not exercise their right to ask for a full fee schedule. You can always request a written fee schedule from any bank or financial institution.",
      source: {
        label: "Bank of Ghana — Consumer Protection Directive",
        url: "https://www.bog.gov.gh",
      },
    },
    {
      id: "qz_m07_l02_002",
      question:
        "Mobile money fraud has just occurred on your account. What is the FIRST thing you should do?",
      options: [
        "Call your mobile money provider's fraud line immediately",
        "Wait 24 hours to see if the money returns",
        "Post on social media to find the fraudster",
        "File a police report and wait for investigation",
      ],
      correctIndex: 0,
      explanation:
        "Speed matters. Call your provider's fraud line the moment you notice unauthorised activity. Providers can sometimes reverse or freeze transactions within minutes if reported quickly enough. Every hour of delay reduces the chance of recovery.",
      did_you_know:
        "MTN MoMo's fraud hotline is available 24/7. Transactions flagged within 15 minutes have a significantly higher reversal success rate than those reported hours later.",
    },
    {
      id: "qz_m07_l02_003",
      question:
        "If your mobile money provider fails to resolve your complaint within a reasonable time, where should you escalate?",
      options: [
        "Bank of Ghana's Consumer Complaints unit",
        "Ghana Police CID Headquarters only",
        "Your local member of parliament",
        "The National Communications Authority (NCA)",
      ],
      correctIndex: 0,
      explanation:
        "Bank of Ghana's Consumer Protection unit handles unresolved complaints against all licensed financial institutions, including mobile money providers. The NCA regulates telecoms (call quality, data) — not financial services. Police handle criminal fraud investigations.",
      did_you_know:
        "Bank of Ghana has resolved thousands of consumer complaints since launching its dedicated online complaints portal. You can file a complaint at bog.gov.gh — no in-person visit required.",
      source: { label: "Bank of Ghana — Consumer Protection Unit" },
    },
  ],
};

/** Score tiers per FR-QZ-021 */
export const SCORE_TIERS = {
  excellent: {
    minScore: 0.8,
    label: "Financial Expert!",
    message: "Outstanding — you have a solid grip on this topic.",
    color: "#C9A84C",
  },
  good: {
    minScore: 0.6,
    label: "Good Work!",
    message:
      "Nice effort — a quick review of any missed questions will reinforce your knowledge.",
    color: "#2D9B5A",
  },
  review: {
    minScore: 0,
    label: "Worth Reviewing",
    message:
      "No problem — revisit the highlighted sections and try again. Every attempt builds knowledge.",
    color: "#E8A020",
  },
} as const;

export type ScoreTierKey = keyof typeof SCORE_TIERS;

export function getScoreTier(score: number): ScoreTierKey {
  if (score >= SCORE_TIERS.excellent.minScore) return "excellent";
  if (score >= SCORE_TIERS.good.minScore) return "good";
  return "review";
}
