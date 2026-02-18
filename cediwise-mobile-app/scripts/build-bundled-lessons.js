/**
 * Builds bundledLessons.json with 34 lessons in structured JSON format.
 * Run: node scripts/build-bundled-lessons.js
 * Output: content/bundledLessons.json
 */

const fs = require("fs");
const path = require("path");

const existing = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../content/bundledLessons.json"),
    "utf-8"
  )
);

// Reuse existing content with new keys where applicable
const mod01Savings02 = existing["mod02-savings-01"];
const mod01Savings01 = {
  schema_version: "1.0",
  sections: [
    {
      type: "text",
      content:
        "Saving in Ghana spans from traditional susu groups to modern bank accounts. Understanding both helps you choose the right option for your goals and lifestyle.",
    },
    { type: "heading", level: 2, content: "What is Susu?" },
    {
      type: "text",
      content:
        "Susu is a rotating savings group (ROSCA) where members contribute a fixed amount regularly and take turns receiving the lump sum. It has been used in Ghana for generations and builds discipline through peer accountability.",
    },
    {
      type: "comparison",
      left: {
        label: "Susu (informal)",
        points: [
          "No bank account needed",
          "Peer accountability",
          "Lump sum on your turn",
          "No interest earned",
          "No GDPC protection",
        ],
      },
      right: {
        label: "Bank savings",
        points: [
          "Requires account",
          "Self-discipline",
          "Access anytime",
          "Earns interest",
          "GDPC protected up to GHS 20,000",
        ],
      },
    },
    { type: "heading", level: 2, content: "When to Use Each" },
    {
      type: "callout_tip",
      content:
        "Use susu when you need a structured way to save without easy access to temptation. Use a bank when you want interest, safety, and flexibility. Many Ghanaians use both — susu for short-term goals, bank for emergency fund.",
    },
    {
      type: "example",
      title: "Abena's Approach",
      content:
        "Abena saves GHS 100/week in a susu group for school fees (lump sum in December). She also keeps GHS 2,000 in a bank savings account for emergencies. Both serve different purposes.",
    },
    { type: "divider" },
  ],
};

const mod04Mobile01 = existing["mod03-mobile-money-01"];
const mod04Mobile02 = existing["mod03-mobile-money-02"];

function stubLesson(intro, tip) {
  return {
    schema_version: "1.0",
    sections: [
      { type: "text", content: intro },
      { type: "heading", level: 2, content: "Key Points" },
      { type: "callout_tip", content: tip },
      {
        type: "text",
        content:
          "This lesson is being expanded with full content. Check back for updates or use the Financial Glossary to explore related terms.",
      },
      { type: "divider" },
    ],
  };
}

