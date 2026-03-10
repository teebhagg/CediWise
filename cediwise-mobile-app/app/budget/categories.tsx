import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { CategoryIcon } from '@/components/CategoryIcon';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { CategorySelectBottomSheet } from '@/components/features/budget/CategorySelectBottomSheet';
import { EditCategoryLimitBottomSheet } from '@/components/features/budget/EditCategoryLimitBottomSheet';
import { BudgetModals } from '@/components/features/budget/BudgetModals';
import { useBudgetScreenState } from '@/components/features/budget/useBudgetScreenState';
import { CATEGORY_ICON_COLORS, getCategoryIcon } from '@/constants/categoryIcons';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import type { BudgetBucket } from '@/types/budget';
import { computeSuggestedLimit } from '@/utils/spendingPatternsLogic';
import { formatCurrency } from '@/utils/formatCurrency';
import * as Haptics from 'expo-haptics';
import { Check, MoreVertical } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Menu } from 'heroui-native';

const FILTERS: { key: 'all' | BudgetBucket; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needs', label: 'Needs' },
  { key: 'wants', label: 'Wants' },
  { key: 'savings', label: 'Savings' },
];

export default function BudgetCategoriesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { modals, derived, budget, ui } = useBudgetScreenState();
  const [filter, setFilter] = useState<'all' | BudgetBucket>('all');
  const [showCategorySelectSheet, setShowCategorySelectSheet] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMultiDeleteConfirm, setShowMultiDeleteConfirm] = useState(false);
  const [multiDeleteLoading, setMultiDeleteLoading] = useState(false);

  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  const flatCategories = useMemo(
    () => [
      ...derived.categoriesByBucket.needs,
      ...derived.categoriesByBucket.wants,
      ...derived.categoriesByBucket.savings,
    ],
    [derived.categoriesByBucket],
  );

  const visibleCategories = useMemo(() => {
    if (filter === 'all') return flatCategories;
    return flatCategories.filter((c) => c.bucket === filter);
  }, [filter, flatCategories]);

  const selectedCategories = useMemo(
    () => flatCategories.filter((c) => selectedIds.has(c.id)),
    [flatCategories, selectedIds],
  );

  const selectedCount = selectedCategories.length;

  const handleFilterChange = (key: 'all' | BudgetBucket) => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext({
      duration: 220,
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFilter(key);
  };

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

  if (!user?.id) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Categories" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
          <Text className="text-slate-400 mt-8 text-center">Sign in to manage categories.</Text>
        </View>
      </View>
    );
  }

  if (!derived.activeCycleId) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black' }}>
        <StandardHeader title="Categories" leading={<BackButton />} centered />
        <View className="px-5 py-4" style={{ paddingTop: headerPadding }}>
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
        actions={
          isManaging
            ? [
                <Button
                  key="delete"
                  size="sm"
                  variant="danger-soft"
                  isDisabled={!selectedCount || multiDeleteLoading}
                  className={
                    selectedCount
                      ? 'bg-rose-500/15 border border-rose-400/60 rounded-full px-3 w-22'
                      : 'opacity-60 rounded-full px-3 w-22'
                  }
                  onPress={async () => {
                    if (!selectedCount) return;
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                    setShowMultiDeleteConfirm(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Delete selected categories"
                >
                  <Text className="text-sm font-semibold text-rose-400">
                    Delete ({selectedCount})
                  </Text>
                </Button>,
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
                      <Menu.Item
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setShowOptionsMenu(false);
                          setShowCategorySelectSheet(true);
                        }}
                      >
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
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingTop: headerPadding + 10, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          <View>
            <Text className="text-white text-2xl font-bold">Budget Categories</Text>
            <Text className="text-slate-400 text-sm mt-2">
              Keep this simple: pick a bucket filter, then add or edit limits.
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-1.5">
            {FILTERS.map((item) => {
              const selected = filter === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => handleFilterChange(item.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${item.label}`}
                  style={({ pressed }) => ({
                    paddingHorizontal: 12,
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: selected
                      ? 'rgba(16,185,129,0.25)'
                      : pressed
                        ? 'rgba(71,85,105,0.35)'
                        : 'rgba(71,85,105,0.2)',
                    borderWidth: 1,
                    borderColor: selected ? 'rgba(16,185,129,0.5)' : 'rgba(148,163,184,0.2)',
                  })}
                >
                  <Text
                    className={`text-sm font-medium ${selected ? 'text-emerald-400' : 'text-slate-400'}`}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {visibleCategories.length === 0 ? (
            <Card>
              <Text className="text-white text-base font-semibold">No categories yet</Text>
              <Text className="text-slate-400 text-sm mt-2">
                Add your first category to start tracking this cycle.
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {visibleCategories.map((cat, idx) => {
                const icon =
                  (cat.icon as import('@/constants/categoryIcons').CategoryIconName) ??
                  getCategoryIcon(cat.name);
                const bgColor = CATEGORY_ICON_COLORS[idx % CATEGORY_ICON_COLORS.length];
                 const isSelected = isManaging && selectedIds.has(cat.id);
                return (
                  <Pressable
                    key={cat.id}
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
                            <Text className="text-slate-400 text-xs mt-0.5 capitalize">
                              {cat.bucket}
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
              })}
            </View>
          )}
        </View>
      </ScrollView>

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
        showEditCycleModal={false}
        setShowEditCycleModal={() => { }}
        activeCyclePaydayDay={derived.activeCycle?.paydayDay ?? 1}
        onUpdateCycleDay={async () => { }}
      />
    </View>
  );
}
