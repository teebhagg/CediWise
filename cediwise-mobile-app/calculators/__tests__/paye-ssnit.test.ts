import { calculatePayeSsnit } from "../paye-ssnit";

describe("calculatePayeSsnit", () => {
  it("calculates SSNIT at 5.5% for gross salary", () => {
    const result = calculatePayeSsnit({ grossSalary: 1000 });
    expect(result.ssnitAmount).toBe(55);
    expect(result.ssnitRate).toBe(0.055);
  });

  it("calculates chargeable income as gross minus SSNIT", () => {
    const result = calculatePayeSsnit({ grossSalary: 1000 });
    expect(result.chargeableIncome).toBe(945);
  });

  it("applies 0% PAYE for chargeable income below 490", () => {
    const result = calculatePayeSsnit({ grossSalary: 500 });
    expect(result.payeAmount).toBe(0);
  });

  it("applies 5% for band 490-600", () => {
    const result = calculatePayeSsnit({ grossSalary: 600 });
    const chargeable = 600 * 0.945; // 567
    expect(result.chargeableIncome).toBe(567);
    expect(result.payeAmount).toBeCloseTo((567 - 490) * 0.05, 2);
  });

  it("calculates net salary correctly", () => {
    const result = calculatePayeSsnit({ grossSalary: 2000 });
    expect(result.netSalary).toBe(result.grossSalary - result.totalDeductions);
  });

  it("supports custom SSNIT rate", () => {
    const result = calculatePayeSsnit({ grossSalary: 1000, ssnitRate: 0 });
    expect(result.ssnitAmount).toBe(0);
    expect(result.chargeableIncome).toBe(1000);
  });

  it("supports custom PAYE bands", () => {
    const result = calculatePayeSsnit({
      grossSalary: 1000,
      ssnitRate: 0,
      payeBands: [{ min: 0, max: 1000, rate: 0.1 }],
    });
    expect(result.payeAmount).toBe(100);
  });
});
