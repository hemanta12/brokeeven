### 12 Core UI/UX Rules (Web, App, & System Baseline)

1. **System Latency & Motion (The Doherty Threshold):** Keep system response times under 400ms. Restrict transition durations to 200-300ms (and micro-interactions to 100-150ms), and implement layout-matched skeleton screens instead of centered loading spinners to maintain user flow.
2. **Field Count & Step Chunking (Miller's Law):** Limit visible input fields to 6–8 maximum. If a form exceeds 10 fields, split it into a multi-step wizard or collapsing accordion, and preserve all state data across steps.
3. **Form Architecture & Persistent Labels:** Enforce single-column vertical forms (parallel fields are prohibited, except for single-entity inputs like expiration dates and the approved Add/Edit Expense `Paid by` + `Date` pair). The pair must stack below 360px. Always render permanent field labels directly above input containers; disappearing placeholders are strictly prohibited.
4. **Hick’s Law & Progressive Disclosure:** Reduce decision fatigue by presenting only one primary call-to-action per screen. Hide optional fields behind progressive disclosure triggers.
5. **Visual Isolation (The Von Restorff Effect):** Ensure primary actions are visually distinct using high contrast. Never rely on color as the sole indicator of state; always pair it with structural changes, icons, or text.
6. **Semantic Grouping (Gestalt Principles):** Use structural whitespace (proximity) and subtle backgrounds (common regions) to visually group related UI elements so users understand relationships without needing explicit instructions.
7. **Registration Timing:** Default strictly to guest checkout for transactional flows. Always defer account creation and password setup to post-transaction confirmation screens.
8. **Native Autofill (Tesler’s Law):** Assign standard HTML autocomplete attributes across all contact, address, and payment fields to shift the manual data-entry burden from the user to the machine.
9. **Inline Validation:** Trigger form validation on-blur (when focus leaves the field) rather than during typing. Always preserve the user's typed data when validation errors occur.
10. **Motion Physics:** Apply natural easing curves to all animations: use deceleration (ease-out) for entering elements, acceleration (ease-in) for exiting elements, and spring physics for on-screen state transitions.
11. **Trust Signal Placement:** Position verifiable security badges and guarantees directly next to primary transactional buttons, intercepting the user exactly where friction and anxiety peak.
12. **Universal Measurement (ISO 9241-11):** Systematically evaluate the final interface based on Effectiveness (accuracy of task completion), Efficiency (time and click count), and Satisfaction (comfort and aesthetic trust).

### 7 Mobile-Specific UI/UX Rules (Apply on top of the 12 Core Rules)

1. **Target Sizing (Fitts's Law):** Set touch target bounds to a minimum of 48x48 dp (Android) or 44x44 pt (iOS). The absolute baseline is 24x24 CSS px with 24px offset spacing. Expand small visual assets using padded hitboxes to prevent misclicks.
2. **Focal Ergonomics:** Position primary interactions in the thumb-reachable zone. The approved Group View Add Expense action uses a persistent bottom-anchored bar because it remains reachable while the ledger scrolls.
3. **Explicit Input Modes:** Declare explicit `inputmode` and `type` attributes (such as numeric, email, or tel) in the code to automatically trigger the correct native mobile keyboard for the user.
4. **Autocorrect Suppression:** Explicitly disable autocorrect and autocapitalize natively on sensitive mobile fields (like emails and credit card numbers) to prevent frustrating automated typos.
5. **Dynamic Scaling:** Ensure mobile layout containers can auto-reflow text up to 200% scale without text clipping or horizontal scrolling. Always use relative font units (rem, sp, pt) to respect device accessibility settings.
6. **Multimodal Feedback:** Pair visual state changes with synchronized haptics or audio cues. This is vital on mobile because the user's finger often physically obscures the screen during interaction.
7. **Express Mobile Payments:** Display digital wallets (Apple Pay, Google Pay) at the very top of the mobile user flow to completely bypass manual form entry on constrained mobile keyboards.
