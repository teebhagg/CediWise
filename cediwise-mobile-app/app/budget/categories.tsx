import { BackButton } from '@/components/BackButton';
import { AppDialog } from '@/components/AppDialog';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { StandardHeader } from '@/components/CediWiseHeader';
import { CategorySelectBottomSheet } from '@/components/features/budget/CategorySelectBottomSheet';
import { BudgetReconcileSheet } from '@/components/features/budget/BudgetReconcileSheet';
import { BudgetNwsAdjustSheet } from '@/components/features/budget/BudgetNwsAdjustSheet';
import { BudgetSurvivalSheet } from '@/components/features/budget/BudgetSurvivalSheet';
import { EditCategoryLimitBottomSheet } from '@/components/features/budget/EditCategoryLimitBottomSheet';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { CATEGORY_ICON_COLORS, getCategoryIcon } from '@/constants/categoryIcons';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import type { BudgetBucket, BudgetCategory } from '@/types/budget';
import { computeSuggestedLimit } from '@/utils/spendingPatternsLogic';
import { formatCurrency } from '@/utils/formatCurrency';
import * as Haptics from 'expo-haptics';
import { Check, MoreVertical, AlertTriangle, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { isPlanOverTakeHomePay } from '@/utils/budgetPlanValidation';
import {
  CategoryBucketFilterBar,
  bucketFilterIcon,
  bucketFilterLabel,
  CATEGORY_FILTER_BAR_HEIGHT,
  type CategoryFilterKey,
} from '@/components/features/budget/CategoryBucketFilterBar';
import { categoryListContentStyle } from '@/utils/categoryListLayout';
import { getStandardHeaderWithBottomBodyOffsetTop, getStandardHeaderBodyOffsetTop } from '@/utils/screenHeaderInsets';
import { Pressable, Text, View } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Menu } from 'heroui-native';

const BUCKET_ORDER: BudgetBucket[] = ['needs', 'wants', 'savings'];
const CATEGORY_CARD_ESTIMATED_HEIGHT = 88;
const SECTION_ROW_ESTIMATED_HEIGHT = 36;

function categoryIconBackgroundColor(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash + categoryId.charCodeAt(i)) | 0;
  }
  return CATEGORY_ICON_COLORS[Math.abs(hash) % CATEGORY_ICON_COLORS.length];
}

type CategoryListRow =
  | { kind: 'section'; id: string; bucket: BudgetBucket; count: number }
  | { kind: 'category'; id: string; category: BudgetCategory };

