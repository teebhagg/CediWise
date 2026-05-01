/**
 * AgooSMS API send test — https://developer.agoosms.com/
 * Env: AGOO_SMS_API_KEY (set in .env.local or shell)
 * Usage: npm run test:agoosms -- "+233XXXXXXXXX" "optional message"
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const p = resolve(__dirname, "../.env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvLocal();

// Public docs show api.agoosms.app (NXDOMAIN); live API resolves on api.agoosms.com
const API_URL =
  process.env.AGOO_SMS_API_URL ?? "https://api.agoosms.com/v1/sms/send";

const apiKey = process.env.AGOO_SMS_API_KEY;
const to = process.argv[2] ?? "+233539672914";
const message =
  process.argv[3] ??
  `CediWise AgooSMS test ${new Date().toISOString()}`;

if (!apiKey) {
  console.error(
    "Missing AGOO_SMS_API_KEY. Add it to cediwise-dashboard/.env.local or export it in your shell."
  );
  process.exit(1);
}

const res = await fetch(API_URL, {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ to, message }),
});

const text = await res.text();
console.log("HTTP", res.status);
console.log(text);
process.exit(res.ok ? 0 : 1);
