---
name: Birthday Rewards
description: Automated birthday loyalty points + unique discount code with idempotent yearly issuance
type: feature
---
**Schema additions**: `profiles.birthday_month` (1-12), `profiles.birthday_day` (1-31).

**Tables**:
- `birthday_reward_config` (singleton id=1): enabled, loyalty_points, discount_percent (0-90), code_valid_days (1-90), window_days (0-7)
- `birthday_reward_issuances` (user_id, reward_year UNIQUE pair, points_awarded, discount_code BDAY-XXXXXXXX, discount_percent, code_expires_at)

**RPCs**:
- `process_birthday_rewards()` — finds today's birthdays without an issuance for current year; inserts issuance + `loyalty_transactions(earned, 'birthday_reward')`. Idempotent via UNIQUE constraint.
- `my_birthday_rewards()` — customer-facing.

**RLS**: customers SELECT own; admins SELECT all; admins UPDATE config.

**UI**: `BirthdayRewardsManager.tsx` at Admin → Marketing → Birthday Rewards. Run-Now button + config form + recent issuances list.

**Cron**: Schedule `process_birthday_rewards` daily ~02:00 IST.
