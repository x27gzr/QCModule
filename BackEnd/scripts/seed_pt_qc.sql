/* =====================================================================
   Seed data QC PT (Prothrombin Time) — sekali jalan
   ---------------------------------------------------------------------
   Sumber   : File/PT rsv.xlsx (20 titik harian, 29 Mei -> 17 Jun 2026)
   Asumsi   : data belum ada sama sekali. Skrip membuat rantai lengkap
              TestFile -> TestFileParameter -> Instrument -> QCSample ->
              QCSampleTarget -> 20 QCResult.

   QCSample : Lot 507969, Level 2, expired 30 Jul 2026
   Target   : Mean 11.305 / SD 0.226 (established) -> CV 2.0%
              *Ganti ke assay sheet 11 / 0.85 bila perlu (lihat @Mean/@SD).*

   Westgard : aturan default 1:2s (warning) & 1:3s (reject), RejectSD 3.
              ZScore, Status, dan flag di bawah sudah dihitung sesuai
              WestgardEvaluator aplikasi:
                Status 1 = Accepted, 2 = Warning, 3 = Rejected, 0 = Pending
              Hasil: 19 Accepted + 1 Warning (16 Jun, 10.8 dtk, z=-2.235).

   Aman dijalankan ulang: skrip berhenti (THROW) bila lot 507969/L2 sudah ada.
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;   -- rollback otomatis bila ada error

USE [QCModuleDB];    -- sesuaikan bila nama database berbeda

/* --- Guard: jangan dobel insert -------------------------------------- */
IF EXISTS (SELECT 1 FROM dbo.QCSamples WHERE LotNumber = N'507969' AND Level = N'2' AND IsDeleted = 0)
    THROW 50000, N'QCSample lot 507969 level 2 sudah ada — dibatalkan agar tidak duplikat.', 1;

/* --- Parameter yang bisa diubah -------------------------------------- */
DECLARE @Mean float = 11.305;   -- assay sheet: 11.0
DECLARE @SD   float = 0.226;    -- assay sheet: 0.85
DECLARE @CV   float = ROUND(@SD / @Mean * 100.0, 2);

DECLARE @now         datetime2(7)     = SYSUTCDATETIME();
DECLARE @TestFileId  uniqueidentifier = NEWID();
DECLARE @ParamId     uniqueidentifier = NEWID();
DECLARE @InstrId     uniqueidentifier = NEWID();
DECLARE @SampleId    uniqueidentifier = NEWID();
DECLARE @TargetId    uniqueidentifier = NEWID();

BEGIN TRAN;

/* 1) TestFile PT --------------------------------------------------------*/
INSERT dbo.TestFiles
    (Id, Name, Code, Type, Unit, IsActive, CreatedAt, UpdatedAt, IsDeleted)
VALUES
    (@TestFileId, N'Prothrombin Time', N'PT', N'Numerical', N'detik', 1, @now, NULL, 0);

/* 2) TestFileParameter PT ----------------------------------------------*/
INSERT dbo.TestFileParameters
    (Id, TestFileId, ParameterName, TestCode, OutputMask, Sequence, Unit, LowerLimit, UpperLimit, CreatedAt, UpdatedAt, IsDeleted)
VALUES
    (@ParamId, @TestFileId, N'PT', NULL, NULL, 1, N'detik', NULL, NULL, @now, NULL, 0);

/* 3) Instrument ---------------------------------------------------------*/
INSERT dbo.Instruments
    (Id, Name, Code, TestFileId, IsActive, CreatedAt, UpdatedAt, IsDeleted)
VALUES
    (@InstrId, N'Coagulation Analyzer', N'COAG-01', @TestFileId, 1, @now, NULL, 0);

/* 4) QCSample (lot 507969, level 2, exp 30 Jul 2026) --------------------*/
INSERT dbo.QCSamples
    (Id, Name, LotNumber, Level, ExpiryDate, InstrumentId, IsActive,
     Rule1_2s, Rule1_3s, Rule2_2s, Rule2_2sDiff, Rule4_1s, Rule10x, Rule7T,
     RejectSD, NxCount, Rule3_1s, RuleR_4s, Rule9x,
     CreatedAt, UpdatedAt, IsDeleted)
VALUES
    (@SampleId, N'Kontrol PT Level 2', N'507969', N'2', '2026-07-30T00:00:00', @InstrId, 1,
     1, 1, 0, 0, 0, 0, 0,
     3.0, 10, 0, 0, 0,
     @now, NULL, 0);

/* 5) QCSampleTarget (Mean/SD/CV) ---------------------------------------*/
INSERT dbo.QCSampleTargets
    (Id, QCSampleId, TestFileParameterId, Mean, SD, CV, Tea, TeaUnit, CreatedAt, UpdatedAt, IsDeleted)
VALUES
    (@TargetId, @SampleId, @ParamId, @Mean, @SD, @CV, NULL, N'%', @now, NULL, 0);

/* 6) QCResults — 20 titik (UserId NULL = auto-import) -------------------*/
/*   Kolom: Value | ZScore | Status(1=Accepted,2=Warning) | WestgardFlags  */
INSERT dbo.QCResults
    (Id, QCSampleId, TestFileParameterId, UserId, ResultDate, Value, ZScore, Status, WestgardFlags, Comment,
     ValidationStatus, ValidatedBy, ValidatedAt, AuthorisationStatus, AuthorisedBy, AuthorisedAt, DeletedReason,
     CreatedAt, UpdatedAt, IsDeleted)
VALUES
    (NEWID(), @SampleId, @ParamId, NULL, '2026-05-29T08:00:00', 11.0, -1.350, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-05-30T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-05-31T08:00:00', 11.4,  0.420, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-01T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-02T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-03T08:00:00', 11.2, -0.465, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-04T08:00:00', 11.4,  0.420, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-05T08:00:00', 11.6,  1.305, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-06T08:00:00', 11.5,  0.863, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-07T08:00:00', 11.1, -0.907, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-08T08:00:00', 11.4,  0.420, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-09T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-10T08:00:00', 11.6,  1.305, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-11T08:00:00', 11.7,  1.748, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-12T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-13T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-14T08:00:00', 11.3, -0.022, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-15T08:00:00', 11.4,  0.420, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-16T08:00:00', 10.8, -2.235, 2, N'1:2s',  NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0),
    (NEWID(), @SampleId, @ParamId, NULL, '2026-06-17T08:00:00', 10.9, -1.792, 1, NULL,     NULL, 0, NULL, NULL, 0, NULL, NULL, NULL, @now, NULL, 0);

COMMIT TRAN;

PRINT 'Seed PT QC selesai: TestFile PT, Instrument COAG-01, QCSample lot 507969/L2, Target Mean/SD, dan 20 QCResult (19 Accepted, 1 Warning).';
