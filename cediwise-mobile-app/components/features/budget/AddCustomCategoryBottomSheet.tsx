/**
 * Bottom sheet for adding a custom category.
 */
import { CustomBottomSheet } from '@/components/common/CustomBottomSheet';
import { CategoryIcon } from '@/components/CategoryIcon';
import {
  CATEGORY_ICON_COLORS,
  CATEGORY_ICON_NAMES,
  DEFAULT_CATEGORY_ICON,
  type CategoryIconName,
} from '@/constants/categoryIcons';
import type { BudgetBucket } from '@/types/budget';
import { AppTextField } from '@/components/AppTextField';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';

const INITIAL_ICON_COUNT = 12;
const BUCKETS: { value: BudgetBucket; label: string }[] = [
  { value: 'needs', label: 'Needs' },
  { value: 'wants', label: 'Wants' },
  { value: 'savings', label: 'Savings' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (params: {
    name: string;
    bucket: BudgetBucket;
    limitAmount: number;
    icon?: CategoryIconName;
  }) => void;
};

export function AddCustomCategoryBottomSheet({
  visible,
  onClose,
  onAdd,
}: Props) {
  const [name, setName] = useState('');
  const [bucket, setBucket] = useState<BudgetBucket>('wants');
  const [limitAmount, setLimitAmount] = useState('');
  const [selectedIcon, setSelectedIcon] =
    useState<CategoryIconName>(DEFAULT_CATEGORY_ICON);
  const [iconExpanded, setIconExpanded] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();

  useEffect(() => {
    if (visible) {
      setName('');
      setBucket('wants');
      setLimitAmount('');
      setSelectedIcon(DEFAULT_CATEGORY_ICON);
      setIconExpanded(false);
      setNameError(undefined);
    }
  }, [visible]);

  const toggleIconExpand = () => {
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
    setIconExpanded((v) => !v);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onClose();
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Enter a category name');
      return;
    }
    setNameError(undefined);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {}
    );
    const limit = Number(limitAmount);
    onAdd({
      name: trimmed,
      bucket,
      limitAmount: Number.isFinite(limit) && limit >= 0 ? limit : 0,
      icon: selectedIcon,
    });
    handleClose();
  };

  return (
    <CustomBottomSheet
      title="Add custom category"
      isOpen={visible}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <View style={styles.container}>
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

        <Text style={styles.label}>Bucket</Text>
        <View style={styles.bucketRow}>
          {BUCKETS.map((b) => (
            <Pressable
              key={b.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                  () => {}
                );
                setBucket(b.value);
              }}
              style={[
                styles.bucketChip,
                bucket === b.value && styles.bucketChipSelected,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Bucket: ${b.label}`}
            >
              <Text
                style={[
                  styles.bucketChipText,
                  bucket === b.value && styles.bucketChipTextSelected,
                ]}
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
        />

        <View style={styles.iconSection}>
          <Pressable
            onPress={toggleIconExpand}
            style={styles.iconSectionHeader}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.label}>Icon</Text>
            {iconExpanded ? (
              <ChevronUp size={18} color="#94a3b8" />
            ) : (
              <ChevronDown size={18} color="#94a3b8" />
            )}
          </Pressable>
          <View style={styles.iconGrid}>
            {(iconExpanded ? CATEGORY_ICON_NAMES : CATEGORY_ICON_NAMES.slice(0, INITIAL_ICON_COUNT)).map(
              (iconName, idx) => {
                const selected = selectedIcon === iconName;
                const color =
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
                        backgroundColor: selected ? color : 'rgba(71,85,105,0.4)',
                        borderWidth: selected ? 2 : 0,
                        borderColor: selected ? color : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={selected ? `${iconName} selected` : `Select ${iconName} icon`}
                  >
                    <CategoryIcon icon={iconName} size={24} color="#fff" />
                  </Pressable>
                );
              }
            )}
          </View>
          <Pressable onPress={toggleIconExpand} style={styles.expandBtn}>
            <Text style={styles.expandBtnText}>
              {iconExpanded ? 'Show less' : `Show more (${CATEGORY_ICON_NAMES.length - INITIAL_ICON_COUNT} more)`}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={handleAdd} style={styles.saveBtn}>
          <Text style={styles.saveBtnText}>Add category</Text>
        </Pressable>
      </View>
    </CustomBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
    color: '#94a3b8',
    marginTop: 4,
    marginBottom: 8,
  },
  iconSection: {
    gap: 8,
  },
  iconSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  expandBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  expandBtnText: {
    fontSize: 13,
    fontFamily: 'Figtree-Medium',
    color: '#64748b',
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  bucketChip: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(71,85,105,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.2)',
  },
  bucketChipSelected: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    borderColor: 'rgba(16,185,129,0.4)',
  },
  bucketChipText: {
    fontSize: 14,
    fontFamily: 'Figtree-Medium',
    color: '#94a3b8',
  },
  bucketChipTextSelected: {
    color: '#34d399',
  },
  saveBtn: {
    backgroundColor: '#10b981',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree-SemiBold',
    color: '#0f172a',
  },
});
