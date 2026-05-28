-- Remove unique constraint from User.whatsappId
-- Multiple users may share the same WhatsApp number (e.g. family / shared devices)
DROP INDEX IF EXISTS "User_whatsappId_key";
