/**
 * Bottom sheet for editing a category's budget limit.
 * Shows category details, spending history, bar chart, and apply-to-future toggle.
 */
import { CustomBottomSheet } from '@/components/common/CustomBottomSheet';
import { ConfirmModal } from '@/components/ConfirmModal';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  CATEGORY_ICON_COLORS,
  CATEGORY_ICON_NAMES,
  getCategoryIcon,
  type CategoryIconName,
} from '@/constants/categoryIcons';
import { AppTextField } from '@/components/AppTextField';
import type { BudgetCycle, BudgetTransaction } from '@/types/budget';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Info, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { formatCurrency } from '@/utils/formatCurrency';

export type ChartDataPoint = { label: string; amount: number };

type Props = {
  visible: boolean;
  categoryId: string;
  categoryName: string;
  currentLimit: number;
  /** Current icon from category (if any). Falls back to name-based mapping. */
  currentIcon?: CategoryIconName | null;
  suggestedLimit?: number | null;
  /** Spent last month (previous cycle) */
  spentLastMonth?: number;
  /** Monthly average from spending patterns */
  avgSpent?: number;
  /** Chart data: last 6 months spending */
  chartData?: ChartDataPoint[];
  /** Available budget for the bucket (for context) */
  availableBudget?: number;
  cycles: BudgetCycle[];
  transactions: BudgetTransaction[];
  onClose: () => void;
  onSave: (
    nextLimit: number,
    applyToFutureMonths?: boolean,
    icon?: CategoryIconName
  ) => void;
  onDelete?: (categoryId: string) => void | Promise<void>;
};

function computeChartData(
  categoryId: string,
  cycles: BudgetCycle[],
  transactions: BudgetTransaction[]
): ChartDataPoint[] {
  const sorted = [...cycles].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );
  const last6 = sorted.slice(0, 6).reverse();
  return last6.map((c) => {
    const spent = transactions
      .filter((t) => t.cycleId === c.id && t.categoryId === categoryId)
      .reduce((s, t) => s + t.amount, 0);
    const d = new Date(c.startDate);
    const label = d.toLocaleDateString('en-GB', { month: 'short' });
    return { label, amount: spent };
  });
}

