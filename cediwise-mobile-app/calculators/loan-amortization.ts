/**
 * Loan Amortization Calculator
 * For educational purposes only.
 */

export type LoanAmortizationInput = {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
};

export type AmortizationRow = {
  month: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  balance: number;
};

export type LoanAmortizationResult = {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: AmortizationRow[];
};

export function calculateLoanAmortization(
  input: LoanAmortizationInput
): LoanAmortizationResult {
  const { principal, annualInterestRate, termMonths } = input;
  const monthlyRate = annualInterestRate / 12;

  if (principal <= 0 || termMonths <= 0) {
    return {
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      schedule: [],
    };
  }

  let monthlyPayment: number;
  if (monthlyRate > 0) {
    monthlyPayment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
      (Math.pow(1 + monthlyRate, termMonths) - 1);
  } else {
    monthlyPayment = principal / termMonths;
  }

  monthlyPayment = Math.round(monthlyPayment * 100) / 100;
  const schedule: AmortizationRow[] = [];
  let balance = principal;

  for (let month = 1; month <= termMonths; month++) {
    const interestPaid = Math.round(balance * monthlyRate * 100) / 100;
    const principalPaid = Math.min(
      Math.round((monthlyPayment - interestPaid) * 100) / 100,
      balance
    );
    balance = Math.max(0, Math.round((balance - principalPaid) * 100) / 100);

    schedule.push({
      month,
      payment: monthlyPayment,
      principalPaid,
      interestPaid,
      balance,
    });
  }

  const totalPayment = monthlyPayment * termMonths;
  const totalInterest = Math.round((totalPayment - principal) * 100) / 100;

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    schedule,
  };
}
