-- ============================================================
--  SEEDER: Sysmex XN-1000 Hematology QC Data
--  Run AFTER all EF migrations have been applied.
--  Safe to re-run: all INSERTs use IF NOT EXISTS guards.
-- ============================================================

-- ── CATATAN ──────────────────────────────────────────────────
-- 1. instrument_id di file .res = XN1000
--    Pastikan Instrument yang ada mempunyai Code = 'XN1000':
--        SELECT Id, Name, Code FROM Instruments WHERE Code = 'XN1000'
--    Jika belum, update:
--        UPDATE Instruments SET Code = 'XN1000' WHERE Id = '784BF886-8F6B-4EE8-A6E5-6E08E1501080'
-- 2. sno_id di .res = 60971102 → Level 2 QCSample
--    sno_id 60971101 = Level 1 (sudah ada)
-- ─────────────────────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════
-- 1. TEST FILE PARAMETERS
--    TestFileId = 14FD9894-C0BB-4C0A-8B19-E36EFB00E40A (XN-1000)
--    WBC sudah ada (5DD563C9-175B-428F-837D-A230ACCC49EA), skip
-- ══════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000001')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000001', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'RBC', 'RBC', '99990.99', 2, '10^6/uL', NULL, NULL, GETUTCDATE(), NULL, 0);

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000002')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000002', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'HB', 'HB', '9990.9', 3, 'g/dL', NULL, NULL, GETUTCDATE(), NULL, 0);

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000003')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000003', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'HCT', 'HCT', '9990.9', 4, '%', NULL, NULL, GETUTCDATE(), NULL, 0);

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000004')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000004', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'MCV', 'MCV', '9990.9', 5, 'fL', NULL, NULL, GETUTCDATE(), NULL, 0);

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000005')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000005', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'MCH', 'MCH', '9990.9', 6, 'pg', NULL, NULL, GETUTCDATE(), NULL, 0);

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000006')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000006', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'MCHC', 'MCHC', '9990.9', 7, 'g/dL', NULL, NULL, GETUTCDATE(), NULL, 0);

IF NOT EXISTS (SELECT 1 FROM TestFileParameters WHERE Id = 'E1000001-0000-0000-0000-000000000007')
INSERT INTO TestFileParameters (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('E1000001-0000-0000-0000-000000000007', '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A',
        'PLT', 'PLT', '999990', 8, '10^3/uL', NULL, NULL, GETUTCDATE(), NULL, 0);

-- ══════════════════════════════════════════════════════════════
-- 2. QC SAMPLE — Level 2 (sno_id = 60971102 di file .res)
--    InstrumentId sama dengan Level 1 yang sudah ada
-- ══════════════════════════════════════════════════════════════

IF NOT EXISTS (SELECT 1 FROM QCSamples WHERE Id = 'F1000001-0000-0000-0000-000000000001')
INSERT INTO QCSamples (Id, Name, LotNumber, Level, ExpiryDate, InstrumentId,
                       IsActive, Rule1_2s, Rule1_3s, Rule2_2s, Rule3_1s, Rule4_1s, Rule9x, Rule10x, RuleR_4s,
                       CreatedAt, UpdatedAt, IsDeleted)
VALUES ('F1000001-0000-0000-0000-000000000001',
        'Control Hematologi', '60971102', 'Level 2',
        '2026-06-19 16:00:00.000',
        '784BF886-8F6B-4EE8-A6E5-6E08E1501080',
        1, 1, 1, 0, 1, 0, 0, 0, 0,
        GETUTCDATE(), NULL, 0);

-- ══════════════════════════════════════════════════════════════
-- 3. QC SAMPLE TARGETS — Level 2 (lot 60971102)
--
--    Target diset mendekati nilai di file .res agar Z-score Accepted:
--    Param  | Nilai .res | Mean   | SD    | CV%  | TEA%
--    -------|------------|--------|-------|------|-----
--    WBC    | 6.77       | 7.00   | 0.35  | 5.0  | 15
--    RBC    | 4.21       | 4.25   | 0.15  | 3.5  | 6
--    HB     | 11.2       | 11.50  | 0.40  | 3.5  | 7
--    HCT    | 34.0       | 34.50  | 1.20  | 3.5  | 7
--    MCV    | 80.8       | 81.00  | 2.50  | 3.1  | 6
--    MCH    | 26.6       | 27.00  | 0.90  | 3.3  | 6
--    MCHC   | 32.9       | 33.00  | 0.80  | 2.4  | 6
--    PLT    | 234        | 235.00 | 14.00 | 6.0  | 15
--
--    CATATAN: ID pakai prefix A/B/C/D/E/F saja (valid hex).
--             G bukan hex — itulah penyebab error sebelumnya!
-- ══════════════════════════════════════════════════════════════

-- WBC (TestFileParameterId existing: 5DD563C9-175B-428F-837D-A230ACCC49EA)
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000001')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000001',
        'F1000001-0000-0000-0000-000000000001',
        '5DD563C9-175B-428F-837D-A230ACCC49EA',
        7.00, 0.35, 5.0, 15, '%', GETUTCDATE(), NULL, 0);

-- RBC
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000002')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000002',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000001',
        4.25, 0.15, 3.5, 6, '%', GETUTCDATE(), NULL, 0);

-- HB
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000003')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000003',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000002',
        11.50, 0.40, 3.5, 7, '%', GETUTCDATE(), NULL, 0);

-- HCT
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000004')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000004',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000003',
        34.50, 1.20, 3.5, 7, '%', GETUTCDATE(), NULL, 0);

-- MCV
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000005')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000005',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000004',
        81.00, 2.50, 3.1, 6, '%', GETUTCDATE(), NULL, 0);

-- MCH
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000006')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000006',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000005',
        27.00, 0.90, 3.3, 6, '%', GETUTCDATE(), NULL, 0);

-- MCHC
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000007')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000007',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000006',
        33.00, 0.80, 2.4, 6, '%', GETUTCDATE(), NULL, 0);

-- PLT
IF NOT EXISTS (SELECT 1 FROM QCSampleTargets WHERE Id = 'A2000001-0000-0000-0000-000000000008')
INSERT INTO QCSampleTargets (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES ('A2000001-0000-0000-0000-000000000008',
        'F1000001-0000-0000-0000-000000000001',
        'E1000001-0000-0000-0000-000000000007',
        235.00, 14.00, 6.0, 15, '%', GETUTCDATE(), NULL, 0);

-- ══════════════════════════════════════════════════════════════
-- VERIFIKASI (jalankan setelah seeder)
-- ══════════════════════════════════════════════════════════════
-- SELECT p.Sequence, p.TestCode, p.ParameterName
-- FROM TestFileParameters p
-- WHERE p.TestFileId = '14FD9894-C0BB-4C0A-8B19-E36EFB00E40A'
-- ORDER BY p.Sequence;

-- SELECT s.LotNumber, s.Level, p.TestCode, t.Mean, t.SD, t.CV
-- FROM QCSampleTargets t
-- JOIN QCSamples s ON t.QCSampleId = s.Id
-- JOIN TestFileParameters p ON t.TestFileParameterId = p.Id
-- WHERE s.LotNumber IN ('60971101', '60971102')
-- ORDER BY s.Level, p.Sequence;
