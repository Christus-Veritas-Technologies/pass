-- Remove unique constraint from User.phone
-- Multiple users may share the same phone number (e.g. family accounts)
DROP INDEX IF EXISTS "User_phone_key";
