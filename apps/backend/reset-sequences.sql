-- Reset auto-increment sequences to fix high ID gaps
-- Run this in development only!

-- Check what tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%message%';

-- Check current sequence values first
SELECT 
    schemaname,
    sequencename,
    last_value
FROM pg_sequences 
WHERE sequencename LIKE '%message%';