const output = {
  ...existing,
  "mod01-savings-01": mod01Savings01,
  "mod01-savings-02": mod01Savings02,
  "mod02-tax-01": stubLesson(
    "The Ghana Revenue Authority (GRA) is Ghana's national tax authority. Every taxpayer — individuals, businesses, and organisations — must register with GRA and obtain a Tax Identification Number (TIN).",
    "Your TIN is required to open a bank account, register a business, obtain a passport, or clear goods at customs. Apply online at gra.gov.gh or visit any GRA office."
  ),
  "mod02-tax-02": stubLesson(
    "PAYE (Pay As You Earn) is Ghana's income tax system. Your employer deducts tax from your salary each month based on graduated bands and remits it to GRA. Understanding the bands helps you verify your payslip.",
    "Use the PAYE/SSNIT calculator in CediWise to estimate your take-home pay and understand how deductions work."
  ),
  "mod02-tax-03": stubLesson(
    "SSNIT manages Ghana's mandatory Tier 1 pension. Both you (5.5%) and your employer (13%) contribute from your gross salary. SSNIT provides a monthly pension from age 60, invalidity benefits, and survivor benefits.",
    "Your SSNIT number is for life. Keep your contribution records — they determine your pension amount at retirement."
  ),
  "mod02-tax-04": stubLesson(
    "GRA offers several tax reliefs that reduce your taxable income — and therefore your PAYE. Common reliefs include personal relief, child education relief, and disability relief. You must apply to benefit.",
    "Check the GRA website for the full list of reliefs and how to claim them. Many employees miss out because they never apply."
  ),
  "mod02-tax-05": stubLesson(
    "VAT (Value Added Tax) applies to most goods and services in Ghana at a unified rate. SME owners with turnover above GHS 200,000 per year must register for VAT with GRA and charge it on taxable supplies.",
    "VAT registration brings compliance obligations but also allows you to reclaim VAT on business inputs. Get professional advice before registering."
  ),
  "mod03-invest-01": stubLesson(
    "Every investment carries risk. Generally, higher potential returns come with higher risk. Understanding the risk-return spectrum helps you choose investments that match your goals and comfort level.",
    "T-Bills are low risk, low return. Shares are higher risk, higher potential return. Diversification — spreading your money across different assets — reduces overall risk."
  ),
  "mod03-invest-02": stubLesson(
    "Treasury Bills (T-Bills) are short-term government debt. The Bank of Ghana issues 91-day, 182-day, and 364-day T-Bills. You buy at a discount and receive face value at maturity — the difference is your return.",
    "T-Bills are among the safest investments in Ghana. Use the T-Bill Simulator in CediWise to estimate returns."
  ),
  "mod03-invest-03": stubLesson(
    "Government bonds are longer-term debt instruments (2 years or more) that pay regular coupon interest. Unlike T-Bills, bonds provide periodic income. The Government of Ghana issues bonds through the Bank of Ghana.",
    "Bonds are suitable for investors who want steady income and can lock away funds for several years."
  ),
  "mod03-invest-04": stubLesson(
    "Mutual funds pool money from many investors and invest in a mix of T-Bills, bonds, and equities. Licensed fund managers in Ghana (e.g. Databank, FirstBanC) offer funds regulated by the SEC.",
    "Always verify that a fund manager is licensed with SEC Ghana before investing. Unlicensed schemes are often fraud."
  ),
  "mod03-invest-05": stubLesson(
    "The Ghana Stock Exchange (GSE) is where shares of listed companies are bought and sold. Investing in shares means owning a part of the company. Returns come from price appreciation and dividends.",
    "You need a licensed stockbroker to buy shares on the GSE. Never invest through unlicensed individuals or WhatsApp groups."
  ),
  "mod03-invest-06": stubLesson(
    "Insurance protects you from financial loss — medical bills, vehicle damage, death, or property loss. In Ghana, insurance is regulated by the National Insurance Commission (NIC). Premiums are the regular payments you make.",
    "Verify any insurer with NIC before buying a policy. Common products include motor, health, life, and business insurance."
  ),
  "mod04-mobile-01": mod04Mobile01,
  "mod04-mobile-02": mod04Mobile02,
  "mod04-mobile-03": stubLesson(
    "Mobile money wallets can hold savings, and some providers offer interest. Bank savings accounts also earn interest and are protected by GDPC. Compare access, interest rates, and safety before deciding.",
    "For emergency funds, keep 1–2 months in instant-access (MoMo or bank). Put the rest in a bank savings or short T-Bill for better returns."
  ),
  "mod04-mobile-04": stubLesson(
    "Digital credit — loans via mobile money (e.g. MTN Qwick Loan) — is convenient but can be expensive. Interest rates of 8–15% per month are common. Borrow only what you can repay on time.",
    "Before taking digital credit, calculate the total repayment. A GHS 500 loan at 10%/month costs GHS 50 in interest if repaid in one month."
  ),
  "mod05-sme-01": stubLesson(
    "Mixing personal and business money is one of the biggest mistakes SME owners make. It leads to unclear profitability, tax problems, and personal liability if the business fails. Open a separate business account from day one.",
    "Use one account for business income and expenses only. Pay yourself a salary or draw, and keep personal spending separate."
  ),
  "mod05-sme-02": stubLesson(
    "Cash flow is the movement of money in and out of your business. Many profitable businesses fail because they run out of cash — they cannot pay suppliers or staff when payments are delayed. Track and forecast cash flow weekly.",
    "Use the Cash Flow Tool in CediWise to project when money comes in and when it goes out. Plan for slow months."
  ),
  "mod05-sme-03": stubLesson(
    "Pricing for profit means covering all your costs — materials, labour, overhead, and your time — plus a margin. Underpricing is a common SME mistake that leads to burnout and business failure.",
    "Calculate your cost per unit, add your desired margin, and test the market. It is easier to lower prices than to raise them."
  ),
  "mod05-sme-04": stubLesson(
    "Business credit — loans, overdrafts, or supplier credit — can help you grow. Banks and microfinance institutions offer SME loans. Understand interest rates, repayment terms, and collateral requirements before borrowing.",
    "Use the Loan Amortization calculator to see total repayment and monthly instalments. Compare offers from multiple lenders."
  ),
  "mod05-sme-05": stubLesson(
    "SMEs must comply with GRA requirements: register for TIN, file tax returns, and if turnover exceeds thresholds, register for VAT. Non-compliance leads to penalties and limits access to formal credit.",
    "Hire an accountant or use GRA's simplified schemes for small businesses. Compliance builds credibility with banks and partners."
  ),
  "mod05-sme-06": stubLesson(
    "Business insurance protects against losses from fire, theft, liability, or key person death. The National Insurance Commission (NIC) regulates insurers. Choose products that match your business risks.",
    "Start with essential cover: fire, theft, and public liability. Add key person insurance if the business depends on one or two people."
  ),
  "mod06-retirement-01": stubLesson(
    "The earlier you start saving for retirement, the more time compound interest has to grow your money. Delaying by 10 years can mean half the retirement fund. Start with whatever you can afford.",
    "Even GHS 100/month in a Tier 3 pension from age 25 can grow to a meaningful sum by 60. The key is starting early."
  ),
  "mod06-retirement-02": stubLesson(
    "SSNIT Tier 1 is mandatory. Tier 2 is your employer's occupational scheme. Maximising both means ensuring contributions are correct, understanding your benefit statement, and planning for the lump sum at retirement.",
    "Request your SSNIT statement annually. Check that your employer is remitting both your and their contributions on time."
  ),
  "mod06-retirement-03": stubLesson(
    "Tier 3 is a voluntary personal pension. You contribute extra beyond Tier 1 and 2, and get 16.5% tax relief on contributions. NPRA-licensed fund managers offer Tier 3 products.",
    "Tier 3 is ideal if you want to retire with more than SSNIT and Tier 2 will provide. The tax relief makes it attractive."
  ),
  "mod06-retirement-04": stubLesson(
    "Beyond pensions, you can build retirement wealth through T-Bills, bonds, property, or business. These 'non-pension' assets give you flexibility and diversification. Plan how they fit with your pension income.",
    "Diversify: do not put all retirement savings in one asset. T-Bills for stability, property for growth, business for income."
  ),
  "mod06-retirement-05": stubLesson(
    "Succession planning ensures your assets go to the right people when you die. A will is the legal document that states your wishes. Without one, Ghana's intestacy laws determine who inherits — which may not match your intentions.",
    "Consult a lawyer to draft a will. Update it when your family or assets change. Keep a copy with someone you trust."
  ),
  "mod07-fraud-03": stubLesson(
    "Your financial data — account numbers, PINs, transaction history — is valuable to fraudsters. Protect it: never share PINs or OTPs, use strong passwords, and be wary of phishing emails or fake websites.",
    "Banks and mobile money providers will never ask for your PIN or OTP by phone, email, or SMS. Anyone who does is a fraudster."
  ),
};

// Remove old keys that were migrated
delete output["mod02-savings-01"];
delete output["mod02-savings-02"];
delete output["mod03-mobile-money-01"];
delete output["mod03-mobile-money-02"];

fs.writeFileSync(
  path.join(__dirname, "../content/bundledLessons.json"),
  JSON.stringify(output, null, 2),
  "utf-8"
);

console.log(
  "Built bundledLessons.json with",
  Object.keys(output).length,
  "lessons"
);
