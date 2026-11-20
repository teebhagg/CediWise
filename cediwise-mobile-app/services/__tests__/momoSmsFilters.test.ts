import {
  canonicalizeSmsSender,
  filterMoMoSmsMessages,
  isLikelyMoMoSender,
  isLikelyMoMoSms,
  isMoMoTransactionBody,
  isScanEligibleSender,
  type MoMoSmsMessage,
  resolvePastedSender,
} from "../momoSmsFilters";

const MTN_PAYMENT_COMPLETED: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Your payment of GHS 5.00 to ECG PREPAID has been completed at 2026-07-08 14:30:00. Your new balance is GHS 45.50.",
  date: Date.now() - 75_000,
};

const MTN_AIRTIME_PAYMENT: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Your payment of GHS 2.00 to MTN AIRTIME has been completed at 2026-07-08 21:56:07. Your new balance: GHS 20.55. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 85012132862. External Transaction Id: 85012132862.Download the MoMo App",
  date: Date.now() - 70_000,
};

/** Real MTN MoMo Android sender — no space between Mobile and Money. */
const MTN_AIRTIME_MOBILEMONEY_SENDER: MoMoSmsMessage = {
  address: "MobileMoney",
  body: MTN_AIRTIME_PAYMENT.body,
  date: Date.now() - 68_000,
};

const MTN_EXPENSE: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Payment made for GHS 25.00 to KWAME MENSAH. Transaction ID: 51234567890. Fee: GHS 0.00. Available balance: GHS 120.50.",
  date: Date.now() - 60_000,
};

const MTN_INCOME: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Payment received for GHS 100.00 from JOHN DOE. Current balance: GHS 300.00. Transaction ID: 555",
  date: Date.now() - 90_000,
};

const TELECEL_EXPENSE: MoMoSmsMessage = {
  address: "Telecel",
  body: "You have sent GHS 10.00 to AMA ADJEI. Trans ID: 99887766. Your Vodafone Cash balance is GHS 45.00.",
  date: Date.now() - 120_000,
};

const TELECEL_CONFIRMED: MoMoSmsMessage = {
  address: "Telecel",
  body: "0000013645405283 Confirmed. GHS2.00 sent to 0534578211 - JOSHUA ANSAH on MTN MOBILE MONEY on 2026-07-08 at 15:19:37. Your Telecel Cash balance is GHS30.92.",
  date: Date.now() - 150_000,
};

const AT_MONEY_EXPENSE: MoMoSmsMessage = {
  address: "AT Money",
  body: "You have sent GHS 18.50 to KOFI STORES. Your new balance is GHS 81.50. Transaction ID: 1234567890.",
  date: Date.now() - 100_000,
};

const MTN_PROMO: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Enjoy 50% bonus on your next MoMo recharge. Dial *170# now! Available balance promo for loyal users.",
  date: Date.now() - 45_000,
};

const BALANCE_ONLY: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Your MoMo wallet balance is GHS 50.00. Dial *170# for more services.",
  date: Date.now() - 40_000,
};

const TELECEL_PROMO: MoMoSmsMessage = {
  address: "Telecel",
  body: "Sending money from Telecel Cash to Telecel Cash remains FREE on the Telecel Play App. Download the App https://bit.ly/TelecelPlayGhana",
  date: Date.now() - 35_000,
};

const NOISE: MoMoSmsMessage = {
  address: "Friend",
  body: "See you at church tomorrow",
  date: Date.now() - 30_000,
};

