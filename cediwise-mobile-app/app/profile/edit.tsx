import { BackButton } from "@/components/BackButton";
import {
  DEFAULT_STANDARD_HEIGHT,
  StandardHeader,
} from "@/components/CediWiseHeader";
import { AppTextField } from "@/components/AppTextField";
import { Card } from "@/components/Card";
import { KeyboardAwareScrollView } from "@/components/KeyboardAwareScrollView";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getStandardHeaderBodyOffsetTop } from "@/utils/screenHeaderInsets";
import { Apple } from "@/components/icons/AppleIcon";
import { Google } from "@/components/icons/GoogleIcon";
import { useAppToast } from "@/hooks/useAppToast";
import { useAuth } from "@/hooks/useAuth";
import {
  getAuthProviderInfo,
  updateUserProfileName,
  type AuthProviderInfo,
} from "@/utils/auth";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Mail, Phone } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, ListGroup } from "heroui-native";

const LIST_GROUP_CONTAINER_CLASS =
  "rounded-xl overflow-hidden bg-[rgba(18,22,33,0.9)]";

function IconPrefix({
  children,
  bgClass,
}: {
  children: ReactNode;
  bgClass: string;
}) {
  return (
    <View
      className={`h-10 w-10 items-center justify-center rounded-xl ${bgClass}`}
    >
      {children}
    </View>
  );
}

function getInitials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  }
  return parts[0]![0]!.toUpperCase();
}

function ProviderRow({ info }: { info: AuthProviderInfo }) {
  const icon = useMemo(() => {
    switch (info.kind) {
      case "google":
        return (
          <IconPrefix bgClass="bg-white/10">
            <Google.Color size={20} />
          </IconPrefix>
        );
      case "apple":
        return (
          <IconPrefix bgClass="bg-white/10">
            <Apple.Logo size={20} color="#F5F5F7" />
          </IconPrefix>
        );
      case "phone":
        return (
          <IconPrefix bgClass="bg-emerald-500/15">
            <Phone color="#10B981" size={20} />
          </IconPrefix>
        );
      case "email":
        return (
          <IconPrefix bgClass="bg-sky-500/15">
            <Mail color="#38BDF8" size={20} />
          </IconPrefix>
        );
      default:
        return (
          <IconPrefix bgClass="bg-slate-500/20">
            <Mail color="#94A3B8" size={20} />
          </IconPrefix>
        );
    }
  }, [info.kind]);

  return (
    <ListGroup.Item disabled>
      <ListGroup.ItemPrefix>{icon}</ListGroup.ItemPrefix>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>{info.label}</ListGroup.ItemTitle>
        <ListGroup.ItemDescription>
          {info.displayValue || "—"}
        </ListGroup.ItemDescription>
        <ListGroup.ItemDescription>
          Sign-in method — not editable
        </ListGroup.ItemDescription>
      </ListGroup.ItemContent>
    </ListGroup.Item>
  );
}

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshAuth } = useAuth();
  const { showError, showSuccess } = useAppToast();

  const [name, setName] = useState(user?.name?.trim() ?? "");
  const [initialName, setInitialName] = useState(user?.name?.trim() ?? "");
  const [providerInfo, setProviderInfo] = useState<AuthProviderInfo | null>(
    null,
  );
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user?.name?.trim() ?? "");
    setInitialName(user?.name?.trim() ?? "");
  }, [user?.id, user?.name]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProvider(true);
      const info = await getAuthProviderInfo({ storedUser: user });
      if (!cancelled) {
        setProviderInfo(info);
        setLoadingProvider(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleBackPress = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    router.back();
  }, []);

  const trimmed = name.trim();
  const canSave =
    trimmed.length > 0 && trimmed !== initialName && !saving;

  const displayName = useMemo(
    () => (trimmed || user?.name || "User"),
    [trimmed, user?.name],
  );

  const onSave = useCallback(async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const result = await updateUserProfileName(trimmed);
      if (!result.success) {
        showError("Couldn’t save", result.error ?? "Try again.");
        setSaving(false);
        return;
      }
      await refreshAuth();
      setInitialName(trimmed);
      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      } catch {
        // ignore
      }
      showSuccess("Profile updated", "Your name has been saved.");
      router.back();
    } catch (e) {
      showError(
        "Error",
        e instanceof Error ? e.message : "Could not update profile",
      );
    } finally {
      setSaving(false);
    }
  }, [canSave, trimmed, refreshAuth, showError, showSuccess]);

  const bodyTop = getStandardHeaderBodyOffsetTop(
    insets.top,
    DEFAULT_STANDARD_HEIGHT,
  );

  return (
    <View className="flex-1 bg-black">
      <StandardHeader
        title="Edit Profile"
        centered
        leading={<BackButton onPress={handleBackPress} />}
      />
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: bodyTop + 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(280).delay(0)}>
          <Card className="mb-6">
            <View className="items-center py-6">
              <View className="mb-4 overflow-hidden rounded-full border-2 border-emerald-500/40 bg-emerald-600/10">
                <Avatar alt={displayName} size="lg">
                  {user?.avatar ? (
                    <Avatar.Image source={{ uri: user.avatar }} />
                  ) : null}
                  <Avatar.Fallback>
                    <Text className="text-2xl font-bold text-emerald-400">
                      {getInitials(user?.name || trimmed)}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>
              </View>
              <Text className="mb-0.5 text-center text-lg font-bold text-white">
                {displayName}
              </Text>
              <Text className="text-center text-sm text-slate-500">
                Display name (save changes below)
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(280).delay(50)}>
          <Text className="mb-2.5 ml-1 text-xs font-medium uppercase tracking-wider text-slate-400">
            Name
          </Text>
          <AppTextField
            label="Your name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Ama Osei"
            autoCapitalize="words"
            autoCorrect
            maxLength={80}
            containerClassName="mb-6"
            accessibilityLabel="Your name"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(280).delay(100)}>
          <Text className="mb-2.5 ml-1 text-xs font-medium uppercase tracking-wider text-slate-400">
            Account type
          </Text>
          <ListGroup
            variant="tertiary"
            className={LIST_GROUP_CONTAINER_CLASS}
          >
            {loadingProvider || !providerInfo ? (
              <ListGroup.Item disabled>
                <ListGroup.ItemPrefix />
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Loading…</ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    Fetching sign-in method
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
              </ListGroup.Item>
            ) : (
              <ProviderRow info={providerInfo} />
            )}
          </ListGroup>
          <Text className="mt-3 px-1 text-xs leading-5 text-slate-500">
            Linked email or phone can&apos;t be changed in the app yet.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeIn.duration(220).delay(120)}
          className="mt-8"
        >
          <PrimaryButton
            loading={saving}
            disabled={!canSave}
            onPress={onSave}
            accessibilityLabel="Save profile"
            accessibilityHint="Saves your display name"
          >
            Save changes
          </PrimaryButton>
        </Animated.View>
      </KeyboardAwareScrollView>
    </View>
  );
}
