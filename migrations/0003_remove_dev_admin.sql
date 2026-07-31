-- The seeded admin account in 0002_seed.sql exists only to support local
-- development. Remove its publicly documented credential from every migrated
-- environment before the production API is exposed.

DELETE FROM sessions
WHERE user_id = 'a0000000-0000-4000-8000-000000000001';

DELETE FROM users
WHERE id = 'a0000000-0000-4000-8000-000000000001'
  AND email_lower = 'admin@movepilot.local';
