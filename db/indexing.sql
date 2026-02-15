-- Benchmark helper SQL snippets
-- Run these against the `urls` table to compare lookup performance.

-- 1) Remove index
ALTER TABLE urls DROP INDEX ux_urls_short_code;

-- 2) Benchmark query
-- SELECT id FROM urls WHERE short_code = 'abc12345' LIMIT 1;

-- 3) Add index back (unique + indexed)
ALTER TABLE urls ADD UNIQUE INDEX ux_urls_short_code (short_code);
