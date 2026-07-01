/* =====================================================================
   Seed data QC PT (Prothrombin Time) — sekali jalan  [HeidiSQL-safe]
   ---------------------------------------------------------------------
   Target DB : SQL Server (QCModuleDB) di Server Dev.
   Sumber    : File/PT rsv.xlsx (20 titik harian, 29 Mei -> 17 Jun 2026).

   MELAMPIRKAN ke data yang SUDAH ADA (bukan bikin baru):
     - Instrument       : code 'CS1600'  (Sysmex CS1600)
     - TestFileParameter: 'PT' di test file code 'CS1600'
   Skrip HANYA membuat:
     - QCSample        : Lot 507969, Level 2, expired 30 Jul 2026 (di CS1600)
     - QCSampleTarget  : Mean 11.305 / SD 0.226 (established) -> CV 2.0%
     - 20 QCResult     : untuk parameter PT

   Westgard  : aturan default 1:2s (warning) & 1:3s (reject), RejectSD 3.
               ZScore/Status/flag sudah dihitung sesuai WestgardEvaluator:
                 Status 1=Accepted, 2=Warning, 3=Rejected, 0=Pending.
               Hasil: 19 Accepted + 1 Warning (16 Jun, 10.8 dtk, z=-2.235).

   CATATAN HeidiSQL:
   - HeidiSQL menjalankan tiap perintah (dipisah tanda titik-koma) secara
     terpisah, jadi skrip ini tanpa DECLARE @var / BEGIN...END / transaksi.
   - ID instrument & parameter PT di-resolve via subquery (by code/name),
     jadi tak perlu tahu GUID-nya.
   - Guard "WHERE NOT EXISTS" => aman dijalankan ulang (tak menduplikat).
   - Pilih database "QCModuleDB" di panel kiri HeidiSQL sebelum run
     (atau aktifkan baris USE di bawah).
   ===================================================================== */

-- USE [QCModuleDB];

SET NOCOUNT ON;
SET XACT_ABORT ON;

/* --- Prasyarat: hentikan dengan pesan jelas bila data induk tak ada ---- */
IF NOT EXISTS (SELECT 1 FROM dbo.Instruments WHERE Code = N'CS1600' AND IsDeleted = 0)
    THROW 50000, N'Instrument dengan Code=CS1600 tidak ditemukan. Sesuaikan kode instrument di skrip.', 1;

IF NOT EXISTS (
        SELECT 1
        FROM dbo.TestFileParameters p
        JOIN dbo.TestFiles f ON f.Id = p.TestFileId
        WHERE p.ParameterName = N'PT' AND f.Code = N'CS1600' AND p.IsDeleted = 0 AND f.IsDeleted = 0)
    THROW 50000, N'Parameter PT pada test file CS1600 tidak ditemukan. Sesuaikan nama parameter/kode di skrip.', 1;

/* 1) QCSample (lot 507969, level 2, exp 30 Jul 2026) di instrument CS1600 */
INSERT INTO dbo.QCSamples
    (Id, Name, LotNumber, Level, ExpiryDate, InstrumentId, IsActive,
     Rule1_2s, Rule1_3s, Rule2_2s, Rule2_2sDiff, Rule4_1s, Rule10x, Rule7T,
     RejectSD, NxCount, Rule3_1s, RuleR_4s, Rule9x,
     CreatedAt, UpdatedAt, IsDeleted)
SELECT 'f1a51000-0000-4000-8000-000000000004', N'Kontrol PT Level 2', N'507969', N'2', '2026-07-30T00:00:00',
       (SELECT Id FROM dbo.Instruments WHERE Code = N'CS1600' AND IsDeleted = 0), 1,
       1, 1, 0, 0, 0, 0, 0,
       3.0, 10, 0, 0, 0,
       SYSUTCDATETIME(), NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM dbo.QCSamples WHERE LotNumber = N'507969' AND Level = N'2' AND IsDeleted = 0);

