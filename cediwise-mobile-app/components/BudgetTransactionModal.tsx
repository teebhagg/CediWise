import * as Haptics from 'expo-haptics';
import { History, ReceiptText } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';


import type { BudgetBucket, BudgetCategory, BudgetTransaction } from '../types/budget';
import { AppDialog } from './AppDialog';
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
    <AppDialog
      visible={visible}
      onOpenChange={handleOpenChange}
      icon={isEditMode ? <History size={22} color="#10B981" /> : <ReceiptText size={22} color="#10B981" />}
      title={isEditMode ? 'Edit Expense' : 'Log Expense'}
      description={isEditMode ? 'Update bucket, category, amount or note.' : 'Pick a bucket and save. Category is optional if none exist yet.'}
      primaryLabel={isEditMode ? 'Update' : 'Save'}
      onPrimary={handleSubmit}
      onClose={handleClose}
    >
      <View className="gap-3">
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
              <Text className="text-[13px] text-slate-400">No categories yet. You can still save this expense.</Text>
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
      </View>
    </AppDialog>
  );
}
