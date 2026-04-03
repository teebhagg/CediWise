import { Card } from "@/components/Card";
import { SalaryInput } from "@/components/SalaryInput";
import {
  buildCasualShareMessage,
  buildPayeVerificationSnapshot,
  buildPrivacySafeShareBody,
  describeCasualPayeLine,
  describeCasualSsnitLine,
  isSsnitInsurableCapApplied,
  payeVerificationResultState,
  salaryRangeBucket,
  shouldShowHighSalaryWarning,
} from "@/utils/payeVerification";
import { formatCurrency } from "@/utils/formatCurrency";
import type { TaxConfig } from "@/utils/taxSync";
import { GHANA_TAX_FALLBACK_2026 } from "@/utils/taxSync";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { usePostHog } from "posthog-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";

const stripFormatting = (text: string) => text.replace(/[,₵\s]/g, "");
const toNumber = (s: string) => {
  const n = parseFloat(stripFormatting(s));
  return Number.isFinite(n) ? n : 0;
};

const WHATSAPP_SHARE_FALLBACK =
  "Just checked my PAYE with CediWise. Turns out my employer's been overdeducting 😤 Check yours: cediwise.app";

type PayeVerificationSectionProps = {
  grossMonthly: number;
  mandatedPaye: number;
  mandatedSsnit: number;
  taxConfig: TaxConfig | null;
  isSignedIn: boolean;
  onSavePress: () => void;
  onSaveRequiresAuth: () => void;
};

