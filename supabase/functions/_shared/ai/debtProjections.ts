/**
 * debtProjections — logic to compute snowball vs. avalanche payoff strategies.
 */

export interface DebtRow {
  id: string;
  name: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number;
  interest_rate: number; // annual percentage, e.g. 24 for 24%
}

export interface DebtProjection {
  strategy: "snowball" | "avalanche";
  debtFreeDate: Date;
  totalInterestPaid: number;
  payoffOrder: string[];
  /** Set when the simulation stops early (e.g. minimum payment does not exceed monthly interest). */
  simulationWarning?: string;
}

/**
 * Computes debt payoff projections for both Snowball and Avalanche methods.
 * @param debts Active debts list
 * @param extraMonthlyBudget Extra amount the user can pay per month on top of minimums
 */
export function computeDebtProjections(
  debts: DebtRow[],
  extraMonthlyBudget: number = 0,
): { snowball: DebtProjection; avalanche: DebtProjection } {
  const extra = Number(extraMonthlyBudget);
  if (!Number.isFinite(extra) || extra < 0) {
    throw new Error(
      `computeDebtProjections: extraMonthlyBudget must be a finite number >= 0 (got ${String(extraMonthlyBudget)})`,
    );
  }

  if (debts.length === 0) {
    const emptyDate = new Date();
    return {
      snowball: { strategy: "snowball", debtFreeDate: emptyDate, totalInterestPaid: 0, payoffOrder: [] },
      avalanche: { strategy: "avalanche", debtFreeDate: emptyDate, totalInterestPaid: 0, payoffOrder: [] },
    };
  }

  debts.forEach((d, index) => {
    const remaining = Number(d.remaining_amount);
    const monthlyPayment = Number(d.monthly_payment);
    const rate = Number(d.interest_rate);

    if (!Number.isFinite(remaining) || remaining < 0) {
      throw new Error(
        `computeDebtProjections: debts[${index}].remaining_amount must be a finite number >= 0 (got ${String(d.remaining_amount)})`,
      );
    }
    if (remaining <= 0) {
      throw new Error(
        `computeDebtProjections: debts[${index}].remaining_amount must be > 0 for active debts (got ${remaining})`,
      );
    }
    if (!Number.isFinite(monthlyPayment) || monthlyPayment < 0) {
      throw new Error(
        `computeDebtProjections: debts[${index}].monthly_payment must be a finite number >= 0 (got ${String(d.monthly_payment)})`,
      );
    }
    if (!Number.isFinite(rate) || rate < 0) {
      throw new Error(
        `computeDebtProjections: debts[${index}].interest_rate must be a finite number >= 0 (got ${String(d.interest_rate)})`,
      );
    }
  });

  // 1. Snowball: Smallest balance first
  const snowballOrder = [...debts].sort((a, b) => a.remaining_amount - b.remaining_amount);
  const snowball = simulatePayoff(snowballOrder, extra, "snowball");

  // 2. Avalanche: Highest interest first
  const avalancheOrder = [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
  const avalanche = simulatePayoff(avalancheOrder, extra, "avalanche");

  return { snowball, avalanche };
}

/** GHS minor units (pesewas): 1 GHS = 100 pesewas; all simulation math uses integers. */
function toPesewas(amount: number): number {
  return Math.round(Number(amount) * 100);
}

/** Monthly interest in pesewas: balance × (APR%/100) / 12, rounded to nearest pesewa. */
function monthlyInterestPesewas(balancePesewas: number, annualPercent: number): number {
  return Math.round((balancePesewas * annualPercent) / 1200);
}

function simulatePayoff(
  orderedDebts: DebtRow[],
  extraBudget: number,
  strategy: "snowball" | "avalanche",
): DebtProjection {
  const simulationDebts = orderedDebts.map((d) => ({
    name: d.name,
    balancePesewas: toPesewas(d.remaining_amount),
    minPaymentPesewas: toPesewas(d.monthly_payment),
    annualPercent: d.interest_rate,
  }));

  let totalInterestPesewas = 0;
  let months = 0;
  const payoffOrder: string[] = [];
  const MAX_MONTHS = 600; // 50 year cap to prevent infinite loops
  const extraBudgetPesewas = toPesewas(extraBudget);

  const abortUnpayable = (name: string, detail: string): DebtProjection => {
    const debtFreeDate = new Date();
    return {
      strategy,
      debtFreeDate,
      totalInterestPaid: Math.round(totalInterestPesewas / 100),
      payoffOrder: [...payoffOrder],
      simulationWarning:
        `Unpayable debt: "${name}" — ${detail}. Minimum payments must exceed monthly interest (or add extra payment capacity).`,
    };
  };

  while (simulationDebts.some((d) => d.balancePesewas > 0) && months < MAX_MONTHS) {
    months++;

    // Accrue interest per debt (store amounts before mutating balances)
    const pending: { idx: number; interest: number }[] = [];
    for (let idx = 0; idx < simulationDebts.length; idx++) {
      const d = simulationDebts[idx];
      if (d.balancePesewas <= 0) continue;
      const interest = monthlyInterestPesewas(d.balancePesewas, d.annualPercent);
      pending.push({ idx, interest });
    }

    const firstActiveIdx = simulationDebts.findIndex((d) => d.balancePesewas > 0);

    for (const { idx, interest } of pending) {
      const d = simulationDebts[idx];
      const receivesExtra = idx === firstActiveIdx;
      if (receivesExtra) {
        if (d.minPaymentPesewas + extraBudgetPesewas <= interest) {
          return abortUnpayable(
            d.name,
            `minimum (${d.minPaymentPesewas} pesewas) plus extra (${extraBudgetPesewas} pesewas) ≤ monthly interest (${interest} pesewas)`,
          );
        }
      } else if (d.minPaymentPesewas <= interest) {
        return abortUnpayable(
          d.name,
          `minimum (${d.minPaymentPesewas} pesewas) ≤ monthly interest (${interest} pesewas) while other debts receive the snowball/avalanche extra`,
        );
      }
    }

    for (const { idx, interest } of pending) {
      const d = simulationDebts[idx];
      totalInterestPesewas += interest;
      d.balancePesewas += interest;
    }

    let availableExtraPesewas = extraBudgetPesewas;

    // Apply minimum payments
    for (const d of simulationDebts) {
      if (d.balancePesewas <= 0) continue;

      const payment = Math.min(d.balancePesewas, d.minPaymentPesewas);
      d.balancePesewas -= payment;

      if (d.balancePesewas <= 0) {
        if (!payoffOrder.includes(d.name)) payoffOrder.push(d.name);
      }
    }

    // Apply extra budget to the target debt (first one in ordered list that isn't paid off)
    for (const d of simulationDebts) {
      if (d.balancePesewas <= 0) continue;

      const extraPayment = Math.min(d.balancePesewas, availableExtraPesewas);
      d.balancePesewas -= extraPayment;
      availableExtraPesewas -= extraPayment;

      if (d.balancePesewas <= 0) {
        if (!payoffOrder.includes(d.name)) payoffOrder.push(d.name);
      }

      if (availableExtraPesewas <= 0) break;
    }
  }

  const debtFreeDate = new Date();
  debtFreeDate.setMonth(debtFreeDate.getMonth() + months);

  const base: DebtProjection = {
    strategy,
    debtFreeDate,
    totalInterestPaid: Math.round(totalInterestPesewas / 100),
    payoffOrder,
  };

  if (months >= MAX_MONTHS && simulationDebts.some((d) => d.balancePesewas > 0)) {
    return {
      ...base,
      simulationWarning:
        `Simulation capped at ${MAX_MONTHS} months; remaining balances may indicate unpayable or insufficient payments under current assumptions.`,
    };
  }

  return base;
}
