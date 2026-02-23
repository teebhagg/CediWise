import { BackButton } from "@/components/BackButton";
import Markdown from "@ronradtke/react-native-markdown-display";
import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const termsContent = `
# Terms of Service for CediWise
Effective date: **February 21, 2026**

**1. Acceptance**
By using the CediWise website or mobile app (“Services”) you accept these Terms. If you do not agree, do not use the Services.

**2. Services & eligibility**
CediWise provides budgeting, salary, SME ledger, and financial literacy tools. You must be at least 13 to use the Services (or have parental permission). We may refuse service to anyone.

**3. Account registration**
You are responsible for providing accurate info and maintaining the security of your account. We may suspend accounts that violate policies.

**4. User content & licenses**
You retain ownership of the content you upload. By uploading content, you grant CediWise a worldwide, non-exclusive, royalty-free license to host, copy, and display it as needed to operate the Services.

**5. Payments & refunds**
No payments are required at this time.

**6. Prohibited conduct**
Do not misuse the Services (e.g., attempt unauthorized access, submit illegal content, provide false info). Breach may result in termination.

**7. Intellectual property**
All intellectual property in the Services (UI, code, trademarks) belongs to CediWise or its licensors. Except for content you post, you may not copy or use our IP without permission.

**8. Disclaimer — Not financial advice**
The Services provide informational tools only. Nothing in the app constitutes financial, tax, or legal advice. Consult a professional before making financial decisions.

**9. Warranties & limitation of liability**
Service provided “AS IS”. To the maximum extent permitted, CediWise disclaims all warranties. We are not liable for indirect, incidental, or consequential damages.

**10. Governing law & dispute resolution**
These Terms are governed by the laws of Ghana. Disputes shall be resolved in Ghanaian courts.

**11. Contact**
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
  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.nav}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.navTitle}>Terms of Service</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Markdown style={markdownStyles}>{termsContent}</Markdown>
      </ScrollView>
    </SafeAreaView>
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
