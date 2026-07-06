-- ========================================================
-- SAFE DROP OLD VIEWS
-- ========================================================
DROP VIEW IF EXISTS request_final_decision;
DROP VIEW IF EXISTS request_completion_time_week;
DROP VIEW IF EXISTS request_completion_time_month;
DROP VIEW IF EXISTS request_completion_time_quarter;
DROP VIEW IF EXISTS requests_by_status;
DROP VIEW IF EXISTS requests_submitted_week;
DROP VIEW IF EXISTS requests_submitted_month;
DROP VIEW IF EXISTS requests_submitted_quarter;
DROP VIEW IF EXISTS commercial_entity_submission_count;
-- ========================================================
-- 1️⃣ REQUESTS BY STATUS (CURRENT SNAPSHOT)
-- ========================================================
CREATE OR REPLACE VIEW requests_by_status AS
SELECT CASE
    WHEN r.status = 'APPROVED' THEN 'Approved'
    WHEN r.status = 'DENIED' THEN 'Denied'
    WHEN r.status IN (
      'UNDER_INITIAL_REVISION_PER_NTIA',
      'UNDER_FINAL_REVISION_PER_NTIA'
    ) THEN 'Revisions Requested'
    WHEN r.status = 'APPROVED_WITH_CONDITIONS' THEN 'Approved With Conditions'
    WHEN r.status = 'SUBMITTED' THEN 'Submitted'
    WHEN r.status IN (
      'UNDER_NTIA_INITIAL_REVIEW',
      'UNDER_FEDERAL_AGENCIES_REVIEW',
      'UNDER_NTIA_FINAL_REVIEW'
    ) THEN 'Under Review'
    ELSE 'Other'
  END AS status_group,
  COUNT(r.id)::bigint AS request_count
FROM "Request" r
WHERE r.current_revision = true
GROUP BY status_group;
-- ========================================================
-- 2️⃣ REQUESTS SUBMITTED DURING LAST COMPLETED PERIODS
-- ========================================================
-- Last week (Monday–Sunday)
CREATE OR REPLACE VIEW requests_submitted_week AS
SELECT COUNT(r.id)::bigint AS total_requests
FROM "Request" r
WHERE r.root_request_id IS NULL
  AND r."createdAt" >= date_trunc('week', current_date - interval '1 week')
  AND r."createdAt" < date_trunc('week', current_date);
-- Last month
CREATE OR REPLACE VIEW requests_submitted_month AS
SELECT COUNT(r.id)::bigint AS total_requests
FROM "Request" r
WHERE r.root_request_id IS NULL
  AND r."createdAt" >= date_trunc('month', current_date - interval '1 month')
  AND r."createdAt" < date_trunc('month', current_date);
-- Last quarter
CREATE OR REPLACE VIEW requests_submitted_quarter AS
SELECT COUNT(r.id)::bigint AS total_requests
FROM "Request" r
WHERE r.root_request_id IS NULL
  AND r."createdAt" >= date_trunc('quarter', current_date - interval '3 months')
  AND r."createdAt" < date_trunc('quarter', current_date);
-- ========================================================
-- 3️⃣ COMMERCIAL ENTITY SUBMISSION COUNT (ALL-TIME)
-- ========================================================
CREATE OR REPLACE VIEW commercial_entity_submission_count AS
SELECT e.id AS entity_id,
  e.name AS entity_name,
  COUNT(r.id)::bigint AS total_submissions
FROM "Entity" e
  JOIN "User" u ON u.entity_id = e.id
  JOIN "Request" r ON r.user_id = u.id
WHERE e.type = 'COMMERCIAL'
  AND r.root_request_id IS NULL
GROUP BY e.id,
  e.name;
-- ========================================================
-- 4️⃣ REQUEST COMPLETION TIME (FINAL DECISIONS)
-- ========================================================
-- Base view: all finalized approvals & denials (accounting for revisions)
CREATE OR REPLACE VIEW request_final_decision AS WITH root_requests_cte AS (
    SELECT id,
      "createdAt"
    FROM "Request"
    WHERE root_request_id IS NULL
  ),
  latest_request_per_root AS (
    SELECT CASE
        WHEN req.root_request_id IS NULL THEN req.id
        ELSE req.root_request_id
      END AS root_id,
      req.id AS request_id,
      req.status,
      ROW_NUMBER() OVER (
        PARTITION BY CASE
          WHEN req.root_request_id IS NULL THEN req.id
          ELSE req.root_request_id
        END
        ORDER BY req."createdAt" DESC
      ) AS rn
    FROM "Request" req
  )