/* 2) QCSampleTarget (Mean 11.305 / SD 0.226 / CV 2.0) untuk parameter PT  */
INSERT INTO dbo.QCSampleTargets
    (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
SELECT 'f1a51000-0000-4000-8000-000000000005',
       (SELECT Id FROM dbo.QCSamples WHERE LotNumber = N'507969' AND Level = N'2' AND IsDeleted = 0),
       (SELECT p.Id FROM dbo.TestFileParameters p JOIN dbo.TestFiles f ON f.Id = p.TestFileId
        WHERE p.ParameterName = N'PT' AND f.Code = N'CS1600' AND p.IsDeleted = 0),
       11.305, 0.226, 2.0, NULL, N'%', SYSUTCDATETIME(), NULL, 0
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.QCSampleTargets t
    WHERE t.QCSampleId = (SELECT Id FROM dbo.QCSamples WHERE LotNumber = N'507969' AND Level = N'2' AND IsDeleted = 0)
      AND t.TestFileParameterId = (SELECT p.Id FROM dbo.TestFileParameters p JOIN dbo.TestFiles f ON f.Id = p.TestFileId
                                   WHERE p.ParameterName = N'PT' AND f.Code = N'CS1600' AND p.IsDeleted = 0));

/* 3) QCResults — 20 titik (UserId NULL = auto-import) -------------------
   Guard: hanya insert bila sample PT ini belum punya hasil PT.           */
INSERT INTO dbo.QCResults
    (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
     ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
     CreatedAt, UpdatedAt, IsDeleted)
SELECT
    NEWID(),
    (SELECT Id FROM dbo.QCSamples WHERE LotNumber = N'507969' AND Level = N'2' AND IsDeleted = 0),
    (SELECT p.Id FROM dbo.TestFileParameters p JOIN dbo.TestFiles f ON f.Id = p.TestFileId
     WHERE p.ParameterName = N'PT' AND f.Code = N'CS1600' AND p.IsDeleted = 0),
    NULL,
    r.ResultDate, r.Val, r.Z, r.Status, r.Flags, NULL,
    0, NULL, NULL, 0, NULL, NULL, NULL,
    SYSUTCDATETIME(), NULL, 0
FROM (VALUES
    ('2026-05-29T08:00:00', 11.0, -1.350, 1, CAST(NULL AS nvarchar(50))),
    ('2026-05-30T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-05-31T08:00:00', 11.4,  0.420, 1, NULL),
    ('2026-06-01T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-06-02T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-06-03T08:00:00', 11.2, -0.465, 1, NULL),
    ('2026-06-04T08:00:00', 11.4,  0.420, 1, NULL),
    ('2026-06-05T08:00:00', 11.6,  1.305, 1, NULL),
    ('2026-06-06T08:00:00', 11.5,  0.863, 1, NULL),
    ('2026-06-07T08:00:00', 11.1, -0.907, 1, NULL),
    ('2026-06-08T08:00:00', 11.4,  0.420, 1, NULL),
    ('2026-06-09T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-06-10T08:00:00', 11.6,  1.305, 1, NULL),
    ('2026-06-11T08:00:00', 11.7,  1.748, 1, NULL),
    ('2026-06-12T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-06-13T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-06-14T08:00:00', 11.3, -0.022, 1, NULL),
    ('2026-06-15T08:00:00', 11.4,  0.420, 1, NULL),
    ('2026-06-16T08:00:00', 10.8, -2.235, 2, N'1:2s'),
    ('2026-06-17T08:00:00', 10.9, -1.792, 1, NULL)
) AS r(ResultDate, Val, Z, Status, Flags)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.QCResults
    WHERE QCSampleId = (SELECT Id FROM dbo.QCSamples WHERE LotNumber = N'507969' AND Level = N'2' AND IsDeleted = 0)
      AND TestFileParameterId = (SELECT p.Id FROM dbo.TestFileParameters p JOIN dbo.TestFiles f ON f.Id = p.TestFileId
                                 WHERE p.ParameterName = N'PT' AND f.Code = N'CS1600' AND p.IsDeleted = 0)
      AND IsDeleted = 0);

PRINT 'Seed PT QC selesai: QCSample lot 507969/L2 di CS1600, Target PT, dan 20 QCResult (19 Accepted, 1 Warning).';
