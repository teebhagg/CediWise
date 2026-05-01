# CediWise Subscription & Billing System Redesign

**Version:** 1.0  
**Author:** Engineering  
**Status:** Superseded by v2 — see [20260421000000_subscription-billing-system-redesign-v2.md](./20260421000000_subscription-billing-system-redesign-v2.md)  
**Target Implementation:** Q2 2026

> This document is retained for history only. Do not implement from v1.

---

## 1. Executive Summary

This document outlines the redesign of CediWise's subscription and billing system to support **Mobile Money (MoMo)** payments, establish a reliable **reminder system**, and implement a **grace period** mechanism for failed payments.

The current system relies solely on Paystack subscriptions with card payments. This redesign introduces a hybrid payment model that supports Ghana's dominant Mobile Money ecosystem while maintaining industry-standard auto-deduction for card users.

---

## 2. Problem Statement

| # | Problem |
|---|----------|
| 1 | Current system only supports card payments; Ghana's dominant payment method (Mobile Money) is not supported |
| 2 | No reminder system; users have no notification when subscription is about to expire |
| 3 | Trial and subscription expiration relies on app reopen, not scheduled processing |
| 4 | Payment preference not persisted; users must select method each time |

---

## 3. Goals

| Goal | Success Metric |
|------|----------------|
| Support Mobile Money payments | MoMo users can complete payments |
| Increase payment success rate | Reduce failed payment churn by 20% |
| Reduce manual intervention | Automated reminders and downgrades |
| Improve user experience | Clear billing status and payment flow |

---

## 4. Payment Model

### 4.1 Hybrid Payment Approach

| Payment Method | Collection Model | User Action Required |
|----------------|------------------|---------------------|
| **Mobile Money** | Manual "Pay Now" each cycle | Yes - tap to pay |
| **Card** | Paystack Subscription (auto-deduct) | No - automatic |

### 4.2 Default Payment Method

**MoMo is the DEFAULT payment method.** This is based on:
- Mobile Money is Ghana's dominant payment method
- MTN MoMo, Vodafone Cash, and AirtelTigo Money are widely used
- Most Ghanaian users are more comfortable with MoMo than entering card details
- MoMo number entry is simpler and faster

### 4.3 Payment Flow

#### MoMo Users
```
Subscribe → MoMo selected by default → Manual pay each cycle
        ↓
Reminders sent: 5, 3, 1 days before billing date
        ↓
Billing date arrives → Reminder sent
        ↓
Grace period: 5 days after billing date
        ↓
Day 1, 3, 5: Overdue reminders
        ↓
Grace period ends → User taps "Pay Now" → Pays → Access restored
```

#### Card Users
```
Subscribe → Card selected → Auto-deduct monthly/quarterly
        ↓ (if insufficient funds / card expires)
Paystack retries (built-in) → Reminder sent → Grace period
        ↓ (if still unpaid after grace period)
User taps "Pay Now" → Manual payment → Access restored
```

---

## 5. Database Schema Changes

### 5.1 Subscriptions Table Updates

```sql
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS payment_preference TEXT 
  CHECK (payment_preference IN ('card', 'momo')) DEFAULT 'momo';

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 5;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
```

### 5.2 Reminder Log Table (New)

```sql
CREATE TABLE public.subscription_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  reminder_type TEXT CHECK (reminder_type IN ('before', 'on_due', 'after', 'final')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT FALSE,
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminders_pending ON public.subscription_reminders(scheduled_for) WHERE sent_at IS NULL;
```

---

## 6. Payment Preference Persistence

### 6.1 Save During First Payment

On first successful payment, persist the payment method used:

```typescript
// In paystack-webhook handler
if (firstPayment && !existingPreference) {
  await supabase
    .from('subscriptions')
    .update({ 
      payment_preference: detectedMethod // 'card' or 'momo'
    })
    .eq('user_id', userId);
}
```

### 6.2 User Can Change Preference

- Subscription screen shows current preference with "Change" option
- Modal allows switching between Card and MoMo
- Preference stored in `subscriptions.payment_preference`

### 6.3 Subsequent Payments

For MoMo users:
- Saved MoMo number used for each payment
- User only needs to approve on their phone

For Card users:
- Auto-deducted unless card fails
- On failure → Manual fallback → Same card or switch method

