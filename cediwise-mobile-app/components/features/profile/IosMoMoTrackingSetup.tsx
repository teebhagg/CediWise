import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ClipboardPaste, ExternalLink, Smartphone } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Pressable, Switch, Text, View } from "react-native";

import { AppDialog } from "@/components/AppDialog";
import { Card } from "@/components/Card";
import { useAppToast } from "@/hooks/useAppToast";
import { useSmsImport } from "@/hooks/useSmsImport";
import { isMoMoSmsLiveImportEnabled } from "@/utils/featureFlags";
import { ListGroup } from "heroui-native";

type IosMoMoTrackingSetupProps = {
  userId: string | undefined;
};

function IconPrefix({
  icon: Icon,
  color,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  color: string;
}) {
  return (
    <View
      className="h-10 w-10 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${color}20` }}
    >
      <Icon color={color} size={20} />
    </View>
  );
}

function getAppScheme(): string {
  const scheme = Constants.expoConfig?.scheme;
  if (typeof scheme === "string") return scheme;
  if (Array.isArray(scheme) && scheme[0]) return scheme[0];
  return Constants.expoConfig?.ios?.bundleIdentifier ?? "com.cediwise.app";
}

export function IosMoMoTrackingSetup({ userId }: IosMoMoTrackingSetupProps) {
  const router = useRouter();
  const { showError, showInfo, showSuccess } = useAppToast();
  const sms = useSmsImport({ userId });
  const [liveImportAvailable, setLiveImportAvailable] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const enabled = sms.optedIn && sms.liveListenerEnabled;
  const hydrateUserTracking = sms.hydrateUserTracking;
  const enableIosShortcutTracking = sms.enableIosShortcutTracking;
  const disableTracking = sms.disableTracking;
  const scheme = getAppScheme();
  const shortcutUrl = `${scheme}://profile/import-sms?momoMessage=[URL-encoded message]&momoSender=[URL-encoded sender]`;

  useEffect(() => {
    if (!userId) {
      setLiveImportAvailable(false);
      return;
    }
    void hydrateUserTracking();
    let active = true;
    void isMoMoSmsLiveImportEnabled(userId).then((available) => {
      if (active) setLiveImportAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [hydrateUserTracking, userId]);

  const handleToggle = async (nextEnabled: boolean) => {
    if (!userId || saving) return;
    if (nextEnabled) {
      setShowConsent(true);
      return;
    }
    setSaving(true);
    try {
      await disableTracking();
      showSuccess("MoMo tracking is off", "CediWise will ignore messages sent by your Shortcuts automation.");
    } catch (error) {
      showError("Could not update tracking", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const confirmEnable = async () => {
    if (!userId || saving) return;
    setSaving(true);
    try {
      const enabledNow = await enableIosShortcutTracking();
      setShowConsent(false);
      if (!enabledNow) {
        showInfo("Automatic import unavailable", "Automatic MoMo import is not enabled in this release.");
        return;
      }
      showSuccess("Shortcuts import enabled", "Create a Message automation below to pass new payment alerts to CediWise.");
    } catch (error) {
      showError("Could not enable tracking", error instanceof Error ? error.message : "Try again.");
    } finally {
      setSaving(false);
    }
  };

  const openShortcuts = () => {
    void Haptics.selectionAsync().catch(() => {});
    void Linking.openURL("shortcuts://").catch(() => {
      showInfo("Shortcuts is unavailable", "Open the Shortcuts app on this iPhone to create the automation.");
    });
  };

  return (
    <View>
      <Text className="mb-2.5 ml-1 text-xs uppercase tracking-wider text-slate-400">
        MoMo expense import
      </Text>

      <Card className="mb-3 border border-slate-700/60">
        <View className="flex-row items-start gap-3">
          <IconPrefix icon={Smartphone} color="#60A5FA" />
          <View className="flex-1">
            <Text className="text-base font-semibold text-white">Import with Apple Shortcuts</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-400">
              iPhone does not let CediWise scan your Messages inbox. A Message automation can pass new payment texts to the app. CediWise opens for each message the automation sends.
            </Text>
          </View>
        </View>
      </Card>

      <ListGroup
        variant="tertiary"
        className="overflow-hidden rounded-xl bg-[rgba(18,22,33,0.9)]"
      >
        <ListGroup.Item>
          <ListGroup.ItemPrefix>
            <IconPrefix icon={Smartphone} color={enabled ? "#34D399" : "#64748B"} />
          </ListGroup.ItemPrefix>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Automatic MoMo import</ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              {liveImportAvailable
                ? enabled
                  ? "Waiting for a Message automation in Shortcuts"
                  : "Pass selected new payment texts to CediWise"
                : "Automatic import is unavailable in this release"}
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix>
            <Switch
              value={enabled}
              disabled={(!liveImportAvailable && !enabled) || !userId || saving}
              onValueChange={(value) => void handleToggle(value)}
              trackColor={{ false: "#334155", true: "#22C55E" }}
              thumbColor="#fff"
              accessibilityLabel="Automatic MoMo import with Shortcuts"
            />
          </ListGroup.ItemSuffix>
        </ListGroup.Item>

        {enabled ? (
          <View className="border-t border-slate-700/70 p-4">
            <Text className="text-sm font-semibold text-white">Set up the automation</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-300">
              In Shortcuts, create a Personal Automation for Message. Choose a sender or a message phrase that matches your MoMo alerts, then set it to Run Immediately.
            </Text>
            <Text className="mt-2 text-sm leading-5 text-slate-300">
              Add actions to get the message content and sender, URL Encode both values, then open this URL with those encoded values:
            </Text>
            <Text selectable className="mt-2 rounded-lg bg-black/50 p-3 text-xs leading-5 text-slate-200">
              {shortcutUrl}
            </Text>
            <Text className="mt-2 text-xs leading-5 text-slate-400">
              Use Open URLs for the final action. Only new messages are passed; older texts can still be pasted below.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={openShortcuts}
              className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-xl bg-blue-500/15 px-4"
            >
              <ExternalLink size={16} color="#93C5FD" />
              <Text className="font-semibold text-blue-200">Open Shortcuts</Text>
            </Pressable>
          </View>
        ) : null}

        <ListGroup.Item
          onPress={() => {
            void Haptics.selectionAsync().catch(() => {});
            router.push("/profile/import-sms" as never);
          }}
        >
          <ListGroup.ItemPrefix>
            <IconPrefix icon={ClipboardPaste} color="#60A5FA" />
          </ListGroup.ItemPrefix>
          <ListGroup.ItemContent>
            <ListGroup.ItemTitle>Import or paste messages</ListGroup.ItemTitle>
            <ListGroup.ItemDescription>
              Review recent messages from Shortcuts, or paste one payment text
            </ListGroup.ItemDescription>
          </ListGroup.ItemContent>
          <ListGroup.ItemSuffix />
        </ListGroup.Item>
      </ListGroup>

      <AppDialog
        visible={showConsent}
        onOpenChange={setShowConsent}
        icon={<Smartphone size={22} color="#34D399" />}
        title="Enable Shortcuts import?"
        primaryLabel={saving ? "Enabling…" : "Enable import"}
        onPrimary={() => void confirmEnable()}
        secondaryLabel="Not now"
        onSecondary={() => setShowConsent(false)}
        loading={saving}
      >
        <Text className="text-sm leading-6 text-slate-300">
          Your Shortcuts automation will pass selected message text and sender details to CediWise. Matching transaction details and message text may be sent to CediWise&apos;s import service and processed or stored by Supabase. Import logs that include message text are kept for up to 180 days. Turn this off here and remove the automation in Shortcuts to stop future imports.
        </Text>
      </AppDialog>
    </View>
  );
}