describe("momoSmsFilters", () => {
  it("accepts MTN your payment completed SMS", () => {
    expect(isLikelyMoMoSms(MTN_PAYMENT_COMPLETED)).toBe(true);
  });

  it("accepts MTN airtime your payment completed SMS", () => {
    expect(isLikelyMoMoSms(MTN_AIRTIME_PAYMENT)).toBe(true);
  });

  it("canonicalizes MobileMoney sender the same as Mobile Money", () => {
    expect(canonicalizeSmsSender("MobileMoney")).toBe("MOBILEMONEY");
    expect(canonicalizeSmsSender("Mobile Money")).toBe("MOBILEMONEY");
    expect(canonicalizeSmsSender("AT-Money")).toBe("ATMONEY");
    expect(isLikelyMoMoSender("MobileMoney")).toBe(true);
  });

  it("accepts MTN airtime SMS from MobileMoney sender", () => {
    expect(isLikelyMoMoSms(MTN_AIRTIME_MOBILEMONEY_SENDER)).toBe(true);
  });

  it("accepts MTN payment-for and purchased-airtime SMS", () => {
    expect(
      isLikelyMoMoSms({
        address: "MobileMoney",
        body: "Payment for GHS 40.00 to MELCOM. Transaction ID: 445566.",
      }),
    ).toBe(true);
    expect(
      isLikelyMoMoSms({
        address: "MobileMoney",
        body: "You have successfully purchased GHS 100.00 Airtime from MTN on 2026-09-03. Ref: 889900.",
      }),
    ).toBe(true);
  });

  it("accepts MTN MoMo payment SMS", () => {
    expect(isLikelyMoMoSms(MTN_EXPENSE)).toBe(true);
  });

  it("does not upload incoming transaction alerts", () => {
    expect(isLikelyMoMoSms(MTN_INCOME)).toBe(false);
  });

  it("accepts Telecel/Vodafone Cash payment SMS", () => {
    expect(isLikelyMoMoSms(TELECEL_EXPENSE)).toBe(true);
  });

  it("accepts Telecel T-Cash Confirmed transaction SMS", () => {
    expect(isLikelyMoMoSms(TELECEL_CONFIRMED)).toBe(true);
  });

  it("accepts AT Money outflow alerts", () => {
    expect(isLikelyMoMoSms(AT_MONEY_EXPENSE)).toBe(true);
  });

  it("rejects a valid-looking transaction from an untrusted sender", () => {
    expect(
      isLikelyMoMoSms({ ...MTN_EXPENSE, address: "0240000000" }),
    ).toBe(false);
  });

  it("requires the body format to match the sender's provider", () => {
    expect(
      isLikelyMoMoSms({ ...AT_MONEY_EXPENSE, address: "MTN MoMo" }),
    ).toBe(false);
  });

  it("rejects MTN promos and marketing SMS", () => {
    expect(isLikelyMoMoSms(MTN_PROMO)).toBe(false);
    expect(isMoMoTransactionBody(MTN_PROMO.body)).toBe(false);
  });

  it("rejects balance-only inquiries without a transaction", () => {
    expect(isLikelyMoMoSms(BALANCE_ONLY)).toBe(false);
  });

  it("rejects Telecel promo-only SMS without a transaction", () => {
    expect(isLikelyMoMoSms(TELECEL_PROMO)).toBe(false);
  });

  it("treats MTN, Telecel, and AT Money senders as scan-eligible even if stored flags were mixed", () => {
    expect(isScanEligibleSender("MTN MoMo")).toBe(true);
    expect(isScanEligibleSender("Telecel")).toBe(true);
    expect(isScanEligibleSender("AT Money")).toBe(true);
    expect(isScanEligibleSender("Friend")).toBe(false);
  });

  it("rejects unrelated SMS", () => {
    expect(isLikelyMoMoSms(NOISE)).toBe(false);
  });

  it("filters by date window and transaction heuristics", () => {
    const minDateMs = Date.now() - 86_400_000;
    const rows = filterMoMoSmsMessages(
      [
        MTN_EXPENSE,
        TELECEL_EXPENSE,
        TELECEL_CONFIRMED,
        AT_MONEY_EXPENSE,
        MTN_PROMO,
        BALANCE_ONLY,
        NOISE,
        { ...MTN_EXPENSE, date: minDateMs - 1 },
      ],
      { minDateMs },
    );
    expect(rows.map((row) => row.address)).toEqual([
      "MTN MoMo",
      "AT Money",
      "Telecel",
      "Telecel",
    ]);
  });
});

describe("resolvePastedSender", () => {
  const source = {
    sender: "Telecel Cash",
    body: "You have sent GHS 10.00 to AMA. Transaction ID: ABCD1234.",
  };

  it("keeps the sender when only whitespace changes", () => {
    expect(resolvePastedSender(source, `${source.body} `)).toBe("Telecel Cash");
    expect(resolvePastedSender(source, "  You have sent GHS 10.00\nto AMA.  Transaction ID: ABCD1234.")).toBe("Telecel Cash");
  });

  it("drops the sender once the message is replaced or edited", () => {
    expect(resolvePastedSender(source, "Payment made for GHS 5.00 to MELCOM. Transaction ID: 99999999.")).toBeUndefined();
    expect(resolvePastedSender(source, source.body.replace("10.00", "20.00"))).toBeUndefined();
  });

  it("returns nothing without a source or sender", () => {
    expect(resolvePastedSender(null, source.body)).toBeUndefined();
    expect(resolvePastedSender({ sender: "", body: source.body }, source.body)).toBeUndefined();
  });
});