export function EditCategoryLimitBottomSheet({
  visible,
  categoryId,
  categoryName,
  currentLimit,
  currentIcon: currentIconProp,
  suggestedLimit,
  spentLastMonth = 0,
  avgSpent = 0,
  chartData: chartDataProp,
  availableBudget = 0,
  cycles,
  transactions,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [value, setValue] = useState(String(currentLimit));
  const [error, setError] = useState<string | undefined>();
  const [applyToFuture, setApplyToFuture] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState<CategoryIconName>(
    currentIconProp ?? getCategoryIcon(categoryName)
  );

  const chartData = useMemo(
    () => chartDataProp ?? computeChartData(categoryId, cycles, transactions),
    [chartDataProp, categoryId, cycles, transactions]
  );

  const maxChart = Math.max(
    ...chartData.map((d) => d.amount),
    currentLimit,
    1
  );

  useEffect(() => {
    if (visible) {
      setValue(String(Number.isFinite(currentLimit) ? currentLimit : 0));
      setError(undefined);
      setSelectedIcon(currentIconProp ?? getCategoryIcon(categoryName));
    }
  }, [visible, currentLimit, currentIconProp, categoryName]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  const handleSave = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError('Enter a valid amount');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    onSave(parsed, applyToFuture, selectedIcon);
    handleClose();
  };

  const handleViewTransactions = () => {
    handleClose();
    router.push('/expenses');
  };

  const handleDeletePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(categoryId);
      handleClose();
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const bgColor = CATEGORY_ICON_COLORS[0];

  return (
    <CustomBottomSheet
      title="Budget by category"
      description={categoryName}
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <View style={styles.container}>
        <View style={styles.categoryRow}>
          <CategoryIcon
            icon={selectedIcon}
            size={48}
            backgroundColor={bgColor}
            color="#fff"
          />
          <Text style={styles.categoryName}>{categoryName}</Text>
        </View>

        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {CATEGORY_ICON_NAMES.slice(0, 18).map((iconName, idx) => {
            const isSelected = selectedIcon === iconName;
            const cellColor =
              CATEGORY_ICON_COLORS[idx % CATEGORY_ICON_COLORS.length];
            return (
              <Pressable
                key={iconName}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                    () => {}
                  );
                  setSelectedIcon(iconName);
                }}
                style={[
                  styles.iconCell,
                  {
                    backgroundColor: isSelected ? cellColor : 'rgba(71,85,105,0.4)',
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: isSelected ? cellColor : 'transparent',
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={isSelected ? `${iconName} selected` : `Select ${iconName} icon`}
              >
                <CategoryIcon icon={iconName} size={24} color="#fff" />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Budget for this cycle</Text>
        <View style={styles.inputRow}>
          <Text style={styles.currencyPrefix}>₵</Text>
          <AppTextField
            value={value}
            onChangeText={(v) => {
              setValue(v);
              if (error) setError(undefined);
            }}
            keyboardType="decimal-pad"
            placeholder="0"
            containerClassName="flex-1"
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <Text style={styles.availableText}>
          Available budget: ₵{formatCurrency(availableBudget)}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Spent last cycle</Text>
            <Text style={styles.summaryValue}>
              ₵{formatCurrency(spentLastMonth)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Monthly average</Text>
            <Text style={styles.summaryValue}>₵{formatCurrency(avgSpent)}</Text>
          </View>
        </View>

        {chartData.length > 0 && (
          <View style={styles.chartSection}>
            <View style={styles.chartBars}>
              {chartData.map((d, i) => {
                const h = maxChart > 0 ? (d.amount / maxChart) * 80 : 0;
                return (
                  <View key={d.label + i} style={styles.chartBarWrap}>
                    <View
                      style={[styles.chartBar, { height: Math.max(h, 4) }]}
                    />
                    <Text style={styles.chartLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <Pressable onPress={handleViewTransactions} style={styles.viewTxLink}>
          <Text style={styles.viewTxText}>View transactions</Text>
        </Pressable>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Apply to future cycles</Text>
          <Switch
            value={applyToFuture}
            onValueChange={setApplyToFuture}
            trackColor={{ false: '#334155', true: 'rgba(16,185,129,0.5)' }}
            thumbColor={applyToFuture ? '#10b981' : '#94a3b8'}
          />
        </View>

        {suggestedLimit != null &&
          suggestedLimit > 0 &&
          suggestedLimit !== currentLimit && (
            <Pressable
              onPress={() => setValue(String(suggestedLimit))}
              style={styles.suggestedCta}
            >
              <Info size={16} color="#10b981" />
              <Text style={styles.suggestedText}>
                Use suggested: ₵{formatCurrency(suggestedLimit)} (from spending)
              </Text>
            </Pressable>
          )}

        <View style={styles.actionRow}>
          <Pressable onPress={handleSave} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
          {onDelete ? (
            <Pressable
              onPress={handleDeletePress}
              style={styles.deleteBtn}
            >
              <Trash2 size={18} color="#f87171" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ConfirmModal
        visible={showDeleteConfirm}
        title="Delete category?"
        description={`Delete "${categoryName}"? This removes it from your budget and cannot be undone.`}
        confirmLabel="Delete"
        loading={isDeleting}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
      />
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  categoryName: {
    fontSize: 22,
    fontFamily: 'Figtree-Bold',
    color: '#f1f5f9',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
    color: '#94a3b8',
    marginBottom: 8,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  currencyPrefix: {
    fontSize: 18,
    fontFamily: 'Figtree-SemiBold',
    color: '#e2e8f0',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginBottom: 4,
  },
  availableText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(71,85,105,0.25)',
    borderRadius: 12,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Figtree-Bold',
    color: '#f1f5f9',
  },
  chartSection: {
    height: 120,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingBottom: 28,
  },
  chartBarWrap: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 20,
    backgroundColor: '#f97316',
    borderRadius: 4,
    marginBottom: 6,
  },
  chartLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  viewTxLink: {
    marginBottom: 16,
  },
  viewTxText: {
    fontSize: 14,
    fontFamily: 'Figtree-SemiBold',
    color: '#10b981',
    textDecorationLine: 'underline',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
    color: '#e2e8f0',
  },
  suggestedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    marginBottom: 16,
  },
  suggestedText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
    color: '#34d399',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
    color: '#0f172a',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
  },
  deleteBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
    color: '#f87171',
  },
});
