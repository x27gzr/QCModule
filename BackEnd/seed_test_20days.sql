-- ============================================================
--  TEST DATA: 19 hari QC (18 Mei - 5 Juni 2026) untuk Level 2
--  Sample: Control Hematologi · Level 2 · Lot 60971102
--  Tujuan: menguji Westgard rules di LJ chart.
--  6 Juni sudah ada datanya → jadi titik ke-20.
--
--  Versi tanpa variabel / tanpa IF-BEGIN-END supaya aman
--  di tool yang memecah statement (DBeaver dll).
--  Guard 'WHERE NOT EXISTS' membuat script aman di-run ulang.
--
--  Hanya 2 statement INSERT. Boleh blok seluruhnya lalu Execute,
--  atau jalankan satu per satu.
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. WBC — didesain memicu rule (Mean 7.00, SD 0.35)
--    21-23 Mei : 3 berturut >+1SD → 3:1s (Warning)
--    30 Mei    : +2.2SD          → 1:2s (Warning)
--    05 Jun    : +3.3SD          → 1:3s (Rejection, dibiarkan Pending)
-- ══════════════════════════════════════════════════════════════
INSERT INTO QCResults
 (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
  ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
  CreatedAt, UpdatedAt, IsDeleted)
SELECT
  NEWID(),
  'F1000001-0000-0000-0000-000000000001',
  '5DD563C9-175B-428F-837D-A230ACCC49EA',
  NULL,
  w.Dt, w.Val, w.Z, w.Status, w.Flags, NULL,
  w.ValStat,
  CASE WHEN w.ValStat = 1 THEN CAST('74F46D02-7BB4-4F7F-A66B-A553D9017B41' AS uniqueidentifier) ELSE NULL END,
  CASE WHEN w.ValStat = 1 THEN w.Dt ELSE NULL END,
  0, NULL, NULL, NULL,
  w.Dt, NULL, 0
FROM (VALUES
  ('2026-05-18T08:00:00', 6.98, -0.06, 1, NULL,   1),
  ('2026-05-19T08:00:00', 7.05,  0.14, 1, NULL,   1),
  ('2026-05-20T08:00:00', 6.92, -0.23, 1, NULL,   1),
  ('2026-05-21T08:00:00', 7.45,  1.29, 1, NULL,   1),
  ('2026-05-22T08:00:00', 7.50,  1.43, 1, NULL,   1),
  ('2026-05-23T08:00:00', 7.43,  1.23, 2, '3:1s', 1),
  ('2026-05-24T08:00:00', 7.10,  0.29, 1, NULL,   1),
  ('2026-05-25T08:00:00', 6.95, -0.14, 1, NULL,   1),
  ('2026-05-26T08:00:00', 7.02,  0.06, 1, NULL,   1),
  ('2026-05-27T08:00:00', 6.88, -0.34, 1, NULL,   1),
  ('2026-05-28T08:00:00', 7.15,  0.43, 1, NULL,   1),
  ('2026-05-29T08:00:00', 6.90, -0.29, 1, NULL,   1),
  ('2026-05-30T08:00:00', 7.77,  2.20, 2, '1:2s', 1),
  ('2026-05-31T08:00:00', 7.08,  0.23, 1, NULL,   1),
  ('2026-06-01T08:00:00', 6.97, -0.09, 1, NULL,   1),
  ('2026-06-02T08:00:00', 7.12,  0.34, 1, NULL,   1),
  ('2026-06-03T08:00:00', 6.85, -0.43, 1, NULL,   1),
  ('2026-06-04T08:00:00', 7.20,  0.57, 1, NULL,   1),
  ('2026-06-05T08:00:00', 8.16,  3.31, 3, '1:3s', 0)
) AS w(Dt, Val, Z, Status, Flags, ValStat)
WHERE NOT EXISTS (
  SELECT 1 FROM QCResults x
  WHERE x.QCSampleId = 'F1000001-0000-0000-0000-000000000001'
    AND x.TestFileParameterId = '5DD563C9-175B-428F-837D-A230ACCC49EA'
    AND x.ResultDate = w.Dt
);

