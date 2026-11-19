import { buildMoMoImportCandidate, buildSmsReversalCaptureItems } from "../momoImportCandidate";

describe("buildMoMoImportCandidate", () => {
  it("creates the same client id for the same reference-free inbox message", () => {
    const message = {
      address: "MTN MoMo",
      body: "Payment made for GHS 25.00 to MELCOM. Fee: GHS 0.50",
      date: 1_789_000_000_000,
    };
    const first = buildMoMoImportCandidate(message);
    const second = buildMoMoImportCandidate(message);
    expect(first?.clientImportId).toBe(second?.clientImportId);
    expect(first).toMatchObject({
      provider: "mtn_momo",
      eventType: "merchant_payment",
      principalPesewas: 2500,
      feePesewas: 50,
      classification: "expense",
    });
  });

  it("requires classification for person-to-person sends", () => {
    const candidate = buildMoMoImportCandidate({
      address: "T-Cash",
      body: "0000013645405283 Confirmed. GHS2.00 sent to 0534000000 - AMA on MTN.",
      date: 1_789_000_000_000,
    });
    expect(candidate).toMatchObject({
      provider: "telecel_cash",
      eventType: "p2p_send",
      classification: null,
      receiptId: "0000013645405283",
    });
  });

  it("reads the network from the message when no sender is given", () => {
    expect(buildMoMoImportCandidate({
      body: "Payment for GHS 40.00 to MELCOM. Transaction ID: 445566.",
      date: Date.now(),
    })).toMatchObject({ provider: "mtn_momo", eventType: "merchant_payment" });
    expect(buildMoMoImportCandidate({
      body: "You have successfully purchased GHS 100.00 Airtime from 0240000000 on 2026-09-03. Ref: 889900.",
      date: Date.now(),
    })).toMatchObject({ provider: "mtn_momo", eventType: "airtime_data" });
    expect(buildMoMoImportCandidate({
      body: "0000013645405283 Confirmed. GHS2.00 sent to 0534000000 - AMA on 2026-07-08.",
      date: Date.now(),
    })).toMatchObject({ provider: "telecel_cash" });
  });

  it("rejects pasted text that is not a mobile money payment", () => {
    expect(buildMoMoImportCandidate({
      body: "See you at church tomorrow, bring GHS 20 for transport",
      date: Date.now(),
    })).toBeNull();
  });
});

describe("buildMoMoImportCandidate review fixes", () => {
  const date = 1_789_000_000_000;
  it("does not read reference text as direction", () => {
    expect(buildMoMoImportCandidate({
      address: "MTN MoMo",
      body: "Payment made for GHS 25.00 to MELCOM. Reference: goods received. Transaction ID: 12345678.",
      date,
    })?.eventType).toBe("merchant_payment");
  });
  it("does not let a decimal inside the reference change the direction", () => {
    expect(buildMoMoImportCandidate({
      address: "MTN MoMo",
      body: "Payment made for GHS 25.00 to MELCOM. Reference: invoice 12.50 received. Transaction ID: 12345678.",
      date,
    })).toMatchObject({ eventType: "merchant_payment", principalPesewas: 2500 });
  });
  it("ignores an amount quoted inside the reference field", () => {
    expect(buildMoMoImportCandidate({
      address: "Vodafone",
      body: "Vodafone Cash: GHS 50.00 paid to merchant AMA. Reference: Payment for GHS 1.00. Transaction ID: 12345678.",
      date,
    })?.principalPesewas).toBe(5000);
  });
  it("keeps person-to-person sends in review", () => {
    expect(buildMoMoImportCandidate({
      address: "MTN MoMo",
      body: "Payment for GHS 10.00 sent to AMA. Transaction ID: 12345678.",
      date,
    })).toMatchObject({ eventType: "p2p_send", classification: null });
  });
  it("takes the principal from the transaction clause, not a balance", () => {
    expect(buildMoMoImportCandidate({
      address: "MTN MoMo",
      body: "Your balance is GHS 500.00. Payment made for GHS 25.00. Transaction ID: 12345678.",
      date,
    })?.principalPesewas).toBe(2500);
  });
  it("rejects a zero principal", () => {
    expect(buildMoMoImportCandidate({
      address: "MTN MoMo",
      body: "Payment made for GHS 0.00 to MELCOM. Transaction ID: 12345678.",
      date,
    })).toBeNull();
  });
  it("does not treat a merchant starting with Bank as a bank transfer", () => {
    expect(buildMoMoImportCandidate({
      address: "MTN MoMo",
      body: "Payment made for GHS 50.00 to BANKU JOINT. Transaction ID: ABCD1234.",
      date,
    })?.eventType).toBe("merchant_payment");
  });
});

describe("buildSmsReversalCaptureItems", () => {
  const range = { minDateMs: 0, maxDateMs: Number.MAX_SAFE_INTEGER };
  const date = 1_789_000_000_000;

  it("lists a reversal that names the payment it undoes", () => {
    const items = buildSmsReversalCaptureItems([
      { address: "MTN MoMo", body: "Reversal of transaction ID 12345678 for GHS 25.00 has been completed.", date },
    ], range);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ eventType: "reversal", categoryId: null, classification: null, amount: 25 });
    expect(items[0]!.description).toContain("12345678");
  });

  it("skips a reversal with no target, ordinary payments and out-of-range messages", () => {
    const items = buildSmsReversalCaptureItems([
      { address: "MTN MoMo", body: "Reversal completed for your account.", date },
      { address: "MTN MoMo", body: "Payment made for GHS 25.00 to MELCOM. Transaction ID: 12345678.", date },
      { address: "MTN MoMo", body: "Reversal of transaction ID 87654321 for GHS 5.00 has been completed.", date: 10 },
    ], { minDateMs: 1000, maxDateMs: Number.MAX_SAFE_INTEGER });
    expect(items).toEqual([]);
  });
});
