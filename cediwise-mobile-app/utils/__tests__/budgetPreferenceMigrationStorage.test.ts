import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isBudgetPreferenceMigrationSkipped,
  setBudgetPreferenceMigrationSkipped,
} from "@/utils/budgetPreferenceMigrationStorage";

describe("budgetPreferenceMigrationStorage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns false before skip is set", async () => {
    await expect(
      isBudgetPreferenceMigrationSkipped("user-a", "cycle-1")
    ).resolves.toBe(false);
  });

  it("returns true after setBudgetPreferenceMigrationSkipped", async () => {
    await setBudgetPreferenceMigrationSkipped("user-a", "cycle-1");
    await expect(
      isBudgetPreferenceMigrationSkipped("user-a", "cycle-1")
    ).resolves.toBe(true);
  });

  it("scopes skip by userId and cycleId", async () => {
    await setBudgetPreferenceMigrationSkipped("user-a", "cycle-1");
    await expect(
      isBudgetPreferenceMigrationSkipped("user-b", "cycle-1")
    ).resolves.toBe(false);
    await expect(
      isBudgetPreferenceMigrationSkipped("user-a", "cycle-2")
    ).resolves.toBe(false);
  });

  it("treats storage errors as not skipped (read)", async () => {
    const spy = jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("disk"));
    await expect(
      isBudgetPreferenceMigrationSkipped("u", "c")
    ).resolves.toBe(false);
    spy.mockRestore();
  });

  it("swallows errors on write", async () => {
    const spy = jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("disk"));
    await expect(
      setBudgetPreferenceMigrationSkipped("u", "c")
    ).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
