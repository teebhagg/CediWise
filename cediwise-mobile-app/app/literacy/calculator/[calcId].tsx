import {
  calculateBudget,
  calculateCashFlow,
  calculateLoanAmortization,
  calculatePayeSsnit,
  calculateSavingsGoal,
  calculateTbillProjection,
} from "@/calculators";
import { BackButton } from "@/components/BackButton";
import { formatCurrency } from "@/utils/formatCurrency";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

export default function CalculatorScreen() {
  const { calcId } = useLocalSearchParams<{ calcId: string }>();
  const [income, setIncome] = useState("");
  const [grossSalary, setGrossSalary] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [monthsToGoal, setMonthsToGoal] = useState("");
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [tbillPrincipal, setTbillPrincipal] = useState("");
  const [tbillRate, setTbillRate] = useState("");
  const [tbillTenor, setTbillTenor] = useState("91");
  const [cashIncome, setCashIncome] = useState("");
  const [fixedExpenses, setFixedExpenses] = useState("");
  const [variablePct, setVariablePct] = useState("");
  const [cashMonths, setCashMonths] = useState("6");

  const incomeNum = parseFloat(income.replace(/,/g, "")) || 0;
  const grossNum = parseFloat(grossSalary.replace(/,/g, "")) || 0;
  const targetNum = parseFloat(targetAmount.replace(/,/g, "")) || 0;
  const contributionNum = parseFloat(monthlyContribution.replace(/,/g, "")) || 0;
  const monthsNum = parseInt(monthsToGoal, 10) || 0;

  const principalNum = parseFloat(principal.replace(/,/g, "")) || 0;
  const interestNum = parseFloat(interestRate.replace(/,/g, "")) || 0;
  const termNum = parseInt(termMonths, 10) || 0;
  const tbillPrincipalNum = parseFloat(tbillPrincipal.replace(/,/g, "")) || 0;
  const tbillRateNum = parseFloat(tbillRate.replace(/,/g, "")) || 0;
  const tenorNum = parseInt(tbillTenor, 10) || 91;
  const cashIncomeNum = parseFloat(cashIncome.replace(/,/g, "")) || 0;
  const fixedExpNum = parseFloat(fixedExpenses.replace(/,/g, "")) || 0;
  const variableNum = parseFloat(variablePct.replace(/,/g, "")) || 0;
  const cashMonthsNum = parseInt(cashMonths, 10) || 6;

  const budgetResult = calcId === "budget-builder-v1" ? calculateBudget({ monthlyIncome: incomeNum }) : null;
  const payeResult = calcId === "paye-ssnit-v1" ? calculatePayeSsnit({ grossSalary: grossNum }) : null;
  const loanResult =
    calcId === "loan-amortization-v1" && principalNum > 0 && termNum > 0
      ? calculateLoanAmortization({
        principal: principalNum,
        annualInterestRate: interestNum / 100,
        termMonths: termNum,
      })
      : null;
  const tbillResult =
    calcId === "tbill-simulator-v1" && tbillPrincipalNum > 0
      ? calculateTbillProjection({
        principal: tbillPrincipalNum,
        annualRate: tbillRateNum / 100,
        tenorDays: tenorNum,
      })
      : null;
  const cashFlowResult =
    calcId === "cash-flow-v1" && cashIncomeNum > 0 && cashMonthsNum > 0
      ? calculateCashFlow({
        monthlyIncome: cashIncomeNum,
        fixedExpenses: fixedExpNum,
        variableExpensePct: variableNum / 100,
        months: cashMonthsNum,
      })
      : null;
  const savingsResult =
    calcId === "savings-goal-v1"
      ? contributionNum > 0 && targetNum > 0
        ? calculateSavingsGoal({ targetAmount: targetNum, monthlyContribution: contributionNum })
        : monthsNum > 0 && targetNum > 0
          ? calculateSavingsGoal({ targetAmount: targetNum, monthsToGoal: monthsNum })
          : null
      : null;

  const inputStyle = "bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white text-base";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1 bg-background"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
          <BackButton onPress={() => router.back()} />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-white text-xl font-bold">
            {calcId === "budget-builder-v1" && "Budget Builder"}
            {calcId === "paye-ssnit-v1" && "PAYE & SSNIT Calculator"}
            {calcId === "savings-goal-v1" && "Savings Goal Planner"}
            {calcId === "loan-amortization-v1" && "Loan Amortization"}
            {calcId === "tbill-simulator-v1" && "T-Bill Projection"}
            {calcId === "cash-flow-v1" && "Cash Flow Tool"}
          </Text>
          <Text className="text-muted-foreground text-sm mt-1">
            For educational purposes only. Verify with official sources.
          </Text>

          {calcId === "budget-builder-v1" && (
            <>
              <Text className="text-slate-300 mt-6 mb-2">Monthly income (GHS)</Text>
              <TextInput
                value={income}
                onChangeText={setIncome}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className={inputStyle}
              />
              {budgetResult && incomeNum > 0 && (
                <View className="mt-6 p-4 rounded-lg bg-slate-800/80 border border-slate-600">
                  <Text className="text-emerald-400 font-semibold mb-3">50/30/20 split</Text>
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Needs (50%)</Text>
                      <Text className="text-white font-medium">₵{formatCurrency(budgetResult.needsAmount)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Wants (30%)</Text>
                      <Text className="text-white font-medium">₵{formatCurrency(budgetResult.wantsAmount)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Savings (20%)</Text>
                      <Text className="text-emerald-400 font-medium">₵{formatCurrency(budgetResult.savingsAmount)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {calcId === "paye-ssnit-v1" && (
            <>
              <Text className="text-slate-300 mt-6 mb-2">Monthly gross salary (GHS)</Text>
              <TextInput
                value={grossSalary}
                onChangeText={setGrossSalary}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className={inputStyle}
              />
              {payeResult && grossNum > 0 && (
                <View className="mt-6 p-4 rounded-lg bg-slate-800/80 border border-slate-600">
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">SSNIT (5.5%)</Text>
                      <Text className="text-slate-300">₵{formatCurrency(payeResult.ssnitAmount)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">PAYE</Text>
                      <Text className="text-slate-300">₵{formatCurrency(payeResult.payeAmount)}</Text>
                    </View>
                    <View className="h-px bg-slate-600 my-2" />
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Net salary</Text>
                      <Text className="text-emerald-400 font-bold">₵{formatCurrency(payeResult.netSalary)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {calcId === "savings-goal-v1" && (
            <>
              <Text className="text-slate-300 mt-6 mb-2">Target amount (GHS)</Text>
              <TextInput
                value={targetAmount}
                onChangeText={setTargetAmount}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className={inputStyle}
              />
              <Text className="text-slate-300 mt-4 mb-2">Monthly contribution (GHS)</Text>
              <TextInput
                value={monthlyContribution}
                onChangeText={setMonthlyContribution}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className={inputStyle}
              />
              <Text className="text-slate-300 mt-4 mb-2">Or: Months to reach goal</Text>
              <TextInput
                value={monthsToGoal}
                onChangeText={setMonthsToGoal}
                placeholder="0"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                className={inputStyle}
              />
              {savingsResult && (contributionNum > 0 || monthsNum > 0) && targetNum > 0 && (
                <View className="mt-6 p-4 rounded-lg bg-slate-800/80 border border-slate-600">
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Monthly to save</Text>
                      <Text className="text-white font-medium">₵{formatCurrency(savingsResult.monthlyContribution)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Months to goal</Text>
                      <Text className="text-emerald-400 font-medium">{savingsResult.monthsToGoal}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {calcId === "loan-amortization-v1" && (
            <>
              <Text className="text-slate-300 mt-6 mb-2">Loan amount (GHS)</Text>
              <TextInput value={principal} onChangeText={setPrincipal} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Annual interest rate (%)</Text>
              <TextInput value={interestRate} onChangeText={setInterestRate} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Term (months)</Text>
              <TextInput value={termMonths} onChangeText={setTermMonths} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              {loanResult && (
                <View className="mt-6 p-4 rounded-lg bg-slate-800/80 border border-slate-600">
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Monthly payment</Text>
                      <Text className="text-emerald-400 font-bold">₵{formatCurrency(loanResult.monthlyPayment)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Total interest</Text>
                      <Text className="text-slate-300">₵{formatCurrency(loanResult.totalInterest)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {calcId === "tbill-simulator-v1" && (
            <>
              <Text className="text-slate-300 mt-6 mb-2">Principal (GHS)</Text>
              <TextInput value={tbillPrincipal} onChangeText={setTbillPrincipal} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Annual rate (%) - override if live data stale</Text>
              <TextInput value={tbillRate} onChangeText={setTbillRate} placeholder="e.g. 25" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Tenor (days)</Text>
              <TextInput value={tbillTenor} onChangeText={setTbillTenor} placeholder="91, 182, or 364" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              {tbillResult && (
                <View className="mt-6 p-4 rounded-lg bg-slate-800/80 border border-slate-600">
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Interest earned</Text>
                      <Text className="text-emerald-400 font-medium">₵{formatCurrency(tbillResult.interestEarned)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Maturity amount</Text>
                      <Text className="text-emerald-400 font-bold">₵{formatCurrency(tbillResult.maturityAmount)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {calcId === "cash-flow-v1" && (
            <>
              <Text className="text-slate-300 mt-6 mb-2">Monthly income (GHS)</Text>
              <TextInput value={cashIncome} onChangeText={setCashIncome} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Fixed expenses (GHS)</Text>
              <TextInput value={fixedExpenses} onChangeText={setFixedExpenses} placeholder="0" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Variable expenses (% of income)</Text>
              <TextInput value={variablePct} onChangeText={setVariablePct} placeholder="e.g. 30" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              <Text className="text-slate-300 mt-4 mb-2">Months to project</Text>
              <TextInput value={cashMonths} onChangeText={setCashMonths} placeholder="6" placeholderTextColor="#64748b" keyboardType="numeric" className={inputStyle} />
              {cashFlowResult && (
                <View className="mt-6 p-4 rounded-lg bg-slate-800/80 border border-slate-600">
                  <View className="gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Avg monthly net</Text>
                      <Text className="text-emerald-400 font-medium">₵{formatCurrency(cashFlowResult.averageMonthlyNet)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400">Total net ({cashMonthsNum} mo)</Text>
                      <Text className="text-emerald-400 font-bold">₵{formatCurrency(cashFlowResult.totalNetOverPeriod)}</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          <View className="mt-8 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Text className="text-amber-400 text-sm">
              For educational purposes only. This is not financial, legal, or tax advice. Verify with the Bank of Ghana, GRA, or a qualified advisor.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
