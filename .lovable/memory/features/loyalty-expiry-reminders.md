---
name: Loyalty expiry reminders
description: Loyalty points nearing expiry are surfaced in account UI and scheduled notifications at 90/30/7-day windows.
type: feature
---
- `loyalty_points.expiring_points` and `expiry_date` drive customer warnings.
- `LoyaltyExpiryPanel` displays in CustomerAccount only when points are expiring, with urgency bands at 30 and 7 days.
- Edge function `process-loyalty-expiry-reminders` creates idempotent in-app reminders for 90/30/7 days before expiry, linking to rewards redemption.