import { BackButton } from "@/components/BackButton";
import { StandardHeader } from "@/components/CediWiseHeader";
import Markdown from "@ronradtke/react-native-markdown-display";
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const privacyContent = `
# Privacy Policy for CediWise
Last updated: **February 21, 2026**

**1. Introduction**
CediWise (“we”, “us”, “our”) provides a salary calculator, budgeting, SME ledger, and financial literacy tools via web and mobile applications (the “Services”). This Privacy Policy describes what personal information we collect, how we use it, with whom we share it, and your rights. By using our Services you agree to the terms below.

**2. Controller & Contact**
Data controller: CediWise
Contact: **privacy@cediwise.app**

**3. What we collect**
* **Account & identity data:** email address, phone number (used for OTP), name, Google account identifiers for Google Sign-In.
* **Financial & usage data:** salary inputs, budgets, SME ledger entries, transactions users input into the app (this data is stored to provide the service).
* **Device & technical data:** device model, OS version, app version, IP address, crash reports. (Collected for troubleshooting and analytics.)
* **Analytics & telemetry:** we collect analytics data (via Firebase Analytics) to understand usage patterns and improve the app.
* **Communications:** emails you send to us, newsletter sign-ups (email), and responses to support requests.

**4. Legal bases**
* Performance of a contract (service delivery) — account and financial data.
* Legitimate interests — security, product improvement, analytics.
* Consent — marketing emails and newsletters.

**5. How we use your data**
* Provide, operate, and maintain the Services.
* Authenticate you (OTP via SMS, Google Sign-In). 
* Improve and personalize the Services (analytics). 
* Communicate about account, support, updates, or legal notices.
* Detect and prevent fraud and misuse.

**6. Third parties & processors**
We use trusted third-party providers to operate the Services. Primary providers include: **Supabase** (database/auth), **Firebase** (analytics), **Google** (Google Sign-In), **Arkesel** (SMS OTP), **Vercel/GitHub** (hosting/releases).

**7. Your rights**
You have rights to request: access to your personal data, correction, deletion (right to be forgotten), portability, restriction of processing, and to object to processing where applicable. To exercise these rights, contact **privacy@cediwise.app**.

**8. Security**
We use industry-standard measures (encryption in transit, secure storage, least privilege access) to protect data. However, no internet transmission is 100% secure.
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

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <StandardHeader
        title="Privacy Policy"
        leading={<BackButton onPress={() => router.back()} />}
        centered
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 64 + insets.top },
        ]}>
        <Markdown style={markdownStyles}>{privacyContent}</Markdown>
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