export function PayeVerificationSection({
  grossMonthly,
  mandatedPaye,
  mandatedSsnit,
  taxConfig,
  isSignedIn,
  onSavePress,
  onSaveRequiresAuth,
}: PayeVerificationSectionProps) {
  const posthog = usePostHog();
  const [verifyExpanded, setVerifyExpanded] = useState(false);
  const [employerPayeStr, setEmployerPayeStr] = useState("");
  const [employerSsnitStr, setEmployerSsnitStr] = useState("");
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<View>(null);
  const startedLogged = useRef(false);
  const lastCompletedKey = useRef<string>("");

  const cfg = taxConfig ?? GHANA_TAX_FALLBACK_2026;

  const snapshot = useMemo(() => {
    if (grossMonthly <= 0) return null;
    if (!employerPayeStr.trim() || !employerSsnitStr.trim()) return null;
    return buildPayeVerificationSnapshot(
      toNumber(employerPayeStr),
      toNumber(employerSsnitStr),
      mandatedPaye,
      mandatedSsnit,
    );
  }, [
    grossMonthly,
    employerPayeStr,
    employerSsnitStr,
    mandatedPaye,
    mandatedSsnit,
  ]);

  useEffect(() => {
    if (!verifyExpanded) {
      startedLogged.current = false;
      return;
    }
    if (startedLogged.current) return;
    startedLogged.current = true;
    try {
      posthog?.capture?.("paye_verification_started", {
        source: "salary_calculator",
      });
    } catch {
      // ignore analytics errors
    }
  }, [verifyExpanded, posthog]);

  useEffect(() => {
    if (!snapshot || grossMonthly <= 0) return;
    const key = `${grossMonthly}|${employerPayeStr}|${employerSsnitStr}|${payeVerificationResultState(snapshot)}`;
    if (lastCompletedKey.current === key) return;
    lastCompletedKey.current = key;
    try {
      posthog?.capture?.("paye_verification_completed", {
        result_state: payeVerificationResultState(snapshot),
        salary_range: salaryRangeBucket(grossMonthly),
      });
    } catch {
      // ignore
    }
  }, [snapshot, grossMonthly, employerPayeStr, employerSsnitStr, posthog]);

  const toggleVerify = async () => {
    try {
      await Haptics.selectionAsync();
    } catch {
      // ignore
    }
    setVerifyExpanded((v) => !v);
  };

  const handleShare = useCallback(async () => {
    if (!snapshot || grossMonthly <= 0) {
      Alert.alert(
        "Enter details",
        "Add your gross salary and employer-claimed PAYE and SSNIT first.",
      );
      return;
    }
    setSharing(true);
    try {
      try {
        await new Promise((r) => setTimeout(r, 100));
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 0.92,
        });
        if (!uri) {
          throw new Error("captureRef returned empty uri");
        }

        const casualMessage = buildCasualShareMessage(snapshot);

        const tryExpoImageShare = async (): Promise<boolean> => {
          try {
            if (!(await Sharing.isAvailableAsync())) return false;
            await Sharing.shareAsync(uri, {
              mimeType: "image/png",
              dialogTitle: "Share verification",
            });
            return true;
          } catch {
            return false;
          }
        };

        const tryRnShareImage = () =>
          Share.share(
            Platform.OS === "ios"
              ? { url: uri }
              : {
                  message: casualMessage,
                  url: uri,
                },
          );

        let channel: "image" | "image_rn_share" | "text_fallback";
        if (await tryExpoImageShare()) {
          channel = "image";
        } else {
          try {
            await tryRnShareImage();
            channel = "image_rn_share";
          } catch {
            await Share.share({
              message: `${casualMessage}\n\n${buildPrivacySafeShareBody(snapshot)}`,
            });
            channel = "text_fallback";
          }
        }
        posthog?.capture?.("paye_verification_shared", { channel });
      } catch {
        await Share.share({
          message: `${WHATSAPP_SHARE_FALLBACK}\n\n${buildPrivacySafeShareBody(snapshot)}`,
        });
        posthog?.capture?.("paye_verification_shared", {
          channel: "text_fallback",
        });
      }
    } finally {
      setSharing(false);
    }
  }, [snapshot, grossMonthly, posthog]);

  const capNote = isSsnitInsurableCapApplied(grossMonthly, cfg);
  const highSalary = shouldShowHighSalaryWarning(grossMonthly);

  const payeLine = snapshot?.paye;
  const ssnitLine = snapshot?.ssnit;

  return (
    <View className="mt-5">
      <Pressable
        onPress={toggleVerify}
        className={`min-h-[44px] px-3.5 py-3 rounded-[1.75rem] border ${verifyExpanded ? "bg-sky-500/15 border-sky-500/35" : "bg-slate-400/10 border-slate-400/25"}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
        accessibilityRole="button"
        accessibilityLabel="Verify employer deductions">
        <Text className="text-slate-200 font-medium text-[13px]">
          Verify employer deductions {verifyExpanded ? "▲" : "▼"}
        </Text>
        <Text className="text-slate-400 text-xs mt-1.5">
          Compare what your employer says they deduct vs GRA-mandated PAYE and
          SSNIT (±GHS {formatCurrency(1)} tolerance).
        </Text>
      </Pressable>

      {verifyExpanded && (
        <View className="mt-4 gap-4">
          {highSalary && (
            <Card>
              <Text className="text-amber-300 text-xs leading-5">
                This exceeds typical salary ranges. Results may not reflect
                special tax arrangements.
              </Text>
            </Card>
          )}

          <SalaryInput
            label="Employer-claimed PAYE (GHS)"
            value={employerPayeStr}
            onChangeText={setEmployerPayeStr}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
          <SalaryInput
            label="Employer-claimed SSNIT (GHS)"
            value={employerSsnitStr}
            onChangeText={setEmployerSsnitStr}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          {grossMonthly > 0 && (
            <Text className="text-slate-500 text-xs">
              GRA-mandated (this app): PAYE GHS {formatCurrency(mandatedPaye)} ·
              SSNIT GHS {formatCurrency(mandatedSsnit)}
            </Text>
          )}

          {capNote && (
            <Text className="text-slate-400 text-xs">
              SSNIT is capped at GHS {formatCurrency(cfg.ssnit_monthly_cap, 0)}{" "}
              insurable earnings.
            </Text>
          )}

          {snapshot && payeLine && ssnitLine && (
            <View className="gap-3">
              <VerificationLine
                label="PAYE"
                line={payeLine}
                annualOverflow={snapshot.annualPayeOverpaymentIfOverpaid}
              />
              <VerificationLine
                label="SSNIT"
                line={ssnitLine}
                annualOverflow={null}
              />
            </View>
          )}

          {/* Shareable card (capture target) — ref must be on a native View for view-shot */}
          <View
            ref={shareCardRef}
            collapsable={false}
            className="rounded-lg border border-white/10 bg-slate-950 p-6">
            {snapshot ? (
              <View className="gap-2">
                <Text className="text-white text-lg font-bold leading-7">
                  {describeCasualPayeLine(snapshot.paye.verdict)}
                </Text>
                <Text className="text-slate-300 text-sm leading-6">
                  {describeCasualSsnitLine(snapshot.ssnit.verdict)}
                </Text>
                <Text className="text-slate-400 text-sm mt-2 leading-5">
                  {buildCasualShareMessage(snapshot)}
                </Text>
              </View>
            ) : (
              <View>
                <Text className="text-white font-bold text-base">
                  CediWise PAYE check
                </Text>
                <Text className="text-slate-400 text-xs mt-1">
                  Compared to GRA rates in CediWise (no amounts on this card)
                </Text>
                <Text className="text-slate-500 text-xs mt-3">
                  Add employer PAYE and SSNIT to generate your shareable summary.
                </Text>
              </View>
            )}
            {/* Subtle CediWise logo watermark — bottom-right */}
            <View className="absolute bottom-2 right-2 opacity-30">
              <Image
                source={require("@/assets/images/logo/cediwise-transparent-emerald-logo.png")}
                style={{ width: 32, height: 32 }}
                resizeMode="contain"
              />
            </View>
          </View>

          <Pressable
            onPress={handleShare}
            disabled={sharing || !snapshot}
            className="min-h-[44px] rounded-2xl bg-emerald-600/90 px-4 py-3 items-center justify-center flex-row gap-2"
            style={{ opacity: sharing || !snapshot ? 0.5 : 1 }}>
            {sharing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-sm">
                Share summary (no amounts)
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              if (!isSignedIn) {
                onSaveRequiresAuth();
                return;
              }
              onSavePress();
            }}
            className="min-h-[44px] items-center justify-center">
            <Text className="text-sky-400 text-sm font-medium">
              Save this result →
            </Text>
          </Pressable>
          {!isSignedIn && (
            <Text className="text-slate-500 text-center text-xs">
              Sign in to save your verification to your profile.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

function VerificationLine({
  label,
  line,
  annualOverflow,
}: {
  label: string;
  line: {
    verdict: "correct" | "overpaid" | "underpaid";
    diff: number;
  };
  annualOverflow: number | null;
}) {
  if (line.verdict === "correct") {
    return (
      <Card>
        <Text className="text-emerald-400 text-sm font-medium">
          {label}: Your deductions match GRA rates. ✓
        </Text>
      </Card>
    );
  }
  if (line.verdict === "overpaid") {
    const payeBody =
      label === "PAYE"
        ? `Your employer deducted GHS ${formatCurrency(Math.abs(line.diff))} more PAYE than GRA requires.${
            annualOverflow != null
              ? ` That's GHS ${formatCurrency(annualOverflow)}/year.`
              : ""
          }`
        : `Your employer deducted GHS ${formatCurrency(Math.abs(line.diff))} more SSNIT than GRA requires for this salary.`;
    return (
      <Card>
        <Text className="text-amber-200 text-sm leading-5">{payeBody}</Text>
      </Card>
    );
  }
  const body =
    label === "PAYE"
      ? "Your employer is deducting less PAYE than required. This is your legal liability."
      : "Your employer is deducting less SSNIT than shown here. Confirm with your employer and SSNIT.";
  return (
    <Card>
      <Text className="text-rose-300 text-sm leading-5">{body}</Text>
    </Card>
  );
}
