-- migrate:up

-- A walk-in or phone customer has no account. A booking's customer is therefore EITHER a
-- registered user OR a free-text name captured at the desk — never neither.
ALTER TABLE bookings
  ALTER COLUMN user_id DROP NOT NULL,
  ADD COLUMN customer_name text,
  ADD CONSTRAINT bookings_has_customer CHECK (num_nonnulls(user_id, customer_name) >= 1);

-- migrate:down

-- Down migration deletes walk-in bookings outright: they cannot satisfy NOT NULL user_id.
DELETE FROM bookings WHERE user_id IS NULL;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_has_customer,
  DROP COLUMN IF EXISTS customer_name,
  ALTER COLUMN user_id SET NOT NULL;
