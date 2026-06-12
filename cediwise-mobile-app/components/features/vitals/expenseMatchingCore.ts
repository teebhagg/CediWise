const EXPENSE_ALIASES: Record<string, string[]> = {
  rent: ["rent", "housing", "accommodation", "landlord"],
  groceries: ["groceries", "grocery", "food", "market", "provisions"],
  transport: ["transport", "trotro", "uber", "fuel", "petrol", "troski", "commute"],
  utilities: ["utilities", "ecg", "electricity", "water", "trash", "ghana water"],
  schoolfees: ["school fees", "school", "tuition", "education"],
  titheschurch: ["tithes", "church", "tithe", "offering"],
  databundles: ["data bundles", "data", "airtime", "internet", "wifi"],
  diningout: ["dining out", "dining", "restaurant", "eating out"],
  entertainment: ["entertainment", "movies", "cinema", "nightlife", "fun", "games", "hobbies"],
  subscriptions: ["subscriptions", "subscription", "netflix", "spotify", "streaming", "dstv", "apple music"],
  clothing: ["clothing", "clothes", "fashion", "apparel"],
  healthcare: ["healthcare", "health", "medical", "pharmacy", "hospital"],
  debtpayments: ["debt payments", "debt", "loan", "loans"],
  childcare: ["childcare", "child care", "nanny", "babysitter"],
  insurance: ["insurance", "premium"],
  savings: ["savings", "emergency", "vault"],
};

export function normalizeExpenseLabel(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function aliasKeysFor(label: string): string[] {
  const normalized = normalizeExpenseLabel(label);
  const keys: string[] = [normalized];
  for (const [key, aliases] of Object.entries(EXPENSE_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a) || a.includes(normalized))) {
      keys.push(key, ...aliases);
    }
  }
  return keys;
}

/** Shared matching used by vitals picker pre-select and tests. */
export function expenseLabelsMatch(a: string, b: string): boolean {
  const keysA = new Set(aliasKeysFor(a));
  const keysB = new Set(aliasKeysFor(b));
  for (const key of keysA) {
    if (keysB.has(key)) return true;
    for (const other of keysB) {
      if (key.includes(other) || other.includes(key)) return true;
    }
  }
  return false;
}
