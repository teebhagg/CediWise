const fs = require("node:fs");
const path = require("node:path");
const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withMainApplication,
} = require("@expo/config-plugins");

const PACKAGE_LINE = "add(com.cediwise.app.sms.MoMoSmsPackage())";

module.exports = function withCediWiseMoMoSms(config) {
  config = withAndroidManifest(config, (mod) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.receiver = application.receiver || [];
    // Release kill switch: a build without the live-import flag must not register a receiver
    // that captures SMS without loading JavaScript.
    const liveImportFlag = process.env.EXPO_PUBLIC_MOMO_SMS_LIVE_IMPORT;
    const receiverEnabled = liveImportFlag === "1" || liveImportFlag === "true" ? "true" : "false";
    const existing = application.receiver.find((receiver) => receiver.$?.["android:name"] === ".sms.MoMoSmsReceiver");
    if (existing) existing.$["android:enabled"] = receiverEnabled;
    if (!application.receiver.some((receiver) => receiver.$?.["android:name"] === ".sms.MoMoSmsReceiver")) {
      application.receiver.push({
        $: {
          "android:name": ".sms.MoMoSmsReceiver",
          "android:enabled": receiverEnabled,
          "android:exported": "true",
          "android:permission": "android.permission.BROADCAST_SMS",
        },
        "intent-filter": [{
          $: { "android:priority": "100" },
          action: [{ $: { "android:name": "android.provider.Telephony.SMS_RECEIVED" } }],
        }],
      });
    }
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    if (!mod.modResults.contents.includes("androidx.work:work-runtime-ktx")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        'implementation("com.facebook.react:react-android")',
        'implementation("com.facebook.react:react-android")\n    implementation("androidx.work:work-runtime-ktx:2.10.1")\n    implementation("androidx.security:security-crypto:1.1.0-alpha06")',
      );
    }
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    if (!mod.modResults.contents.includes(PACKAGE_LINE)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "PackageList(this).packages.apply {",
        `PackageList(this).packages.apply {\n              ${PACKAGE_LINE}`,
      );
    }
    return mod;
  });

  return withDangerousMod(config, ["android", async (mod) => {
    const source = path.join(mod.modRequest.projectRoot, "native", "momo-sms", "sms");
    const target = path.join(mod.modRequest.platformProjectRoot, "app", "src", "main", "java", "com", "cediwise", "app", "sms");
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(source, target, { recursive: true });
    return mod;
  }]);
};
