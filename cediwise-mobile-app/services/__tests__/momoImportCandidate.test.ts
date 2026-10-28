import { buildMoMoImportCandidate } from "../momoImportCandidate";

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
