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

  // --- MOD-01: Understanding Your Money ------------------------------------------


  "mod01-budgeting-01": [
    {
      id: "qz_mod01-budgeting-01_001",
      question: "Kofi earns GHS 2,400/month net. He spends GHS 1,200 on needs, GHS 600 on wants, and saves GHS 600. What is his savings rate?",
      options: [
        "25% — because GHS 600 ÷ GHS 2,400 = 0.25",
        "50% — because he saves half of what he spends on wants",
        "15% — because his savings are only 15% of his needs",
        "33% — because needs are half his income, so savings must be a third",
      ],
      correctIndex: 0,
      explanation: "Savings rate = savings ÷ income. GHS 600 ÷ GHS 2,400 = 0.25 = 25% of his net income.",
      did_you_know: "Ghanaian households that follow a structured budget save an average of 22% of income—more than double the national average of 9%.",
    },
    {
      id: "qz_mod01-budgeting-01_002",
      question: "Which scenario BEST demonstrates the purpose of a budget?",
      options: [
        "Aisha writes down her GHS 1,800 income and plans exactly how much goes to rent, food, transport, and savings before spending.",
        "Kwame checks his bank balance every evening to see if he has money left.",
        "Esi puts all her cash in an envelope and spends without tracking categories.",
        "Yaw asks his friend to hold GHS 500 so he does not spend it.",
      ],
      correctIndex: 0,
      explanation: "A budget is a proactive plan—deciding where money goes before spending, not just tracking after the fact.",
      did_you_know: "Only 32% of Ghanaians are financially literate despite 96% having access to financial services.",
    },
    {
      id: "qz_mod01-budgeting-01_003",
      question: "A friend says: ‘I don’t need a budget because I always have money left.’ What is the BEST response?",
      options: [
        "A budget still helps—it ensures your money works toward your goals rather than just accumulating.",
        "That is true—if you always have extra, budgeting is unnecessary.",
        "You should spend all remaining money to make budgeting worthwhile.",
        "Having money left means you earn too much—reduce your income.",
      ],
      correctIndex: 0,
      explanation: "Even with surplus income, a budget directs money intentionally toward savings, investments, and goals.",
      did_you_know: "Ghana’s national savings rate is only about 9%, meaning most people with extra money still do not save effectively.",
    },
    {
      id: "qz_mod01-budgeting-01_004",
      question: "What is the difference between gross income and net income when budgeting?",
      options: [
        "Net income is what you earn after tax and deductions—use that for budgeting.",
        "Gross income is what you save; net income is what you spend.",
        "They are the same thing for budgeting purposes.",
        "Gross income includes only salary; net income includes side jobs.",
      ],
      correctIndex: 0,
      explanation: "Always use net (take-home) pay for budgeting because that is the money you actually receive.",
      did_you_know: "Your payslip shows both gross and net—always budget based on net income.",
    },
    {
      id: "qz_mod01-budgeting-01_005",
      question: "Which statement about budgeting is TRUE according to the lesson?",
      options: [
        "Budgeting reduces money stress, helps reach goals like building an emergency fund, and keeps you out of debt.",
        "Budgeting only works for people with irregular income.",
        "A budget guarantees you will never face a financial emergency.",
        "Budgeting requires eliminating all discretionary spending.",
      ],
      correctIndex: 0,
      explanation: "Budgeting reduces financial stress, helps achieve savings goals, and prevents debt—without requiring extreme sacrifice.",
      did_you_know: "People who budget report 40% less financial anxiety than those who do not track their spending.",
    }
  ],

  "mod01-budgeting-02": [
    {
      id: "qz_mod01-budgeting-02_001",
      question: "Ama earns GHS 3,000/month and applies the 50/30/20 rule. How much goes to Needs, Wants, and Savings?",
      options: [
        "GHS 1,500 Needs, GHS 900 Wants, GHS 600 Savings",
        "GHS 1,000 Needs, GHS 1,000 Wants, GHS 1,000 Savings",
        "GHS 1,800 Needs, GHS 600 Wants, GHS 600 Savings",
        "GHS 1,500 Needs, GHS 600 Wants, GHS 900 Savings",
      ],
      correctIndex: 0,
      explanation: "50% = GHS 1,500 for Needs. 30% = GHS 900 for Wants. 20% = GHS 600 for Savings.",
      did_you_know: "Households that follow a structured budget save 22% of income on average—more than double the 9% national average.",
    },
    {
      id: "qz_mod01-budgeting-02_002",
      question: "Which expense is a ‘Need’ under the 50/30/20 rule?",
      options: [
        "Monthly rent of GHS 700",
        "Netflix subscription of GHS 50",
        "New clothes for a wedding",
        "Weekend outing with friends",
      ],
      correctIndex: 0,
      explanation: "Rent is an essential living expense. Entertainment, event clothing, and social outings are Wants.",
      did_you_know: "Needs are essentials: rent, food, utilities, transport to work—things you cannot live without.",
    },
    {
      id: "qz_mod01-budgeting-02_003",
      question: "What makes the 50/30/20 rule effective?",
      options: [
        "It makes saving automatic before extras, covers needs first, and still allows guilt-free wants.",
        "It only works for people earning over GHS 5,000/month.",
        "It requires a detailed daily spreadsheet.",
        "It focuses entirely on cutting wants to zero.",
      ],
      correctIndex: 0,
      explanation: "The rule’s strength: needs first, wants allowed guilt-free, savings built-in before extras.",
      did_you_know: "The 50/30/20 rule was popularised by Elizabeth Warren in ‘All Your Worth.’",
    },
    {
      id: "qz_mod01-budgeting-02_004",
      question: "If Ama’s needs cost GHS 1,800 (60% of GHS 3,000), what should she do?",
      options: [
        "Reduce needs or increase income—60% on needs exceeds the 50% guideline.",
        "Borrow GHS 300 monthly to cover the gap.",
        "Eliminate all wants and put everything into needs.",
        "Save less than 20% and keep spending as is.",
      ],
      correctIndex: 0,
      explanation: "When needs exceed 50%, either cut costs or earn more—borrowing creates a debt cycle.",
      did_you_know: "Housing alone consumes over 40% of income for many urban Ghanaian households.",
    },
    {
      id: "qz_mod01-budgeting-02_005",
      question: "Which statement about the 50/30/20 rule is TRUE?",
      options: [
        "The 20% should be split between savings AND debt repayment if you have existing debt.",
        "The 30% for wants includes rent and utility bills.",
        "The rule requires exactly 20% savings even with high-interest debt.",
        "The percentages are fixed and cannot be adjusted.",
      ],
      correctIndex: 0,
      explanation: "The 20% category covers both savings and debt repayment—paying down debt improves financial health.",
      did_you_know: "High-interest debt repayment should often take priority over saving since avoiding interest is a guaranteed return.",
    }
  ],

  "mod01-budgeting-03": [
    {
      id: "qz_mod01-budgeting-03_001",
      question: "Mensah tracks spending and discovers GHS 200 went to trotro, snacks, and airtime he did not notice. What should he do FIRST?",
      options: [
        "Review these small expenses and decide which to reduce—tracking reveals patterns you cannot see without data.",
        "Stop carrying cash entirely.",
        "Ignore it—GHS 200 is not significant.",
        "Transfer all money to savings immediately.",
      ],
      correctIndex: 0,
      explanation: "Tracking reveals where money goes. Then make informed decisions about what to cut.",
      did_you_know: "Studies show tracking reduces unnecessary expenses by 15% on average within the first month.",
    },
    {
      id: "qz_mod01-budgeting-03_002",
      question: "Which category is MOST likely to contain hidden costs that add up unnoticed?",
      options: [
        "Transport—multiple trotro rides, okada trips, and unplanned taxis",
        "Rent—a fixed monthly amount",
        "Loan payments—scheduled deductions",
        "Insurance—paid quarterly or annually",
      ],
      correctIndex: 0,
      explanation: "Variable transport costs are easily underestimated because each trip is small but frequent.",
      did_you_know: "80% of Ghanaians cannot account for where their money went at the end of the month.",
    },
    {
      id: "qz_mod01-budgeting-03_003",
      question: "What is the primary benefit of tracking your spending?",
      options: [
        "It shows where your money actually goes—most people are surprised by what they find.",
        "It automatically reduces your bills.",
        "It increases your monthly income.",
        "It eliminates the need for financial planning.",
      ],
      correctIndex: 0,
      explanation: "Tracking gives you actual spending data, the foundation for meaningful budget adjustments.",
      did_you_know: "Most people underestimate their monthly spending by 30–50% when guessing without tracking.",
    },
    {
      id: "qz_mod01-budgeting-03_004",
      question: "Which tracking method does the lesson recommend?",
      options: [
        "Choose a method you will stick with—notebook, spreadsheet, or an app like Monefy or Wallet.",
        "Only complex accounting software works.",
        "Ask your bank for a monthly report.",
        "Estimate expenses from memory at month-end.",
      ],
      correctIndex: 0,
      explanation: "Consistency matters more than the tool. Pick whatever you will use daily.",
      did_you_know: "Apps like Monefy let you categorise spending in under 30 seconds per transaction.",
    },
    {
      id: "qz_mod01-budgeting-03_005",
      question: "TRUE or FALSE: The lesson says small frequent purchases like transport and recharge cards deserve special attention.",
      options: [
        "True—these are the most common source of ‘missing money’ in monthly budgets.",
        "False—only large expenses like rent and school fees matter.",
        "True—but only for people earning over GHS 5,000/month.",
        "False—the lesson recommends grouping all expenses into one category.",
      ],
      correctIndex: 0,
      explanation: "The lesson flags transport, airtime, and small drinks as categories that silently drain money.",
      did_you_know: "GHS 5/day on small things = GHS 150/month = GHS 1,800/year—enough for a full emergency savings goal.",
    }
  ],

  "mod01-savings-01": [
    {
      id: "qz_mod01-savings-01_001",
      question: "Adjoa joins a susu where 10 members contribute GHS 200 monthly. She receives the lump sum in month 6. How much does she get?",
      options: [
        "GHS 2,000—10 members × GHS 200 = GHS 2,000, the full pooled amount on her turn.",
        "GHS 200—only her own contribution back.",
        "GHS 1,200—the pool minus fees.",
        "GHS 600—half because she is mid-cycle.",
      ],
      correctIndex: 0,
      explanation: "In a susu (ROSCA), each member receives the entire pooled amount: GHS 200 × 10 = GHS 2,000.",
      did_you_know: "Over 60% of Ghanaian adults participate in informal savings like susu—one of the highest rates in Africa.",
    },
    {
      id: "qz_mod01-savings-01_002",
      question: "When should you choose a bank account over susu?",
      options: [
        "When you need flexible withdrawals, earn interest, and want GDPC deposit insurance.",
        "When you want social pressure to force saving.",
        "When you need cash immediately without waiting.",
        "When you want to avoid all bank paperwork.",
      ],
      correctIndex: 0,
      explanation: "Bank accounts offer flexibility, interest, and deposit insurance—but require self-discipline.",
      did_you_know: "Only 24% of Ghanaian adults have formal savings accounts. GDPC insures deposits up to GHS 20,000.",
    },
    {
      id: "qz_mod01-savings-01_003",
      question: "What is a key disadvantage of susu compared to a bank account?",
      options: [
        "You cannot access your money until your turn—no flexibility for emergencies.",
        "You earn more interest than a bank account.",
        "The government guarantees all susu contributions.",
        "You can withdraw at any time.",
      ],
      correctIndex: 0,
      explanation: "Susu’s inflexibility is its main drawback—fixed cycle with no early access.",
      did_you_know: "Some digital platforms now offer ‘virtual susu’ combining group discipline with flexible access.",
    },
    {
      id: "qz_mod01-savings-01_004",
      question: "Which savings goal is BEST suited for a bank account rather than susu?",
      options: [
        "Building an emergency fund that may be needed anytime",
        "Saving for Christmas in December",
        "Funding a yearly family gathering",
        "Paying school fees due in September",
      ],
      correctIndex: 0,
      explanation: "Emergency funds require instant access. A bank account provides this; susu locks funds until your turn.",
      did_you_know: "Keep 3–6 months of expenses in a readily accessible account for true emergencies.",
    },
    {
      id: "qz_mod01-savings-01_005",
      question: "Why does the lesson call Ghana a ‘leader in community-based savings’?",
      options: [
        "Over 60% of adults use informal savings like susu—one of the highest participation rates in Africa.",
        "Ghana has the most bank branches per capita.",
        "Ghanaian banks offer the highest interest rates in West Africa.",
        "The government mandates savings accounts for all citizens.",
      ],
      correctIndex: 0,
      explanation: "The 60%+ participation rate in informal mechanisms is exceptionally high by global standards.",
      did_you_know: "ROSCAs exist across Africa, Asia, and Latin America under different names: susu, tontine, chama, hui.",
    }
  ],

  "mod01-savings-02": [
    {
      id: "qz_mod01-savings-02_001",
      question: "Kojo earns GHS 2,500/month. Essential expenses are GHS 1,500/month. What is a 6-month emergency fund target, and how long at 20% savings?",
      options: [
        "GHS 9,000; 18 months",
        "GHS 15,000; 30 months",
        "GHS 6,000; 12 months",
        "GHS 9,000; 36 months",
      ],
      correctIndex: 0,
      explanation: "GHS 1,500 × 6 = GHS 9,000 target. Saving 20% = GHS 500/month → 18 months.",
      did_you_know: "Over 60% of Ghanaian households have faced a financial shock in the past two years with no savings buffer.",
    },
    {
      id: "qz_mod01-savings-02_002",
      question: "Which is a valid emergency justifying use of your emergency fund?",
      options: [
        "Unexpected medical bill of GHS 800",
        "A 40% discount on a new phone",
        "A friend’s wedding invitation",
        "A seasonal clothing sale",
      ],
      correctIndex: 0,
      explanation: "Medical emergencies are true emergencies—unexpected and essential.",
      did_you_know: "Valid emergencies: medical expenses, job loss, emergency travel, urgent home/car repairs.",
    },
    {
      id: "qz_mod01-savings-02_003",
      question: "Why is an emergency fund especially important in Ghana?",
      options: [
        "NHIS does not cover all treatments, jobs can be informal without notice, and family obligations arise suddenly.",
        "Banks charge high fees for emergency withdrawals.",
        "Inflation makes saving impossible.",
        "Formal insurance covers all unexpected expenses.",
      ],
      correctIndex: 0,
      explanation: "Ghana’s context—limited health coverage, informal employment, family obligations—makes emergency savings critical.",
      did_you_know: "Many Ghanaians rely on extended family during emergencies, straining relationships over time.",
    },
    {
      id: "qz_mod01-savings-02_004",
      question: "Akua has GHS 4,000 saved (target GHS 6,000). Her car needs GHS 3,500 in essential repairs. What should she do?",
      options: [
        "Use GHS 3,500 for the repair, then rebuild the fund to GHS 6,000 before other goals.",
        "Use the entire GHS 4,000 since car repairs are always emergencies.",
        "Do not touch it—borrow from a friend instead.",
        "Stop saving since the fund was used.",
      ],
      correctIndex: 0,
      explanation: "Essential car repairs are a valid emergency. Take only what you need and prioritise rebuilding.",
      did_you_know: "Emergency funds are meant to be used and rebuilt—they are not ‘set and forget.’",
    },
    {
      id: "qz_mod01-savings-02_005",
      question: "Which statement about emergency funds is FALSE?",
      options: [
        "Invest your emergency fund in stocks for higher returns while you wait to use it.",
        "A target of 3–6 months of essential expenses is recommended.",
        "The fund should be in a separate, accessible account.",
        "Job loss and medical bills are valid reasons to use it.",
      ],
      correctIndex: 0,
      explanation: "Emergency funds must be safe and liquid. Stocks can lose value exactly when you need the money.",
      did_you_know: "A money market fund or high-yield savings account is better than stocks for emergency savings.",
    }
  ],

  // --- MOD-02: Taxes & SSNIT ----------------------------------------------------------

  "mod02-tax-01": [
    {
      id: "qz_mod02-tax-01_001",
      question: "What does \"Tax Identification Number (TIN)\" mean?",
      options: [
        "A unique 13-digit number issued by the GRA that identifies every taxpayer in Ghana.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Tax Identification Number (TIN)\" is defined as: A unique 13-digit number issued by the GRA that identifies every taxpayer in Ghana.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-01_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Over 1.5 million Ghanaians registered for a TIN between 2020 and 2024, yet millions more remain outside the tax net.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Over 1.5 million Ghanaians registered for a TIN between 2020 and 2024, yet millions more remain outside the tax net.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod02-tax-01_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Do not ignore tax obligations. GRA increasingly uses data-matching to identify non-filers. If they find you before you register, penalties can be s...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Do not ignore tax obligations. GRA increasingly uses data-matching to identify non-filers. If they find you before you register, penalties can be s...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod02-tax-01_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Keep your TIN handy. You will need it for almost every financial transaction --- bank accounts, property purchases, investment accounts, and business...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Keep your TIN handy. You will need it for almost every financial transaction --- bank accounts, property purchases, investment accounts, and business...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-01_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "The Ghana Revenue Authority (GRA) is the national tax collector",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: The Ghana Revenue Authority (GRA) is the national tax collector. Every individual and business in Ghana must register and obtain a Tax Identification Number (TIN). Your TIN is your financial identi...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod02-tax-02": [
    {
      id: "qz_mod02-tax-02_001",
      question: "What does \"PAYE (Pay As You Earn)\" mean?",
      options: [
        "A system where employers deduct income tax from salaries and remit it to GRA.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"PAYE (Pay As You Earn)\" is defined as: A system where employers deduct income tax from salaries and remit it to GRA.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-02_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana's tax-to-GDP ratio stood at 13.8% in 2024, below the West African average of 15.2%.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana's tax-to-GDP ratio stood at 13.8% in 2024, below the West African average of 15.2%.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod02-tax-02_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "If your payslip does not itemise deductions, ask your HR department. Employers who fail to remit SSNIT or PAYE are breaking the law.",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: If your payslip does not itemise deductions, ask your HR department. Employers who fail to remit SSNIT or PAYE are breaking the law.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod02-tax-02_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Use the PAYE/SSNIT calculator in CediWise to estimate your take-home pay instantly.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Use the PAYE/SSNIT calculator in CediWise to estimate your take-home pay instantly.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-02_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "PAYE (Pay As You Earn) is the system through which your employer deducts income tax from your salary before you receive it",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: PAYE (Pay As You Earn) is the system through which your employer deducts income tax from your salary before you receive it. Understanding the tax bands helps you verify your payslip.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod02-tax-03": [
    {
      id: "qz_mod02-tax-03_001",
      question: "What does \"SSNIT\" mean?",
      options: [
        "Ghana's mandatory social security scheme providing retirement, disability, and survivor benefits.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"SSNIT\" is defined as: Ghana's mandatory social security scheme providing retirement, disability, and survivor benefits.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "SSNIT covers approximately 2.1 million active contributors, yet only 8% of Ghana's workforce contributes.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: SSNIT covers approximately 2.1 million active contributors, yet only 8% of Ghana's workforce contributes.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod02-tax-03_003",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Check your SSNIT statement annually at ssnit.org.gh. Verify your employer is remitting contributions.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Check your SSNIT statement annually at ssnit.org.gh. Verify your employer is remitting contributions.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod02-tax-03_004",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "The Social Security and National Insurance Trust (SSNIT) manages Ghana's mandatory pension scheme",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: The Social Security and National Insurance Trust (SSNIT) manages Ghana's mandatory pension scheme. Every formal-sector employee must contribute.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    }
  ],

  "mod02-tax-04": [
    {
      id: "qz_mod02-tax-04_001",
      question: "What does \"Tax Relief\" mean?",
      options: [
        "A deduction from gross income that reduces the amount subject to tax.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Tax Relief\" is defined as: A deduction from gross income that reduces the amount subject to tax.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-04_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Less than 30% of eligible Ghanaian taxpayers claim any tax relief --- leaving millions in unclaimed deductions each year.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Less than 30% of eligible Ghanaian taxpayers claim any tax relief --- leaving millions in unclaimed deductions each year.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod02-tax-04_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Claiming reliefs you're not entitled to is tax fraud. Keep documentation for all claims.",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Claiming reliefs you're not entitled to is tax fraud. Keep documentation for all claims.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod02-tax-04_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Submit relief applications at the start of the tax year. Once approved, your employer adjusts your PAYE deductions.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Submit relief applications at the start of the tax year. Once approved, your employer adjusts your PAYE deductions.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-04_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Tax reliefs reduce your taxable income, which means you pay less PAYE",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Tax reliefs reduce your taxable income, which means you pay less PAYE. Many employees never claim reliefs simply because they don't know about them.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod02-tax-05": [
    {
      id: "qz_mod02-tax-05_001",
      question: "What does \"VAT\" mean?",
      options: [
        "A consumption tax on goods and services. The final consumer bears the cost.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"VAT\" is defined as: A consumption tax on goods and services. The final consumer bears the cost.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-05_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana's VAT rate is 15%. Over 60% of registered businesses fail to file VAT returns on time.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana's VAT rate is 15%. Over 60% of registered businesses fail to file VAT returns on time.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod02-tax-05_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "VAT is not your money --- it belongs to government. Never spend VAT you collect.",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: VAT is not your money --- it belongs to government. Never spend VAT you collect.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod02-tax-05_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Voluntary registration lets you reclaim input VAT. Many suppliers prefer VAT-registered businesses.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Voluntary registration lets you reclaim input VAT. Many suppliers prefer VAT-registered businesses.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod02-tax-05_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Value Added Tax (VAT) is a consumption tax",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Value Added Tax (VAT) is a consumption tax. If your business turnover exceeds GHS 750,000/year, you must register for VAT (effective January 2026).",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-03: Investment ------------------------------------------------------------

  "mod03-invest-01": [
    {
      id: "qz_mod03-invest-01_001",
      question: "What does \"Risk-Return Spectrum\" mean?",
      options: [
        "The principle that higher potential returns require accepting higher levels of risk.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Risk-Return Spectrum\" is defined as: The principle that higher potential returns require accepting higher levels of risk.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-01_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Higher potential returns come with higher risk. Understanding this relationship is the foundation of smart investing.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Higher potential returns come with higher risk. Understanding this relationship is the foundation of smart investing.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod03-invest-01_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Be wary of investments promising 'high returns with no risk' --- they are almost always scams. Every legitimate investment carries some risk.",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Be wary of investments promising 'high returns with no risk' --- they are almost always scams. Every legitimate investment carries some risk.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod03-invest-01_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "A simple diversified portfolio: keep 3--6 months of expenses in savings, invest 40% in T-Bills/bonds, 30% in mutual funds, 20% in stocks, and 10% in...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: A simple diversified portfolio: keep 3--6 months of expenses in savings, invest 40% in T-Bills/bonds, 30% in mutual funds, 20% in stocks, and 10% in...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-01_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Every investment involves a trade-off between risk and return",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Every investment involves a trade-off between risk and return. Generally, the higher the potential return, the higher the risk you must accept. Understanding your own risk tolerance is the first st...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod03-invest-02": [
    {
      id: "qz_mod03-invest-02_001",
      question: "What does \"T-Bill (Treasury Bill)\" mean?",
      options: [
        "A short-term government security sold at a discount. The investor receives face value at maturity. Considered very lo...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"T-Bill (Treasury Bill)\" is defined as: A short-term government security sold at a discount. The investor receives face value at maturity. Considered very low risk.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-02_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana's T-Bill rates have declined significantly --- from 28% in early 2025 to approximately 6-13% in early 2026 --- reflecting easing inflation and po...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana's T-Bill rates have declined significantly --- from 28% in early 2025 to approximately 6-13% in early 2026 --- reflecting easing inflation and po...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod03-invest-02_003",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Use the T-Bill Simulator in CediWise to compare returns across tenors and calculate your net return after tax.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Use the T-Bill Simulator in CediWise to compare returns across tenors and calculate your net return after tax.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod03-invest-02_004",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Treasury Bills (T-Bills) are short-term government debt instruments",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Treasury Bills (T-Bills) are short-term government debt instruments. You buy them at a discount and receive the full face value at maturity --- the difference is your return. They are considered one ...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    }
  ],

  "mod03-invest-03": [
    {
      id: "qz_mod03-invest-03_001",
      question: "What does \"Government Bond\" mean?",
      options: [
        "A debt security issued by the government that pays regular interest (coupon) and repays principal at maturity.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Government Bond\" is defined as: A debt security issued by the government that pays regular interest (coupon) and repays principal at maturity.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Following the Domestic Debt Exchange Programme (DDEP) in 2023, Ghana gradually returned to the domestic bond market, with the DDEP restructuring pa...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Following the Domestic Debt Exchange Programme (DDEP) in 2023, Ghana gradually returned to the domestic bond market, with the DDEP restructuring pa...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod03-invest-03_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "The 2022 Domestic Debt Exchange (DDE) showed that bonds carry some risk. Diversify across different tenors and consider combining bonds with T-Bill...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: The 2022 Domestic Debt Exchange (DDE) showed that bonds carry some risk. Diversify across different tenors and consider combining bonds with T-Bill...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod03-invest-03_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "If you hold a bond to maturity, price fluctuations don't matter --- you receive all coupon payments plus your principal back. Bonds are ideal for inv...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: If you hold a bond to maturity, price fluctuations don't matter --- you receive all coupon payments plus your principal back. Bonds are ideal for inv...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-03_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Government bonds are longer-term debt instruments (2 years or more) that pay regular interest (coupon) payments",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Government bonds are longer-term debt instruments (2 years or more) that pay regular interest (coupon) payments. Unlike T-Bills, bonds provide periodic income, making them suitable for investors wh...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod03-invest-04": [
    {
      id: "qz_mod03-invest-04_001",
      question: "What does \"Mutual Fund\" mean?",
      options: [
        "A pooled investment vehicle where investors buy units representing a diversified portfolio of assets managed by a pro...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Mutual Fund\" is defined as: A pooled investment vehicle where investors buy units representing a diversified portfolio of assets managed by a professional fund manager.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-04_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "The collective investment scheme (CIS) industry in Ghana manages over GHS 6.5 billion in assets (SEC 2024), making it accessible for small investor...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: The collective investment scheme (CIS) industry in Ghana manages over GHS 6.5 billion in assets (SEC 2024), making it accessible for small investor...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod03-invest-04_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Only invest with SEC-licensed fund managers. Verify licenses at sec.gov.gh. Unlicensed operators promising guaranteed returns are likely running Po...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Only invest with SEC-licensed fund managers. Verify licenses at sec.gov.gh. Unlicensed operators promising guaranteed returns are likely running Po...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod03-invest-04_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Compare funds on SEC Ghana's website. Look for funds with consistent performance, experienced managers, and reasonable fees. Past performance does ...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Compare funds on SEC Ghana's website. Look for funds with consistent performance, experienced managers, and reasonable fees. Past performance does ...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-04_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Mutual funds pool money from many investors to buy a diversified portfolio of stocks, bonds, and other assets",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Mutual funds pool money from many investors to buy a diversified portfolio of stocks, bonds, and other assets. Each investor owns units representing a portion of the fund. This lets small investors...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod03-invest-05": [
    {
      id: "qz_mod03-invest-05_001",
      question: "What does \"GSE (Ghana Stock Exchange)\" mean?",
      options: [
        "The principal stock exchange of Ghana where shares of publicly-listed companies are traded.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"GSE (Ghana Stock Exchange)\" is defined as: The principal stock exchange of Ghana where shares of publicly-listed companies are traded.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-05_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "The Ghana Stock Exchange (GSE) listed 37 companies and had a market capitalisation of over GHS 70 billion as of 2024.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: The Ghana Stock Exchange (GSE) listed 37 companies and had a market capitalisation of over GHS 70 billion as of 2024.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod03-invest-05_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "The stock market can be volatile. Prices can drop 20% or more in a year. Only invest money you can afford to leave for at least 3--5 years. Never in...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: The stock market can be volatile. Prices can drop 20% or more in a year. Only invest money you can afford to leave for at least 3--5 years. Never in...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod03-invest-05_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Start with well-known, profitable companies. Banks (GCB, Stanbic), telecoms (MTN), and manufacturing companies are common starting points. Diversif...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Start with well-known, profitable companies. Banks (GCB, Stanbic), telecoms (MTN), and manufacturing companies are common starting points. Diversif...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-05_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "The Ghana Stock Exchange is where shares of publicly-listed companies are bought and sold",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: The Ghana Stock Exchange is where shares of publicly-listed companies are bought and sold. When you buy shares, you become a part-owner of that company. Returns come from price appreciation and div...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod03-invest-06": [
    {
      id: "qz_mod03-invest-06_001",
      question: "What does \"Premium\" mean?",
      options: [
        "The regular payment you make to an insurance company to keep your policy active.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Premium\" is defined as: The regular payment you make to an insurance company to keep your policy active.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-06_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Only about 1% of Ghanaians have any form of insurance (NIC 2024), compared to the African average of approximately 3% --- representing both a gap and...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Only about 1% of Ghanaians have any form of insurance (NIC 2024), compared to the African average of approximately 3% --- representing both a gap and...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod03-invest-06_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Insurance is not an investment. Avoid 'investment-linked' insurance products unless you fully understand the fees and terms. In many cases, buying ...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Insurance is not an investment. Avoid 'investment-linked' insurance products unless you fully understand the fees and terms. In many cases, buying ...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod03-invest-06_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Always verify an insurer is licensed by the National Insurance Commission (NIC) before buying a policy. Check at nicgh.org.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Always verify an insurer is licensed by the National Insurance Commission (NIC) before buying a policy. Check at nicgh.org.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod03-invest-06_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Insurance protects you and your family from financial loss",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Insurance protects you and your family from financial loss. You pay regular premiums, and in return, the insurer pays a benefit when a covered event occurs --- medical bills, car accidents, death, or...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-04: Mobile Money & Digital Payments ------------------------------------

  "mod04-mobile-01": [
    {
      id: "qz_mod04-mobile-01_001",
      question: "Ghana recorded over 6.8 billion mobile money transactions worth GHS 1.9 trillion in 2023. What does this indicate?",
      options: [
        "Mobile money has become the dominant payment method for millions of Ghanaians.",
        "Mobile money is only used by wealthy Ghanaians.",
        "Most people lose money through transaction fees.",
        "The volume only reflects business-to-business payments.",
      ],
      correctIndex: 0,
      explanation: "6.8 billion transactions shows mobile money is deeply embedded in daily Ghanaian life.",
      did_you_know: "Mobile money accounts in Ghana grew to over 60 million registered accounts by 2024—more than double the number of bank accounts.",
    },
    {
      id: "qz_mod04-mobile-01_002",
      question: "Akosua needs to send GHS 200 to her mother in a village 200 km away. Her mother has no bank account. What is the BEST method?",
      options: [
        "Mobile money—mother can withdraw at any nearby agent without needing a bank account.",
        "Cash through a bus driver.",
        "A money order at the post office.",
        "Open a bank account in her mother’s name.",
      ],
      correctIndex: 0,
      explanation: "Mobile money is instant, accessible nationwide through agents, and requires no bank account.",
      did_you_know: "Mobile money agents outnumber bank branches 50-to-1 in rural Ghana.",
    },
    {
      id: "qz_mod04-mobile-01_003",
      question: "Which of the following CAN you do with a mobile money wallet in Ghana?",
      options: [
        "Pay ECG bills, buy airtime, pay DSTV, send money, and save in the wallet.",
        "Apply for a mortgage through your MoMo provider.",
        "Trade stocks on the Ghana Stock Exchange.",
        "Open a fixed deposit earning 15% interest.",
      ],
      correctIndex: 0,
      explanation: "MoMo offers bill payments, airtime, DSTV, transfers, and in-wallet savings.",
      did_you_know: "You can pay school fees, hospital bills, and market purchases with MoMo in most Ghanaian cities.",
    },
    {
      id: "qz_mod04-mobile-01_004",
      question: "What is the main difference between a mobile money wallet and a bank account?",
      options: [
        "MoMo is for daily digital transactions; bank accounts offer interest, loans, and deposit insurance.",
        "MoMo can only receive money but cannot send it.",
        "Bank accounts are only for businesses.",
        "They are the same product from different providers.",
      ],
      correctIndex: 0,
      explanation: "MoMo excels at daily transactions; banks offer interest, credit building, and GDPC protection.",
      did_you_know: "Keep 1–2 months of expenses in MoMo and main savings in a bank account.",
    },
    {
      id: "qz_mod04-mobile-01_005",
      question: "How is mobile money regulated in Ghana?",
      options: [
        "By the Bank of Ghana under the Payment Systems and Services Act.",
        "It is completely unregulated.",
        "Only MTN and Vodafone are allowed to offer it.",
        "Transactions are limited to GHS 100/day by law.",
      ],
      correctIndex: 0,
      explanation: "The BoG regulates all mobile money operators with consumer protection rules.",
      did_you_know: "The BoG sets transaction limits and requires minimum capital reserves from all MoMo operators.",
    }
  ],

  "mod04-mobile-02": [
    {
      id: "qz_mod04-mobile-02_001",
      question: "Abena receives: ‘Congratulations! You won GHS 5,000! Send GHS 100 processing fee to claim.’ What should she do?",
      options: [
        "Delete it—this is an advance-fee scam. Legitimate promotions never ask you to pay to receive a prize.",
        "Send GHS 100—GHS 5,000 is worth the small fee.",
        "Call the number to verify.",
        "Send GHS 50 as a counter-offer.",
      ],
      correctIndex: 0,
      explanation: "Classic advance-fee scam: fraudster takes your ‘processing fee’ and disappears.",
      did_you_know: "MoMo fraud losses in Ghana were over GHS 16 million in 2023.",
    },
    {
      id: "qz_mod04-mobile-02_002",
      question: "What is ‘The Golden Rule’ of mobile money security?",
      options: [
        "Never share your PIN, never send money to claim a prize, verify unexpected requests through official channels.",
        "Always keep your phone unlocked for emergencies.",
        "Share your PIN with trusted family members.",
        "Follow instructions from anyone claiming to be your network provider.",
      ],
      correctIndex: 0,
      explanation: "Golden rule: keep PINs secret, never pay to claim prizes, always verify through official channels.",
      did_you_know: "The BoG recorded over 14,600 electronic money fraud cases in 2023.",
    },
    {
      id: "qz_mod04-mobile-02_003",
      question: "Kofi gets a call from someone claiming to be MTN needing his PIN to ‘upgrade his account.’ What should he do?",
      options: [
        "Hang up—no legitimate agent will ever ask for your PIN. It is the master key to your wallet.",
        "Give the PIN since they identified themselves.",
        "Ask them to visit your home.",
        "Give only the last 4 digits.",
      ],
      correctIndex: 0,
      explanation: "Never share your PIN. No legitimate service provider will ever ask for it.",
      did_you_know: "With your MoMo PIN, fraudsters can empty your wallet and take loans in your name.",
    },
    {
      id: "qz_mod04-mobile-02_004",
      question: "Which is a legitimate mobile money security practice?",
      options: [
        "Register only your own SIM in your own name and never let others use your wallet.",
        "Write your PIN on the back of your phone.",
        "Keep your MoMo PIN the same as your bank card PIN.",
        "Use the same PIN for all your MoMo wallets.",
      ],
      correctIndex: 0,
      explanation: "SIM registration in your name is required by BoG regulation.",
      did_you_know: "Use different PINs for MoMo, banking, and other services to limit damage if one is compromised.",
    },
    {
      id: "qz_mod04-mobile-02_005",
      question: "A friend gets a text from ‘MoMo Support’ asking her to click a link to ‘verify her account.’ What do you advise?",
      options: [
        "Do not click—this is phishing. Official providers use their app or USSD, not clickable links in texts.",
        "Click immediately—account blocking is serious.",
        "Reply to ask if it is legitimate.",
        "Forward to 10 friends first, then click.",
      ],
      correctIndex: 0,
      explanation: "Phishing creates urgency to trick you. Official channels are app/USSD.",
      did_you_know: "Report suspicious SMS to your provider’s official number—not the number in the suspicious message.",
    }
  ],

  "mod04-mobile-03": [
    {
      id: "qz_mod04-mobile-03_001",
      question: "What does \"GDPC (Ghana Deposit Protection Corporation)\" mean?",
      options: [
        "A government body that insures deposits at licensed banks up to GHS 20,000 per depositor.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"GDPC (Ghana Deposit Protection Corporation)\" is defined as: A government body that insures deposits at licensed banks up to GHS 20,000 per depositor.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod04-mobile-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Mobile money accounts in Ghana grew to over 60 million registered accounts in 2024 --- more than double the number of bank accounts.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Mobile money accounts in Ghana grew to over 60 million registered accounts in 2024 --- more than double the number of bank accounts.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod04-mobile-03_003",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "A practical approach: keep 1--2 months of expenses in MoMo for daily access, and your main savings in a bank account for safety and interest.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: A practical approach: keep 1--2 months of expenses in MoMo for daily access, and your main savings in a bank account for safety and interest.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod04-mobile-03_004",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Both mobile money wallets and bank accounts let you save money, but they serve different purposes",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Both mobile money wallets and bank accounts let you save money, but they serve different purposes. Understanding the differences helps you choose the right option for each savings goal.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    }
  ],

  "mod04-mobile-04": [
    {
      id: "qz_mod04-mobile-04_001",
      question: "What does \"Digital Credit\" mean?",
      options: [
        "Short-term loans accessed through mobile platforms, typically based on transaction history rather than formal credit ...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Digital Credit\" is defined as: Short-term loans accessed through mobile platforms, typically based on transaction history rather than formal credit checks.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod04-mobile-04_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Digital lending in Ghana has grown rapidly, with over 15 million micro-loans disbursed through mobile platforms in 2024 --- but effective annual inte...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Digital lending in Ghana has grown rapidly, with over 15 million micro-loans disbursed through mobile platforms in 2024 --- but effective annual inte...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod04-mobile-04_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Late repayment can result in: default listing on credit bureaus (harming future borrowing), daily penalty fees that accumulate rapidly, and aggress...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Late repayment can result in: default listing on credit bureaus (harming future borrowing), daily penalty fees that accumulate rapidly, and aggress...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod04-mobile-04_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Before borrowing, ask: Can I repay this in full on the due date? If not, the late fees and rollover costs can quickly make the loan unmanageable.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Before borrowing, ask: Can I repay this in full on the due date? If not, the late fees and rollover costs can quickly make the loan unmanageable.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod04-mobile-04_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Digital credit --- loans accessed through your phone --- has made borrowing easier than ever",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Digital credit --- loans accessed through your phone --- has made borrowing easier than ever. But convenience comes at a cost. Understanding the true cost of digital loans is essential before you borrow.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-05: SME --------------------------------------------------------------------

  "mod05-sme-01": [
    {
      id: "qz_mod05-sme-01_001",
      question: "What does \"Business Bank Account\" mean?",
      options: [
        "A bank account used exclusively for business transactions. Required for tax compliance, legal protection, and accessi...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Business Bank Account\" is defined as: A bank account used exclusively for business transactions. Required for tax compliance, legal protection, and accessing business credit.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-01_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Over 60% of SME failures in Ghana are linked to poor financial management, with mixing personal and business finances being a leading cause.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Over 60% of SME failures in Ghana are linked to poor financial management, with mixing personal and business finances being a leading cause.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod05-sme-01_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "If the business is sued and you have mixed finances, a court may 'pierce the corporate veil' --- making your personal assets vulnerable. A separate b...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: If the business is sued and you have mixed finances, a court may 'pierce the corporate veil' --- making your personal assets vulnerable. A separate b...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod05-sme-01_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Choose a business account that offers online banking, low transaction fees, and integrates with accounting software. Many Ghanaian banks offer SME-...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Choose a business account that offers online banking, low transaction fees, and integrates with accounting software. Many Ghanaian banks offer SME-...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-01_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Mixing personal and business money is one of the biggest mistakes SME owners make",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Mixing personal and business money is one of the biggest mistakes SME owners make. It leads to unclear profitability, tax problems, and personal liability if the business fails.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod05-sme-02": [
    {
      id: "qz_mod05-sme-02_001",
      question: "What does \"Cash Flow\" mean?",
      options: [
        "The net amount of cash moving in and out of a business. Positive cash flow means more cash is coming in than going out.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Cash Flow\" is defined as: The net amount of cash moving in and out of a business. Positive cash flow means more cash is coming in than going out.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-02_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Over 80% of Ghanaian SMEs that fail cite cash flow problems as the primary cause --- even when they were profitable on paper.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Over 80% of Ghanaian SMEs that fail cite cash flow problems as the primary cause --- even when they were profitable on paper.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod05-sme-02_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "A common cash flow trap: winning a large contract that requires upfront spending (inventory, staff) but pays in 60 days. You run out of cash before...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: A common cash flow trap: winning a large contract that requires upfront spending (inventory, staff) but pays in 60 days. You run out of cash before...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod05-sme-02_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Use the Cash Flow Tool in CediWise to project your weekly cash position. Update it every week with actual numbers.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Use the Cash Flow Tool in CediWise to project your weekly cash position. Update it every week with actual numbers.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-02_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Cash flow is the movement of money in and out of your business",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Cash flow is the movement of money in and out of your business. Profit is not cash. You can be profitable but run out of cash if customers pay late or expenses spike. Managing cash flow is more imp...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod05-sme-03": [
    {
      id: "qz_mod05-sme-03_001",
      question: "What does \"Cost-Plus Pricing\" mean?",
      options: [
        "A pricing method where a fixed percentage (markup) is added to the cost of producing a product to determine the selli...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Cost-Plus Pricing\" is defined as: A pricing method where a fixed percentage (markup) is added to the cost of producing a product to determine the selling price.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Many Ghanaian SMEs underprice their products, leaving 30--50% of potential profit on the table. Correct pricing is the fastest way to improve profit...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Many Ghanaian SMEs underprice their products, leaving 30--50% of potential profit on the table. Correct pricing is the fastest way to improve profit...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod05-sme-03_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Do not compete only on price. The cheapest price race has only one winner --- and it's usually not the small business. Compete on quality, service, r...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Do not compete only on price. The cheapest price race has only one winner --- and it's usually not the small business. Compete on quality, service, r...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod05-sme-03_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "A simple formula: Selling Price = (Total Cost per Unit) ÷ (1 -- Desired Profit Margin). For 30% profit margin: Price = Cost ÷ 0.7.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: A simple formula: Selling Price = (Total Cost per Unit) ÷ (1 -- Desired Profit Margin). For 30% profit margin: Price = Cost ÷ 0.7.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-03_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Pricing is not just about covering costs",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Pricing is not just about covering costs. A good price covers all costs, includes a profit margin, reflects what the market will bear, and positions your brand. Many SMEs fail because they underprice.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod05-sme-04": [
    {
      id: "qz_mod05-sme-04_001",
      question: "What does \"Collateral\" mean?",
      options: [
        "An asset (property, equipment, or savings) that a lender can seize if you fail to repay a loan. Required for most bus...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Collateral\" is defined as: An asset (property, equipment, or savings) that a lender can seize if you fail to repay a loan. Required for most business loans.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-04_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Only 20% of Ghanaian SMEs have access to formal bank credit, despite the sector contributing 70% of GDP. Understanding loan options is crucial for ...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Only 20% of Ghanaian SMEs have access to formal bank credit, despite the sector contributing 70% of GDP. Understanding loan options is crucial for ...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod05-sme-04_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Be extremely careful with loan covenants. Missing a single repayment can trigger default penalties, increased interest rates, or seizure of collate...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Be extremely careful with loan covenants. Missing a single repayment can trigger default penalties, increased interest rates, or seizure of collate...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod05-sme-04_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Before applying for a loan: separate your business and personal accounts first, keep clean financial records, build a relationship with a bank by m...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Before applying for a loan: separate your business and personal accounts first, keep clean financial records, build a relationship with a bank by m...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-04_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Business credit can help you grow --- buying inventory, expanding premises, or investing in equipment",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Business credit can help you grow --- buying inventory, expanding premises, or investing in equipment. But borrowing without understanding the terms can put your business at risk.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod05-sme-05": [
    {
      id: "qz_mod05-sme-05_001",
      question: "What does \"Tax Compliance\" mean?",
      options: [
        "The act of fulfilling all tax obligations including registration, filing returns, and paying taxes on time.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Tax Compliance\" is defined as: The act of fulfilling all tax obligations including registration, filing returns, and paying taxes on time.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-05_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana's tax laws require all businesses --- regardless of size --- to register and file returns. Non-compliance is the fastest way to lose access to fo...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana's tax laws require all businesses --- regardless of size --- to register and file returns. Non-compliance is the fastest way to lose access to fo...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod05-sme-05_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "GRA penalties for non-compliance: late filing GHS 300/month, late payment 3% interest/month. Persistent non-compliance can lead to asset seizure, b...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: GRA penalties for non-compliance: late filing GHS 300/month, late payment 3% interest/month. Persistent non-compliance can lead to asset seizure, b...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod05-sme-05_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Use accounting software or hire a part-time accountant. The cost is far less than the penalties for non-compliance or the tax savings you'll miss.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Use accounting software or hire a part-time accountant. The cost is far less than the penalties for non-compliance or the tax savings you'll miss.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-05_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Tax compliance is not optional",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Tax compliance is not optional. Every business must register with GRA, obtain a TIN, and file returns. Compliance builds credibility with banks, partners, and customers.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod05-sme-06": [
    {
      id: "qz_mod05-sme-06_001",
      question: "What does \"Premium\" mean?",
      options: [
        "The regular payment you make to keep your insurance policy active. Usually paid annually for business insurance.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Premium\" is defined as: The regular payment you make to keep your insurance policy active. Usually paid annually for business insurance.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-06_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Over 60% of Ghanaian SMEs that experience a major loss (fire, theft, or key person death) never reopen. Business insurance is an investment in surv...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Over 60% of Ghanaian SMEs that experience a major loss (fire, theft, or key person death) never reopen. Business insurance is an investment in surv...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod05-sme-06_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Under-insuring is dangerous. If your stock is worth GHS 100,000 but you insure it for GHS 50,000, the insurer may apply 'average' --- paying only hal...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Under-insuring is dangerous. If your stock is worth GHS 100,000 but you insure it for GHS 50,000, the insurer may apply 'average' --- paying only hal...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod05-sme-06_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Start with fire and theft insurance as a minimum. Add public liability if customers visit your premises. Add key person insurance if the business d...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Start with fire and theft insurance as a minimum. Add public liability if customers visit your premises. Add key person insurance if the business d...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod05-sme-06_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Business insurance protects your hard work against unexpected events",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Business insurance protects your hard work against unexpected events. The cost of insurance is small compared to the cost of rebuilding from nothing.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-06: Retirement -----------------------------------------------------------

  "mod06-retirement-01": [
    {
      id: "qz_mod06-retirement-01_001",
      question: "What does \"Compound Interest\" mean?",
      options: [
        "Interest earned on both the original amount saved and on the interest that amount has already earned. The eighth wond...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Compound Interest\" is defined as: Interest earned on both the original amount saved and on the interest that amount has already earned. The eighth wonder of the world.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-01_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Starting retirement savings at age 25 instead of 35 can more than double your retirement fund --- thanks to compound interest.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Starting retirement savings at age 25 instead of 35 can more than double your retirement fund --- thanks to compound interest.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod06-retirement-01_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Relying only on SSNIT or children for retirement income is risky. SSNIT contributions depend on your employment history, and your children may have...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Relying only on SSNIT or children for retirement income is risky. SSNIT contributions depend on your employment history, and your children may have...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod06-retirement-01_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Even GHS 100/month in a Tier 3 voluntary pension or mutual fund from age 25 can grow to a meaningful sum by age 60. The key is starting early and b...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Even GHS 100/month in a Tier 3 voluntary pension or mutual fund from age 25 can grow to a meaningful sum by age 60. The key is starting early and b...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-01_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "The earlier you start saving for retirement, the more time compound interest has to work",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: The earlier you start saving for retirement, the more time compound interest has to work. Delaying by even 10 years can mean half the retirement fund. Start now, with whatever you can afford.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod06-retirement-02": [
    {
      id: "qz_mod06-retirement-02_001",
      question: "What does \"Occupational Pension (Tier 2)\" mean?",
      options: [
        "A mandatory employer-sponsored pension scheme managed by private fund managers. Portable between jobs.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Occupational Pension (Tier 2)\" is defined as: A mandatory employer-sponsored pension scheme managed by private fund managers. Portable between jobs.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-02_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "SSNIT Tier 1 and Tier 2 combined replace approximately 30--50% of your final salary --- enough for basics but not your full lifestyle.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: SSNIT Tier 1 and Tier 2 combined replace approximately 30--50% of your final salary --- enough for basics but not your full lifestyle.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod06-retirement-02_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "When you change jobs, your Tier 2 funds stay with the fund manager (portable). Ensure your new employer transfers contributions to the same or a co...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: When you change jobs, your Tier 2 funds stay with the fund manager (portable). Ensure your new employer transfers contributions to the same or a co...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod06-retirement-02_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Ask your HR department which Tier 2 fund manager your company uses. You may have the right to choose between conservative, moderate, or aggressive ...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Ask your HR department which Tier 2 fund manager your company uses. You may have the right to choose between conservative, moderate, or aggressive ...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-02_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Tier 1 (SSNIT) and Tier 2 (occupational pension) are mandatory for all formal employees",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Tier 1 (SSNIT) and Tier 2 (occupational pension) are mandatory for all formal employees. Understanding and maximising both is essential for a comfortable retirement.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod06-retirement-03": [
    {
      id: "qz_mod06-retirement-03_001",
      question: "What does \"Tier 3 Pension\" mean?",
      options: [
        "A voluntary personal pension scheme offering tax relief on contributions. Available to all individuals, including sel...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Tier 3 Pension\" is defined as: A voluntary personal pension scheme offering tax relief on contributions. Available to all individuals, including self-employed and informal workers.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Tier 3 contributions qualify for up to 16.5% tax relief --- reducing your tax bill while building your retirement savings.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Tier 3 contributions qualify for up to 16.5% tax relief --- reducing your tax bill while building your retirement savings.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod06-retirement-03_003",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Tier 3 is ideal for self-employed individuals who don't have access to mandatory Tier 1 and 2. Even small, irregular contributions add up over time...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Tier 3 is ideal for self-employed individuals who don't have access to mandatory Tier 1 and 2. Even small, irregular contributions add up over time...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod06-retirement-03_004",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Tier 3 is a voluntary personal pension that you can contribute to at any time",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Tier 3 is a voluntary personal pension that you can contribute to at any time. Unlike Tier 1 and 2, it is open to everyone --- self-employed, informal workers, and formal employees who want to save m...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    }
  ],

  "mod06-retirement-04": [
    {
      id: "qz_mod06-retirement-04_001",
      question: "What does \"Diversification\" mean?",
      options: [
        "Spreading investments across different asset types to reduce risk. When one investment drops, others may hold steady ...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Diversification\" is defined as: Spreading investments across different asset types to reduce risk. When one investment drops, others may hold steady or rise.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-04_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghanaians who combine pension savings with non-pension investments (T-Bills, property, business) retire with 3× more wealth than those relying sole...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghanaians who combine pension savings with non-pension investments (T-Bills, property, business) retire with 3× more wealth than those relying sole...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod06-retirement-04_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Property can be illiquid --- you cannot sell half a house. Ensure you have enough liquid savings (T-Bills, bonds) for expenses before investing heavi...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Property can be illiquid --- you cannot sell half a house. Ensure you have enough liquid savings (T-Bills, bonds) for expenses before investing heavi...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod06-retirement-04_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Diversify across different asset types and risk levels. Do not put all retirement savings in one asset class.",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Diversify across different asset types and risk levels. Do not put all retirement savings in one asset class.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-04_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Beyond pensions, you can build retirement wealth through T-Bills, bonds, property, or a business",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Beyond pensions, you can build retirement wealth through T-Bills, bonds, property, or a business. These 'non-pension' assets give you flexibility and diversification.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod06-retirement-05": [
    {
      id: "qz_mod06-retirement-05_001",
      question: "What does \"Intestate Succession\" mean?",
      options: [
        "The legal process for distributing a deceased person's assets when no valid will exists. In Ghana, governed by PNDCL ...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Intestate Succession\" is defined as: The legal process for distributing a deceased person's assets when no valid will exists. In Ghana, governed by PNDCL 111.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-05_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Over 70% of Ghanaians die without a will --- leaving their assets to be distributed according to Ghana's intestate succession laws, which may not mat...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Over 70% of Ghanaians die without a will --- leaving their assets to be distributed according to Ghana's intestate succession laws, which may not mat...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod06-retirement-05_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Without a will, the court decides who gets your assets --- a process that can take 1--3 years and cost a significant portion of the estate in legal fees.",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Without a will, the court decides who gets your assets --- a process that can take 1--3 years and cost a significant portion of the estate in legal fees.",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod06-retirement-05_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Update your will when your family or asset situation changes (marriage, divorce, birth of children, buying property, starting a business). Review i...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Update your will when your family or asset situation changes (marriage, divorce, birth of children, buying property, starting a business). Review i...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod06-retirement-05_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Succession planning ensures your assets go to the right people",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Succession planning ensures your assets go to the right people. A will is the legal document that states your wishes. Without one, Ghana's intestacy laws determine who inherits.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-07: Consumer Protection & Fraud --------------------------------------------

  "mod07-fraud-01": [
    {
      id: "qz_mod07-fraud-01_001",
      question: "Esi is approached on WhatsApp promising to ‘double any amount in 48 hours via forex.’ She invests GHS 500 and receives GHS 1,000 back. Now they ask for GHS 5,000. What is happening?",
      options: [
        "Confidence scam—the initial return builds trust to lure her into a much larger loss.",
        "Legitimate forex—the return proves it works.",
        "A bank-regulated investment product.",
        "A micro-investment scheme.",
      ],
      correctIndex: 0,
      explanation: "Classic ‘pig butchering’: small returns build trust, then fraudster asks for a large sum and disappears.",
      did_you_know: "Financial fraud cost Ghanaian consumers an estimated GHS 88 million in 2023.",
    },
    {
      id: "qz_mod07-fraud-01_002",
      question: "Which is a universal red flag of financial fraud?",
      options: [
        "Pressure to act quickly with ‘limited time offer’ to bypass critical thinking.",
        "A professionally designed website.",
        "A physical office address in Accra.",
        "Registration with the Registrar General.",
      ],
      correctIndex: 0,
      explanation: "Fraudsters create urgency to prevent research. Legitimate investments do not pressure you.",
      did_you_know: "Every scam follows the same pattern: build trust, create urgency, request money, disappear.",
    },
    {
      id: "qz_mod07-fraud-01_003",
      question: "A company promises ‘guaranteed 15% monthly returns.’ What is the most likely truth?",
      options: [
        "Almost certainly a Ponzi scheme—no legitimate investment guarantees fixed high monthly returns.",
        "A great opportunity to grow wealth fast.",
        "A regulated unit trust product.",
        "Reasonable because Ghana’s economy grows fast.",
      ],
      correctIndex: 0,
      explanation: "Guaranteed high monthly returns are a Ponzi hallmark. Legitimate investments carry risk.",
      did_you_know: "The GSE averaged about 28% annual return in 2023—not 15% monthly.",
    },
    {
      id: "qz_mod07-fraud-01_004",
      question: "Fraudsters call claiming to be from your bank asking you to ‘verify’ account details. What type of fraud is this?",
      options: [
        "Vishing (voice phishing)—fraudsters impersonate legitimate institutions over the phone.",
        "Pyramid scheme",
        "Ponzi scheme",
        "Advance-fee scam",
      ],
      correctIndex: 0,
      explanation: "Vishing is phone-based phishing. Banks never call asking for PINs or full account numbers.",
      did_you_know: "Always hang up and call your bank’s official number to verify.",
    },
    {
      id: "qz_mod07-fraud-01_005",
      question: "Which statement about fraud prevention is TRUE?",
      options: [
        "If an offer sounds too good to be true, it almost certainly is—verify through official sources.",
        "Only elderly people fall for financial scams.",
        "Fraud only happens through unknown websites.",
        "If a friend made money from it, it must be legitimate.",
      ],
      correctIndex: 0,
      explanation: "Too-good-to-be-true is the #1 fraud warning. Always verify independently.",
      did_you_know: "Scammers pay early investors from new victims’ money to create the illusion of legitimacy.",
    }
  ],

  "mod07-fraud-02": [
    {
      id: "qz_mod07-fraud-02_001",
      question: "A bank charges you an unexplained fee and refuses a refund. Where do you escalate?",
      options: [
        "Bank of Ghana Consumer Help Desk—the BoG resolved 4,800+ complaints in 2023, recovering GHS 15 million.",
        "The nearest police station.",
        "Your Member of Parliament.",
        "The Ghana Journalists Association.",
      ],
      correctIndex: 0,
      explanation: "The BoG handles consumer complaints against financial institutions with a track record of recovering funds.",
      did_you_know: "The BoG recovered GHS 15 million for consumers who knew their rights and escalated properly in 2023.",
    },
    {
      id: "qz_mod07-fraud-02_002",
      question: "What documentation should you keep for a financial complaint?",
      options: [
        "Receipts, SMS confirmations, screenshots, dates, amounts, and names of agents you spoke with.",
        "Only the final resolution letter.",
        "Nothing—verbal complaints are sufficient.",
        "Only bank statements from the past 3 months.",
      ],
      correctIndex: 0,
      explanation: "Thorough documentation is essential for successful escalation to the BoG.",
      did_you_know: "Regulators need specific evidence to investigate complaints—the more documentation, the stronger your case.",
    },
    {
      id: "qz_mod07-fraud-02_003",
      question: "Your MoMo wallet was debited GHS 500 for a transaction you did not make. What is your FIRST step?",
      options: [
        "Report immediately to your provider’s customer service and file a formal complaint with transaction details.",
        "Post about it on social media.",
        "Wait a week to see if it reverses.",
        "Close your wallet and open a new one.",
      ],
      correctIndex: 0,
      explanation: "Report unauthorised transactions to your provider immediately. Keep your complaint reference number.",
      did_you_know: "Under BoG regulations, you have the right to dispute unauthorised transactions.",
    },
    {
      id: "qz_mod07-fraud-02_004",
      question: "What is the correct escalation order for a financial complaint?",
      options: [
        "Financial institution first, then Bank of Ghana, then legal action if needed.",
        "BoG first, then the institution.",
        "Your lawyer immediately.",
        "Social media to pressure them.",
      ],
      correctIndex: 0,
      explanation: "Start with the institution. If unsatisfied, escalate to BoG. Legal action is last resort.",
      did_you_know: "Most complaints are resolved at the institution level with clear documentation.",
    },
    {
      id: "qz_mod07-fraud-02_005",
      question: "Which consumer right applies when a financial product was mis-sold to you?",
      options: [
        "Right to fair treatment and accurate information—clear, truthful disclosure about financial products.",
        "Right to free money if you complain.",
        "Right to cancel any contract within 2 years.",
        "Right to unlimited compensation for inconvenience.",
      ],
      correctIndex: 0,
      explanation: "Mis-selling violates your right to fair treatment and accurate information.",
      did_you_know: "The BoG Consumer Help Desk handles complaints about banks, SDIs, microfinance, and payment providers.",
    }
  ],

  "mod07-fraud-03": [
    {
      id: "qz_mod07-fraud-03_001",
      question: "What does \"Phishing\" mean?",
      options: [
        "A fraudulent attempt to obtain sensitive information by pretending to be a trustworthy entity via email, SMS, or phone.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Phishing\" is defined as: A fraudulent attempt to obtain sensitive information by pretending to be a trustworthy entity via email, SMS, or phone.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod07-fraud-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana's Data Protection Commission received over 1,500 data breach reports in 2024 --- up 40% from 2023. Your financial data is a prime target.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana's Data Protection Commission received over 1,500 data breach reports in 2024 --- up 40% from 2023. Your financial data is a prime target.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod07-fraud-03_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Screenshots of financial information shared on social media can expose account numbers, balances, and other sensitive data. Cropped images can ofte...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Screenshots of financial information shared on social media can expose account numbers, balances, and other sensitive data. Cropped images can ofte...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod07-fraud-03_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Set up transaction alerts on all your accounts. If you receive an alert for a transaction you didn't make, contact your bank immediately. Early rep...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Set up transaction alerts on all your accounts. If you receive an alert for a transaction you didn't make, contact your bank immediately. Early rep...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod07-fraud-03_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Your financial data --- account numbers, PINs, passwords, transaction history --- is valuable to fraudsters",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Your financial data --- account numbers, PINs, passwords, transaction history --- is valuable to fraudsters. Protecting it is as important as protecting your physical wallet.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-08: Credit ---------------------------------------------------------------

  "mod08-credit-01": [
    {
      id: "qz_mod08-credit-01_001",
      question: "What does \"APR (Annual Percentage Rate)\" mean?",
      options: [
        "The total yearly cost of borrowing including interest and fees. Always compare APRs when shopping for credit.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"APR (Annual Percentage Rate)\" is defined as: The total yearly cost of borrowing including interest and fees. Always compare APRs when shopping for credit.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-01_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Credit is a powerful tool when used wisely --- but Ghana's non-performing loan ratio stood at 21.8% in 2024 (BoG), indicating many borrowers struggle...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Credit is a powerful tool when used wisely --- but Ghana's non-performing loan ratio stood at 21.8% in 2024 (BoG), indicating many borrowers struggle...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod08-credit-01_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Avoid borrowing for depreciating assets (cars, electronics, clothes) unless absolutely necessary. By the time you finish paying, the item is worth ...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Avoid borrowing for depreciating assets (cars, electronics, clothes) unless absolutely necessary. By the time you finish paying, the item is worth ...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod08-credit-01_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Before borrowing, ask: Is this for something that will grow in value or generate income? Can I comfortably afford the monthly payments? What happen...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Before borrowing, ask: Is this for something that will grow in value or generate income? Can I comfortably afford the monthly payments? What happen...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-01_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Credit means borrowing money with a promise to repay later, usually with interest",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Credit means borrowing money with a promise to repay later, usually with interest. Used wisely, credit helps you achieve goals like buying a home, starting a business, or handling emergencies. Used...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod08-credit-02": [
    {
      id: "qz_mod08-credit-02_001",
      question: "What does \"APR (Annual Percentage Rate)\" mean?",
      options: [
        "The annual cost of borrowing including interest and all fees. Required by Bank of Ghana regulations for transparent l...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"APR (Annual Percentage Rate)\" is defined as: The annual cost of borrowing including interest and all fees. Required by Bank of Ghana regulations for transparent lending.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-02_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "A difference of just 5% in interest rate on a GHS 50,000 loan over 5 years means GHS 7,500 more in interest payments.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: A difference of just 5% in interest rate on a GHS 50,000 loan over 5 years means GHS 7,500 more in interest payments.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod08-credit-02_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Late payment fees can add significantly to your loan cost. A GHS 50 late fee on a GHS 1,000 monthly payment equals an extra 60% APR if it happens e...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Late payment fees can add significantly to your loan cost. A GHS 50 late fee on a GHS 1,000 monthly payment equals an extra 60% APR if it happens e...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod08-credit-02_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "When comparing loans, ONLY compare APR. Ignore flat rates, monthly rates, or weekly rates --- they are designed to confuse. The APR includes all fees...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: When comparing loans, ONLY compare APR. Ignore flat rates, monthly rates, or weekly rates --- they are designed to confuse. The APR includes all fees...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-02_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Interest is the cost of borrowing money",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Interest is the cost of borrowing money. The interest rate determines how much extra you pay. Even small differences in rates can mean thousands of cedis over the life of a loan.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod08-credit-03": [
    {
      id: "qz_mod08-credit-03_001",
      question: "What does \"Credit Bureau\" mean?",
      options: [
        "An organisation that collects and maintains credit information on individuals and businesses. Lenders use this data t...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Credit Bureau\" is defined as: An organisation that collects and maintains credit information on individuals and businesses. Lenders use this data to assess creditworthiness.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-03_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana's Credit Reporting Act, 2007 (Act 726) established a credit reporting system. Your credit history affects loan approval, interest rates, and ...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana's Credit Reporting Act, 2007 (Act 726) established a credit reporting system. Your credit history affects loan approval, interest rates, and ...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod08-credit-03_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Debt recovery agencies operate in Ghana. If you default, they can: report you to credit bureaus (ruining your credit for 6+ years), obtain a court ...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Debt recovery agencies operate in Ghana. If you default, they can: report you to credit bureaus (ruining your credit for 6+ years), obtain a court ...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod08-credit-03_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "The 20/30/50 rule: no more than 20% of your net income on debt repayment, no more than 30% on housing (if renting or paying mortgage), and 50% mini...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: The 20/30/50 rule: no more than 20% of your net income on debt repayment, no more than 30% on housing (if renting or paying mortgage), and 50% mini...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-03_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Your credit history is a record of how you've borrowed and repaid money",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Your credit history is a record of how you've borrowed and repaid money. A good credit score makes borrowing easier and cheaper. A bad score can block you from loans entirely.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod08-credit-04": [
    {
      id: "qz_mod08-credit-04_001",
      question: "What does \"Mortgage\" mean?",
      options: [
        "A loan secured against property, typically with terms of 10--25 years. The property can be repossessed if payments are...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Mortgage\" is defined as: A loan secured against property, typically with terms of 10--25 years. The property can be repossessed if payments are not made.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-04_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "The average home loan in Ghana is GHS 250,000--500,000 with interest rates between 25--32% APR. A mortgage is typically the largest financial commitm...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: The average home loan in Ghana is GHS 250,000--500,000 with interest rates between 25--32% APR. A mortgage is typically the largest financial commitm...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod08-credit-04_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Defaulting on a mortgage means losing the property. The bank can repossess and sell it. You may still owe the difference if the sale price is less ...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Defaulting on a mortgage means losing the property. The bank can repossess and sell it. You may still owe the difference if the sale price is less ...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod08-credit-04_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Before applying for a mortgage: save at least 30% of the property value as deposit, reduce other debts to improve your debt-to-income ratio, gather...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Before applying for a mortgage: save at least 30% of the property value as deposit, reduce other debts to improve your debt-to-income ratio, gather...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod08-credit-04_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "A mortgage is a loan specifically for buying property",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: A mortgage is a loan specifically for buying property. The property itself serves as collateral. Mortgages have longer terms (10--25 years) than other loans, making monthly payments more affordable ...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  // --- MOD-09: International ---------------------------------------------------------

  "mod09-intl-01": [
    {
      id: "qz_mod09-intl-01_001",
      question: "What does \"Exchange Rate\" mean?",
      options: [
        "The price of one currency in terms of another. Fluctuates based on supply and demand, economic conditions, and govern...",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Exchange Rate\" is defined as: The price of one currency in terms of another. Fluctuates based on supply and demand, economic conditions, and government policy.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod09-intl-01_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "The Ghana cedi depreciated by approximately 20% against the US dollar in 2024, making it one of the most volatile currencies in West Africa.",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: The Ghana cedi depreciated by approximately 20% against the US dollar in 2024, making it one of the most volatile currencies in West Africa.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod09-intl-01_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Avoid street currency exchangers ('black market'). You risk counterfeit notes, robbery, or being reported to police. Use licensed forex bureaus or ...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Avoid street currency exchangers ('black market'). You risk counterfeit notes, robbery, or being reported to police. Use licensed forex bureaus or ...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod09-intl-01_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "For large transfers, use the mid-market rate (Google rate) as a benchmark. If a provider offers a rate more than 3% away from the mid-market rate, ...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: For large transfers, use the mid-market rate (Google rate) as a benchmark. If a provider offers a rate more than 3% away from the mid-market rate, ...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod09-intl-01_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Exchange rates determine how much your cedi is worth in other currencies",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Exchange rates determine how much your cedi is worth in other currencies. Understanding what drives the cedi's value helps you make better decisions about saving, spending, and investing.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],

  "mod09-intl-02": [
    {
      id: "qz_mod09-intl-02_001",
      question: "What does \"Remittance\" mean?",
      options: [
        "Money sent by a person working abroad to their home country. Ghana is one of Africa's largest remittance recipients.",
        "A type of bank account",
        "A government regulation",
        "An investment strategy",
      ],
      correctIndex: 0,
      explanation: "\"Remittance\" is defined as: Money sent by a person working abroad to their home country. Ghana is one of Africa's largest remittance recipients.",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod09-intl-02_002",
      question: "According to the lesson, what financial statistic is mentioned?",
      options: [
        "Ghana received over $4.6 billion in diaspora remittances in 2023 --- the largest source of foreign exchange after gold, exceeding both cocoa and oil ...",
        "This information is not provided",
        "The opposite of what is stated",
        "An unrelated statistic",
      ],
      correctIndex: 0,
      explanation: "The lesson states: Ghana received over $4.6 billion in diaspora remittances in 2023 --- the largest source of foreign exchange after gold, exceeding both cocoa and oil ...",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    },
    {
      id: "qz_mod09-intl-02_003",
      question: "What warning does this lesson give to financial consumers?",
      options: [
        "Beware of advance-fee fraud: people claiming to hold funds abroad who ask you to pay 'release fees' or 'clearance charges.' Legitimate transfers ne...",
        "There are no risks in financial products",
        "All financial advice is always correct",
        "You should never save money",
      ],
      correctIndex: 0,
      explanation: "The warning states: Beware of advance-fee fraud: people claiming to hold funds abroad who ask you to pay 'release fees' or 'clearance charges.' Legitimate transfers ne...",
      did_you_know: "Applying this knowledge in your daily life can significantly improve your financial well-being.",
    },
    {
      id: "qz_mod09-intl-02_004",
      question: "Which of the following is a recommended tip from this lesson?",
      options: [
        "Compare the 'total cost' --- how many cedis the recipient actually gets. The provider that gives the most cedis for your dollars (or vice versa) is t...",
        "Always ignore professional financial advice",
        "Spend all your income as soon as you receive it",
        "Avoid learning about financial products",
      ],
      correctIndex: 0,
      explanation: "The lesson recommends: Compare the 'total cost' --- how many cedis the recipient actually gets. The provider that gives the most cedis for your dollars (or vice versa) is t...",
      did_you_know: "Regular review of financial concepts helps reinforce good money habits.",
    },
    {
      id: "qz_mod09-intl-02_005",
      question: "Which statement best describes the main concept of this lesson?",
      options: [
        "Whether you're receiving money from abroad or sending money overseas, choosing the right method can save you significant fees and give you a better...",
        "The opposite of what is described in the lesson",
        "An unrelated concept from another financial topic",
        "A common myth about personal finance",
      ],
      correctIndex: 0,
      explanation: "The lesson explains: Whether you're receiving money from abroad or sending money overseas, choosing the right method can save you significant fees and give you a better exchange rate.",
      did_you_know: "Understanding these concepts can help you make better financial decisions.",
    }
  ],


  "mod09-intl-03": [
    {
      id: "qz_mod09-intl-03_001",
      question: "The Ghana diaspora is over 3 million people, sending $4.6 billion in remittances in 2023. What trend does the lesson highlight?",
      options: [
        "The diaspora is increasingly looking to invest back home beyond just sending remittances.",
        "Remittances are declining as diaspora members move back to Ghana.",
        "Diaspora investment is limited to real estate only.",
        "Most diaspora members have no interest in Ghanaian investments.",
      ],
      correctIndex: 0,
      explanation: "The lesson highlights a shift from purely sending remittances toward active investment in Ghana’s growth.",
      did_you_know: "Diaspora bonds and special investment products have been created to channel diaspora savings into national development.",
    },
    {
      id: "qz_mod09-intl-03_002",
      question: "Which accounts/docs does a Ghanaian abroad need to invest in Ghanaian stocks?",
      options: [
        "A non-resident Ghana cedi account (Nostro), a TIN, and a CDS (Central Securities Depository) account.",
        "A Ghanaian passport only.",
        "A work permit from GIPC.",
        "A letter from their employer abroad.",
      ],
      correctIndex: 0,
      explanation: "To invest from abroad: open a non-resident GHS account, get a TIN, open a CDS account, choose a licensed broker.",
      did_you_know: "You can manage all these remotely through most Ghanaian banks’ diaspora banking units.",
    },
    {
      id: "qz_mod09-intl-03_003",
      question: "Which investment option is specifically designed for Ghanaians abroad?",
      options: [
        "Diaspora bonds—government securities aimed at the diaspora, often with minimum investments under $1,000.",
        "Regular fixed deposits at any local bank.",
        "Cryptocurrency mining pools.",
        "Foreign currency accounts outside Ghana.",
      ],
      correctIndex: 0,
      explanation: "Diaspora bonds are government securities specifically marketed to the diaspora with accessible minimums.",
      did_you_know: "Ghana has issued several diaspora bonds, including the ‘Ghana Diaspora Bond’ for infrastructure projects.",
    },
    {
      id: "qz_mod09-intl-03_004",
      question: "What is a key challenge diaspora investors face?",
      options: [
        "Finding reliable local partners, navigating regulations remotely, and managing GHS currency risk.",
        "Lack of investment options in Ghana.",
        "Prohibition against foreign ownership of Ghanaian assets.",
        "Requirement to live in Ghana to own shares.",
      ],
      correctIndex: 0,
      explanation: "Key challenges: reliable partners, remote regulatory navigation, and currency depreciation risk.",
      did_you_know: "Some diaspora investors hedge currency risk with USD-denominated instruments or export businesses.",
    },
    {
      id: "qz_mod09-intl-03_005",
      question: "Which statement about diaspora investments in Ghana is TRUE?",
      options: [
        "The government and private sector offer several diaspora-targeted options: bonds, real estate, and stocks.",
        "Only Ghanaian residents can invest in the stock market.",
        "Diaspora investors are exempt from all taxes on returns.",
        "All diaspora investments require a minimum of $100,000.",
      ],
      correctIndex: 0,
      explanation: "Multiple diaspora-targeted options exist across bonds, real estate, and equities at various entry points.",
      did_you_know: "The GIPC has a dedicated Diaspora Desk to facilitate investments from abroad.",
    }
  ],
};

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
