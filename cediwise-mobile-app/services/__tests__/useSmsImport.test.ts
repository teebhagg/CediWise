import { useSmsImport } from "@/hooks/useSmsImport";
import type { SmsExpenseCaptureItem } from "@/services/momoSmsExpensePreview";
import { hydrateBudgetStateFromRemote } from "@/utils/budgetHydrate";

const mockImportSmsBatch = jest.fn()
const mockImportSmsMessage = jest.fn()
const mockToImportPayload = jest.fn()
const mockRecordSyncSummary = jest.fn()

const mockTrackingState = {
  optedIn: false,
  liveListenerEnabled: false,
  lastSyncAt: null,
  lastSyncSummary: null,
  providers: {},
  hydrate: jest.fn(),
  setOptedIn: jest.fn(),
  setLiveListenerEnabled: jest.fn(),
  setProviderEnabled: jest.fn(),
  recordSyncSummary: mockRecordSyncSummary,
}

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useCallback: (callback: unknown) => callback,
  useRef: (current: unknown) => ({ current }),
  useState: (initial: unknown) => [initial, jest.fn()],
}));

jest.mock("@/services/androidSmsListener", () => ({
  clearMoMoSmsListenerDebounce: jest.fn(),
  isAndroidSmsListenerAvailable: jest.fn(() => false),
  isMoMoSmsListenerActive: jest.fn(() => false),
  startMoMoSmsListener: jest.fn(() => false),
  stopMoMoSmsListener: jest.fn(),
}));

jest.mock("@/services/androidSmsPermissions", () => ({
  getReadSmsPermissionGranted: jest.fn(async () => false),
  getReceiveSmsPermissionGranted: jest.fn(async () => false),
  getSmsPermissionStatus: jest.fn(),
  requestReadSmsPermission: jest.fn(),
  requestReceiveSmsPermission: jest.fn(),
}));

jest.mock("@/services/androidSmsReader", () => ({
  isAndroidSmsReaderAvailable: jest.fn(() => false),
  queryMoMoSmsSince: jest.fn(async () => []),
}));

jest.mock("@/services/momoSmsFilters", () => ({
  filterMoMoSmsMessages: jest.fn(() => []),
  isScanEligibleSender: jest.fn(() => false),
}));

jest.mock("@/services/momoSmsExpensePreview", () => ({
  buildSmsExpenseCaptureItems: jest.fn(() => []),
}));

jest.mock("@/services/momoLiveImportNotify", () => ({
  notifyMoMoLiveImport: jest.fn(),
}));

jest.mock("@/services/smsImportClient", () => ({
  importSmsBatch: (...args: unknown[]) => mockImportSmsBatch(...args),
  importSmsMessage: (...args: unknown[]) => mockImportSmsMessage(...args),
  SmsImportClientError: class SmsImportClientError extends Error {},
  sortCandidatePayloadsOldestFirst: (payloads: unknown[]) => payloads,
  toImportPayload: (...args: unknown[]) => mockToImportPayload(...args),
}));

jest.mock("@/stores/smsTrackingStore", () => ({
  useSmsTrackingStore: Object.assign(
    (selector: (state: typeof mockTrackingState) => unknown) => selector(mockTrackingState),
    { getState: () => mockTrackingState },
  ),
  getActiveTrackingUserId: () => "user-1",
}));

