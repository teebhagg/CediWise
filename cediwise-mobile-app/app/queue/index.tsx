import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { RefreshCcw, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { DEFAULT_STANDARD_HEIGHT, StandardHeader } from '@/components/CediWiseHeader';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuth } from '@/hooks/useAuth';
import { useBudget } from '@/hooks/useBudget';
import type { BudgetMutation } from '@/types/budget';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const QUEUE_ITEM_GAP = 12;

function QueueItemSeparator() {
  return <View style={{ height: QUEUE_ITEM_GAP }} />;
}

function formatWhen(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function kindLabel(kind: string) {
  switch (kind) {
    case 'upsert_profile':
      return 'Profile update';
    case 'upsert_income_source':
      return 'Income source';
    case 'upsert_cycle':
      return 'Budget cycle';
    case 'upsert_category':
      return 'Category';
    case 'insert_transaction':
      return 'Transaction';
    case 'delete_category':
      return 'Delete category';
    case 'delete_income_source':
      return 'Delete income source';
    case 'reset_budget':
      return 'Reset budget';
    case 'apply_reallocation':
      return 'Reallocation';
    case 'apply_template':
      return 'Template';
    case 'insert_recurring_expense':
      return 'Add recurring expense';
    case 'update_recurring_expense':
      return 'Update recurring expense';
    case 'delete_recurring_expense':
      return 'Delete recurring expense';
    case 'insert_vault_deposit':
      return 'Vault deposit';
    case 'update_vault_deposit':
      return 'Vault deposit update';
    default:
      return kind;
  }
}

function DangerPillButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 80 });
      }}
      onPress={async () => {
        try {
          await Haptics.selectionAsync();
        } catch {
          // ignore
        }
        onPress();
      }}
      style={[
        {
          height: 44,
          paddingHorizontal: 14,
          borderRadius: 999,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          backgroundColor: 'rgba(239, 68, 68, 0.14)',
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.30)',
          shadowColor: '#EF4444',
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        },
        animatedStyle,
        style,
      ]}
    >
      <Trash2 size={16} color="#FCA5A5" />
      <Text style={{ color: '#FCA5A5', fontFamily: 'Figtree-Medium', fontSize: 13 }}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}