---

## 7. Paystack Integration Changes

### 7.1 Payment Method Selection

**Selection occurs BEFORE Paystack opens.** This allows:
1. Immediate persistence of preference to database
2. Direct routing to appropriate Paystack API
3. Cleaner UX - no need to extract payment method from webhook

```
+-----------------------------------+
|         Your Plan: SME Ledger        |
|         Amount: GHS 25/month        |
+-----------------------------------+
|                                     |
|   [📱] Pay with Mobile Money   (Default)
|       Quick, secure, Ghana's #1     |
|                                     |
|   [💳] Pay with Card              |
|       Auto-renew each month          |
|                                     |
+-----------------------------------+
```

### 7.2 Edge Functions Required

| Function | Purpose |
|----------|---------|
| `paystack-initiate` | Existing - enhanced to save payment method and route to correct API |
| `paystack-webhook` | Existing - enhanced to save payment preference on first payment |
| `paystack-momo-charge` (NEW) | One-time MoMo charge for manual payments |
| `subscription-reminders` (NEW) | Cron job to send reminders via SMS/Email |
| `subscription-janitor` (ENHANCE) | Handle grace period and auto-downgrades |

### 7.3 API Routing

| Payment Method | Paystack API | Flow |
|----------------|--------------|------|
| MoMo | `POST /charge` | One-time charge, manual each cycle |
| Card | `POST /subscription` | Auto-deduct each cycle |

### 7.4 Payment Confirmation Flow

After successful payment via MoMo or Card:

1. **Webhook receives event** (`paystack-webhook`)
   - Validates Paystack signature
   - Extracts payment details

2. **Database updates**:
   - `status` = "active"
   - `next_billing_date` = current date + billing period (30 or 90 days)
   - `grace_period_end` = next_billing_date + 5 days
   - `payment_preference` = saved on first payment
   - `updated_at` = now

3. **Frontend sync**:
   - On next app open, `TierContext.loadTier()` reads updated subscription
   - Janitor sees "active" status and valid dates
   - `effectiveTier` set to user's plan (sme/budget)
   - `canAccessSME` / `canAccessBudget` set to true
   - UI immediately reflects upgraded access

4. **User confirmation**:
   - In-app toast "Payment successful! Your [Plan] is active."
   - Subscription screen shows updated status and next billing date

---

## 8. Reminder System

### 8.1 Reminder Schedule

| Timing | Type | Message Theme |
|--------|------|---------------|
| 5 days before | `before` | Upcoming renewal notice |
| 3 days before | `before` | Renewal reminder |
| 1 day before | `before` | Tomorrow reminder |
| Billing date | `on_due` | Payment due today |
| 1 day after | `after` | Overdue notice |
| 3 days after | `after` | Features at risk |
| 5 days after | `final` | Final notice before downgrade |

### 8.2 SMS Message Templates

#### Pre-Billing (Before)
```
CediWise: Hi [Name], your [Plan] subscription renews in [X] days for GHS [amount]. 
Open the app to pay: cediwise://subscription
```

#### Due Date
```
CediWise: Your [Plan] subscription is due today for GHS [amount]. 
Pay now to keep full access: cediwise://subscription
```

#### Overdue (After)
```
CediWise: Your [Plan] has expired. Please renew within [X] days to keep full access.
Pay now: cediwise://subscription
```

#### Final Notice
```
CediWise: FINAL NOTICE - Your CediWise access ends [tomorrow/today]. 
Renew now to keep [Plan] features: cediwise://subscription
```

### 8.3 Technical Implementation

- **SMS Provider**: AgooSMS
- **Email Provider**: Resend (existing)
- **Scheduler**: Supabase pg_cron (daily at 9:00 AM GMT)
- **Deep Link**: cediwise://subscription - Opens subscription screen

---

## 9. Auto-Downgrade Logic

### 9.1 Janitor Enhancement

The existing `TierContext.tsx` janitor handles:

| Condition | Action |
|-----------|--------|
| `pending_tier` exists AND `pending_tier_start_date` passed AND trial over | Activate pending tier |
| No `pending_tier` AND trial expired AND no payment | Expire trial, set to free |
| **grace_period_end <= now AND no successful payment** | **Downgrade to free** (NEW) |

