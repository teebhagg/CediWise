import { useRouter } from "expo-router";
import { WifiOff } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import {
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  DEFAULT_EXPANDED_HEIGHT,
  DEFAULT_STANDARD_HEIGHT,
  ExpandedHeader,
} from "@/components/CediWiseHeader";
import { Avatar } from "heroui-native";
import { Pressable } from "react-native";

import { BudgetTransactionModal } from "@/components/BudgetTransactionModal";
import { DiscoveryHeroCard } from "@/components/features/home/DiscoveryHeroCard";
import { MonthlyActivitiesCard } from "@/components/features/home/MonthlyActivitiesCard";
import { VaultHeroCard } from "@/components/features/home/VaultHeroCard";
import { VitalHeroCard } from "@/components/features/home/VitalHeroCard";
import { VitalHeroSkeleton } from "@/components/features/home/VitalHeroSkeleton";
import { useHomeScreenState } from "@/components/features/home/useHomeScreenState";
import { useTourContext } from "@/contexts/TourContext";
import { useUpdateCheckContext } from "@/contexts/UpdateCheckContext";
import { useConnectivity } from "@/hooks/useConnectivity";
import { TourZone, useTour } from "react-native-lumen";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { check: checkForUpdate } = useUpdateCheckContext();
  const { isConnected } = useConnectivity();
  const {
    startActiveOnboardingIfEligible,
    onboardingLoaded,
    activeOnboardingState,
    state1Status,
    state2Status,
  } = useTourContext();
  const { scrollViewRef } = useTour();
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const {
    user,
    headerTitle,
    headerCollapsedTitle,
    headerSubtitle,
    authLoading,
    isHomeLoading,
    setupCompleted,
    handleProfilePress,
    budgetState,
    budgetTotals,
    activeCycleId,
    cycleCategories,
    recentExpenses,
    addTransaction,
    incomeTaxSummary,
    refreshing,
    handleRefresh,
    showExpenseModal,
    setShowExpenseModal,
    overviewAnimStyle,
  } = useHomeScreenState();

  const handleRefreshWithUpdateCheck = useCallback(async () => {
    await handleRefresh();
    void checkForUpdate();
  }, [handleRefresh, checkForUpdate]);

  const tourZonesReady = !isHomeLoading && onboardingLoaded;

  useEffect(() => {
    if (!onboardingLoaded || !tourZonesReady || !activeOnboardingState) {
      return;
    }

    const currentStatus =
      activeOnboardingState === "state_1_unpersonalized"
        ? state1Status
        : state2Status;

    if (currentStatus !== "never_seen") {
      return;
    }

    void startActiveOnboardingIfEligible("home");
  }, [
    activeOnboardingState,
    onboardingLoaded,
    startActiveOnboardingIfEligible,
    state1Status,
    state2Status,
    tourZonesReady,
  ]);

  const handleSeeAllPress = useCallback(() => {
    router.push("/expenses");
  }, [router]);

  return (
    <View style={styles.container} collapsable={false} className="flex-1 bg-background">
      <ExpandedHeader
        scrollY={scrollY}
        title={headerTitle}
        collapsedTitle={headerCollapsedTitle}
        subtitle={headerSubtitle}
        actions={[
          isConnected === false && (
            <View
              key="offline"
              className="mr-1 px-2 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 flex-row items-center gap-1">
              <WifiOff size={12} color="#FCA5A5" />
              <Text className="text-red-300 font-medium text-[10px]">Offline</Text>
            </View>
          ),
          !authLoading && (
            <View collapsable={false} style={{ position: "relative", width: 36, height: 36 }}>
              <Pressable
                onPress={handleProfilePress}
                style={({ pressed }) => [
                  styles.profileButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}>
                <Avatar alt={user?.name ?? "User"} size="sm">
                  {user?.avatar && (
                    <Avatar.Image source={{ uri: user.avatar }} />
                  )}
                  <Avatar.Fallback>
                    {user?.name?.charAt(0) ?? "U"}
                  </Avatar.Fallback>
                </Avatar>
              </Pressable>
            </View>
          ),
        ].filter(Boolean)}
      />

      <Animated.ScrollView
        ref={scrollViewRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        snapToOffsets={[0, DEFAULT_EXPANDED_HEIGHT - DEFAULT_STANDARD_HEIGHT]}
        snapToEnd={false}
        decelerationRate="fast"
        className="flex-1"
        contentContainerStyle={{
          paddingTop: DEFAULT_EXPANDED_HEIGHT + insets.top + 20, // 170 + top + 20px gap
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 20,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefreshWithUpdateCheck}
            tintColor="#22C55E"
            colors={["#22C55E"]}
            progressViewOffset={Platform.OS === "android" ? 60 : undefined}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View className="bg-background">
          {isHomeLoading ? (
            <VitalHeroSkeleton />
          ) : !setupCompleted ? (
            <TourZone
              stepKey="state1-home-setup"
              name="Start with your budget profile"
              description="Begin here to build a budget around your payday and spending style. It takes about 2 minutes."
              shape="rounded-rect"
              borderRadius={35}>
              <View collapsable={false}>
                <DiscoveryHeroCard />
              </View>
            </TourZone>
          ) : (
            <>
              <TourZone
                stepKey="state2-home-vitals"
                name="Your money snapshot"
                description="This card gives you a quick view of your financial position so you know where you stand at a glance."
                shape="rounded-rect"
                borderRadius={16}>
                <View collapsable={false}>
                  <VitalHeroCard
                    incomeTaxSummary={incomeTaxSummary}
                    budgetTotals={budgetTotals}
                    animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
                  />
                </View>
              </TourZone>
              <VaultHeroCard
                animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
              />
              <TourZone
                stepKey="state2-home-activities"
                name="Your recent activity"
                description="Use this area to review recent activity and add expenses so your budget stays accurate."
                shape="rounded-rect"
                borderRadius={16}>
                <View collapsable={false}>
                  <MonthlyActivitiesCard
                    recentExpenses={recentExpenses}
                    budgetState={budgetState}
                    hasActiveCycle={!!activeCycleId}
                    onRecordExpensePress={() => setShowExpenseModal(true)}
                    onSeeAllPress={handleSeeAllPress}
                    animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
                  />
                </View>
              </TourZone>
              <BudgetTransactionModal
                visible={showExpenseModal}
                categories={cycleCategories}
                onClose={() => setShowExpenseModal(false)}
                onSubmit={async ({ amount, note, bucket, categoryId }) => {
                  await addTransaction({ amount, note, bucket, categoryId });
                }}
              />
            </>
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}
