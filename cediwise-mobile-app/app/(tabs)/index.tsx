import { usePathname, useRouter } from "expo-router";
import { Bug } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import {
  Platform,
  RefreshControl,
  StyleSheet,
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
import { VitalHeroCard } from "@/components/features/home/VitalHeroCard";
import { VitalHeroSkeleton } from "@/components/features/home/VitalHeroSkeleton";
import { useHomeScreenState } from "@/components/features/home/useHomeScreenState";
import { useTourContext } from "@/contexts/TourContext";
import { useUpdateCheckContext } from "@/contexts/UpdateCheckContext";
import { log } from "@/utils/logger";
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
  const pathname = usePathname();
  const { check: checkForUpdate } = useUpdateCheckContext();
  const { startHomeTour, hasSeenHomeTour } = useTourContext();
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

  useEffect(() => {
    if (
      !setupCompleted &&
      hasSeenHomeTour === false &&
      user?.id
      // Current screen is the home screen
      && (pathname === "/(tabs)/index" || pathname === "/")
    ) {
      log.debug("[Tour] Starting home tour");
      startHomeTour();
    } else {
      log.debug("[Tour] Home tour not started", {
        setupCompleted,
        hasSeenHomeTour,
        userId: user?.id,
      });
    }
  }, [setupCompleted, hasSeenHomeTour, user?.id, startHomeTour]);

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
          <Pressable
            key="debug-tour"
            onPress={startHomeTour}
            style={{ marginRight: 8, padding: 8 }}>
            <Bug color="white" size={20} />
          </Pressable>,
          !authLoading && (
            <TourZone
              stepKey="home-profile"
              name="Your Profile"
              description="Your profile lives here. Tap anytime to edit."
              shape="circle">
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
            </TourZone>
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
              stepKey="home-setup"
              name="Set up profile"
              description="Add income and budget prefs to get personalized insights."
              shape="rounded-rect"
              borderRadius={16}>
              <View collapsable={false}>
                <DiscoveryHeroCard />
              </View>
            </TourZone>
          ) : (
            <>
              <TourZone
                stepKey="home-setup"
                name="Financial overview"
                description="Your financial overview at a glance."
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
              <MonthlyActivitiesCard
                recentExpenses={recentExpenses}
                budgetState={budgetState}
                hasActiveCycle={!!activeCycleId}
                onRecordExpensePress={() => setShowExpenseModal(true)}
                onSeeAllPress={handleSeeAllPress}
                animatedStyle={overviewAnimStyle as StyleProp<ViewStyle>}
              />
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