export default function BudgetQueueScreen() {
  const { user } = useAuth();
  const { showSuccess, showError } = useAppToast();
  const {
    queue,
    pendingCount,
    isLoading,
    isSyncing,
    lastSyncRunEndedAt,
    clearSyncRunResult,
    syncNow,
    retryMutation,
    reload,
    clearLocal,
  } = useBudget(user?.id);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [retryingMutationId, setRetryingMutationId] = useState<string | null>(null);

  // React only to sync run end: show one toast per run (only if run ended recently), then clear.
  useEffect(() => {
    if (lastSyncRunEndedAt == null) return;
    const age = Date.now() - lastSyncRunEndedAt;
    if (age <= 2000) {
      if (pendingCount === 0) {
        showSuccess('Sync complete', 'All changes saved.');
      } else {
        showSuccess('Sync complete', `${pendingCount} item(s) still pending.`);
      }
    }
    clearSyncRunResult();
  }, [lastSyncRunEndedAt, pendingCount, clearSyncRunResult, showSuccess]);

  const listHeader = useMemo(
    () => (
      <View style={queueStyles.listHeaderStack}>
        <Card>
          <View style={queueStyles.pendingCardColumn}>
            <View>
              {isSyncing ? (
                <Text className="text-white text-base font-semibold" style={queueStyles.textBase}>
                  Syncing…
                </Text>
              ) : (
                <Text className="text-white text-base font-semibold" style={queueStyles.textBase}>
                  Pending: {pendingCount}
                </Text>
              )}
              <Text className="text-muted-foreground text-xs mt-1" style={queueStyles.textMuted}>
                {isSyncing
                  ? 'Sync run in progress — UI updates when run finishes.'
                  : 'List updates when you sync, retry items, or clear cache.'}
              </Text>
            </View>

            <View style={queueStyles.pendingButtonsRow}>
              <View style={queueStyles.pendingButtonGrow}>
                <DangerPillButton
                  label="Clear cache"
                  onPress={() => setShowClearConfirm(true)}
                  style={queueStyles.pendingPillFill}
                />
              </View>
              <View style={queueStyles.pendingButtonGrow}>
                <PrimaryButton
                  onPress={async () => {
                    try {
                      await syncNow();
                      await reload();
                    } catch (e) {
                      showError('Sync failed', e instanceof Error ? e.message : 'Could not sync');
                    }
                  }}
                  style={queueStyles.retryAllButtonFill}
                  disabled={isLoading || isSyncing || pendingCount === 0}
                >
                  <RefreshCcw size={18} color="#020617" />
                  <Text style={queueStyles.retryAllText}>
                    {isSyncing ? 'Syncing…' : 'Retry all'}
                  </Text>
                </PrimaryButton>
              </View>
            </View>
          </View>
        </Card>
      </View>
    ),
    [pendingCount, isLoading, isSyncing, showError, syncNow, reload],
  );

  const listEmpty = useCallback(
    () => (
      <View style={queueStyles.emptyListWrap}>
        <Text className="text-white text-base font-semibold" style={queueStyles.textBase}>
          Nothing pending
        </Text>
        <Text className="text-muted-foreground text-sm mt-2" style={queueStyles.textMuted}>
          You’re all caught up — no items are waiting to sync.
        </Text>
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: BudgetMutation }) => {
      const isRetrying = retryingMutationId === item.id;
      return (
        <Card>
          <View style={queueStyles.queueItemColumn}>
            <View>
              <Text className="text-white text-base" style={queueStyles.textBase}>
                {kindLabel(item.kind)}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1" style={queueStyles.textMuted}>
                Created: {formatWhen(item.createdAt)} • Retries: {item.retryCount}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1" style={queueStyles.textMuted}>
                Last attempt: {formatWhen(item.lastAttemptAt)}
              </Text>
              {item.lastError ? (
                <Text className="text-rose-300 text-xs mt-2" style={queueStyles.textMuted}>
                  {item.lastError}
                </Text>
              ) : null}
            </View>

            <Pressable
              disabled={isRetrying || isSyncing}
              accessibilityRole="button"
              accessibilityLabel={isRetrying ? 'Retry in progress' : 'Retry this item'}
              accessibilityState={{ busy: isRetrying, disabled: isRetrying || isSyncing }}
              onPress={async () => {
                setRetryingMutationId(item.id);
                try {
                  await retryMutation(item.id);
                  await reload();
                } finally {
                  setRetryingMutationId((current) =>
                    current === item.id ? null : current,
                  );
                }
              }}
              style={({ pressed }) => [
                queueStyles.retryButtonBottom,
                {
                  backgroundColor: pressed ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)',
                  opacity: isRetrying || isSyncing ? 0.85 : 1,
                },
              ]}
            >
              {isRetrying ? (
                <View style={queueStyles.retryButtonInner}>
                  <ActivityIndicator size="small" color="#86EFAC" />
                  <Text style={queueStyles.retryButtonText}>Retrying…</Text>
                </View>
              ) : (
                <Text style={queueStyles.retryButtonText}>Retry</Text>
              )}
            </Pressable>
          </View>
        </Card>
      );
    },
    [retryMutation, reload, retryingMutationId, isSyncing],
  );

  const keyExtractor = useCallback((item: BudgetMutation) => item.id, []);

  const insets = useSafeAreaInsets();
  const headerPadding = DEFAULT_STANDARD_HEIGHT + insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background">
      <StandardHeader title="Sync Queue" leading={<BackButton />} centered />
      <View className="px-5 py-3" style={{ paddingTop: headerPadding }}>
        <Text className="text-muted-foreground text-sm" style={queueStyles.textMuted}>
          Pending items retry until they save.
        </Text>
      </View>

      <View className="px-5 flex-1">
        <FlashList
          data={queue?.items ?? []}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={`${retryingMutationId}-${pendingCount}`}
          ItemSeparatorComponent={QueueItemSeparator}
          contentContainerStyle={queueStyles.listContent}
        />
      </View>

      <ConfirmModal
        visible={showClearConfirm}
        title="Clear local cache?"
        description="This clears your local Budget state + queue (testing only). It won’t delete anything already saved in Supabase."
        confirmLabel="Clear"
        onClose={() => setShowClearConfirm(false)}
        onConfirm={async () => {
          setShowClearConfirm(false);
          try {
            await clearLocal();
            await reload();
            showSuccess('Cache cleared', 'Local cache has been cleared');
          } catch (e) {
            showError('Clear failed', e instanceof Error ? e.message : 'Could not clear cache');
          }
        }}
      />
    </View>
  );
}

const queueStyles = StyleSheet.create({
  title: { fontFamily: 'Figtree-Bold' },
  flex1: { flex: 1 },
  textBase: { fontFamily: 'Figtree-Medium' },
  textMuted: { fontFamily: 'Figtree-Regular' },
  listHeaderStack: {
    gap: 16,
    marginBottom: 4,
  },
  pendingCardColumn: {
    gap: 16,
  },
  pendingButtonsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  pendingButtonGrow: {
    flex: 1,
    minWidth: 0,
  },
  pendingPillFill: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  retryAllButtonFill: {
    height: 44,
    minHeight: 44,
    flex: 1,
    width: '100%',
    paddingHorizontal: 12,
  },
  retryAllText: { color: '#020617', fontFamily: 'Figtree-Medium' },
  queueItemColumn: {
    gap: 14,
  },
  retryButtonBottom: {
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  retryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  retryButtonText: { color: '#E2E8F0', fontFamily: 'Figtree-SemiBold', fontSize: 14 },
  listContent: { paddingBottom: 32 },
  emptyListWrap: {
    paddingVertical: 24,
    paddingHorizontal: 4,
  },
});

