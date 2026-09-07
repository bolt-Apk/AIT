/*
# Enforce one canonical nickname per account

## Problem
Nicknames are the identifier used to find another person when sharing generated media,
and the profile screen already handles a "nickname already taken" outcome, but nothing
in the database prevented two accounts holding the same nickname. Two people could
therefore appear identically in the recipient picker, letting a newly registered
account impersonate an existing one and receive media intended for someone else.

## Change
1. Data integrity
   - Adds a case-insensitive unique index on `public.user_balances.nickname`, ignoring
     null and empty values.

## Notes
1. No existing rows collide, so the index is created without any data change.
2. The profile screen already reports the unique-violation case as "this nickname is
   already taken", so the message it shows now reflects a real constraint.
*/

CREATE UNIQUE INDEX IF NOT EXISTS user_balances_nickname_lower_key
  ON public.user_balances (lower(nickname))
  WHERE nickname IS NOT NULL AND nickname <> '';
