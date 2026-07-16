import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import {
  NO_TRAINEE_EVIDENCE,
  loadLastEvaluation,
  saveEvaluation,
  verifyTraineeQuote,
  type CertificationOutcome,
  type ComplianceStatus,
  type EvaluationRecord,
  type ReadinessBand,
  type StageStatus,
} from "@/lib/session";
import { getRoleplaySession } from "@/lib/roleplay-sessions.functions";
import { RoleplayAudioPlayer } from "@/components/RoleplayAudioPlayer";
import {
  evaluateCommunication,
  ratingToneClass,
  type VoiceEvaluation,
} from "@/lib/voice-evaluation";
import { buildFilename, generateEvaluationPdf } from "@/lib/evaluation-pdf";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Evaluation Report · KGIS Sales Training AI" },
      {
        name: "description",
        content:
          "QMF-style trainer evaluation with call flow adherence, compliance gates, transcript evidence, and coaching actions.",
      },
    ],
  }),
  component: EvaluationPage,
});

type TrainerDecision =
  | "Accept AI Recommendation"
  | "Override to Conditional Pass"
  | "Override to Needs More Practice"
  | "Override to Not Certified";

function EvaluationPage() {
  const [record, setRecord] = useState<EvaluationRecord | null>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [trainerDecision, setTrainerDecision] = useState<TrainerDecision>(
    "Accept AI Recommendation",
  );
  const [trainerNotes, setTrainerNotes] = useState("");
  const [audioStatus, setAudioStatus] = useState<"pending" | "ready" | "failed" | "missing">(
    "pending",
  );
  const [includeTranscript, setIncludeTranscript] = useState(false);
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "error">("idle");
  const navigate = useNavigate();
  const fetchSession = useServerFn(getRoleplaySession);

  useEffect(() => setRecord(loadLastEvaluation()), []);

  // Poll audio status for this session so voice evaluation activates once
  // the recording arrives from the provider.
  useEffect(() => {
    const dbId = record?.dbSessionId;
    if (!dbId) {
      setAudioStatus("missing");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const row = await fetchSession({ data: { sessionId: dbId } });
        if (cancelled) return;
        if (row?.audio_status === "ready") setAudioStatus("ready");
        else if (row?.audio_status === "failed") setAudioStatus("failed");
        else if (attempts < 20) window.setTimeout(tick, 3_000);
        else setAudioStatus("failed");
      } catch {
        setAudioStatus("failed");
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [record?.dbSessionId, fetchSession]);

  const voiceEval: VoiceEvaluation | null = useMemo(() => {
    if (!record) return null;
    return evaluateCommunication(
      record.transcript ?? "",
      record.durationSeconds ?? 0,
      audioStatus === "ready",
    );
  }, [record, audioStatus]);

  // Assessment Mode + audio-detected critical behaviour blocks Production Ready.
  const voiceBlocksCertification = useMemo(() => {
    if (!record || !voiceEval?.available) return false;
    if (record.mode !== "Assessment Module") return false;
    return voiceEval.flags.length > 0;
  }, [record, voiceEval]);


  const finalOutcome = useMemo<CertificationOutcome | null>(() => {
    if (!record) return null;
    switch (trainerDecision) {
      case "Override to Conditional Pass":
        return "Conditional Pass";
      case "Override to Needs More Practice":
        return "Needs More Practice";
      case "Override to Not Certified":
        return "Not Certified";
      default: {
        // Block Production Ready certification when audio flagged critical behaviour.
        if (voiceBlocksCertification && record.certification === "Certified for Production") {
          return "Needs More Practice";
        }
        return record.certification;
      }
    }
  }, [record, trainerDecision, voiceBlocksCertification]);

  if (!record) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
          <h1 className="text-xl font-semibold text-foreground">No evaluation available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Complete a roleplay and generate an evaluation to see the report.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Start Training
          </Link>
        </div>
      </AppShell>
    );
  }

  const s = record.session;
  const criticalFailed = record.criticalComplianceStatus === "Failed";

  const download = async () => {
    if (downloadState === "preparing") return;
    setDownloadState("preparing");
    try {
      const doc = generateEvaluationPdf({
        record,
        voiceEval,
        audioAvailable: audioStatus === "ready",
        trainerReview: {
          aiRecommendation: record.certification,
          decision: trainerDecision,
          notes: trainerNotes,
          finalOutcome: finalOutcome ?? record.certification,
          reviewDate: trainerNotes ? new Date().toLocaleDateString() : undefined,
        },
        includeTranscript,
      });
      doc.save(buildFilename(record));
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
      window.setTimeout(() => setDownloadState("idle"), 4000);
    }
  };

  const assignNext = () => {
    // Persist trainer notes on this evaluation before assigning.
    saveEvaluation({ ...record, coachingSummary: record.coachingSummary });
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Evaluation Report
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trainer-led QMF assessment · {s.salespersonName} · {s.employeeId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate({ to: "/roleplay" })}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Practice Again
          </button>
          <Link
            to="/trainer"
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Return to Trainer View
          </Link>
          <label className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground">
            <input
              type="checkbox"
              checked={includeTranscript}
              onChange={(e) => setIncludeTranscript(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Include Full Transcript
          </label>
          <button
            onClick={download}
            disabled={downloadState === "preparing"}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {downloadState === "preparing"
              ? "Preparing professional report…"
              : downloadState === "error"
                ? "Unable to generate the PDF report. Please try again."
                : "Download PDF Report"}
          </button>
        </div>
      </div>

      {/* Session summary chips */}
      <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
        <SummaryChip label="Trainee Name" value={s.salespersonName} />
        <SummaryChip label="Trainee ID" value={s.employeeId} />
        <SummaryChip label="Batch" value={s.batchName} />
        <SummaryChip label="Project" value={s.project} />
        <SummaryChip label="Telecom Provider" value={s.provider} />
        <SummaryChip label="Core Training Module" value={s.coreModule} />
        <SummaryChip
          label={
            s.coreModule === "Component-Based Coaching Module"
              ? "Training Stage"
              : s.coreModule === "Assessment Module"
                ? "Assessment Type"
                : "Simulation Type"
          }
          value={s.subOption}
        />
        <SummaryChip label="Scenario" value={s.scenario} />
        <SummaryChip label="Difficulty" value={s.difficulty} />
        <SummaryChip label="Roleplay Date" value={new Date(record.date).toLocaleDateString()} />
        <SummaryChip label="Call Duration" value={formatDuration(record.durationSeconds)} />
        <SummaryChip label="Number of Turns" value={String(record.turns ?? "—")} />
      </div>

      {/* Trainer audio review */}
      <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Roleplay Recording</h2>
            <p className="text-xs text-muted-foreground">
              Available to trainers for coaching and assessment review.
            </p>
          </div>
        </div>
        <div className="mt-3">
          <RoleplayAudioPlayer sessionId={record.dbSessionId ?? null} />
        </div>
      </div>

      {/* POC data privacy note */}
      <div className="mt-4 rounded-xl border border-border bg-teal-soft/40 p-4 text-xs text-teal">
        <span className="font-semibold">Proof of Concept:</span> Recording retention,
        trainer access, download permissions, consent wording, and deletion policies
        will be finalized with KGIS before production deployment.
      </div>




      {/* Top-line score + certification */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary to-[color-mix(in_oklab,var(--primary)_70%,var(--teal))] p-6 text-primary-foreground shadow-elevated">
          <div className="text-xs font-medium uppercase tracking-wide opacity-80">Overall Score</div>
          <div className="mt-2 text-5xl font-semibold tracking-tight">{record.overallScore}</div>
          <div className="mt-1 text-xs opacity-80">out of 100</div>
          <div className="mt-4 border-t border-white/20 pt-3 text-xs opacity-90">
            Call Flow Adherence: <span className="font-semibold">{record.callFlowAdherencePct ?? 0}%</span>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Readiness Level
          </div>
          <div className="mt-2 text-2xl font-semibold text-foreground">{record.readiness}</div>
          <div className="mt-1 text-xs text-muted-foreground">{readinessBlurb(record.readiness)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusPill
              label={`Compliance: ${record.criticalComplianceStatus ?? "Passed"}`}
              tone={
                record.criticalComplianceStatus === "Failed"
                  ? "destructive"
                  : record.criticalComplianceStatus === "Passed with Warning"
                    ? "warning"
                    : "success"
              }
            />
            <StatusPill
              label={record.assessmentValidity ?? "Practice Attempt Only"}
              tone={
                record.assessmentValidity === "Valid for Certification"
                  ? "teal"
                  : record.assessmentValidity === "Invalid Due to Incomplete Call"
                    ? "destructive"
                    : "muted"
              }
            />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Certification Decision
          </div>
          <div className="mt-2 text-2xl font-semibold text-teal">{record.certification}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {record.certificationReason ?? "Based on the QMF scorecard."}
          </div>
          <div className="mt-4">
            <StatusPill
              label={`Mode: ${record.mode ?? "Full Call Flow Practice"}`}
              tone="muted"
            />
          </div>
        </div>
      </div>

      {criticalFailed && (
        <div className="mt-5 rounded-xl border border-[var(--destructive)] bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] p-4 text-sm font-medium text-destructive">
          Critical compliance requirement missed. Certification is not recommended.
        </div>
      )}

      {/* Call flow adherence */}
      <Section title="Call Flow Adherence">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Stage</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Score</th>
                <th className="px-4 py-2 text-left font-medium">Evidence · Miss · Coaching</th>
              </tr>
            </thead>
            <tbody>
              {(record.callFlow ?? []).map((stage, i) => (
                <tr key={stage.stage} className={i % 2 ? "bg-surface" : "bg-background"}>
                  <td className="px-4 py-3 align-top font-medium text-foreground">{stage.stage}</td>
                  <td className="px-4 py-3 align-top">
                    <StageStatusPill status={stage.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-foreground">
                    {stage.status === "Not Applicable" ? "—" : `${stage.score}/${stage.max}`}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                    {stage.evidence && (
                      <div>
                        <span className="font-medium text-foreground">Evidence:</span>{" "}
                        <span className="italic">“{stage.evidence}”</span>
                      </div>
                    )}
                    {stage.missed && (
                      <div className="mt-1">
                        <span className="font-medium text-[color-mix(in_oklab,var(--warning)_50%,black)]">Missed:</span>{" "}
                        {stage.missed}
                      </div>
                    )}
                    {stage.coaching && (
                      <div className="mt-1">
                        <span className="font-medium text-teal">Coaching:</span> {stage.coaching}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* A. Call Content and Process */}
      <Section title="A. Call Content and Process — Category Scores">
        <p className="-mt-2 mb-3 text-xs text-muted-foreground">
          Based on transcript and call-flow adherence.
        </p>
        <div className="space-y-3">
          {(record.categoryDetails ?? []).map((c) => {
            const pct = (c.score / c.max) * 100;
            const isOpen = openCat === c.name;
            return (
              <div
                key={c.name}
                className="rounded-xl border border-border bg-surface shadow-card"
              >
                <button
                  onClick={() => setOpenCat(isOpen ? null : c.name)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{c.name}</span>
                      <span className="font-semibold text-foreground">
                        {c.score}
                        <span className="text-muted-foreground">/{c.max}</span>
                      </span>
                    </div>
                    <div className="mt-2">
                      <ScoreBar value={pct} />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{isOpen ? "Hide" : "Details"}</span>
                </button>
                {isOpen && (
                  <div className="grid grid-cols-1 gap-3 border-t border-border px-5 py-4 text-sm md:grid-cols-2">
                    <DetailBlock label="What was done well" value={c.wentWell} />
                    <DetailBlock label="What was missed" value={c.missed} />
                    <DetailBlock label="Evidence from transcript" value={`“${c.evidence}”`} italic />
                    <DetailBlock label="Improvement action" value={c.improvement} tone="teal" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* B. Communication and Customer Handling */}
      <Section title="B. Communication and Customer Handling">
        <p className="-mt-2 mb-3 text-xs text-muted-foreground">
          Based on the roleplay audio recording and interaction behaviour.
          Heuristic analysis for the POC — production integrates KGIS-provided
          acoustic analysis.
        </p>
        {!voiceEval || !voiceEval.available ? (
          <div className="rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground shadow-card">
            {voiceEval?.reason ??
              "Voice-based communication analysis was not completed."}
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <SummaryChip
                label="Speaking Pace"
                value={
                  voiceEval.metrics.wordsPerMinute != null
                    ? `${voiceEval.metrics.wordsPerMinute} wpm`
                    : "—"
                }
              />
              <SummaryChip
                label="Filler Words"
                value={String(voiceEval.metrics.fillerCount)}
              />
              <SummaryChip
                label="Trainee Turns"
                value={String(voiceEval.metrics.traineeTurns)}
              />
              <SummaryChip
                label="Avg Turn Length"
                value={`${voiceEval.metrics.avgTraineeTurnWords} words`}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {voiceEval.dimensions.map((d) => (
                <div
                  key={d.key}
                  className="rounded-xl border border-border bg-surface p-4 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-foreground">
                      {d.label}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ratingToneClass(d.rating)}`}
                    >
                      {d.rating}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-foreground">{d.explanation}</p>
                  {d.evidence && (
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Evidence: {d.evidence}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-teal">
                    <span className="font-semibold">Coaching:</span> {d.coaching}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* Critical behaviour flags */}
      <Section title="Critical Behaviour Flags">
        {!voiceEval || !voiceEval.available ? (
          <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
            Voice-based flag detection was not run because audio was unavailable.
          </div>
        ) : voiceEval.flags.length === 0 ? (
          <div className="rounded-xl border border-border bg-[color-mix(in_oklab,var(--success)_10%,transparent)] p-4 text-sm text-foreground shadow-card">
            No critical behaviour flags detected in this recording.
          </div>
        ) : (
          <div className="space-y-2">
            {voiceEval.flags.map((f) => (
              <div
                key={f.key}
                className="rounded-xl border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] p-4 shadow-card"
              >
                <div className="text-sm font-semibold text-destructive">
                  {f.label}
                </div>
                {f.evidence && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    {f.evidence}
                  </p>
                )}
              </div>
            ))}
            {record.mode === "Assessment Module" && (
              <p className="mt-2 text-xs font-medium text-destructive">
                Critical flags detected — Production Ready certification is blocked
                pending trainer review.
              </p>
            )}
          </div>
        )}
      </Section>



      {/* Compliance gate */}
      <Section title="Compliance and Non-Negotiables">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(record.compliance ?? []).map((c) => (
            <div
              key={c.item}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 shadow-card"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{c.item}</div>
                {c.critical && (
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Critical
                  </div>
                )}
              </div>
              <ComplianceBadge status={c.status} />
            </div>
          ))}
        </div>
      </Section>

      {/* Transcript evidence */}
      <Section title="Transcript Evidence">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(record.evidence ?? []).map((e) => (
            <div
              key={e.label}
              className="rounded-xl border border-border bg-surface p-4 shadow-card"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {e.label}
              </div>
              <p className="mt-2 text-sm italic text-foreground">“{e.quote}”</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Coaching insights */}
      <Section title="Coaching Insights">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card lg:col-span-3">
            <h3 className="text-sm font-semibold text-foreground">Coaching Summary</h3>
            <p className="mt-2 text-sm leading-relaxed text-foreground">{record.coachingSummary}</p>
          </div>
          <BulletCard title="Strengths Demonstrated" items={record.strengths.slice(0, 3)} tone="success" />
          <BulletCard title="Missed Expectations" items={record.missed.slice(0, 5)} tone="warning" />
          <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Priority Improvement Actions</h3>
            <ol className="mt-3 space-y-3 text-sm">
              {(record.priorityActions ?? []).map((a, i) => (
                <li key={i} className="rounded-lg bg-teal-soft p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-teal">
                    Action {i + 1}
                  </div>
                  <div className="mt-1 font-medium text-foreground">{a.what}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Why:</span> {a.why}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Do:</span> {a.do}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {record.practicePrescription && (
          <div className="mt-5 rounded-xl border border-border bg-surface p-5 shadow-card">
            <h3 className="text-sm font-semibold text-foreground">Practice Prescription</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
              <PrescriptionItem label="Recommended Scenario" value={record.practicePrescription.scenario} />
              <PrescriptionItem label="Training Mode" value={record.practicePrescription.mode} />
              <PrescriptionItem label="Difficulty" value={record.practicePrescription.difficulty} />
              <PrescriptionItem label="Focus Skill" value={record.practicePrescription.focus} />
              <PrescriptionItem
                label="Suggested Attempts"
                value={`${record.practicePrescription.attempts} practice call${record.practicePrescription.attempts === 1 ? "" : "s"}`}
              />
            </div>
          </div>
        )}
      </Section>

      {/* Performance summary */}
      <Section title="Performance Summary">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <PerfCell label="Current Score" value={`${record.overallScore}`} />
            <PerfCell
              label="Previous Score"
              value={record.previousScore != null ? `${record.previousScore}` : "—"}
            />
            <PerfCell
              label="Change"
              value={
                record.previousScore != null
                  ? `${record.overallScore - record.previousScore >= 0 ? "+" : ""}${record.overallScore - record.previousScore}`
                  : "First recorded attempt"
              }
            />
            <PerfCell label="Strongest Stage" value={record.strongestStage ?? "—"} />
            <PerfCell label="Weakest Stage" value={record.weakestStage ?? "—"} />
            <PerfCell label="Production Readiness" value={record.readiness} />
          </div>
        </div>
      </Section>

      {/* Trainer review */}
      <Section title="Trainer Review">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                AI Recommendation
              </div>
              <div className="mt-1 text-lg font-semibold text-foreground">{record.certification}</div>
              <p className="mt-1 text-xs text-muted-foreground">{record.certificationReason}</p>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Trainer Decision
              </label>
              <select
                value={trainerDecision}
                onChange={(e) => setTrainerDecision(e.target.value as TrainerDecision)}
                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option>Accept AI Recommendation</option>
                <option>Override to Conditional Pass</option>
                <option>Override to Needs More Practice</option>
                <option>Override to Not Certified</option>
              </select>
              <div className="mt-2 text-xs text-muted-foreground">
                Final outcome:{" "}
                <span className="font-semibold text-foreground">{finalOutcome}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trainer Notes
            </label>
            <textarea
              value={trainerNotes}
              onChange={(e) => setTrainerNotes(e.target.value)}
              rows={3}
              placeholder="Coaching notes, context, or rationale for the decision…"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={assignNext}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Assign Next Roleplay
            </button>
            <span className="self-center text-xs text-muted-foreground">
              The trainer remains the final decision-maker.
            </span>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}

/* ---------- Small presentational helpers ---------- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-card">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 text-xs font-medium text-foreground">{value || "—"}</div>
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const color =
    value >= 85
      ? "var(--success)"
      : value >= 70
        ? "var(--teal)"
        : value >= 50
          ? "var(--warning)"
          : "var(--destructive)";
  return (
    <div className="h-2 w-full rounded-full bg-secondary">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "success" | "warning" | "destructive" | "teal" | "muted";
}) {
  const styles: Record<typeof tone, string> = {
    success:
      "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]",
    warning:
      "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]",
    destructive:
      "bg-[color-mix(in_oklab,var(--destructive)_18%,transparent)] text-destructive",
    teal: "bg-teal-soft text-teal",
    muted: "bg-secondary text-secondary-foreground",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${styles[tone]}`}>
      {label}
    </span>
  );
}

function StageStatusPill({ status }: { status: StageStatus }) {
  const tone: "success" | "warning" | "destructive" | "muted" =
    status === "Completed"
      ? "success"
      : status === "Partially Completed"
        ? "warning"
        : status === "Missed"
          ? "destructive"
          : "muted";
  return <StatusPill label={status} tone={tone} />;
}

function ComplianceBadge({ status }: { status: ComplianceStatus }) {
  const tone =
    status === "Passed"
      ? "success"
      : status === "Warning"
        ? "warning"
        : status === "Failed"
          ? "destructive"
          : "muted";
  return <StatusPill label={status} tone={tone as never} />;
}

function DetailBlock({
  label,
  value,
  italic,
  tone,
}: {
  label: string;
  value: string;
  italic?: boolean;
  tone?: "teal";
}) {
  return (
    <div className="rounded-lg bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <p
        className={`mt-1 text-sm ${italic ? "italic text-muted-foreground" : "text-foreground"} ${
          tone === "teal" ? "text-teal" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BulletCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning" | "teal";
}) {
  const dot =
    tone === "success"
      ? "bg-[var(--success)]"
      : tone === "warning"
        ? "bg-[var(--warning)]"
        : "bg-teal";
  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-foreground">
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground">Nothing to report.</li>
        )}
        {items.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PrescriptionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function PerfCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function readinessBlurb(r: ReadinessBand) {
  switch (r) {
    case "Production Ready":
      return "85+ — cleared for live customer calls";
    case "Needs Minor Coaching":
      return "70–84 — one targeted practice recommended";
    case "Needs More Practice":
      return "50–69 — additional coaching required";
    case "Not Ready":
      return "Below 50 — return to component practice";
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