-- ══════════════════════════════════════════════════════════════
-- 2. 7 parameter lain — in-control (z-offset kecil ±0.7SD,
--    tidak memicu rule). Semua divalidasi oleh Administrator.
-- ══════════════════════════════════════════════════════════════
INSERT INTO QCResults
 (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
  ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
  CreatedAt, UpdatedAt, IsDeleted)
SELECT
  NEWID(),
  'F1000001-0000-0000-0000-000000000001',
  p.Pid,
  NULL,
  d.Dt,
  ROUND(p.Mn + p.Sd * d.Z, 2),
  d.Z, 1, NULL, NULL,
  1, CAST('74F46D02-7BB4-4F7F-A66B-A553D9017B41' AS uniqueidentifier), d.Dt,
  0, NULL, NULL, NULL,
  d.Dt, NULL, 0
FROM (VALUES
  (CAST('E1000001-0000-0000-0000-000000000001' AS uniqueidentifier),   4.25,  0.15),  -- RBC
  (CAST('E1000001-0000-0000-0000-000000000002' AS uniqueidentifier),  11.50,  0.40),  -- HB
  (CAST('E1000001-0000-0000-0000-000000000003' AS uniqueidentifier),  34.50,  1.20),  -- HCT
  (CAST('E1000001-0000-0000-0000-000000000004' AS uniqueidentifier),  81.00,  2.50),  -- MCV
  (CAST('E1000001-0000-0000-0000-000000000005' AS uniqueidentifier),  27.00,  0.90),  -- MCH
  (CAST('E1000001-0000-0000-0000-000000000006' AS uniqueidentifier),  33.00,  0.80),  -- MCHC
  (CAST('E1000001-0000-0000-0000-000000000007' AS uniqueidentifier), 235.00, 14.00)   -- PLT
) AS p(Pid, Mn, Sd)
CROSS JOIN (VALUES
  ('2026-05-18T08:00:00',  0.10),
  ('2026-05-19T08:00:00', -0.30),
  ('2026-05-20T08:00:00',  0.50),
  ('2026-05-21T08:00:00', -0.20),
  ('2026-05-22T08:00:00',  0.40),
  ('2026-05-23T08:00:00', -0.60),
  ('2026-05-24T08:00:00',  0.20),
  ('2026-05-25T08:00:00',  0.70),
  ('2026-05-26T08:00:00', -0.40),
  ('2026-05-27T08:00:00',  0.30),
  ('2026-05-28T08:00:00', -0.10),
  ('2026-05-29T08:00:00',  0.60),
  ('2026-05-30T08:00:00', -0.50),
  ('2026-05-31T08:00:00',  0.20),
  ('2026-06-01T08:00:00', -0.70),
  ('2026-06-02T08:00:00',  0.40),
  ('2026-06-03T08:00:00', -0.20),
  ('2026-06-04T08:00:00',  0.50),
  ('2026-06-05T08:00:00', -0.30)
) AS d(Dt, Z)
WHERE NOT EXISTS (
  SELECT 1 FROM QCResults x
  WHERE x.QCSampleId = 'F1000001-0000-0000-0000-000000000001'
    AND x.TestFileParameterId = p.Pid
    AND x.ResultDate = d.Dt
);

-- ══════════════════════════════════════════════════════════════
-- VERIFIKASI (jalankan terpisah setelah seeder)
-- ══════════════════════════════════════════════════════════════
-- SELECT CAST(ResultDate AS date) AS Tgl, Value, ZScore, Status, WestgardFlags, ValidationStatus
-- FROM QCResults
-- WHERE QCSampleId = 'F1000001-0000-0000-0000-000000000001'
--   AND TestFileParameterId = '5DD563C9-175B-428F-837D-A230ACCC49EA'
--   AND ResultDate >= '2026-05-18'
-- ORDER BY ResultDate;
