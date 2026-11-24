---
name: salary-check
description: Estimate Ghana take-home pay (SSNIT, PAYE, net) from a gross monthly salary using the 2026 GRA rules, and help compare the result with a payslip. Use when the user asks what their net pay would be, or whether a payslip deduction looks right.
---

# Salary check

Use the CediWise `estimate_ghana_take_home` tool (MCP server `cediwise`) with the gross monthly salary in GHS.

1. Ask for the gross monthly salary if the user has not given it. Do not guess it.
2. Call the tool and show SSNIT, PAYE, and net take-home.
3. Say that this is an estimate under the 2026 GRA rules. Suggest checking the payslip, and the official GRA guidance at https://gra.gov.gh/domestic-tax/tax-types/paye/ for filing or disputes.
4. Do not give personal tax, legal, or investment advice.