jest.mock("@/utils/budgetHydrate", () => ({ hydrateBudgetStateFromRemote: jest.fn() }));
jest.mock("@/utils/featureFlags", () => ({ isFeatureEnabled: jest.fn(async () => false) }));
jest.mock("@/utils/momoLiveCatchUpStorage", () => ({
  clearLiveCatchUpAtMs: jest.fn(),
  readLiveCatchUpAtMs: jest.fn(async () => null),
  writeLiveCatchUpAtMs: jest.fn(),
}));
jest.mock("@/utils/momoLiveCatchUpWindow", () => ({ resolveLiveCatchUpMinDateMs: jest.fn(() => 0) }));
jest.mock("@/stores/budgetStore", () => ({ useBudgetStore: { getState: jest.fn(() => ({ state: null })) } }));
jest.mock("@/services/androidMoMoQueue", () => ({
  configureNativeMoMoCapture: jest.fn(),
  dismissNativeMoMoQueueItem: jest.fn(),
  enqueueNativeMoMoReview: jest.fn(),
  getNativeMoMoQueueItems: jest.fn(async () => []),
  isNativeMoMoCaptureAvailable: jest.fn(() => false),
  pauseNativeMoMoCapture: jest.fn(),
  resolveNativeMoMoQueueReview: jest.fn(),
  retryNativeMoMoQueue: jest.fn(),
}));
jest.mock("@/services/iosMomoHistoryHandoff", () => ({ IOS_MOMO_HISTORY_MAX_DAYS: 30 }));

describe("useSmsImport saveCapturedExpenses", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportSmsBatch.mockResolvedValue({
      ok: true,
      results: [],
      summary: {
        total: 0,
        parsed: 0,
        duplicate: 0,
        skipped: 0,
        failed: 0,
        needs_review: 0,
        retryable: 0,
        reversed: 0,
      },
    });
  });

  it("only submits structured payloads and counts unsupported messages as local skips", async () => {
    const unsupportedPayload = null;
    const structuredPayload = { candidate: { clientImportId: "sms-12345678" } };
    mockToImportPayload
      .mockResolvedValueOnce(unsupportedPayload)
      .mockResolvedValueOnce(structuredPayload);

    const hook = useSmsImport({ userId: "user-1" });
    const items = [
      {
        id: "unsupported",
        message: { address: "MTN", body: "unsupported body", date: 1_760_000_000_000 },
        amount: 0,
        description: "",
        categoryName: "",
        categoryId: null,
        eventType: "merchant_payment",
        classification: "expense",
        receivedAtLabel: "",
      },
      {
        id: "structured",
        message: { address: "MTN", body: "supported structured payment", date: 1_760_000_000_001 },
        amount: 1,
        description: "Payment",
        categoryName: "Others",
        categoryId: null,
        eventType: "merchant_payment",
        classification: "expense",
        receivedAtLabel: "",
      },
    ] satisfies SmsExpenseCaptureItem[];

    const summary = await hook.saveCapturedExpenses(items);

    expect(mockImportSmsBatch).toHaveBeenCalledWith([structuredPayload]);
    expect(mockImportSmsMessage).not.toHaveBeenCalled();
    expect(summary).toMatchObject({ found: 2, skipped: 1, parsed: 0 });
    expect(mockRecordSyncSummary).toHaveBeenCalledWith("user-1", summary);
  });

  it("hydrates the budget with the local state so local-only preferences survive an import", async () => {
    mockToImportPayload.mockResolvedValueOnce({ candidate: { clientImportId: "sms-12345678" } });
    mockImportSmsBatch.mockResolvedValue({
      ok: true,
      results: [],
      summary: { total: 1, parsed: 1, duplicate: 0, skipped: 0, failed: 0, needs_review: 0, retryable: 0, reversed: 0 },
    });
    const hook = useSmsImport({ userId: "user-1" });

    await hook.saveCapturedExpenses([{
      id: "structured",
      message: { address: "MTN", body: "supported structured payment", date: 1_760_000_000_001 },
      amount: 1,
      description: "Payment",
      categoryName: "Others",
      categoryId: null,
      eventType: "merchant_payment",
      classification: "expense",
      receivedAtLabel: "",
    }] satisfies SmsExpenseCaptureItem[]);

    expect(hydrateBudgetStateFromRemote).toHaveBeenCalledWith(
      "user-1",
      expect.any(Function),
      expect.objectContaining({ getLocalState: expect.any(Function) }),
    );
  });
});
