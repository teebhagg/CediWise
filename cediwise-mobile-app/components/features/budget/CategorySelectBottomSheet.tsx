/**
 * Bottom sheet for selecting an existing category or creating a new one.
 * Opens when user taps "Add category" on the categories screen.
 * For predefined categories: select → optional set limit → add.
 */
import { AppTextField } from '@/components/AppTextField';
import { CustomBottomSheet } from '@/components/common/CustomBottomSheet';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  CATEGORY_ICON_COLORS,
  PREDEFINED_CATEGORIES,
} from '@/constants/categoryIcons';
import type { BudgetBucket } from '@/types/budget';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Plus } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type CategorySelectBottomSheetProps = {
  visible: boolean;
  existingCategoryNames: string[];
  onClose: () => void;
  onSelectExisting: (params: {
    name: string;
    bucket: BudgetBucket;
    limitAmount?: number;
    icon?: string;
  }) => void;
  onCreateNew: () => void;
};

export function CategorySelectBottomSheet({
  visible,
  existingCategoryNames,
  onClose,
  onSelectExisting,
  onCreateNew,
}: CategorySelectBottomSheetProps) {
  const [pendingCategory, setPendingCategory] = useState<{
    name: string;
    bucket: BudgetBucket;
    icon: string;
  } | null>(null);
  const [limitAmount, setLimitAmount] = useState('');

  useEffect(() => {
    if (visible && !pendingCategory) {
      setLimitAmount('');
    }
  }, [visible, pendingCategory]);

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPendingCategory(null);
    setLimitAmount('');
    onClose();
  };

  const handleSelectPredefined = (name: string, bucket: BudgetBucket, icon: string) => {
    if (existingCategoryNames.includes(name)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPendingCategory({ name, bucket, icon });
    setLimitAmount('');
  };

  const handleBackToGrid = () => {
    Haptics.selectionAsync().catch(() => {});
    setPendingCategory(null);
    setLimitAmount('');
  };

  const handleAddPredefined = () => {
    if (!pendingCategory) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    const limit = Number(limitAmount);
    const amount = Number.isFinite(limit) && limit >= 0 ? limit : 0;
    onSelectExisting({
      name: pendingCategory.name,
      bucket: pendingCategory.bucket,
      limitAmount: amount,
      icon: pendingCategory.icon,
    });
    setPendingCategory(null);
    setLimitAmount('');
    handleClose();
  };

  const handleCreate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    handleClose();
    onCreateNew();
  };

  const existingSet = new Set(existingCategoryNames);
  const showLimitStep = !!pendingCategory;

  // Unused (not yet added) first, used (already added) last
  const sortedPredefined = [...PREDEFINED_CATEGORIES].sort((a, b) => {
    const aUsed = existingSet.has(a.name) ? 1 : 0;
    const bUsed = existingSet.has(b.name) ? 1 : 0;
    return aUsed - bUsed;
  });

  return (
    <CustomBottomSheet
      title={showLimitStep ? `Set budget for ${pendingCategory?.name}` : 'Add Category'}
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) {
          setPendingCategory(null);
          onClose();
        }
      }}
    >
      {showLimitStep && pendingCategory ? (
        <View style={styles.limitStep}>
          <View style={styles.limitStepHeader}>
            <CategoryIcon
              icon={pendingCategory.icon as import('@/constants/categoryIcons').CategoryIconName}
              size={48}
              backgroundColor={
                CATEGORY_ICON_COLORS[
                  PREDEFINED_CATEGORIES.findIndex((c) => c.name === pendingCategory.name) %
                    CATEGORY_ICON_COLORS.length
                ]
              }
              color="#fff"
            />
            <Text style={styles.limitStepSubtext}>
              Optional: set a monthly limit for this category
            </Text>
          </View>
          <AppTextField
            label="Monthly limit (GHS)"
            value={limitAmount}
            onChangeText={setLimitAmount}
            placeholder="0"
            keyboardType="decimal-pad"
          />
          <View style={styles.limitStepActions}>
            <Pressable
              onPress={handleBackToGrid}
              style={({ pressed }) => [styles.backBtn, pressed && styles.cellPressed]}
              accessibilityRole="button"
              accessibilityLabel="Back to category list"
            >
              <ArrowLeft size={18} color="#94a3b8" strokeWidth={2} />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={handleAddPredefined}
              style={({ pressed }) => [
                styles.addBtn,
                pressed && styles.cellPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Add category"
            >
              <Text style={styles.addBtnText}>Add category</Text>
            </Pressable>
          </View>
        </View>
      ) : (
      <View style={styles.grid}>
        {/* Create new cell */}
        <Pressable
          onPress={handleCreate}
          style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
          accessibilityRole="button"
          accessibilityLabel="Create new category"
        >
          <View style={styles.createCircle}>
            <Plus size={28} color="#94a3b8" strokeWidth={2} />
          </View>
          <Text style={styles.cellLabel}>Create</Text>
        </Pressable>

        {/* Predefined categories: unused first, used last */}
        {sortedPredefined.map((cat) => {
          const isAdded = existingSet.has(cat.name);
          const origIdx = PREDEFINED_CATEGORIES.findIndex(
            (c) => c.name === cat.name && c.bucket === cat.bucket
          );
          const color = CATEGORY_ICON_COLORS[origIdx % CATEGORY_ICON_COLORS.length];
          return (
            <Pressable
              key={`${cat.name}-${cat.bucket}`}
              onPress={() =>
                !isAdded && handleSelectPredefined(cat.name, cat.bucket, cat.icon)
              }
              disabled={isAdded}
              style={({ pressed }) => [
                styles.cell,
                pressed && !isAdded && styles.cellPressed,
                isAdded && styles.cellDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                isAdded ? `${cat.name} (already added)` : cat.name
              }
            >
              <CategoryIcon
                icon={cat.icon}
                size={48}
                backgroundColor={isAdded ? 'rgba(71,85,105,0.4)' : color}
                color="#fff"
              />
              <Text
                style={[styles.cellLabel, isAdded && styles.cellLabelDisabled]}
                numberOfLines={2}
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
      )}
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  cell: {
    width: '30%',
    alignItems: 'center',
    minWidth: 90,
  },
  cellPressed: {
    opacity: 0.8,
  },
  cellDisabled: {
    opacity: 0.5,
  },
  createCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(71,85,105,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(148,163,184,0.3)',
    borderStyle: 'dashed',
  },
  cellLabel: {
    marginTop: 8,
    fontSize: 12,
    fontFamily: 'Figtree-Medium',
    color: '#e2e8f0',
    textAlign: 'center',
  },
  cellLabelDisabled: {
    color: '#64748b',
  },
  limitStep: {
    gap: 16,
  },
  limitStepHeader: {
    alignItems: 'center',
    gap: 12,
  },
  limitStepSubtext: {
    fontSize: 14,
    fontFamily: 'Figtree-Regular',
    color: '#94a3b8',
    textAlign: 'center',
  },
  limitStepActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(71,85,105,0.25)',
  },
  backBtnText: {
    fontSize: 15,
    fontFamily: 'Figtree-SemiBold',
    color: '#94a3b8',
  },
  addBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 24,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
    color: '#0f172a',
  },
});
