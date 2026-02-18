export { calculateBudget } from "./budget-builder";
export type { BudgetBuilderInput, BudgetBuilderResult } from "./budget-builder";

export { DEFAULT_PAYE_BANDS_2025, calculatePayeSsnit } from "./paye-ssnit";
export type { PayeBand, PayeSsnitInput, PayeSsnitResult } from "./paye-ssnit";

export { calculateSavingsGoal } from "./savings-goal";
export type { SavingsGoalInput, SavingsGoalResult } from "./savings-goal";

export { calculateLoanAmortization } from "./loan-amortization";
export type {
  AmortizationRow,
  LoanAmortizationInput,
  LoanAmortizationResult,
} from "./loan-amortization";

export { calculateTbillProjection } from "./tbill-simulator";
export type {
  TbillSimulatorInput,
  TbillSimulatorResult,
} from "./tbill-simulator";

export { calculateCashFlow } from "./cash-flow-tool";
export type {
  CashFlowInput,
  CashFlowMonth,
  CashFlowResult,
} from "./cash-flow-tool";
