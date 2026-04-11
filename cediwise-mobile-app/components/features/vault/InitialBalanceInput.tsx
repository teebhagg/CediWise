import { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from "react";
import { Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { useAppToast } from "@/hooks/useAppToast";
import { AppTextField } from "@/components/AppTextField";

export type InitialBalanceInputVariant = "standalone" | "appDialog";

export type InitialBalanceInputRef = {
  /** Validates, saves, toasts; throws after validation toast so callers (e.g. AppDialog) skip success haptic. */
  submit: () => Promise<void>;
};

export type InitialBalanceInputProps = {
  initialValue: number;
  onSave: (amount: number) => Promise<void>;
  /** Called after `onSave` completes successfully and the success toast is shown. */
  onSaved?: () => void;
  disabled?: boolean;
  /** `appDialog`: field only — use with `AppDialog` primary + `ref.submit()`. */
  variant?: InitialBalanceInputVariant;
  /** When `variant` is `appDialog`, disables the field while parent runs primary action. */
  submitLocked?: boolean;
};

export const InitialBalanceInput = forwardRef<
  InitialBalanceInputRef,
  InitialBalanceInputProps
>(function InitialBalanceInput(
  {
    initialValue,
    onSave,
    onSaved,
    disabled,
    variant = "standalone",
    submitLocked = false,
  },
  ref,
) {
  const toast = useAppToast();
  const [raw, setRaw] = useState(
    initialValue > 0 ? String(initialValue) : "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRaw(initialValue > 0 ? String(initialValue) : "");
  }, [initialValue]);

  const persist = useCallback(async () => {
    const n = Number(String(raw).replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      toast.showError("Enter a valid amount (0 or more).");
      throw new Error("invalid_amount");
    }
    setSaving(true);
    try {
      await onSave(n);
      toast.showSuccess("Starting balance saved.");
      onSaved?.();
    } catch {
      toast.showError("Could not save. Try again when online.");
      throw new Error("save_failed");
    } finally {
      setSaving(false);
    }
  }, [raw, onSave, onSaved, toast]);

  useImperativeHandle(
    ref,
    () => ({
      submit: persist,
    }),
    [persist],
  );

  const handleSave = useCallback(async () => {
    try {
      await persist();
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message === "invalid_amount" || e.message === "save_failed")
      ) {
        return;
      }
      throw e;
    }
  }, [persist]);

  const fieldDisabled = disabled || saving || (variant === "appDialog" && submitLocked);

  return (
    <View className={variant === "standalone" ? "gap-3" : ""}>
      {variant === "standalone" ? (
        <Text className="text-white/70 text-sm leading-5">
          How much have you already saved? (Bank, Momo, Susu, cash — your best
          estimate.) This is only used inside CediWise; it does not connect to
          your accounts.
        </Text>
      ) : null}
      <AppTextField
        label="Starting balance"
        value={raw}
        onChangeText={setRaw}
        keyboardType="decimal-pad"
        placeholder="0.00"
        placeholderTextColor="rgba(255,255,255,0.35)"
        editable={!fieldDisabled}
        returnKeyType="done"
        className="rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-white text-lg"
      />
      {variant === "standalone" ? (
        <PrimaryButton
          onPress={handleSave}
          disabled={disabled}
          loading={saving}>
          <Text className="text-slate-950 font-semibold">Save starting balance</Text>
        </PrimaryButton>
      ) : null}
    </View>
  );
});
