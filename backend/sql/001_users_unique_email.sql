-- Run once against your BloodTrack database (e.g. bloodtrack_db).
--
-- 1) Make sure there are no duplicate emails. This must return ZERO rows:
--    SELECT LOWER(email) AS email, COUNT(*) AS n
--      FROM users GROUP BY LOWER(email) HAVING n > 1;
--
-- 2) Add the unique index. It is what makes "one account per email" safe even
--    when two sign-ups for the same address arrive at the same moment.

ALTER TABLE users ADD UNIQUE INDEX uq_users_email (email);
