import {
  buildSmsExpenseCaptureItems,
  formatSmsExpenseDate,
  previewSmsExpense,
} from "../momoSmsExpensePreview";
import type { MoMoSmsMessage } from "../momoSmsFilters";

const NOW = Date.UTC(2026, 7, 3, 15, 0, 0); // 3 Aug 2026 15:00 UTC

const MTN_AIRTIME: MoMoSmsMessage = {
  address: "MobileMoney",
  body: "Your payment of GHS 2.00 to MTN AIRTIME has been completed at 2026-07-08 21:56:07. Your new balance: GHS 20.55.",
  date: Date.UTC(2026, 6, 8, 21, 56, 7),
};

const MTN_INCOME: MoMoSmsMessage = {
  address: "MTN MoMo",
  body: "Payment received for GHS 100.00 from JOHN DOE. Current balance: GHS 300.00. Transaction ID: 555",
  date: Date.UTC(2026, 6, 8, 10, 0, 0),
};

const TELECEL_EXPENSE: MoMoSmsMessage = {
  address: "Telecel",
  body: "0000013645405283 Confirmed. GHS2.00 sent to 0534578211 - JOSHUA ANSAH on MTN MOBILE MONEY on 2026-07-08 at 15:19:37. Your Telecel Cash balance is GHS30.92.",
  date: Date.UTC(2026, 6, 8, 15, 19, 37),
};

const CATEGORIES = [
  { id: "1", name: "data bundles", bucket: "needs" },
  { id: "2", name: "others", bucket: "wants" },
  { id: "3", name: "transport", bucket: "needs" },
];

describe("momoSmsExpensePreview", () => {
  it("previews MTN purchased airtime and payment-for SMS", () => {
    const purchased = previewSmsExpense(
      {
        address: "MobileMoney",
        body: "You have successfully purchased GHS 100.00 Airtime from MTN on 2026-09-03. Ref: 889900.",
        date: Date.UTC(2026, 8, 3, 12, 0, 0),
      },
      CATEGORIES,
    );
    expect(purchased?.amount).toBe(100);
    expect(purchased?.description).toBe("MoMo → Airtime from MTN");
    expect(purchased?.categoryName).toBe("Data Bundles");
    expect(purchased?.eventType).toBe("airtime_data");

    const paymentFor = previewSmsExpense(
      {
        address: "MobileMoney",
        body: "Payment for GHS 40.00 to MELCOM. Transaction ID: 445566.",
        date: Date.UTC(2026, 8, 3, 12, 0, 0),
      },
      CATEGORIES,
    );
    expect(paymentFor?.amount).toBe(40);
    expect(paymentFor?.description).toBe("MoMo → MELCOM (#445566)");
    expect(paymentFor?.eventType).toBe("merchant_payment");
  });

  it("previews MTN airtime with human date and category", () => {
    const preview = previewSmsExpense(MTN_AIRTIME, CATEGORIES);
    expect(preview).not.toBeNull();
    expect(preview?.amount).toBe(2);
    expect(preview?.description).toBe("MoMo → MTN AIRTIME");
    expect(preview?.categoryName).toBe("Data Bundles");
    expect(preview?.receivedAtLabel).toMatch(/at /i);
  });

  it("skips income SMS", () => {
    expect(previewSmsExpense(MTN_INCOME, CATEGORIES)).toBeNull();
  });

  it("drops messages before minDateMs", () => {
    const items = buildSmsExpenseCaptureItems(
      [MTN_AIRTIME, TELECEL_EXPENSE],
      {
        categories: CATEGORIES,
        minDateMs: Date.UTC(2026, 7, 1),
        maxDateMs: NOW,
      },
    );
    expect(items).toHaveLength(0);
  });

  it("keeps messages on/after profile created date", () => {
    const items = buildSmsExpenseCaptureItems(
      [MTN_AIRTIME, TELECEL_EXPENSE],
      {
        categories: CATEGORIES,
        minDateMs: Date.UTC(2026, 6, 1),
        maxDateMs: NOW,
      },
    );
    expect(items).toHaveLength(2);
    expect(items[0]?.categoryName).toBe("Data Bundles");
    expect(items[1]?.description).toContain("JOSHUA ANSAH");
  });
});

describe("formatSmsExpenseDate", () => {
  it("labels today and yesterday clearly", () => {
    expect(formatSmsExpenseDate(NOW, NOW)).toMatch(/^Today at /);
    expect(
      formatSmsExpenseDate(NOW - 24 * 60 * 60 * 1000, NOW),
    ).toMatch(/^Yesterday at /);
  });

  it("uses weekday for recent dates and calendar date for older ones", () => {
    const threeDaysAgo = NOW - 3 * 24 * 60 * 60 * 1000;
    expect(formatSmsExpenseDate(threeDaysAgo, NOW)).toMatch(/ at /);
    expect(formatSmsExpenseDate(new Date(2026, 6, 8, 15, 19).getTime(), NOW)).toBe(
      "8 Jul at 3:19 PM",
    );
  });
});

describe("previewSmsExpense person-to-person wording", () => {
  it("keeps a send to a recipient named like a keyword as a p2p send", () => {
    const preview = previewSmsExpense({
      address: "AT Money",
      body: "You have sent GHS 10.00 to BILL. Transaction ID: 12345678.",
      date: Date.UTC(2026, 6, 8, 15, 19),
    });
    expect(preview).toMatchObject({ eventType: "p2p_send", classification: null });
  });
});