export default function BudgetCategoriesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { modals, derived, budget, ui } = useBudgetScreenState();
  const {
    showReconcileSheet,
    setShowReconcileSheet,
    setShowRebalancePreview,
    handleApplyRebalance,
    handleDismissReconcileSheet,
    handleCloseReconcileSheet,
  } = modals;
  const [filter, setFilter] = useState<CategoryFilterKey>('all');
  const listRef = useRef<FlashListRef<CategoryListRow>>(null);
  const skipInitialFilterScrollRef = useRef(true);
  const [showCategorySelectSheet, setShowCategorySelectSheet] = useState(false);
  const [showAddCategoryBlockedDialog, setShowAddCategoryBlockedDialog] =
    useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [multiDeleteLoading, setMultiDeleteLoading] = useState(false);

  const flatCategories = useMemo(
    () => [
      ...derived.categoriesByBucket.needs,
      ...derived.categoriesByBucket.wants,
      ...derived.categoriesByBucket.savings,
    ],
    [derived.categoriesByBucket],
  );

  const listRowsByFilter = useMemo(() => {
    const toCategoryRows = (categories: BudgetCategory[]): CategoryListRow[] =>
      categories.map((category) => ({
        kind: 'category' as const,
        id: category.id,
        category,
      }));

    const allRows: CategoryListRow[] = [];
    for (const bucket of BUCKET_ORDER) {
      const bucketCategories = derived.categoriesByBucket[bucket];
      if (bucketCategories.length === 0) continue;
      allRows.push({
        kind: 'section',
        id: `section-${bucket}`,
        bucket,
        count: bucketCategories.length,
      });
      for (const category of bucketCategories) {
        allRows.push({ kind: 'category', id: category.id, category });
      }
    }

    return {
      all: allRows,
      needs: toCategoryRows(derived.categoriesByBucket.needs),
      wants: toCategoryRows(derived.categoriesByBucket.wants),
      savings: toCategoryRows(derived.categoriesByBucket.savings),
    };
  }, [derived.categoriesByBucket]);

  const listRows = listRowsByFilter[filter];

  const headerPadding = getStandardHeaderWithBottomBodyOffsetTop(insets.top, {
    bottomHeight: CATEGORY_FILTER_BAR_HEIGHT,
  });

  const bucketCounts = useMemo(
    () => ({
      all: flatCategories.length,
      needs: derived.categoriesByBucket.needs.length,
      wants: derived.categoriesByBucket.wants.length,
      savings: derived.categoriesByBucket.savings.length,
    }),
    [derived.categoriesByBucket, flatCategories.length],
  );

  const planOverTakeHome = useMemo(
    () => isPlanOverTakeHomePay(derived.planValidation),
    [derived.planValidation],
  );

  const handleFilterChange = useCallback((key: CategoryFilterKey) => {
    startTransition(() => {
      setFilter(key);
    });
  }, []);

  useEffect(() => {
    if (skipInitialFilterScrollRef.current) {
      skipInitialFilterScrollRef.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [filter]);

  const listContentStyle = useMemo(
    () =>
      categoryListContentStyle({
        itemCount: listRows.length,
        headerOffsetTop: headerPadding,
      }),
    [headerPadding, listRows.length],
  );

  const handleAddNewCategoryPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowOptionsMenu(false);
    if (planOverTakeHome) {
      setShowAddCategoryBlockedDialog(true);
      return;
    }
    setShowCategorySelectSheet(true);
  }, [planOverTakeHome]);

  const selectedCategories = useMemo(
    () => flatCategories.filter((c) => selectedIds.has(c.id)),
    [flatCategories, selectedIds],
  );

  const selectedCount = selectedCategories.length;

  const exitManageMode = () => {
    setIsManaging(false);
    setSelectedIds(new Set());
  };

  const toggleSelectCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmMultiDelete = async () => {
    if (!selectedCount || multiDeleteLoading) return;
    setMultiDeleteLoading(true);
    try {
      const ids = selectedCategories.map((c) => c.id);
      await budget.deleteCategories(ids);
      await budget.reload();
      exitManageMode();
      setShowMultiDeleteConfirm(false);
    } finally {
      setMultiDeleteLoading(false);
    }
  };

  const multiDeleteDescription = useMemo(() => {
    if (!selectedCount) {
      return 'No categories selected.';
    }
    const names = selectedCategories.map((c) => c.name);
    const preview = names.slice(0, 3).join(', ');
    const extra = names.length > 3 ? `, +${names.length - 3} more` : '';
    return `The selected categories will be removed from this cycle. Past transactions will stay in your history but will no longer be linked to these categories.\n\n${preview}${extra}`;
  }, [selectedCount, selectedCategories]);

  const categoryListHeader = useMemo(
    () => (
      <View className="gap-2 pb-1">
        <View>
          <Text className="text-white text-2xl font-bold">Budget Categories</Text>
          <Text className="text-slate-400 text-sm mt-2">
            Tap a bucket to jump or filter. Tap again to show all.
          </Text>
        </View>
      </View>
    ),
    [],
  );

  const categoryListEmpty = useMemo(() => {
    const bucketLabel =
      filter === 'all' ? null : bucketFilterLabel(filter);
    return (
      <Card>
        <Text className="text-white text-base font-semibold">
          {bucketLabel ? `No ${bucketLabel.toLowerCase()} categories` : 'No categories yet'}
        </Text>
        <Text className="text-slate-400 text-sm mt-2">
          {bucketLabel
            ? `Add a ${bucketLabel.toLowerCase()} line or switch back to All.`
            : 'Add your first category to start tracking this cycle.'}
        </Text>
      </Card>
    );
  }, [filter]);

  const filterBar = (
    <CategoryBucketFilterBar
      active={filter}
      counts={bucketCounts}
      onChange={handleFilterChange}
    />
  );

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Categories" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: getStandardHeaderBodyOffsetTop(insets.top) }}>
          <Text className="text-slate-400 mt-8 text-center">Sign in to manage categories.</Text>
        </View>
      </View>
    );
  }

  if (!derived.activeCycleId) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Categories" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: getStandardHeaderBodyOffsetTop(insets.top) }}>
          <Text className="text-slate-400 mt-8 text-center">
            Set up your budget cycle first.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <StandardHeader
        title={isManaging ? 'Manage Categories' : 'Categories'}
        leading={
          isManaging ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                exitManageMode();
              }}
              style={{ paddingHorizontal: 4, paddingVertical: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel manage categories"
              className="w-22"
            >
              <Text className="text-slate-200 text-sm font-medium">Cancel</Text>
            </Button>
          ) : (
            <BackButton />
          )
        }
        centered
        bottom={filterBar}
        bottomHeight={CATEGORY_FILTER_BAR_HEIGHT}
        actions={
          isManaging
            ? [
                <Pressable
                  key="delete"
                  disabled={!selectedCount || multiDeleteLoading}
                  onPress={() => {
                    if (!selectedCount || multiDeleteLoading) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    setShowMultiDeleteConfirm(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedCount
                      ? `Delete ${selectedCount} selected ${selectedCount === 1 ? 'category' : 'categories'}`
                      : 'Delete selected categories'
                  }
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: -8,
                    backgroundColor: selectedCount
                      ? 'rgba(244,63,94,0.15)'
                      : 'rgba(244,63,94,0.08)',
                    borderWidth: 1,
                    borderColor: selectedCount
                      ? 'rgba(251,113,133,0.6)'
                      : 'rgba(251,113,133,0.28)',
                    opacity: !selectedCount || multiDeleteLoading ? 0.5 : pressed ? 0.85 : 1,
                    transform: [{ scale: pressed && selectedCount ? 0.97 : 1 }],
                  })}
                >
                  <Trash2 size={20} color="#fb7185" strokeWidth={2.2} />
                  {selectedCount > 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        minWidth: 18,
                        height: 18,
                        paddingHorizontal: 4,
                        borderRadius: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(225,29,72,0.95)',
                        borderWidth: 1,
                        borderColor: 'rgba(254,205,211,0.55)',
                      }}
                    >
                      <Text
                        style={{
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: '700',
                          lineHeight: 13,
                        }}
                      >
                        {selectedCount}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>,
              ]
            : [
                <Menu
                  key="options"
                  presentation="popover"
                  isOpen={showOptionsMenu}
                  onOpenChange={setShowOptionsMenu}
                >
                  <Menu.Trigger asChild>
                    <Pressable
                      style={({ pressed }) => ({
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: -8,
                        backgroundColor: pressed ? 'rgba(71,85,105,0.4)' : 'transparent',
                      })}
                      accessibilityRole="button"
                      accessibilityLabel="Options"
                    >
                      <MoreVertical size={22} color="#e2e8f0" strokeWidth={2} />
                    </Pressable>
                  </Menu.Trigger>
                  <Menu.Portal>
                    <Menu.Overlay />
                    <Menu.Content
                      presentation="popover"
                      placement="bottom"
                      align="end"
                      width={220}
                      className="bg-slate-800 border border-slate-600/50 rounded-[22px]"
                    >
                      <Menu.Item onPress={handleAddNewCategoryPress}>
                        <Menu.ItemTitle className="text-slate-100">
                          Add new category
                        </Menu.ItemTitle>
                      </Menu.Item>
                      {flatCategories.length > 0 && (
                        <Menu.Item
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            setShowOptionsMenu(false);
                            setIsManaging(true);
                          }}
                        >
                          <Menu.ItemTitle className="text-slate-100">
                            Manage
                          </Menu.ItemTitle>
                        </Menu.Item>
                      )}
                    </Menu.Content>
                  </Menu.Portal>
                </Menu>,
              ]
        }
      />
      <FlashList
        ref={listRef}
        style={{ flex: 1 }}
        className="px-5"
        data={listRows}
        keyExtractor={(row) => row.id}
        getItemType={(row) => row.kind}
        estimatedItemSize={CATEGORY_CARD_ESTIMATED_HEIGHT}
        overrideItemLayout={(layout, row) => {
          layout.size =
            row.kind === 'section'
              ? SECTION_ROW_ESTIMATED_HEIGHT
              : CATEGORY_CARD_ESTIMATED_HEIGHT;
        }}
        ListHeaderComponent={categoryListHeader}
        ListEmptyComponent={categoryListEmpty}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        extraData={{ isManaging, selectedIds: [...selectedIds].sort().join(',') }}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: row }) => {
          if (row.kind === 'section') {
            const SectionIcon = bucketFilterIcon(row.bucket);
            return (
              <View className="flex-row items-center justify-between pt-2 pb-1">
                <View className="flex-row items-center gap-2">
                  <SectionIcon size={16} color="#94A3B8" strokeWidth={2.2} />
                  <Text className="text-slate-300 text-sm font-semibold tracking-wide">
                    {bucketFilterLabel(row.bucket)}
                  </Text>
                </View>
                <Text className="text-slate-500 text-xs font-medium">
                  {row.count} {row.count === 1 ? 'category' : 'categories'}
                </Text>
              </View>
            );
          }

          const cat = row.category;
          const icon =
            (cat.icon as import('@/constants/categoryIcons').CategoryIconName) ??
            getCategoryIcon(cat.name);
          const bgColor = categoryIconBackgroundColor(cat.id);
          const isSelected = isManaging && selectedIds.has(cat.id);
          return (
            <Pressable
              onPress={() => {
                if (isManaging) {
                  toggleSelectCategory(cat.id);
                  return;
                }
                modals.setEditingLimit({
                  id: cat.id,
                  name: cat.name,
                  current: cat.limitAmount,
                  icon: cat.icon ?? null,
                });
                modals.setShowEditLimitModal(true);
              }}
              className="active:opacity-90"
              accessibilityRole="button"
              accessibilityLabel={
                isManaging
                  ? `${cat.name}, ${isSelected ? 'selected' : 'tap to select'}`
                  : `${cat.name}, ${cat.bucket}, ₵${formatCurrency(cat.limitAmount)}, tap to edit`
              }
            >
              <Card>
                <View className="flex-row items-center justify-between gap-3">
                  <View className="flex-row items-center gap-3 flex-1 min-w-0">
                    {isManaging && (
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#fb7185' : 'rgba(148,163,184,0.6)',
                          backgroundColor: isSelected ? 'rgba(248,113,113,0.18)' : 'transparent',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSelected && <Check size={14} color="#f9fafb" strokeWidth={2.4} />}
                      </View>
                    )}
                    <CategoryIcon
                      icon={icon}
                      size={44}
                      backgroundColor={bgColor}
                      color="#fff"
                    />
                    <View className="flex-1 min-w-0">
                      <Text className="text-white text-base font-semibold" numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end shrink-0">
                    <Text className="text-emerald-300 text-base font-bold">
                      ₵{formatCurrency(cat.limitAmount)}
                    </Text>
                    {!isManaging && (
                      <Pressable
                        onPress={() => {
                          modals.setEditingLimit({
                            id: cat.id,
                            name: cat.name,
                            current: cat.limitAmount,
                            icon: cat.icon ?? null,
                          });
                          modals.setShowEditLimitModal(true);
                        }}
                        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                        className="mt-2"
                        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit ${cat.name}`}
                      >
                        <Text className="text-slate-400 text-sm">Edit</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <ConfirmModal
        visible={showMultiDeleteConfirm}
        title={
          selectedCount === 1
            ? 'Delete 1 category?'
            : `Delete ${selectedCount} categories?`
        }
        description={multiDeleteDescription}
        confirmLabel={selectedCount === 1 ? 'Delete category' : 'Delete categories'}
        loading={multiDeleteLoading}
        onClose={() => {
          if (multiDeleteLoading) return;
          setShowMultiDeleteConfirm(false);
        }}
        onConfirm={handleConfirmMultiDelete}
      />

      <EditCategoryLimitBottomSheet
        visible={modals.showEditLimitModal}
        categoryId={modals.editingLimit?.id ?? ''}
        categoryName={modals.editingLimit?.name ?? 'Category'}
        currentLimit={modals.editingLimit?.current ?? 0}
        currentIcon={
          (modals.editingLimit?.icon as import('@/constants/categoryIcons').CategoryIconName) ??
          null
        }
        suggestedLimit={
          modals.editingLimit?.suggestedLimit ??
          (modals.editingLimit && ui.spendingInsights?.length
            ? (() => {
                const insight = ui.spendingInsights.find(
                  (i) => i.categoryId === modals.editingLimit?.id
                );
                if (!insight || insight.avgSpent <= 0) return null;
                return computeSuggestedLimit(
                  insight.avgSpent,
                  insight.variance ?? 0,
                  insight.trend,
                  modals.editingLimit.current
                );
              })()
            : null)
        }
        spentLastMonth={
          modals.editingLimit && derived.previousCycle
            ? (budget.state?.transactions ?? [])
                .filter(
                  (t) =>
                    t.cycleId === derived.previousCycle?.id &&
                    t.categoryId === modals.editingLimit?.id
                )
                .reduce((s, t) => s + t.amount, 0)
            : 0
        }
        avgSpent={
          ui.spendingInsights?.find((i) => i.categoryId === modals.editingLimit?.id)?.avgSpent ?? 0
        }
        availableBudget={
          derived.activeCycle
            ? (budget.totals?.needsLimit ?? 0) +
              (budget.totals?.wantsLimit ?? 0) +
              (budget.totals?.savingsLimit ?? 0)
            : 0
        }
        cycles={budget.state?.cycles ?? []}
        transactions={budget.state?.transactions ?? []}
        onClose={() => {
          modals.setShowEditLimitModal(false);
          modals.setEditingLimit(null);
        }}
        onSave={async (nextLimit, applyToFuture, icon) => {
          if (!modals.editingLimit) return;
          await modals.handleUpdateCategoryLimit(
            modals.editingLimit.id,
            nextLimit,
            icon
          );
          modals.setShowEditLimitModal(false);
          modals.setEditingLimit(null);
        }}
        onDelete={async (id) => {
          await budget.deleteCategory(id);
          await budget.reload();
          modals.setShowEditLimitModal(false);
          modals.setEditingLimit(null);
        }}
      />

      <CategorySelectBottomSheet
        visible={showCategorySelectSheet}
        existingCategoryNames={derived.cycleCategories.map((c) => c.name)}
        onClose={() => setShowCategorySelectSheet(false)}
        onSelectExisting={async ({ name, bucket, limitAmount, icon }) => {
          await modals.handleAddCategory({
            name,
            bucket,
            limitAmount: limitAmount ?? 0,
            icon: icon as import('@/constants/categoryIcons').CategoryIconName | undefined,
          });
          setShowCategorySelectSheet(false);
        }}
        onCreateNew={() => {
          setShowCategorySelectSheet(false);
          modals.setShowAddCustomCategoryModal(true);
        }}
      />

      <BudgetModals
        showAddCustomCategoryModal={modals.showAddCustomCategoryModal}
        setShowAddCustomCategoryModal={modals.setShowAddCustomCategoryModal}
        onAddCategory={modals.handleAddCategory}
        showTxModal={false}
        setShowTxModal={() => { }}
        cycleCategories={derived.cycleCategories}
        needsOverLimitFor={derived.needsOverLimitFor}
        onAddTransaction={async () => { }}
        onSubmitBatch={async () => ({ count: 0, success: true })}
        onReloadBudget={async () => { }}
        pendingConfirm={null}
        setPendingConfirm={() => { }}
        showNeedsOverModal={false}
        setShowNeedsOverModal={() => { }}
        showResetConfirm={false}
        setShowResetConfirm={() => { }}
        onResetBudget={async () => { }}
        categoryToDelete={modals.categoryToDelete}
        setCategoryToDelete={modals.setCategoryToDelete}
        showDeleteCategoryConfirm={modals.showDeleteCategoryConfirm}
        setShowDeleteCategoryConfirm={modals.setShowDeleteCategoryConfirm}
        onDeleteCategory={async (id) => {
          await budget.deleteCategory(id);
          await budget.reload();
        }}
        incomeToDelete={null}
        setIncomeToDelete={() => { }}
        showDeleteIncomeConfirm={false}
        setShowDeleteIncomeConfirm={() => { }}
        onDeleteIncomeSource={async () => { }}
        incomeToEdit={null}
        setIncomeToEdit={() => { }}
        showEditIncomeModal={false}
        setShowEditIncomeModal={() => { }}
        onUpdateIncomeSource={async () => { }}
        editingLimit={modals.editingLimit}
        setEditingLimit={modals.setEditingLimit}
        showEditLimitModal={false}
        setShowEditLimitModal={modals.setShowEditLimitModal}
        onUpdateCategoryLimit={modals.handleUpdateCategoryLimit}
        spendingInsights={ui.spendingInsights}
        allocationExceededResult={modals.allocationExceededResult}
        showAllocationExceededModal={modals.showAllocationExceededModal}
        setShowAllocationExceededModal={modals.setShowAllocationExceededModal}
        onConfirmAllocationExceeded={modals.onConfirmAllocationExceeded}
        onCloseAllocationExceeded={modals.handleCloseAllocationExceeded}
        showFlexibleOverNetAck={modals.showFlexibleOverNetAck}
        onTrimCategories={modals.handleTrimFromAllocationModal}
        onAdjustSplit={modals.handleOpenNwsAdjust}
        showEditCycleModal={false}
        setShowEditCycleModal={() => { }}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async () => { }}
      />

      <BudgetReconcileSheet
        visible={showReconcileSheet}
        validation={derived.planValidation}
        rebalancePreview={modals.rebalancePreview}
        rebalanceLoading={modals.rebalanceLoading}
        enforcement={derived.budgetEnforcement}
        showRebalancePreview={modals.showRebalancePreview}
        offendingBucket={derived.offendingBucket}
        onBalanceForMe={modals.handleBalanceForMe}
        onAdjustMyself={() => {
          if (derived.offendingBucket) {
            handleFilterChange(derived.offendingBucket);
          }
          void handleCloseReconcileSheet();
        }}
        onAdjustSplit={() => {
          void handleCloseReconcileSheet();
          modals.setShowNwsAdjustSheet(true);
        }}
        onApplyRebalance={handleApplyRebalance}
        onDismiss={handleDismissReconcileSheet}
        onBackFromPreview={() => modals.setShowRebalancePreview(false)}
        onClose={() => {
          void handleCloseReconcileSheet();
        }}
      />

      <BudgetNwsAdjustSheet
        visible={modals.showNwsAdjustSheet}
        preview={derived.nwsAdjustPreview}
        onClose={() => modals.setShowNwsAdjustSheet(false)}
        onApply={modals.handleApplyNwsAdjust}
      />

      <BudgetSurvivalSheet
        visible={modals.showSurvivalSheet}
        validation={derived.planValidation}
        onReviewIncome={() => {
          modals.setShowSurvivalSheet(false);
          router.push('/budget/income');
        }}
        onReduceFixed={() => {
          modals.setShowSurvivalSheet(false);
          if (derived.offendingBucket) {
            handleFilterChange(derived.offendingBucket);
          }
        }}
        onClose={() => {}}
      />

      <AppDialog
        visible={showAddCategoryBlockedDialog}
        onOpenChange={(open) => {
          if (!open) setShowAddCategoryBlockedDialog(false);
        }}
        icon={
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
            }}
          >
            <AlertTriangle color="#F59E0B" size={24} />
          </View>
        }
        title="Can't add a category"
        description="A new category can't be created while your allocations exceed your take-home pay."
        primaryLabel="Change now"
        onPrimary={() => {
          setShowAddCategoryBlockedDialog(false);
          modals.handleOpenReconcileSheet('categories');
        }}
        secondaryLabel="Cancel"
        onSecondary={() => setShowAddCategoryBlockedDialog(false)}
      />
    </View>
  );
}