SELECT lrr.request_id,
  rr."createdAt" AS request_created_at,
  a."createdAt" AS decision_created_at,
  a.date_approved AS decision_date,
  EXTRACT(
    EPOCH
    FROM (a.date_approved - rr."createdAt")
  ) / 86400 AS days_to_complete,
  CASE
    WHEN lrr.status = 'APPROVED_WITH_CONDITIONS' THEN 'approved_with_conditions'
    ELSE 'approved'
  END AS decision_type
FROM latest_request_per_root lrr
  JOIN root_requests_cte rr ON rr.id = lrr.root_id
  JOIN "Approval" a ON a.request_id = lrr.request_id
WHERE lrr.rn = 1
  AND a.is_final = TRUE
  AND lrr.status IN ('APPROVED', 'APPROVED_WITH_CONDITIONS')
UNION ALL
SELECT lrr.request_id,
  rr."createdAt",
  d."createdAt",
  d.date_denied,
  EXTRACT(
    EPOCH
    FROM (d.date_denied - rr."createdAt")
  ) / 86400,
  'denied'
FROM latest_request_per_root lrr
  JOIN root_requests_cte rr ON rr.id = lrr.root_id
  JOIN "Denial" d ON d.request_id = lrr.request_id
WHERE lrr.rn = 1
  AND d.is_final = TRUE
  AND lrr.status = 'DENIED';
-- ========================================================
-- 5️⃣ REQUESTS COMPLETED DURING LAST COMPLETED PERIODS
-- ========================================================
-- Last week
CREATE OR REPLACE VIEW request_completion_time_week AS
SELECT r.id,
  d.request_id, d.decision_date, d.request_created_at, d.days_to_complete
FROM "Request" r
  JOIN request_final_decision d ON d.request_id = r.id
WHERE d.decision_date >= date_trunc('week', current_date - interval '1 week')
  AND d.decision_date < date_trunc('week', current_date)
  AND d.request_created_at >= date_trunc('week', current_date - interval '1 week')
  AND d.request_created_at < date_trunc('week', current_date);
-- Last month
CREATE OR REPLACE VIEW request_completion_time_month AS
SELECT r.id,
  d.request_id, d.decision_date, d.request_created_at, d.days_to_complete
FROM "Request" r
  JOIN request_final_decision d ON d.request_id = r.id
WHERE d.decision_date >= date_trunc('month', current_date - interval '1 month')
  AND d.decision_date < date_trunc('month', current_date)
  AND d.request_created_at >= date_trunc('month', current_date - interval '1 month')
  AND d.request_created_at < date_trunc('month', current_date);
-- Last quarter
CREATE OR REPLACE VIEW request_completion_time_quarter AS
SELECT r.id,
  d.request_id, d.decision_date, d.request_created_at, d.days_to_complete
FROM "Request" r
  JOIN request_final_decision d ON d.request_id = r.id
WHERE d.decision_date >= date_trunc('quarter', current_date - interval '3 months')
  AND d.decision_date < date_trunc('quarter', current_date)
  AND d.request_created_at >= date_trunc('quarter', current_date - interval '3 months')
  AND d.request_created_at < date_trunc('quarter', current_date);
-- ========================================================
-- 6️⃣ COMPLETION SUMMARY METRICS PER PERIOD
-- ========================================================
CREATE OR REPLACE VIEW request_completion_summary_week AS
SELECT COUNT(*)::bigint AS total_completed,
  AVG(days_to_complete) AS avg_days,
  MIN(days_to_complete) AS fastest_days,
  MAX(days_to_complete) AS slowest_days
FROM request_completion_time_week;
CREATE OR REPLACE VIEW request_completion_summary_month AS
SELECT COUNT(*)::bigint AS total_completed,
  AVG(days_to_complete) AS avg_days,
  MIN(days_to_complete) AS fastest_days,
  MAX(days_to_complete) AS slowest_days
FROM request_completion_time_month;
CREATE OR REPLACE VIEW request_completion_summary_quarter AS
SELECT COUNT(*)::bigint AS total_completed,
  AVG(days_to_complete) AS avg_days,
  MIN(days_to_complete) AS fastest_days,
  MAX(days_to_complete) AS slowest_days
FROM request_completion_time_quarter;
