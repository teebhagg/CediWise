import * as Haptics from 'expo-haptics';
import { ChevronDown, ListPlus, Plus, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button, Card } from 'heroui-native';

import { CustomBottomSheet } from '@/components/common/CustomBottomSheet';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useBudgetStore } from '@/stores/budgetStore';
import type { BudgetBucket, BudgetCategory, DraftBudgetTransaction } from '@/types/budget';
import { formatCurrency } from '@/utils/formatCurrency';

type Props = {
  visible: boolean;
  categories: BudgetCategory[];
  initialBucket?: BudgetBucket;
  onClose: () => void;
  onSubmitAll: () => Promise<void>;
};

export function BatchTransactionModal({
  visible,
  categories,
  initialBucket = 'needs',
  onClose,
  onSubmitAll,
}: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [bucket, setBucket] = useState<BudgetBucket>(initialBucket);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const amountInputRef = useRef<TextInput>(null);
  const [categoryByBucket, setCategoryByBucket] = useState<Record<BudgetBucket, string | null>>({
    needs: null,
    wants: null,
    savings: null,
  });

  const draftItems = useBudgetStore((s) => s.draftBatchTransactions);
  const lastUsedBucket = useBudgetStore((s) => s.lastUsedBucket);
  const lastUsedCategoryId = useBudgetStore((s) => s.lastUsedCategoryId);

  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Problem: Performance & UX lookup map
  const categoryMap = useMemo(() => {
    const map = new Map<string, BudgetCategory>();
    for (const c of categories) map.set(c.id, c);
    return map;
  }, [categories]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const isKeyboardVisible = keyboardHeight > 0;

  // Toggle dropdown with animation
  const toggleCategoryPicker = useCallback(() => {
    try {
      Haptics.selectionAsync();
    } catch {}
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCategoryPicker(prev => !prev);
  }, []);

  const draftListMaxHeight = useMemo(() => {
    if (isKeyboardVisible) {
      // Shrunk space: give at least some room but don't explode
      return Math.max(80, windowHeight * 0.12);
    }
    // If picker is open, shrink draft list to give room
    if (showCategoryPicker) return 120;
    return 240; 
  }, [isKeyboardVisible, windowHeight, showCategoryPicker]);

  const bucketCategories = useMemo(
    () => categories.filter((c) => c.bucket === bucket),
    [bucket, categories]
  );

  const selectedCategory = useMemo(
    () => bucketCategories.find((c) => c.id === categoryId) ?? null,
    [bucketCategories, categoryId]
  );

  useEffect(() => {
    if (visible) {
      setFormError(undefined);
      setAmount('');
      setNote('');
      const initialB = lastUsedBucket ?? initialBucket;
      setBucket(initialB);
      setCategoryId(lastUsedCategoryId ?? null);
      setShowCategoryPicker(false);
      setEditingItemId(null);

      // Problem 6: Initialize the map
      if (lastUsedCategoryId) {
        setCategoryByBucket(prev => ({ ...prev, [initialB]: lastUsedCategoryId }));
      }
    }
  }, [visible, initialBucket, lastUsedBucket, lastUsedCategoryId]);

  useEffect(() => {
    if (!visible) return;
    if (bucketCategories.length > 0 && !categoryId) {
      setCategoryId(bucketCategories[0].id);
    } else if (bucketCategories.length === 0) {
      setCategoryId(null);
    }
  }, [bucketCategories, categoryId, visible]);

  const handleBucketPress = async (next: BudgetBucket) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    
    // Problem 6: Save current category for current bucket before switching
    setCategoryByBucket(prev => ({ ...prev, [bucket]: categoryId }));
    
    setBucket(next);
    // Restore previous selection for this bucket if exists
    setCategoryId(categoryByBucket[next]);
    
    // Auto-close picker on bucket change for cleanliness
    if (showCategoryPicker) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowCategoryPicker(false);
    }
  };

  const handleCategorySelect = async (id: string) => {
    try {
      await Haptics.selectionAsync();
    } catch {}
    setCategoryId(id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCategoryPicker(false);
  };

  const handleAddToList = async () => {
    const parsed = Number(amount);
    if (!amount || !Number.isFinite(parsed) || parsed <= 0) {
      setFormError('Enter a valid amount');
      return;
    }
    if (bucketCategories.length > 0 && !categoryId) {
      setFormError('Pick a category');
      return;
    }
    setFormError(undefined);

    try {
      await Haptics.selectionAsync();
    } catch {}

    const item: Omit<DraftBudgetTransaction, 'tempId'> = {
      bucket,
      categoryId,
      amount: parsed,
      note: note.trim() ? note.trim() : null,
      occurredAt: new Date().toISOString(),
    };
    
    if (editingItemId) {
      useBudgetStore.getState().updateDraftBatchItem(editingItemId, item);
      setEditingItemId(null);
    } else {
      useBudgetStore.getState().addToDraftBatch(item);
    }
    
    useBudgetStore.getState().setLastUsedBucket(bucket);
    if (categoryId) {
      useBudgetStore.getState().setLastUsedCategory(categoryId);
    }

    setAmount('');
    setNote('');
    // Close picker if it was open
    if (showCategoryPicker) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowCategoryPicker(false);
    }
    setTimeout(() => amountInputRef.current?.focus(), 100);
  };

  const handleRemoveItem = (tempId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    useBudgetStore.getState().removeFromDraftBatch(tempId);
  };

  // Problem 4: Edit draft item
  const handleEditDraftItem = (item: DraftBudgetTransaction) => {
    setAmount(String(item.amount));
    setNote(item.note ?? '');
    setBucket(item.bucket);
    setCategoryId(item.categoryId ?? null);
    setEditingItemId(item.tempId);
    setTimeout(() => amountInputRef.current?.focus(), 100);
  };

  const handleSaveAll = async () => {
    if (draftItems.length === 0 || isSaving) return;
    setIsSaving(true);
    try {
      await onSubmitAll();
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSaving(false);
    }
  };

  const categoryName = useCallback(
    (catId: string | null | undefined) => {
      if (!catId) return 'Uncategorized';
      return categoryMap.get(catId)?.name ?? 'Uncategorized';
    },
    [categoryMap]
  );

  const totalAmount = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.amount, 0),
    [draftItems]
  );

  const bucketLabel = (b: BudgetBucket) =>
    b === 'needs' ? 'Needs' : b === 'wants' ? 'Wants' : 'Savings';

  return (
    <CustomBottomSheet
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
      title="Batch Expense"
      description="Add multiple expenses at once."
    >
      <View style={styles.container}>
        {/* Quick Add Form */}
        <View style={styles.formSection}>
          {/* Bucket Pills */}
          <View style={styles.bucketRow}>
            {(['needs', 'wants', 'savings'] as const).map((b) => (
              <Pressable
                key={b}
                onPress={() => handleBucketPress(b)}
                style={[
                  styles.bucketPill,
                  bucket === b && styles.bucketPillActive,
                ]}
                hitSlop={8}
                accessibilityLabel={`${bucketLabel(b)} bucket`}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.bucketPillText,
                    bucket === b && styles.bucketPillTextActive,
                  ]}
                >
                  {bucketLabel(b)}
                </Text>
              </Pressable>
               ))}
            </View>

          {/* Inline Category Picker (Accordion) */}
          <Pressable
            style={[
              styles.categoryDropdown,
              showCategoryPicker && styles.categoryDropdownOpen,
            ]}
            onPress={toggleCategoryPicker}
            hitSlop={8}
            accessibilityLabel="Select category"
            accessibilityRole="button"
            accessibilityState={{ expanded: showCategoryPicker }}
          >
            <Text
              style={[
                styles.categoryDropdownText,
                !selectedCategory && styles.categoryDropdownPlaceholder,
              ]}
              numberOfLines={1}
            >
              {selectedCategory?.name ?? (bucketCategories.length === 0 ? 'No categories' : 'Select category')}
            </Text>
            <ChevronDown 
              size={18} 
              color="#64748b" 
              style={{ transform: [{ rotate: showCategoryPicker ? '180deg' : '0deg' }] }}
            />
          </Pressable>

          {showCategoryPicker && (
            <View style={[styles.inlinePicker, { shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 10 }]}>
              <ScrollView 
                style={styles.inlinePickerScroll} 
                showsVerticalScrollIndicator={true}
                indicatorStyle="white"
                nestedScrollEnabled
              >
                {bucketCategories.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.inlinePickerItem,
                      categoryId === item.id && styles.inlinePickerItemActive,
                    ]}
                    onPress={() => handleCategorySelect(item.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: categoryId === item.id }}
                  >
                    <Text
                      style={[
                        styles.inlinePickerItemText,
                        categoryId === item.id && styles.inlinePickerItemTextActive,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </Pressable>
                ))}
                {bucketCategories.length === 0 && (
                  <Text style={styles.noCategories}>No categories in this bucket</Text>
                )}
              </ScrollView>
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.amountWrap}>
            <Text style={styles.currencyPrefix}>GHS</Text>
            <TextInput
              ref={amountInputRef}
              style={styles.amountInput}
              value={amount}
              onChangeText={(t) => {
                setAmount(t);
                if (formError) setFormError(undefined);
              }}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#475569"
              returnKeyType="done"
              accessibilityLabel="Amount"
            />
          </View>

          {/* Note Input */}
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Note (optional)"
            placeholderTextColor="#475569"
            returnKeyType="done"
            accessibilityLabel="Note"
          />

          {formError ? (
            <Text style={styles.errorText}>{formError}</Text>
          ) : null}

          {/* Add to List Button */}
          <Button
            variant="primary"
            size="md"
            onPress={handleAddToList}
            className="w-full h-12 rounded-xl bg-emerald-500"
          >
            <Plus size={18} color="#020617" />
            <Button.Label className="font-semibold text-slate-950">
              {editingItemId ? 'Update Expense' : 'Add to List'}
            </Button.Label>
          </Button>
        </View>

        {/* Empty State Hint */}
        {draftItems.length === 0 && (
          <View style={styles.emptyHint}>
            <Text style={styles.emptyHintText}>
              Add expenses above, then tap "Save All" to log them together.
            </Text>
          </View>
        )}

        {/* Draft List */}
        {draftItems.length > 0 && (
          <View style={styles.listSection}>
            <View style={styles.listHeader}>
              <Text style={styles.listHeaderTitle}>Added ({draftItems.length})</Text>
            </View>

            <ScrollView 
              style={[styles.draftList, { maxHeight: draftListMaxHeight }]} 
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {draftItems.map((item) => (
                <Pressable 
                  key={item.tempId} 
                  onPress={() => handleEditDraftItem(item)}
                  style={{ marginBottom: 8 }}
                >
                  <Card className={`flex-row items-center justify-between p-3.5 rounded-2xl bg-[#1e293b]/70 border ${editingItemId === item.tempId ? 'border-emerald-500/70' : 'border-white/5'}`}>
                    <View style={styles.draftItemLeft}>
                      <Text style={styles.draftItemCategory} numberOfLines={1}>
                        {categoryName(item.categoryId)}
                      </Text>
                      <View style={styles.draftItemMeta}>
                        <Text style={styles.draftItemBucket}>{bucketLabel(item.bucket)}</Text>
                        {item.note ? (
                          <>
                            <Text style={styles.draftItemDot}>·</Text>
                            <Text style={styles.draftItemNote} numberOfLines={1}>
                              {item.note}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.draftItemRight}>
                      <Text style={styles.draftItemAmount}>
                        ₵{formatCurrency(item.amount)}
                      </Text>
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveItem(item.tempId);
                        }}
                        style={styles.removeBtn}
                        hitSlop={8}
                        accessibilityLabel="Remove item"
                        accessibilityRole="button"
                      >
                        <X size={14} color="#94a3b8" />
                      </Pressable>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </ScrollView>

            {/* Total */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₵{formatCurrency(totalAmount)}</Text>
            </View>
          </View>
        )}
        {/* Save Button */}
        <PrimaryButton
          onPress={handleSaveAll}
          disabled={draftItems.length === 0 || isSaving}
          loading={isSaving}
          className={`mt-2 ${draftItems.length === 0 || isSaving ? 'bg-emerald-500/50' : 'bg-emerald-500'}`}
        >
          <Text>
          Save All ({draftItems.length})
          </Text>
        </PrimaryButton>
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  formSection: {
    gap: 12,
  },
  bucketRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bucketPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    alignItems: 'center',
  },
  bucketPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  bucketPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  bucketPillTextActive: {
    color: '#f1f5f9',
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 48,
  },
  categoryDropdownText: {
    flex: 1,
    fontSize: 15,
    color: '#f1f5f9',
  },
  categoryDropdownPlaceholder: {
    color: '#64748b',
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    minHeight: 48,
  },
  currencyPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#f1f5f9',
    paddingVertical: 0,
  },
  noteInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#f1f5f9',
    minHeight: 48,
  },
  errorText: {
    color: '#f87171',
    fontSize: 12,
    textAlign: 'center',
  },
  listSection: {
    gap: 0,
  },
  listHeader: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  listHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  draftList: {
    // maxHeight is dynamic
  },
  draftItemLeft: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 10,
  },
  draftItemCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  draftItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  draftItemBucket: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  draftItemDot: {
    fontSize: 11,
    color: '#475569',
  },
  draftItemNote: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
  },
  draftItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  draftItemAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f87171',
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  emptyHint: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    alignItems: 'center',
  },
  emptyHintText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryDropdownOpen: {
    borderColor: '#10b981',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 0,
  },
  inlinePicker: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    marginBottom: 12,
    maxHeight: 160,
    overflow: 'hidden',
  },
  inlinePickerScroll: {
    padding: 8,
  },
  inlinePickerItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  inlinePickerItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  inlinePickerItemText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  inlinePickerItemTextActive: {
    color: '#10b981',
    fontWeight: '600',
  },
  noCategories: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
});
