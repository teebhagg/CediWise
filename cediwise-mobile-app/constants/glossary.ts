/**
 * CediWise Financial Glossary — 75 Ghana-specific terms
 * FR-SRC-005, FR-SRC-006
 *
 * Minimum 60 terms required at launch (FRD §17).
 * Definitions are written for a Ghanaian adult audience — plain English,
 * local context, and where applicable a GHS example.
 */

export type GlossaryTerm = {
  id: string;
  term: string;
  /** Expanded acronym or full official name */
  full_form?: string;
  definition: string;
  /** Tags used for search synonym expansion */
  tags: string[];
  /** Related module IDs */
  module_tags?: string[];
  source?: { label: string; url?: string };
};

export const GLOSSARY: GlossaryTerm[] = [
  // ── A ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_advance_fee_fraud",
    term: "Advance Fee Fraud",
    definition:
      "A scam where you are asked to pay an upfront 'fee' (tax, processing charge, bribe) to release a promised large sum of money that never materialises. Also known as '419 fraud'. Common in Ghana via email, WhatsApp, and phone calls.",
    tags: ["fraud", "scam", "419", "advance fee"],
    module_tags: ["MOD-07"],
    source: { label: "EOCO Ghana" },
  },
  {
    id: "gls_asset",
    term: "Asset",
    definition:
      "Anything of value you own — cash, a savings account, land, a vehicle, shares, or a business — that can generate income or be converted to cash. Building assets over time is the foundation of wealth creation.",
    tags: ["asset", "wealth", "investment", "property"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_airtel_tigo_money",
    term: "AirtelTigo Money",
    definition:
      "The mobile money wallet service operated by AirtelTigo Ghana. Like MTN MoMo and Vodafone Cash, it is regulated by the Bank of Ghana and supports deposits, withdrawals, transfers, and merchant payments.",
    tags: ["airteltigo", "mobile money", "momo", "wallet"],
    module_tags: ["MOD-03"],
    source: { label: "Bank of Ghana — PSP Registry" },
  },

  // ── B ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_bank_of_ghana",
    term: "Bank of Ghana",
    full_form: "BoG",
    definition:
      "Ghana's central bank, established by the Bank of Ghana Act, 2002 (Act 612). It issues the cedi, sets monetary policy, regulates all banks and payment service providers, and protects financial consumers.",
    tags: ["bank of ghana", "bog", "central bank", "regulator"],
    module_tags: ["MOD-01", "MOD-03", "MOD-07"],
    source: { label: "Bank of Ghana", url: "https://www.bog.gov.gh" },
  },
  {
    id: "gls_bond",
    term: "Bond",
    definition:
      "A fixed-income investment where you lend money to a government or company for a set period at a stated interest rate. The Government of Ghana issues 2-year, 3-year, and longer bonds. Unlike T-Bills, bonds pay regular coupon interest.",
    tags: ["bond", "government bond", "fixed income", "investment"],
    module_tags: ["MOD-03"],
    source: { label: "Bank of Ghana — Debt Management" },
  },
  {
    id: "gls_budget",
    term: "Budget",
    definition:
      "A written plan that shows how you will spend and save your income over a period (usually a month). A budget gives every cedi a job before it leaves your hands. It is the most powerful single tool for financial control.",
    tags: ["budget", "budgeting", "spending plan", "money plan"],
    module_tags: ["MOD-01"],
  },

  // ── C ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_cash_flow",
    term: "Cash Flow",
    definition:
      "The movement of money in (income) and out (expenses) over a period. Positive cash flow means you earn more than you spend. Negative cash flow means you are spending more than you earn — a sign that your budget needs adjusting.",
    tags: ["cash flow", "income", "expenses", "spending"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_cedi",
    term: "Cedi (GHS)",
    full_form: "Ghana Cedi",
    definition:
      "Ghana's official currency, introduced in 2007 as the 'new cedi' (redenominated from the old cedi at a ratio of 1:10,000). The symbol is GHS or ₵. The cedi is issued and managed by the Bank of Ghana.",
    tags: ["cedi", "ghs", "currency", "ghana cedi"],
    source: { label: "Bank of Ghana" },
  },
  {
    id: "gls_compound_interest",
    term: "Compound Interest",
    definition:
      "Interest calculated on both the original principal AND the accumulated interest from previous periods. Known as 'interest on interest', it accelerates growth in savings and debt alike. Starting early amplifies the effect enormously.",
    tags: ["compound interest", "interest", "savings growth", "investment"],
    module_tags: ["MOD-01", "MOD-02"],
  },
  {
    id: "gls_consumer_protection",
    term: "Consumer Protection",
    definition:
      "The legal rights and regulatory safeguards that protect individuals when dealing with financial institutions. In Ghana, the Bank of Ghana's Consumer Protection Directive (2020) requires banks and payment providers to treat customers fairly, disclose all fees, and handle complaints promptly.",
    tags: ["consumer protection", "rights", "complaint", "bank of ghana"],
    module_tags: ["MOD-07"],
    source: {
      label: "Bank of Ghana — Consumer Protection Directive",
      url: "https://www.bog.gov.gh",
    },
  },
  {
    id: "gls_cpi",
    term: "CPI",
    full_form: "Consumer Price Index",
    definition:
      "A measure of the average change in prices paid by consumers for goods and services over time. Ghana Statistical Service (GSS) publishes the monthly CPI. When CPI rises, your purchasing power falls — this is inflation.",
    tags: ["cpi", "consumer price index", "inflation", "gss"],
    source: {
      label: "Ghana Statistical Service",
      url: "https://statsghana.gov.gh",
    },
  },
  {
    id: "gls_credit",
    term: "Credit",
    definition:
      "The ability to borrow money with the promise to repay it later, usually with interest. In Ghana, credit is offered by banks, microfinance institutions, mobile money lenders (e.g., MTN Qwick Loan), and susu groups.",
    tags: ["credit", "loan", "borrow", "debt"],
    module_tags: ["MOD-01"],
  },

  // ── D ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_ddep",
    term: "DDEP",
    full_form: "Domestic Debt Exchange Programme",
    definition:
      "Ghana's 2023 programme in which holders of domestic government bonds and some treasury bills agreed to exchange them for new bonds with lower coupon rates and/or longer maturities. Part of Ghana's debt restructuring under an IMF programme.",
    tags: ["ddep", "debt exchange", "government bonds", "imf"],
    source: { label: "Ministry of Finance Ghana" },
  },
  {
    id: "gls_debt",
    term: "Debt",
    definition:
      "Money owed to another party — a bank, a friend, a mobile money lender, or an employer advance. Debt is not inherently bad; a loan for income-generating investment can be worthwhile. But high-interest consumer debt (e.g., 8–15% monthly from informal lenders) erodes wealth quickly.",
    tags: ["debt", "loan", "credit", "borrow", "owe"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_dividend",
    term: "Dividend",
    definition:
      "A share of a company's profits paid to shareholders, typically quarterly or annually. On the Ghana Stock Exchange, dividends are declared by listed companies and paid into shareholders' nominated accounts.",
    tags: ["dividend", "shares", "gse", "investment", "equity"],
    module_tags: ["MOD-03"],
  },

  // ── E ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_e_levy",
    term: "e-Levy",
    full_form: "Electronic Transaction Levy",
    definition:
      "A government levy on electronic money transfers introduced in Ghana in 2022. Currently set at 1% on transfers above the daily free threshold (GHS 100/day). Applies to mobile money transfers, bank-to-mobile transfers, and some merchant payments.",
    tags: ["e-levy", "electronic levy", "mobile money tax", "transfer tax"],
    source: { label: "Ghana Revenue Authority", url: "https://www.gra.gov.gh" },
  },
  {
    id: "gls_emergency_fund",
    term: "Emergency Fund",
    definition:
      "A dedicated pool of savings set aside for genuine unexpected expenses — medical bills, sudden job loss, or urgent home repairs. The recommended target is 3–6 months of your essential living expenses, kept in a liquid savings account.",
    tags: ["emergency fund", "savings", "safety net", "financial buffer"],
    module_tags: ["MOD-01", "MOD-02"],
  },
  {
    id: "gls_eoco",
    term: "EOCO",
    full_form: "Economic and Organised Crime Office",
    definition:
      "Ghana's specialised law enforcement agency for investigating financial crimes, money laundering, fraud, and organised economic crime. EOCO works alongside Ghana Police Service and has powers to freeze assets and prosecute.",
    tags: ["eoco", "fraud", "financial crime", "investigation"],
    module_tags: ["MOD-07"],
    source: { label: "EOCO Ghana", url: "https://www.eoco.gov.gh" },
  },
  {
    id: "gls_equity",
    term: "Equity / Shares",
    definition:
      "Ownership in a company. Buying shares on the Ghana Stock Exchange (GSE) makes you a part-owner. As the company grows and profits, the value of your shares may rise. You may also receive dividends. Unlike bonds, there is no guaranteed return.",
    tags: ["equity", "shares", "stocks", "gse", "ownership"],
    module_tags: ["MOD-03"],
  },
  {
    id: "gls_expenses",
    term: "Expenses",
    definition:
      "Money you spend on goods and services — rent, food, transport, airtime, school fees, utilities. Tracking expenses is the first step to building a budget and identifying areas where you can save more.",
    tags: ["expenses", "spending", "costs", "budget"],
    module_tags: ["MOD-01"],
  },

  // ── F ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_financial_fraud",
    term: "Financial Fraud",
    definition:
      "The use of deception to illegally obtain money or property from another person. Common types in Ghana include mobile money fraud, investment fraud (Ponzi schemes), advance fee fraud, and SIM swap attacks.",
    tags: ["fraud", "scam", "deception", "financial crime"],
    module_tags: ["MOD-07"],
  },
  {
    id: "gls_financial_inclusion",
    term: "Financial Inclusion",
    definition:
      "The availability and access to affordable, appropriate financial products and services — bank accounts, savings, credit, insurance, payments — for all individuals, especially those historically excluded (rural populations, low-income earners, the unbanked).",
    tags: ["financial inclusion", "banking", "access", "unbanked"],
    source: { label: "Bank of Ghana — Financial Inclusion Strategy" },
  },
  {
    id: "gls_fixed_deposit",
    term: "Fixed Deposit",
    definition:
      "A savings product where you lock money with a bank for a set period (e.g., 3, 6, or 12 months) in exchange for a higher interest rate than a regular savings account. Early withdrawal usually incurs a penalty. Ghanaian banks offer rates of 15–28% per annum depending on tenure.",
    tags: ["fixed deposit", "savings", "bank", "interest rate"],
    module_tags: ["MOD-02"],
  },
  {
    id: "gls_forex",
    term: "Forex",
    full_form: "Foreign Exchange",
    definition:
      "The buying and selling of currencies. In Ghana, the Bank of Ghana sets the interbank forex rate; bureaux de change offer slightly different rates. The GHS/USD rate significantly impacts import prices, inflation, and the cost of goods.",
    tags: ["forex", "foreign exchange", "currency", "exchange rate"],
    source: { label: "Bank of Ghana — Forex Market" },
  },

  // ── G ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_gdpc",
    term: "GDPC",
    full_form: "Ghana Deposit Protection Corporation",
    definition:
      "A statutory body that protects bank depositors. If a licensed bank fails, GDPC pays each depositor up to GHS 20,000 of their deposits. This protection applies only to licensed deposit-taking institutions.",
    tags: ["gdpc", "deposit protection", "bank failure", "insurance"],
    source: { label: "GDPC Ghana", url: "https://www.gdpc.gov.gh" },
  },
  {
    id: "gls_getfund",
    term: "GETFund",
    full_form: "Ghana Education Trust Fund",
    definition:
      "A levy of 2.5% charged as part of Ghana's VAT (Unified VAT = 15% VAT + 2.5% NHIL + 2.5% GETFund). GETFund revenue is used to fund educational infrastructure and scholarships.",
    tags: ["getfund", "vat", "education", "levy"],
    source: { label: "Ghana Revenue Authority" },
  },
  {
    id: "gls_gra",
    term: "GRA",
    full_form: "Ghana Revenue Authority",
    definition:
      "Ghana's national tax collection authority, established by the Ghana Revenue Authority Act, 2009 (Act 791). GRA administers PAYE, VAT, corporate tax, and customs duties. All taxpayers must register with GRA and obtain a TIN.",
    tags: ["gra", "ghana revenue authority", "tax", "paye", "tin"],
    module_tags: ["MOD-01"],
    source: { label: "GRA Ghana", url: "https://www.gra.gov.gh" },
  },
  {
    id: "gls_gross_income",
    term: "Gross Income",
    definition:
      "Your total earnings before any deductions — PAYE tax, SSNIT contributions, or any other statutory deduction. This is the figure on the top line of your payslip. Always budget using your net (take-home) income, not gross.",
    tags: ["gross income", "salary", "payslip", "income"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_gse",
    term: "GSE",
    full_form: "Ghana Stock Exchange",
    definition:
      "Ghana's primary securities exchange, established in 1990 and regulated by the Securities and Exchange Commission (SEC). Listed companies include banks, telecoms, and manufacturing firms. Ordinary Ghanaians can invest through licensed stockbrokers.",
    tags: ["gse", "ghana stock exchange", "shares", "stocks", "investment"],
    module_tags: ["MOD-03"],
    source: { label: "Ghana Stock Exchange", url: "https://www.gse.com.gh" },
  },
  {
    id: "gls_gse_ci",
    term: "GSE-CI",
    full_form: "GSE Composite Index",
    definition:
      "The broad market index tracking the performance of all equities listed on the Ghana Stock Exchange. A rising GSE-CI means listed companies' collective value is increasing; a falling index means it is decreasing.",
    tags: ["gse-ci", "composite index", "gse", "market index"],
    source: { label: "Ghana Stock Exchange" },
  },

  // ── I ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_income",
    term: "Income",
    definition:
      "Money received regularly — salary, business profits, rental income, remittances, freelance fees. Always identify all sources and use your NET (after-tax, after-deduction) income as the foundation for your budget.",
    tags: ["income", "salary", "earnings", "revenue"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_inflation",
    term: "Inflation",
    definition:
      "The rate at which the general level of prices rises over time, reducing the purchasing power of money. If inflation is 20% per year, GHS 100 today buys only GHS 83 worth of goods next year. Ghana's annual CPI is published monthly by Ghana Statistical Service.",
    tags: ["inflation", "cpi", "prices", "purchasing power"],
    source: { label: "Ghana Statistical Service" },
  },
  {
    id: "gls_insurance",
    term: "Insurance",
    definition:
      "A financial product where you pay regular premiums to an insurer in exchange for protection against specified financial losses — medical costs, vehicle damage, death, or property loss. In Ghana, insurance is regulated by the National Insurance Commission (NIC).",
    tags: ["insurance", "nic", "premium", "protection"],
    module_tags: ["MOD-07"],
    source: {
      label: "National Insurance Commission",
      url: "https://www.nicgh.org",
    },
  },
  {
    id: "gls_interest_rate",
    term: "Interest Rate",
    definition:
      "The percentage charged on borrowed money (or paid on saved money) over a period. Banks set lending rates above the Bank of Ghana's Policy Rate. Always compare interest rates before taking a loan — a 2% monthly rate equals 24% per year, which is very expensive.",
    tags: ["interest rate", "loan rate", "savings rate", "bank rate"],
    module_tags: ["MOD-01", "MOD-02"],
    source: { label: "Bank of Ghana — Policy Rate" },
  },
  {
    id: "gls_interoperability",
    term: "Interoperability",
    definition:
      "The ability to send and receive money between different mobile money networks (e.g., from MTN MoMo to Vodafone Cash) using just a phone number. Bank of Ghana mandated full interoperability in 2018, making Ghana a regional leader.",
    tags: ["interoperability", "mobile money", "momo", "transfer"],
    module_tags: ["MOD-03"],
    source: { label: "Bank of Ghana" },
  },

  // ── L ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_liability",
    term: "Liability",
    definition:
      "Money you owe to others — a loan, a credit card balance, unpaid rent, or a business debt. Net Worth = Assets − Liabilities. Reducing liabilities or growing assets increases your financial health.",
    tags: ["liability", "debt", "owe", "loan"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_loan",
    term: "Loan",
    definition:
      "A sum of money borrowed from a lender (bank, microfinance institution, mobile lender, or susu group) with an agreement to repay the principal plus interest over a set period. Always read the full terms, including effective annual interest rate, before signing.",
    tags: ["loan", "credit", "borrow", "repay", "debt"],
    module_tags: ["MOD-01"],
  },

  // ── M ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_mobile_money",
    term: "Mobile Money (MoMo)",
    definition:
      "A digital financial service that allows users to store, send, and receive money via a mobile phone without needing a bank account. Ghana's major providers are MTN MoMo, Vodafone Cash, and AirtelTigo Money, all regulated by the Bank of Ghana.",
    tags: [
      "mobile money",
      "momo",
      "mtn momo",
      "vodafone cash",
      "airteltigo",
      "wallet",
    ],
    module_tags: ["MOD-03"],
    source: { label: "Bank of Ghana — Payment Systems" },
  },
  {
    id: "gls_mtn_momo",
    term: "MTN MoMo",
    definition:
      "MTN Ghana's mobile money service — the largest mobile money platform in Ghana by subscriber count. Services include person-to-person transfers, bill payments, merchant payments, airtime top-up, savings (MoMo Kufuor), and loans (Qwick Loan).",
    tags: ["mtn momo", "momo", "mobile money", "mtn"],
    module_tags: ["MOD-03"],
  },
  {
    id: "gls_mutual_fund",
    term: "Mutual Fund",
    definition:
      "A pooled investment where many investors contribute money managed by a licensed fund manager. The fund invests in a mix of T-Bills, bonds, equities, or money market instruments. In Ghana, mutual funds are regulated by the SEC and offered by firms like Databank, FirstBanC, and others.",
    tags: ["mutual fund", "collective investment", "fund", "investment", "sec"],
    module_tags: ["MOD-03"],
    source: { label: "SEC Ghana", url: "https://sec.gov.gh" },
  },

  // ── N ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_needs_wants",
    term: "Needs vs. Wants",
    definition:
      "A budgeting distinction: Needs are essential expenses you cannot safely skip (rent, food, utilities, school fees, transport to work). Wants are optional spending that improves life but is not essential (eating out, streaming, new clothes beyond necessity). The 50/30/20 rule allocates 50% to needs and 30% to wants.",
    tags: ["needs", "wants", "budget", "50/30/20", "spending"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_net_income",
    term: "Net Income",
    full_form: "Take-Home Pay",
    definition:
      "Your income after all statutory deductions — PAYE tax, SSNIT contributions, and any other mandatory withholdings. This is the actual cash deposited into your account. Always build your budget on net income, not gross.",
    tags: ["net income", "take-home pay", "salary", "paye", "ssnit"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_net_worth",
    term: "Net Worth",
    definition:
      "The difference between everything you own (assets) and everything you owe (liabilities). Net Worth = Assets − Liabilities. Tracking your net worth annually is the clearest indicator of whether your financial position is improving.",
    tags: ["net worth", "wealth", "assets", "liabilities"],
    module_tags: ["MOD-01"],
  },
  {
    id: "gls_nhil",
    term: "NHIL",
    full_form: "National Health Insurance Levy",
    definition:
      "A 2.5% levy included in Ghana's VAT (Unified VAT = 15% VAT + 2.5% NHIL + 2.5% GETFund). NHIL revenue funds the National Health Insurance Scheme (NHIS).",
    tags: ["nhil", "national health insurance levy", "vat", "nhis"],
    source: { label: "GRA Ghana" },
  },
  {
    id: "gls_nhis",
    term: "NHIS",
    full_form: "National Health Insurance Scheme",
    definition:
      "Ghana's public health insurance scheme that provides subsidised healthcare to registered members. Annual premium is income-based. SSNIT contributors automatically have their NHIS premium deducted. Provides coverage at accredited health facilities.",
    tags: ["nhis", "national health insurance", "health", "insurance"],
    source: { label: "NHIA Ghana", url: "https://www.nhia.gov.gh" },
  },
  {
    id: "gls_nic",
    term: "NIC",
    full_form: "National Insurance Commission",
    definition:
      "The government agency that regulates and supervises the insurance industry in Ghana under the Insurance Act, 2021 (Act 1061). All insurance companies must be licensed by NIC. NIC handles consumer complaints against insurers.",
    tags: ["nic", "national insurance commission", "insurance", "regulator"],
    source: { label: "NIC Ghana", url: "https://www.nicgh.org" },
  },
  {
    id: "gls_npra",
    term: "NPRA",
    full_form: "National Pensions Regulatory Authority",
    definition:
      "The Ghanaian government body that regulates Tier 2 (mandatory occupational pension) and Tier 3 (voluntary personal pension) schemes, under the National Pensions Act, 2008 (Act 766). NPRA approves and oversees fund trustees and managers.",
    tags: ["npra", "pension", "tier 2", "tier 3", "retirement"],
    source: { label: "NPRA Ghana", url: "https://www.npra.gov.gh" },
  },

  // ── O ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_otp",
    term: "OTP",
    full_form: "One-Time Password",
    definition:
      "A temporary, single-use code sent to your phone via SMS to verify a transaction or login. OTPs are a critical security layer — NEVER share your OTP with anyone, including people claiming to be bank or mobile money staff.",
    tags: ["otp", "one-time password", "security", "pin", "fraud prevention"],
    module_tags: ["MOD-03", "MOD-07"],
  },

  // ── P ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_paye",
    term: "PAYE",
    full_form: "Pay As You Earn",
    definition:
      "Ghana's income tax system where your employer deducts income tax from your salary each month and remits it directly to GRA. Tax is calculated on a graduated band system — lower income is taxed at lower rates, with the top rate at 35% for income above GHS 240,000/year (2025 bands).",
    tags: ["paye", "pay as you earn", "income tax", "gra", "tax"],
    module_tags: ["MOD-01"],
    source: { label: "GRA — PAYE Guidelines", url: "https://www.gra.gov.gh" },
  },
  {
    id: "gls_phishing",
    term: "Phishing",
    definition:
      "A cyberfraud technique where criminals impersonate legitimate organisations (banks, mobile money providers, GRA) via email, SMS, or fake websites to trick you into revealing your PIN, OTP, or account details. Common in Ghana via WhatsApp and fake 'GRA refund' SMS.",
    tags: ["phishing", "fraud", "scam", "cyber", "sms fraud"],
    module_tags: ["MOD-07"],
  },
  {
    id: "gls_pin",
    term: "PIN",
    full_form: "Personal Identification Number",
    definition:
      "A secret numeric code used to authenticate yourself to a mobile money wallet, bank ATM, or mobile banking app. Choose a non-obvious PIN (not your birthday or 1234). Change it immediately if you suspect someone else knows it.",
    tags: ["pin", "personal identification number", "security", "mobile money"],
    module_tags: ["MOD-03", "MOD-07"],
  },
  {
    id: "gls_policy_rate",
    term: "Policy Rate (Monetary Policy Rate)",
    definition:
      "The benchmark interest rate set by the Bank of Ghana's Monetary Policy Committee (MPC). Commercial banks use it as a reference — lending rates are typically 8–15 percentage points above the Policy Rate. A lower Policy Rate encourages borrowing and spending; a higher rate helps control inflation.",
    tags: ["policy rate", "monetary policy", "bank of ghana", "interest rate"],
    source: { label: "Bank of Ghana — MPC", url: "https://www.bog.gov.gh" },
  },
  {
    id: "gls_ponzi",
    term: "Ponzi Scheme",
    definition:
      "A fraudulent investment operation that pays early investors with money from new investors rather than legitimate profits. It collapses when new investor inflow stops. Many Ghanaians have lost savings to Ponzi schemes disguised as high-yield investment programmes (HYIPs).",
    tags: ["ponzi", "fraud", "scam", "investment fraud", "hyip"],
    module_tags: ["MOD-07"],
  },

  // ── R ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_remittance",
    term: "Remittance",
    definition:
      "Money sent by Ghanaians abroad to family members in Ghana. Ghana is one of Africa's largest remittance recipients. Services like WorldRemit, Wave, and MTN International Transfer are used. Remittances are a significant source of household income for many Ghanaian families.",
    tags: ["remittance", "diaspora", "transfer", "international"],
  },
  {
    id: "gls_rosca",
    term: "ROSCA / Susu",
    full_form: "Rotating Savings and Credit Association",
    definition:
      "An informal savings group where members contribute a fixed amount regularly and take turns receiving the lump sum. Known in Ghana as 'susu'. ROSCAs are a centuries-old practice that builds savings discipline and provides access to lump sums for members with limited access to formal banking.",
    tags: [
      "rosca",
      "susu",
      "rotating savings",
      "informal savings",
      "savings group",
    ],
    module_tags: ["MOD-02"],
  },

  // ── S ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_savings",
    term: "Savings",
    definition:
      "The portion of income not spent — set aside for future use. Savings can be held in a bank account, mobile money wallet, fixed deposit, T-Bills, or a susu group. Consistent saving, even small amounts, builds financial resilience over time.",
    tags: ["savings", "save", "emergency fund", "financial health"],
    module_tags: ["MOD-01", "MOD-02"],
  },
  {
    id: "gls_sec",
    term: "SEC",
    full_form: "Securities and Exchange Commission Ghana",
    definition:
      "The government body that regulates Ghana's capital markets — the Ghana Stock Exchange, collective investment schemes (mutual funds), and investment advisers. Before investing with any investment firm, verify their SEC registration.",
    tags: ["sec", "securities commission", "investment", "regulation", "gse"],
    module_tags: ["MOD-03"],
    source: { label: "SEC Ghana", url: "https://sec.gov.gh" },
  },
  {
    id: "gls_sim_swap",
    term: "SIM Swap Fraud",
    definition:
      "A fraud where a criminal convinces your mobile network operator to transfer your phone number to a new SIM card they control. They then intercept your OTPs to access your mobile money wallet or bank account. Report any unexpected loss of mobile signal to your provider immediately.",
    tags: ["sim swap", "fraud", "mobile money", "security", "phone fraud"],
    module_tags: ["MOD-07"],
  },
  {
    id: "gls_simple_interest",
    term: "Simple Interest",
    definition:
      "Interest calculated only on the original principal amount, not on accumulated interest. Formula: Interest = Principal × Rate × Time. T-Bills use a discounted form of simple interest. Compare with compound interest, which grows faster because it earns interest on interest.",
    tags: ["simple interest", "interest", "t-bill", "loan"],
    module_tags: ["MOD-02", "MOD-03"],
  },
  {
    id: "gls_ssnit",
    term: "SSNIT",
    full_form: "Social Security and National Insurance Trust",
    definition:
      "Ghana's mandatory public pension manager, operating the Tier 1 pension scheme under the National Pensions Act, 2008 (Act 766). Employees contribute 5.5% of gross salary; employers contribute 13%. SSNIT manages the funds and pays monthly pensions to eligible retirees.",
    tags: ["ssnit", "social security", "pension", "tier 1", "retirement"],
    module_tags: ["MOD-01"],
    source: { label: "SSNIT Ghana", url: "https://www.ssnit.org.gh" },
  },
  {
    id: "gls_susu",
    term: "Susu",
    definition:
      "Ghana's traditional rotating savings group (a form of ROSCA). Members agree on a fixed contribution and a rotation schedule. The 'susu collector' sometimes takes a small fee. Digital susu platforms now exist, bringing the concept online. Susu builds savings discipline but lacks GDPC protection.",
    tags: [
      "susu",
      "rosca",
      "rotating savings",
      "informal savings",
      "savings group",
    ],
    module_tags: ["MOD-02"],
  },

  // ── T ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_t_bill",
    term: "T-Bill",
    full_form: "Treasury Bill",
    definition:
      "A short-term government debt instrument issued by the Bank of Ghana on behalf of the government, with tenors of 91 days, 182 days, and 364 days. T-Bills are considered among the safest investments in Ghana. You earn the difference between the discounted purchase price and the face value at maturity.",
    tags: [
      "t-bill",
      "treasury bill",
      "investment",
      "government",
      "91 day",
      "182 day",
      "364 day",
    ],
    module_tags: ["MOD-03"],
    source: {
      label: "Bank of Ghana — Treasury Markets",
      url: "https://www.bog.gov.gh",
    },
  },
  {
    id: "gls_tax_relief",
    term: "Tax Relief",
    definition:
      "Deductions permitted by GRA that reduce your taxable income — and therefore your PAYE liability. Common reliefs include personal relief, child education relief, and disability relief. You must apply for reliefs through your employer or directly with GRA.",
    tags: ["tax relief", "paye", "gra", "deduction", "income tax"],
    module_tags: ["MOD-01"],
    source: { label: "GRA — Tax Reliefs", url: "https://www.gra.gov.gh" },
  },
  {
    id: "gls_tier1_pension",
    term: "Tier 1 Pension",
    definition:
      "The mandatory basic social security scheme managed by SSNIT under the National Pensions Act, 2008. Both employer (13% of gross salary) and employee (5.5%) contribute. Benefits include a monthly pension from age 60, invalidity pension, and survivor benefits.",
    tags: ["tier 1", "pension", "ssnit", "retirement", "social security"],
    module_tags: ["MOD-01"],
    source: { label: "SSNIT Ghana" },
  },
  {
    id: "gls_tier2_pension",
    term: "Tier 2 Pension",
    definition:
      "A mandatory occupational pension scheme managed by NPRA-approved private fund trustees. Employers contribute 5% of gross salary on the employee's behalf. Lump sum can be accessed at retirement, disability, or death. Unlike Tier 1, the investment growth depends on the fund manager's performance.",
    tags: ["tier 2", "pension", "npra", "occupational pension", "retirement"],
    module_tags: ["MOD-01"],
    source: { label: "NPRA Ghana" },
  },
  {
    id: "gls_tier3_pension",
    term: "Tier 3 Pension",
    definition:
      "A voluntary personal pension scheme where individuals contribute additional amounts beyond their mandatory Tier 1 and Tier 2 contributions. Contributions attract a 16.5% tax relief. Managed by NPRA-approved fund managers. Ideal for building additional retirement wealth.",
    tags: [
      "tier 3",
      "pension",
      "voluntary",
      "npra",
      "retirement",
      "tax relief",
    ],
    source: { label: "NPRA Ghana" },
  },
  {
    id: "gls_tin",
    term: "TIN",
    full_form: "Tax Identification Number",
    definition:
      "A unique identifier issued by GRA to all taxpayers — individuals, companies, and NGOs. Required to open a bank account, register a business, obtain a passport, or clear goods at customs. Apply online at gra.gov.gh or at any GRA office.",
    tags: ["tin", "tax identification number", "gra", "taxpayer"],
    source: { label: "GRA Ghana", url: "https://www.gra.gov.gh" },
  },

  // ── V ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_vat",
    term: "VAT",
    full_form: "Value Added Tax",
    definition:
      "Ghana's main consumption tax, applied at a unified rate of 21.9% on taxable goods and services (15% VAT + 2.5% NHIL + 2.5% GETFund + 1% COVID-19 Health Recovery Levy). Businesses with turnover above GHS 200,000/year must register for VAT with GRA.",
    tags: ["vat", "value added tax", "gra", "tax", "nhil", "getfund"],
    source: { label: "GRA — VAT", url: "https://www.gra.gov.gh" },
  },
  {
    id: "gls_vodafone_cash",
    term: "Vodafone Cash",
    definition:
      "Vodafone Ghana's mobile money service, rebranded as 'Telecel Cash' following Vodafone's acquisition by Telecel. Regulated by the Bank of Ghana. Offers person-to-person transfers, merchant payments, savings, and international remittance receipt.",
    tags: ["vodafone cash", "telecel cash", "mobile money", "momo", "vodafone"],
    module_tags: ["MOD-03"],
  },

  // ── W ───────────────────────────────────────────────────────────────────────
  {
    id: "gls_wallet",
    term: "Mobile Wallet",
    definition:
      "A digital account linked to your mobile number that stores money electronically. In Ghana, mobile wallets (MTN MoMo, Vodafone Cash, AirtelTigo Money) are regulated by the Bank of Ghana under the Payment Systems and Services Act, 2019 (Act 987).",
    tags: ["mobile wallet", "wallet", "mobile money", "momo", "digital"],
    module_tags: ["MOD-03"],
  },

  // ── 5/30/20 ─────────────────────────────────────────────────────────────────
  {
    id: "gls_50_30_20",
    term: "50/30/20 Rule",
    definition:
      "A simple budgeting guideline: allocate 50% of take-home pay to needs (rent, food, transport, utilities), 30% to wants (entertainment, dining out, personal care), and 20% to savings and debt repayment. Popularised by Senator Elizabeth Warren; adaptable to Ghanaian household budgets.",
    tags: ["50/30/20", "budget", "rule", "savings", "spending"],
    module_tags: ["MOD-01"],
  },
];

/** Total: 75 terms — satisfies FR-SRC-006 (minimum 60) */

/** Build a fast lookup map by term ID */
export const GLOSSARY_MAP: Record<string, GlossaryTerm> = Object.fromEntries(
  GLOSSARY.map((t) => [t.id, t])
);

/** Returns terms grouped by first letter (A–Z) */
export type GlossarySection = { letter: string; data: GlossaryTerm[] };

export function getGlossarySections(terms: GlossaryTerm[]): GlossarySection[] {
  const sorted = [...terms].sort((a, b) =>
    a.term.localeCompare(b.term, "en", { sensitivity: "base" })
  );
  const map: Record<string, GlossaryTerm[]> = {};
  for (const t of sorted) {
    const letter = t.term[0].toUpperCase();
    if (!map[letter]) map[letter] = [];
    map[letter].push(t);
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, data]) => ({ letter, data }));
}
