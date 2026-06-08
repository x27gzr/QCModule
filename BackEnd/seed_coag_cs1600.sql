-- ============================================================
--  SEEDER: Coagulation QC Data — instrument CS1600, sno_id 507971
--  Sumber data: input qc1.png + input qc2.png (folder QCModule)
--  26 titik PT (30-Apr-2026 .. 25-Mei-2026), nilai detik ~11.
--
--  Dirancang aman:
--   - Semua master (Instrument / TestFile / Parameter / Sample /
--     Target) hanya dibuat IF NOT EXISTS, di-key pakai natural key
--     (Instrument.Code='CS1600', QCSample.LotNumber='507971').
--   - INSERT QCResults mencari Id Sample & Parameter via subquery,
--     jadi tetap jalan walau master sudah ada dengan GUID berbeda.
--   - Guard NOT EXISTS pada ResultDate → aman di-run ulang.
--
--  ASUMSI (ubah bila perlu):
--   - Parameter tunggal = PT (Prothrombin Time), satuan "detik".
--   - Target Mean 11.30 / SD 0.20  → ZScore & Status dihitung di sini
--     dengan rule z (1:2s / 1:3s), sesuai WestgardService aplikasi.
--   - ValidationStatus = Validated (validator = user pertama),
--     AuthorisationStatus = Pending (siap diuji Doctor Authorise).
--   - Kolom Comment diisi teks asli dari gambar (OKE / PENOLAKAN dst).
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. TEST FILE — CS1600
-- ══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM TestFiles WHERE Code = 'CS1600')
INSERT INTO TestFiles (Id, Name, Code, Type, Unit, IsActive, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('D2000001-0000-0000-0000-000000000001',
        'Sysmex CS-1600 Coagulation', 'CS1600', 'Numerical', 'detik',
        1, GETUTCDATE(), NULL, 0);

-- ══════════════════════════════════════════════════════════════
-- 2. INSTRUMENT — Code = CS1600 (instrumen_id di file .res)
-- ══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM Instruments WHERE Code = 'CS1600')
INSERT INTO Instruments (Id, Name, Code, IsActive, TestFileId, CreatedAt, UpdatedAt, IsDeleted)
SELECT 'D2000002-0000-0000-0000-000000000001',
       'Sysmex CS-1600', 'CS1600', 1, tf.Id, GETUTCDATE(), NULL, 0
FROM   TestFiles tf
WHERE  tf.Code = 'CS1600';

-- ══════════════════════════════════════════════════════════════
-- 3. TEST FILE PARAMETER — PT (parameter tunggal)
-- ══════════════════════════════════════════════════════════════
IF NOT EXISTS (
    SELECT 1 FROM TestFileParameters p
    JOIN TestFiles tf ON tf.Id = p.TestFileId
    WHERE tf.Code = 'CS1600' AND p.ParameterName = 'PT')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
SELECT 'D2000003-0000-0000-0000-000000000001', tf.Id,
       'PT', 'PT', '9990.99', 1, 'detik', NULL, NULL, GETUTCDATE(), NULL, 0
FROM   TestFiles tf
WHERE  tf.Code = 'CS1600';

-- ══════════════════════════════════════════════════════════════
-- 4. QC SAMPLE — LotNumber = 507971 (sno_id di file .res)
-- ══════════════════════════════════════════════════════════════
IF NOT EXISTS (SELECT 1 FROM QCSamples WHERE LotNumber = '507971')
INSERT INTO QCSamples (Id, Name, LotNumber, Level, ExpiryDate, InstrumentId,
                       IsActive, Rule1_2s, Rule1_3s, Rule2_2s, Rule3_1s, Rule4_1s, Rule9x, Rule10x, RuleR_4s,
                       CreatedAt, UpdatedAt, IsDeleted)
SELECT 'D2000004-0000-0000-0000-000000000001',
       'Control Coagulation', '507971', 'Level 1',
       '2026-12-31 16:00:00.000',
       i.Id,
       1, 1, 1, 0, 0, 0, 1, 1, 0,
       GETUTCDATE(), NULL, 0
FROM   Instruments i
WHERE  i.Code = 'CS1600';

-- ══════════════════════════════════════════════════════════════
-- 5. QC SAMPLE TARGET — PT (Mean 11.30 / SD 0.20)
-- ══════════════════════════════════════════════════════════════
IF NOT EXISTS (
    SELECT 1 FROM QCSampleTargets t
    JOIN QCSamples s ON s.Id = t.QCSampleId
    JOIN TestFileParameters p ON p.Id = t.TestFileParameterId
    WHERE s.LotNumber = '507971' AND p.ParameterName = 'PT')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
SELECT 'D2000005-0000-0000-0000-000000000001', s.Id, p.Id,
       11.30, 0.20, 1.77, 15, '%', GETUTCDATE(), NULL, 0