### 9.2 Downgrade Actions

1. Update `subscriptions.status` = "expired"
2. Update `subscriptions.plan` = "free"
3. Send post-downgrade SMS notification
4. Log downgrade event for analytics

---

## 10. Frontend Changes

### 10.1 Subscription Screen

**MoMo Users (Default)**
```
+-----------------------------------------+
|  [📋] Current Plan: SME Ledger (Monthly) |
|     Status: Active                       |
|     Next billing: 27 April 2026          |
|     Paying with: Mobile Money [Change]  |
+-----------------------------------------+
|                                         |
|     [ 📱 Pay Now (GHS 25) ]             |
|                                         |
|     Pay manually each billing cycle      |
|                                         |
+-----------------------------------------+
```

**Card Users (Auto-Deduct)**
```
+-----------------------------------------+
|  [📋] Current Plan: SME Ledger (Monthly) |
|     Status: Active                       |
|     Next billing: 27 April 2026          |
|     Paying with: Card (ending 4242)       |
+-----------------------------------------+
|                                         |
|     Auto-renews on billing date         |
|                                         |
|     [ 💳 Manage Card ]                 |
|                                         |
|     If payment fails:                   |
|     [ 📱 Pay Now (Manual) ]             |
|                                         |
+-----------------------------------------+
```

### 10.2 First Payment Flow

```
+-------------------------------------+
|         Select Payment Method        |
+-------------------------------------+
|                                     |
|   [📱] Pay with Mobile Money (Default)
|       Quick, secure, Ghana's #1      |
|                                     |
|   [💳] Pay with Card               |
|       Auto-renew each month           |
|                                     |
|   [ Continue to Pay GHS 25 ]       |
|                                     |
+-------------------------------------+
```

---

## 11. Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| MoMo payment pending > 10 min | Timeout - Show "Payment pending, check status" |
| Card declined permanently | Switch to manual fallback after grace period |
| User changes plan mid-cycle | Keep current tier until period end, then switch |
| User downgrades | Keep current tier until period end, then switch |
| Payment during grace | Immediate access restoration |
| MoMo user switches to Card | Generate Paystack subscription, save preference |

---

## 12. Metrics & Monitoring

| Metric | Target |
|--------|--------|
| MoMo payment success rate | > 85% |
| Reminder-to-payment conversion | > 30% |
| Auto-downgrade rate | < 5% of subscriptions |
| Payment failure recovery | > 60% recover after reminder |

---

## 13. Phased Implementation

### Phase 1: Database & Backend
- Schema changes
- Payment preference field
- Webhook enhancements for preference persistence

### Phase 2: MoMo Flow
- MoMo charge edge function
- Payment method selection UI (MoMo default)
- First payment preference save

### Phase 3: Reminder System
- AgooSMS integration
- Cron job setup
- Message templates
- Deep link configuration

### Phase 4: Janitor Enhancement & Auto-Downgrade
- Grace period logic
- Auto-downgrade
- Post-downgrade notifications

---

## 14. Open Questions

| # | Question | Recommendation |
|---|----------|----------------|
| 1 | MoMo provider detection (MTN/Vodafone/AirtelTigo) | Auto-detect from number prefix, or skip for now |
| 2 | Card failure retry count | Default: 3 attempts (Paystack default) |
| 3 | Partial payment / prorated upgrades | Not in scope for V1 |
| 4 | Billing date alignment | Fixed to calendar month (pay on 15th - next billing 15th) |

---

## 15. Appendix

### A. Paystack MoMo Provider Codes
| Provider | Code | Country |
|----------|------|---------|
| MTN | mtn | Ghana |
| AirtelTigo | tgo | Ghana |
| Vodafone | vod | Ghana |

### B. AgooSMS API Reference
- Endpoint: https://api.agoosms.com/send
- Method: POST
- Authentication: API Key

### C. Related Documents
- Existing Paystack Integration (`supabase/functions/paystack-*`)
- Tier Context (`contexts/TierContext.tsx`)
- Upgrade Screen (`app/upgrade.tsx`)

---

## 16. Approval History

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | Engineering | 2026-04-20 | Draft |
| Product | - | - | Pending |
| Design | - | - | Pending |

---

*Document created: 2026-04-20*