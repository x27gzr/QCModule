using QCModule.Domain.Enums;

namespace QCModule.Domain.Entities;

public class QCResult : BaseEntity
{
    public Guid QCSampleId { get; set; }
    public QCSample QCSample { get; set; } = null!;
    public Guid TestFileParameterId { get; set; }
    public TestFileParameter TestFileParameter { get; set; } = null!;

    // Analyst who entered the result
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime ResultDate { get; set; }
    public double Value { get; set; }
    public double ZScore { get; set; }

    // Automatic Westgard evaluation result
    public QCStatus Status { get; set; } = QCStatus.Pending;
    public string? WestgardFlags { get; set; }
    public string? Comment { get; set; }

    // ── Stage 1: Analyst validation ───────────────────────────────────────────
    public ValidationStatus ValidationStatus { get; set; } = ValidationStatus.Pending;
    public Guid?     ValidatedBy { get; set; }
    public User?     ValidatedByUser { get; set; }
    public DateTime? ValidatedAt { get; set; }

    // ── Stage 2: Doctor authorisation (requires validation first) ─────────────
    public AuthorisationStatus AuthorisationStatus { get; set; } = AuthorisationStatus.Pending;
    public Guid?     AuthorisedBy { get; set; }
    public User?     AuthorisedByUser { get; set; }
    public DateTime? AuthorisedAt { get; set; }

    // ── Soft delete ───────────────────────────────────────────────────────────
    public string?   DeletedReason { get; set; }
}
