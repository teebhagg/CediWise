import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { RefreshCcw, Trash2 } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/Card';
import { ConfirmModal } from '@/components/ConfirmModal';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useAppToast } from '@/hooks/useAppToast';
import { useAuth } from '@/hooks/useAuth';
import { useBudget } from '@/hooks/useBudget';
import type { BudgetMutation } from '@/types/budget';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    default:
      return kind;
  }
}

function DangerPillButton({ label, onPress }: { label: string; onPress: () => void }) {
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
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError } = useAppToast();
  const { queue, pendingCount, isLoading, syncNow, retryMutation, reload, clearLocal } = useBudget(user?.id);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const listHeader = useMemo(
    () => (
      <>
        <Card className="mb-4">
          <View className="flex-row items-center justify-between">
            <View style={queueStyles.flex1}>
              <Text className="text-white text-base font-semibold" style={queueStyles.textBase}>
                Pending: {pendingCount}
              </Text>
              <Text className="text-muted-foreground text-xs mt-1" style={queueStyles.textMuted}>
                Pull-to-refresh isn’t wired here yet — use Retry all.
              </Text>
            </View>
            <View style={queueStyles.buttonsRow}>
              <DangerPillButton label="Clear cache" onPress={() => setShowClearConfirm(true)} />

              <PrimaryButton
                onPress={async () => {
                  try {
                    await syncNow();
                    await reload();
                    showSuccess('Sync complete', 'Pending items have been synced');
                  } catch (e) {
                    showError('Sync failed', e instanceof Error ? e.message : 'Could not sync');
                  }
                }}
                style={queueStyles.retryAllButton}
                disabled={isLoading || pendingCount === 0}
              >
                <RefreshCcw size={18} color="#020617" />
                <Text style={queueStyles.retryAllText}>Retry all</Text>
              </PrimaryButton>
            </View>
          </View>
        </Card>

        {pendingCount === 0 ? (
          <Card>
            <Text className="text-white text-base font-semibold" style={queueStyles.textBase}>
              All synced
            </Text>
            <Text className="text-muted-foreground text-sm mt-2" style={queueStyles.textMuted}>
              You’re good — no failed writes are waiting.
            </Text>
          </Card>
        ) : null}
      </>
    ),
    [pendingCount, isLoading, showSuccess, showError]
  );

  const renderItem = useCallback(
    ({ item }: { item: BudgetMutation }) => (
      <Card>
        <View style={queueStyles.row}>
          <View style={queueStyles.flex1}>
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
            onPress={async () => {
              await retryMutation(item.id);
              await reload();
            }}
            style={({ pressed }) => [
              queueStyles.retryButton,
              { backgroundColor: pressed ? 'rgba(34,197,94,0.18)' : 'rgba(34,197,94,0.12)' },
            ]}
          >
            <Text style={queueStyles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </Card>
    ),
    [retryMutation, reload]
  );

  const keyExtractor = useCallback((item: BudgetMutation) => item.id, []);

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: 'black' }} className="flex-1 bg-background">
      <View className="px-5 py-3 flex-row items-center justify-between">
        <View>
          <BackButton />
          <Text className="text-white text-2xl font-bold" style={queueStyles.title}>
            Sync Queue
          </Text>
          <Text className="text-muted-foreground text-sm" style={queueStyles.textMuted}>
            Pending items retry until they save.
          </Text>
        </View>
      </View>

      <View className="px-5 flex-1">
        <FlashList
          data={pendingCount === 0 ? [] : (queue?.items ?? [])}
          ListHeaderComponent={listHeader}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
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
    </SafeAreaView>
  );
}

const queueStyles = StyleSheet.create({
  title: { fontFamily: 'Figtree-Bold' },
  flex1: { flex: 1 },
  textBase: { fontFamily: 'Figtree-Medium' },
  textMuted: { fontFamily: 'Figtree-Regular' },
  buttonsRow: { flexDirection: 'row', gap: 10 },
  retryAllButton: { height: 44, paddingHorizontal: 16 },
  retryAllText: { color: '#020617', fontFamily: 'Figtree-Medium' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  retryButton: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.35)',
  },
  retryButtonText: { color: '#E2E8F0', fontFamily: 'Figtree-Medium' },
  listContent: { paddingBottom: 32, gap: 12 },
});

