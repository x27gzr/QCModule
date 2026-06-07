-- ============================================================
--  TEST DATA: 19 hari QC (18 Mei – 5 Juni 2026) untuk Level 2
--  Sample: Control Hematologi · Level 2 · Lot 60971102
--  Tujuan: menguji Westgard rules di LJ chart.
--  Catatan: 6 Juni sudah ada datanya → jadi titik ke-20.
--  Aman di-run ulang: ada guard IF EXISTS.
-- ============================================================
SET NOCOUNT ON;

DECLARE @sampleId UNIQUEIDENTIFIER = 'F1000001-0000-0000-0000-000000000001';
DECLARE @analyst  UNIQUEIDENTIFIER = '74F46D02-7BB4-4F7F-A66B-A553D9017B41'; -- Administrator
DECLARE @base     datetime2 = '2026-05-18T08:00:00';

-- Guard: jangan dobel insert
IF EXISTS (SELECT 1 FROM QCResults
           WHERE QCSampleId = @sampleId
             AND ResultDate >= '2026-05-18' AND ResultDate < '2026-06-06')
BEGIN
    PRINT 'Test data 2026-05-18..2026-06-05 sudah ada. Dibatalkan agar tidak dobel.';
    RETURN;
END

-- ══════════════════════════════════════════════════════════════
-- 1. WBC — didesain memicu rule (Mean 7.00, SD 0.35)
--    Day 4-6  : 3 berturut >+1SD  → 3:1s (Warning)
--    Day 13   : +2.2SD            → 1:2s (Warning)
--    Day 19   : +3.3SD            → 1:3s (Rejection, dibiarkan Pending)
-- ══════════════════════════════════════════════════════════════
DECLARE @wbc TABLE (DayNo int, Val decimal(10,2), Z decimal(6,2), Status int, Flags nvarchar(20), ValStat int);
INSERT INTO @wbc (DayNo, Val, Z, Status, Flags, ValStat) VALUES
 (1, 6.98, -0.06, 1, NULL,   1),
 (2, 7.05,  0.14, 1, NULL,   1),
 (3, 6.92, -0.23, 1, NULL,   1),
 (4, 7.45,  1.29, 1, NULL,   1),
 (5, 7.50,  1.43, 1, NULL,   1),
 (6, 7.43,  1.23, 2, '3:1s', 1),
 (7, 7.10,  0.29, 1, NULL,   1),
 (8, 6.95, -0.14, 1, NULL,   1),
 (9, 7.02,  0.06, 1, NULL,   1),
 (10,6.88, -0.34, 1, NULL,   1),
 (11,7.15,  0.43, 1, NULL,   1),
 (12,6.90, -0.29, 1, NULL,   1),
 (13,7.77,  2.20, 2, '1:2s', 1),
 (14,7.08,  0.23, 1, NULL,   1),
 (15,6.97, -0.09, 1, NULL,   1),
 (16,7.12,  0.34, 1, NULL,   1),
 (17,6.85, -0.43, 1, NULL,   1),
 (18,7.20,  0.57, 1, NULL,   1),
 (19,8.16,  3.31, 3, '1:3s', 0);  -- rejection → tetap Pending (belum divalidasi)

INSERT INTO QCResults
 (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
  ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
  CreatedAt, UpdatedAt, IsDeleted)
SELECT
  NEWID(), @sampleId, '5DD563C9-175B-428F-837D-A230ACCC49EA', NULL,
  DATEADD(DAY, DayNo-1, @base), Val, Z, Status, Flags, NULL,
  ValStat,
  CASE WHEN ValStat = 1 THEN @analyst ELSE NULL END,
  CASE WHEN ValStat = 1 THEN DATEADD(DAY, DayNo-1, @base) ELSE NULL END,
  0, NULL, NULL, NULL,
  DATEADD(DAY, DayNo-1, @base), NULL, 0
FROM @wbc;

-- ══════════════════════════════════════════════════════════════
-- 2. 7 parameter lain — in-control (nilai mengikuti pola z-offset
--    kecil, semua dalam ±0.7SD → tidak memicu rule apa pun)
-- ══════════════════════════════════════════════════════════════
DECLARE @params TABLE (Pid UNIQUEIDENTIFIER, Mn decimal(12,4), Sd decimal(12,4));
INSERT INTO @params (Pid, Mn, Sd) VALUES
 ('E1000001-0000-0000-0000-000000000001',   4.25,  0.15),  -- RBC
 ('E1000001-0000-0000-0000-000000000002',  11.50,  0.40),  -- HB
 ('E1000001-0000-0000-0000-000000000003',  34.50,  1.20),  -- HCT
 ('E1000001-0000-0000-0000-000000000004',  81.00,  2.50),  -- MCV
 ('E1000001-0000-0000-0000-000000000005',  27.00,  0.90),  -- MCH
 ('E1000001-0000-0000-0000-000000000006',  33.00,  0.80),  -- MCHC
 ('E1000001-0000-0000-0000-000000000007', 235.00, 14.00);  -- PLT

DECLARE @zoff TABLE (DayNo int, Z decimal(6,2));
INSERT INTO @zoff (DayNo, Z) VALUES
 (1,0.10),(2,-0.30),(3,0.50),(4,-0.20),(5,0.40),(6,-0.60),(7,0.20),
 (8,0.70),(9,-0.40),(10,0.30),(11,-0.10),(12,0.60),(13,-0.50),(14,0.20),
 (15,-0.70),(16,0.40),(17,-0.20),(18,0.50),(19,-0.30);

INSERT INTO QCResults
 (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
  ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
  CreatedAt, UpdatedAt, IsDeleted)
SELECT
  NEWID(), @sampleId, p.Pid, NULL,
  DATEADD(DAY, z.DayNo-1, @base),
  ROUND(p.Mn + p.Sd * z.Z, 2),
  z.Z, 1, NULL, NULL,
  1, @analyst, DATEADD(DAY, z.DayNo-1, @base),
  0, NULL, NULL, NULL,
  DATEADD(DAY, z.DayNo-1, @base), NULL, 0
FROM @params p CROSS JOIN @zoff z;

PRINT 'Selesai. 19 hari x 8 parameter = 152 hasil QC ditambahkan untuk Level 2.';

-- ══════════════════════════════════════════════════════════════
-- VERIFIKASI (jalankan terpisah setelah seeder)
-- ══════════════════════════════════════════════════════════════
-- SELECT CAST(ResultDate AS date) AS Tgl, Value, ZScore, Status, WestgardFlags, ValidationStatus
-- FROM QCResults
-- WHERE QCSampleId = 'F1000001-0000-0000-0000-000000000001'
--   AND TestFileParameterId = '5DD563C9-175B-428F-837D-A230ACCC49EA'
--   AND ResultDate >= '2026-05-18'
-- ORDER BY ResultDate;
