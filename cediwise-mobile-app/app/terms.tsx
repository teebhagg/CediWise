import { BackButton } from "@/components/BackButton";
import { StandardHeader } from "@/components/CediWiseHeader";
import Markdown from "@ronradtke/react-native-markdown-display";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const termsContent = `
# Terms of Service for CediWise
Effective date: **July 5, 2026**

**1. Acceptance**
By using the CediWise website or mobile app (“Services”) you accept these Terms. If you do not agree, do not use the Services.

**2. Services & eligibility**
CediWise provides budgeting, salary, SME ledger, financial literacy tools, and optional Mobile Money (MoMo) SMS expense import for users in Ghana. MoMo import is available on supported mobile devices when you opt in (Android first; iOS may use Apple Shortcuts when available). You must be at least 13 to use the Services (or have parental permission). We may refuse service to anyone.

**3. Account registration**
You are responsible for providing accurate info and maintaining the security of your account. We may suspend accounts that violate policies.

**4. User content & licenses**
You retain ownership of the content you upload. By uploading content, you grant CediWise a worldwide, non-exclusive, royalty-free license to host, copy, and display it as needed to operate the Services.

**5. Optional MoMo SMS import**
If you enable MoMo SMS import, you agree that:
* The feature is **opt-in only**. You voluntarily grant any device permissions required (e.g. SMS read on Android).
* You must use a phone and account that legitimately receive your MoMo payment alerts.
* We do **not** guarantee complete, timely, or accurate capture of every MoMo transaction. Import is an aid to budgeting, not a substitute for your MoMo wallet history, bank records, or official statements.
* You are responsible for reviewing imported entries and correcting or deleting inaccurate ones.
* You must not share import credentials (e.g. webhook keys), misuse the import API, or attempt to import SMS belonging to another person.

**6. Payments & refunds**
No payments are required at this time.

**7. Prohibited conduct**
Do not misuse the Services (e.g., attempt unauthorized access, submit illegal content, provide false info, abuse MoMo import endpoints or credentials). Breach may result in termination.

**8. Intellectual property**
All intellectual property in the Services (UI, code, trademarks) belongs to CediWise or its licensors. Except for content you post, you may not copy or use our IP without permission.

**9. Disclaimer — Not financial advice**
The Services provide informational tools only. Nothing in the app constitutes financial, tax, or legal advice. Auto-imported MoMo amounts and categories are parsed automatically and may be wrong. Consult a professional before making financial decisions.

**10. Warranties & limitation of liability**
Service provided “AS IS”. To the maximum extent permitted, CediWise disclaims all warranties. We are not liable for indirect, incidental, or consequential damages, including losses arising from missed, duplicate, or incorrect MoMo imports.

**11. Governing law & dispute resolution**
These Terms are governed by the laws of Ghana. Disputes shall be resolved in Ghanaian courts.

**12. Contact**
For legal notices: **legal@cediwise.app**
`;

const markdownStyles = {
  body: { color: "#e2e8f0", fontSize: 16, lineHeight: 26 },
  heading1: {
    color: "#f1f5f9",
    fontSize: 24,
    fontFamily: "Figtree-Bold",
    marginTop: 20,
    marginBottom: 10,
  },
  heading2: {
    color: "#f1f5f9",
    fontSize: 20,
    fontFamily: "Figtree-Bold",
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: { marginBottom: 16, fontFamily: "Figtree-Regular" },
  strong: { fontFamily: "Figtree-Bold", color: "#f1f5f9" },
  bullet_list: { marginBottom: 16 },
  list_item: {
    marginBottom: 8,
    color: "#e2e8f0",
    fontFamily: "Figtree-Regular",
  },
  bullet_list_icon: { color: "#10b981", marginRight: 8 },
};

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StandardHeader
        title="Terms of Service"
        leading={<BackButton onPress={() => router.back()} />}
        centered
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 64 + insets.top },
        ]}>
        <Markdown style={markdownStyles}>{termsContent}</Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  navTitle: {
    fontSize: 18,
    fontFamily: "Figtree-Bold",
    color: "#f1f5f9",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
});
