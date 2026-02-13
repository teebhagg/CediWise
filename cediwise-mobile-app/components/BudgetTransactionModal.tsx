import * as Haptics from 'expo-haptics';
import { Button, Dialog } from 'heroui-native';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { BlurView } from 'expo-blur';
import type { BudgetBucket, BudgetCategory, BudgetTransaction } from '../types/budget';
import { AppTextField } from './AppTextField';

type Props = {
  visible: boolean;
  categories: BudgetCategory[];
  initialBucket?: BudgetBucket;
  /** When set, modal is in edit mode: prefills from this transaction and calls onUpdate on submit */
  initialTransaction?: BudgetTransaction | null;
  onClose: () => void;
  onSubmit: (payload: { amount: number; note?: string; bucket: BudgetBucket; categoryId?: string | null }) => void;
  onUpdate?: (
    id: string,
    payload: { amount: number; note?: string; bucket: BudgetBucket; categoryId?: string | null; occurredAt: string }
  ) => void;
};

export function BudgetTransactionModal({
  visible,
  categories,
  initialBucket = 'needs',
  initialTransaction = null,
  onClose,
  onSubmit,
  onUpdate,
}: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [bucket, setBucket] = useState<BudgetBucket>(initialBucket);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  const bucketCategories = useMemo(
    () => categories.filter((c) => c.bucket === bucket),
    [bucket, categories]
  );

  const isEditMode = !!initialTransaction;

  useEffect(() => {
    if (visible) {
      setError(undefined);
      if (initialTransaction) {
        setAmount(String(initialTransaction.amount));
        setNote(initialTransaction.note ?? '');
        setBucket(initialTransaction.bucket);
        setCategoryId(initialTransaction.categoryId ?? null);
      } else {
        setAmount('');
        setNote('');
        setBucket(initialBucket);
        setCategoryId(null);
      }
    }
  }, [visible, initialBucket, initialTransaction]);

  useEffect(() => {
    if (!isEditMode && bucketCategories.length > 0 && !categoryId) {
      setCategoryId(bucketCategories[0].id);
    } else if (bucketCategories.length === 0) {
      setCategoryId(null);
    }
  }, [bucketCategories, isEditMode, categoryId]);

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

  const handleBucketPress = async (next: BudgetBucket) => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setBucket(next);
  };

  const handleCategoryPress = async (id: string) => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setCategoryId(id);
  };

  const handleSubmit = async () => {
    const parsed = Number(amount);
    if (!amount || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (bucketCategories.length > 0 && !categoryId) {
      setError('Pick a category');
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // ignore
    }
    if (isEditMode && initialTransaction && onUpdate) {
      onUpdate(initialTransaction.id, {
        amount: parsed,
        note: note.trim() ? note.trim() : undefined,
        bucket,
        categoryId,
        occurredAt: initialTransaction.occurredAt,
      });
    } else {
      onSubmit({
        amount: parsed,
        note: note.trim() ? note.trim() : undefined,
        bucket,
        categoryId,
      });
    }
    onClose();
  };

  return (
    <Dialog isOpen={visible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/60" />
        <BlurView intensity={7} tint="dark" className="absolute inset-0" onTouchEnd={handleClose} />
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1, justifyContent: 'center' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
        >
          <Dialog.Content
            className="max-w-[380px] w-full rounded-xl overflow-hidden bg-slate-900/95 p-0"
            style={styles.contentShadow}
          >
            <Dialog.Close
              variant="ghost"
              className="absolute top-4 right-4 w-10 h-10 rounded-full z-10"
              onPress={handleClose}
            />
            <View className="px-7 pt-[45px] pb-7 gap-3">
              <Dialog.Title className="text-[26px] font-bold text-slate-200 mb-1.5 text-center">
                {isEditMode ? 'Edit Expense' : 'Log Expense'}
              </Dialog.Title>
              <Dialog.Description className="text-[15px] text-slate-400 mb-3 text-center leading-[22px]">
                {isEditMode ? 'Update bucket, category, amount or note.' : 'Pick a bucket + category and save.'}
              </Dialog.Description>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Bucket
                </Text>
                <View className="flex-row gap-2.5">
                  {(['needs', 'wants', 'savings'] as const).map((b) => (
                    <Pressable
                      key={b}
                      onPress={() => handleBucketPress(b)}
                      className={`px-3 py-2.5 rounded-full border ${bucket === b
                        ? 'bg-emerald-500/20 border-emerald-500/45'
                        : 'bg-slate-400/15 border-slate-400/25'
                        }`}
                    >
                      <Text
                        className={`text-[13px] ${bucket === b ? 'text-slate-50' : 'text-slate-300'}`}
                      >
                        {b === 'needs' ? 'Needs' : b === 'wants' ? 'Wants' : 'Savings'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View className="gap-1.5">
                <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Category
                </Text>
                <View className="flex-row flex-wrap gap-2.5">
                  {bucketCategories.length === 0 ? (
                    <Text className="text-[13px] text-slate-400">No categories yet.</Text>
                  ) : (
                    bucketCategories.map((c) => (
                      <Pressable
                        key={c.id}
                        onPress={() => handleCategoryPress(c.id)}
                        className={`px-3 py-2.5 rounded-full border ${categoryId === c.id
                          ? 'bg-emerald-500/20 border-emerald-500/45'
                          : 'bg-slate-400/15 border-slate-400/25'
                          }`}
                      >
                        <Text
                          className={`text-[13px] ${categoryId === c.id ? 'text-slate-50' : 'text-slate-300'}`}
                        >
                          {c.name}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              </View>

              <AppTextField
                label="Amount (GHS)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                returnKeyType="done"
              />

              <AppTextField
                label="Note (optional)"
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Groceries at Melcom"
                returnKeyType="done"
              />

              {error ? (
                <Text className="text-red-300 text-xs mt-1 text-center">{error}</Text>
              ) : null}

              <Button variant="primary" onPress={handleSubmit} className="mt-1.5 h-12 rounded-full bg-emerald-500">
                <Button.Label className="text-slate-900 font-semibold">{isEditMode ? 'Update' : 'Save'}</Button.Label>
              </Button>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  contentShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 18 },
    }),
  },
});
