import { GlassView } from "@/components/GlassView";
import * as Haptics from "expo-haptics";
import { Button, Dialog } from "heroui-native";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";

import type { BudgetBucket } from "../types/budget";
import { AppTextField } from "./AppTextField";

const BUCKETS: { value: BudgetBucket; label: string }[] = [
  { value: "needs", label: "Needs" },
  { value: "wants", label: "Wants" },
  { value: "savings", label: "Savings" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (params: { name: string; bucket: BudgetBucket; limitAmount: number }) => void;
};

export function AddCustomCategoryModal({
  visible,
  onClose,
  onAdd,
}: Props) {
  const [name, setName] = useState("");
  const [bucket, setBucket] = useState<BudgetBucket>("wants");
  const [limitAmount, setLimitAmount] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setName("");
      setBucket("wants");
      setLimitAmount("");
      setNameError(undefined);
    }
  }, [visible]);

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleClose = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    onClose();
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Enter a category name");
      return;
    }
    setNameError(undefined);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    const limit = Number(limitAmount);
    onAdd({
      name: trimmed,
      bucket,
      limitAmount: Number.isFinite(limit) && limit >= 0 ? limit : 0,
    });
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <GlassView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1, justifyContent: "center" }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 40}
        >
          <Dialog.Content className="w-full rounded-xl bg-slate-900/95 p-6">
            <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10"
              onPress={handleClose}
            />
            <View className="mb-5">
              <Dialog.Title className="text-white text-xl font-bold tracking-tight">
                Add custom category
              </Dialog.Title>
            </View>

            <AppTextField
              label="Name"
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (nameError) setNameError(undefined);
              }}
              placeholder="e.g. Pet care, Hobbies"
              error={nameError}
              autoCapitalize="words"
            />

            <Text className="text-slate-400 font-medium text-sm mt-4 mb-2">Bucket</Text>
            <View className="flex-row flex-wrap gap-2.5 mb-4">
              {BUCKETS.map((b) => (
                <Pressable
                  key={b.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
                    setBucket(b.value);
                  }}
                  className={`px-4 py-2.5 rounded-full border active:opacity-90 ${bucket === b.value
                    ? "bg-emerald-500/20 border-emerald-500/40"
                    : "bg-slate-400/10 border-slate-400/20"
                    }`}
                >
                  <Text
                    className={
                      bucket === b.value
                        ? "text-emerald-400 font-medium text-sm"
                        : "text-slate-400 font-medium text-sm"
                    }
                  >
                    {b.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <AppTextField
              label="Monthly limit (GHS) — optional"
              value={limitAmount}
              onChangeText={setLimitAmount}
              placeholder="0"
              keyboardType="decimal-pad"
              containerClassName="mt-4"
            />

            <Button variant="primary" onPress={handleAdd} className="mt-6 h-12 rounded-full bg-emerald-500">
              <Button.Label className="text-slate-900 font-semibold">Add category</Button.Label>
            </Button>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  );
}