FROM   QCSamples s
JOIN   Instruments i        ON i.Id = s.InstrumentId
JOIN   TestFileParameters p ON p.TestFileId = i.TestFileId AND p.ParameterName = 'PT'
WHERE  s.LotNumber = '507971';

-- ══════════════════════════════════════════════════════════════
-- 6. QC RESULTS — 26 titik dari input qc1.png + input qc2.png
--    ZScore = (Value - Mean)/SD ; Status via rule z:
--      |z| > 3 → Rejected (1:3s) | |z| > 2 → Warning (1:2s) | else Accepted
-- ══════════════════════════════════════════════════════════════
;WITH src(Dt, Val, Cmt) AS (
    SELECT * FROM (VALUES
        ('2026-04-30T01:30:00', 11.10, 'OKE'),
        ('2026-05-01T01:40:00', 11.20, 'OKE'),
        ('2026-05-02T03:10:00', 11.30, 'OKE'),
        ('2026-05-03T01:39:00', 11.40, 'OKE'),
        ('2026-05-04T01:46:00', 11.30, 'OKE'),
        ('2026-05-05T01:23:00', 11.30, 'OKE'),
        ('2026-05-06T01:46:00', 11.50, 'OKE'),
        ('2026-05-07T01:12:00', 10.90, '7X-> OKE'),
        ('2026-05-08T01:22:00', 11.10, '8X -> OKE'),
        ('2026-05-09T01:53:00', 11.60, '9X-->PERINGATAN'),
        ('2026-05-10T01:06:00', 11.90, 'PENOLAKAN 10X'),
        ('2026-05-11T00:40:00', 10.90, 'PENOLAKAN 11X'),
        ('2026-05-13T15:52:00', 11.10, 'OKE'),
        ('2026-05-14T01:36:00', 11.10, 'OKE'),
        ('2026-05-15T03:30:00', 11.40, 'OKE'),
        ('2026-05-16T02:05:00', 11.30, 'OKE'),
        ('2026-05-17T02:10:00', 11.30, 'OKE'),
        ('2026-05-18T07:11:00', 11.30, 'OKE'),
        ('2026-05-19T01:14:00', 11.00, 'OKE'),
        ('2026-05-20T02:10:00', 11.10, 'OKE'),
        ('2026-05-20T17:10:00', 11.30, 'OKE'),
        ('2026-05-21T01:13:00', 11.40, 'OKE'),
        ('2026-05-22T01:05:00', 11.30, 'OKE'),
        ('2026-05-23T00:47:00', 11.40, 'OKE'),
        ('2026-05-24T03:09:00', 11.00, 'OKE'),
        ('2026-05-25T01:05:00', 11.30, 'OKE')
    ) AS v(Dt, Val, Cmt)
)
INSERT INTO QCResults
 (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
  ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
  CreatedAt, UpdatedAt, IsDeleted)
SELECT
  NEWID(), s.Id, p.Id, NULL,
  src.Dt, src.Val,
  ROUND((src.Val - t.Mean) / t.SD, 3),
  CASE WHEN ABS((src.Val - t.Mean) / t.SD) > 3 THEN 3
       WHEN ABS((src.Val - t.Mean) / t.SD) > 2 THEN 2
       ELSE 1 END,
  CASE WHEN ABS((src.Val - t.Mean) / t.SD) > 3 THEN '1:3s'
       WHEN ABS((src.Val - t.Mean) / t.SD) > 2 THEN '1:2s'
       ELSE NULL END,
  src.Cmt,
  1, (SELECT TOP 1 Id FROM Users WHERE IsDeleted = 0 ORDER BY CreatedAt), src.Dt,
  0, NULL, NULL, NULL,
  src.Dt, NULL, 0
FROM   src
CROSS JOIN QCSamples s
JOIN   Instruments i        ON i.Id = s.InstrumentId
JOIN   TestFileParameters p ON p.TestFileId = i.TestFileId AND p.ParameterName = 'PT'
JOIN   QCSampleTargets t     ON t.QCSampleId = s.Id AND t.TestFileParameterId = p.Id
WHERE  s.LotNumber = '507971' AND s.IsDeleted = 0
  AND NOT EXISTS (
        SELECT 1 FROM QCResults x
        WHERE x.QCSampleId = s.Id AND x.TestFileParameterId = p.Id AND x.ResultDate = src.Dt
  );

-- ══════════════════════════════════════════════════════════════
-- VERIFIKASI (jalankan terpisah setelah seeder)
-- ══════════════════════════════════════════════════════════════
-- SELECT CAST(r.ResultDate AS date) AS Tgl, r.Value, r.ZScore, r.Status, r.WestgardFlags, r.Comment
-- FROM QCResults r
-- JOIN QCSamples s ON s.Id = r.QCSampleId
-- WHERE s.LotNumber = '507971'
-- ORDER BY r.ResultDate;
