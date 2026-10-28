# MoMo Import Intro

## Goal

People who have not seen Import MoMo get one short explanation on Home, then a step-by-step sheet the first time they open Import MoMo. A book icon on that screen reopens the steps.

## Scope

**In scope**

- One first-time sheet on Home: [cediwise-mobile-app/app/(tabs)/index.tsx](../../../cediwise-mobile-app/app/(tabs)/index.tsx)
- Steps sheet, book icon, and header layout on [cediwise-mobile-app/app/profile/import-sms.tsx](../../../cediwise-mobile-app/app/profile/import-sms.tsx)
- A small pure gate for when the Home sheet may open, plus a unit test
- Per-account AsyncStorage flags for "already seen"

**Out of scope**

- Budget screen
- Scan, paste, review, save, and capture-settings behavior
- Product tour content
- Profile MoMo setup copy
- A new bottom-sheet component or extra entrance animation

## Units

| Unit | Does | Interface | Depends on |
| --- | --- | --- | --- |
| Home intro gate | Decides whether the Home sheet may open | `shouldShowMoMoImportIntro(input) => boolean` | Onboarding status, tour active flag, feedback visibility, seen flag |
| Home screen | Shows the intro sheet once and routes to Import MoMo | Existing Home render | Gate, `CustomBottomSheet`, router |
| Import MoMo screen | Auto-opens the steps once, and reopens them from the book icon | Existing screen plus two header actions | `CustomBottomSheet`, AsyncStorage |
| Seen flags | Remember each sheet per signed-in account | `get` / `set` for the two keys below | AsyncStorage |

## Seen flags

Two keys, value `"1"` when seen. No other payload.

- `@cediwise/momo-import-home-intro-seen:{userId}`
- `@cediwise/momo-import-steps-seen:{userId}`

Do not read or write either key when `userId` is missing. Do not open either sheet until that key has been read for the current account, so a slow read cannot flash the sheet for someone who already dismissed it.

## Home sheet

Show only when `shouldShowMoMoImportIntro` is true:

- `userId` is a non-empty string
- the Home seen flag is false
- `onboardingLoaded` is true
- `isTourActive` is false
- the active onboarding status (`state2Status` when `setupCompleted`, otherwise `state1Status`) is `dismissed`, `completed`, or `invalidated`
- `PeriodicFeedbackPromptModal` is not visible

`never_seen` and `in_progress` wait. The sheet does not show on Budget.

The feedback prompt can become visible after Home has already opened this sheet. If that happens, close the intro immediately and do not write the Home seen flag. When the prompt is gone and the gate passes again, the intro may open. Do not leave both overlays up.

Use `CustomBottomSheet`. No extra entrance animation.

- Title: `Import MoMo`
- Description: `Pull MoMo payments from your SMS into your budget. You review them before anything is added. Scan recent messages, or paste one. Capture settings live on your profile.`
- Primary label, string child only: `Import MoMo`. Marks the Home flag seen, closes the sheet, then `router.push("/profile/import-sms")`.
- Secondary label, string child only: `Not now`. Marks the Home flag seen and closes the sheet.
- Close control and swipe-down do the same as **Not now**.

`PrimaryButton` only shows its label when `children` is a string. Do not pass an icon as a child.

## Import MoMo header

`StandardHeader` on this screen is centered today, and a centered header reserves 44px for actions. Two icons do not fit. Turn centering off so the title sits on the left and the actions size to their content.

Order, left to right: back button, title `Import MoMo`, book, phone-and-gear.

Book button:

- Lucide `BookOpen`, size 20, color `#E2E8F0`
- 44×44 press target
- Press opacity 0.7, same as the phone-and-gear button
- `accessibilityLabel`: `How to import`
- Press opens the steps sheet. It does not navigate.

The phone-and-gear button stays as it is, including its route to `/profile`.

## Steps sheet

First time this screen opens for an account whose steps flag is still unseen, open the sheet after the flag read resolves. Opening it writes the steps flag immediately, so a later visit does not auto-open. The book button can open it again whether or not the flag is set. If the person taps the book before the auto-open effect runs, open once and write the flag. Do not stack a second sheet.

Use `CustomBottomSheet`. Title: `How to import`. No primary button. Close and swipe dismiss only.

Body, in order:

1. Choose 2, 7, or 30 days.
2. Tap Scan SMS. Messages are listed only. Nothing is added yet.
3. Untick anything you do not want, then tap Add.
4. Or paste one SMS under Add a payment yourself.
5. The phone-and-gear icon opens capture settings.
6. A row with the same `BookOpen` icon (size 20, color `#E2E8F0`) and the sentence: `Open these steps again from the book beside the phone settings.`

The sheet may open during a review. It does not clear the review or call save.

## Error handling

A failed AsyncStorage read is treated as unseen, and the sheet may show. A failed write leaves the in-memory session closed after dismiss, and the next cold start may show the sheet again. Do not toast storage failures.

## Testing

Unit-test `shouldShowMoMoImportIntro`:

- true only for the allowed onboarding statuses when every other gate passes
- false when the flag is seen, the tour is active, onboarding is not loaded, status is `never_seen` or `in_progress`, feedback is visible, or `userId` is missing

No snapshot of the sheets. Do not change scan-button tests.
