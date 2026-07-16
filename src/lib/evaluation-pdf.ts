// Client-side PDF generation for the KGIS Sales Training AI evaluation report.
// Uses jsPDF + autoTable to produce a structured, multi-page, print-safe PDF.
// No webpage screenshot, no JSON, no vendor branding.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NO_TRAINEE_EVIDENCE, verifyTraineeQuote, type EvaluationRecord } from "@/lib/session";
import type { VoiceEvaluation } from "@/lib/voice-evaluation";

const NAVY: [number, number, number] = [15, 34, 74];
const TEAL: [number, number, number] = [15, 118, 130];
const GREY_TEXT: [number, number, number] = [70, 78, 92];
const LIGHT_BG: [number, number, number] = [242, 245, 249];
const AMBER: [number, number, number] = [176, 108, 20];
const RED: [number, number, number] = [176, 32, 40];
const SUCCESS: [number, number, number] = [22, 122, 78];
const BORDER: [number, number, number] = [214, 219, 226];

const MARGIN_X = 40;
const MARGIN_TOP = 90;
const MARGIN_BOTTOM = 55;

export type PdfBuildInput = {
  record: EvaluationRecord;
  voiceEval: VoiceEvaluation | null;
  audioAvailable: boolean;
  trainerReview: {
    aiRecommendation: string;
    decision: string;
    notes: string;
    finalOutcome: string;
    trainerName?: string;
    reviewDate?: string;
  };
  includeTranscript: boolean;
};

const NA = "Not Available";
const NOEV = NO_TRAINEE_EVIDENCE;

/**
 * Only render a quote when it appears verbatim in the trainee lines of the
 * session transcript. Otherwise return NO_TRAINEE_EVIDENCE plain text so the
 * PDF never contains fabricated or cross-session evidence.
 */
function verifiedQuote(transcript: string | undefined, quote: string | undefined | null): string {
  const q = (quote ?? "").trim();
  if (!q || q === NO_TRAINEE_EVIDENCE) return NO_TRAINEE_EVIDENCE;
  return verifyTraineeQuote(transcript, q) ? q : NO_TRAINEE_EVIDENCE;
}
const PENDING = "Pending Trainer Review";

function fallback(v: unknown, alt = NA): string {
  if (v === null || v === undefined) return alt;
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null" || s === "[object Object]") return alt;
  return s;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function sanitizeForFilename(s: string) {
  return (s || "Unknown").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function buildFilename(record: EvaluationRecord) {
  const name = sanitizeForFilename(record.session.salespersonName);
  const id = sanitizeForFilename(record.session.employeeId);
  return `KGIS_Sales_Training_Report_${name}_${id}_${todayIso()}.pdf`;
}

export function generateEvaluationPdf(input: PdfBuildInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN_X * 2;
  const generatedAt = new Date().toLocaleString();

  // Cursor for free-form content. autoTable manages its own layout.
  let y = MARGIN_TOP;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - MARGIN_BOTTOM) {
      doc.addPage();
      y = MARGIN_TOP;
    }
  };

  const drawSectionHeading = (title: string) => {
    ensureSpace(40);
    doc.setFillColor(...LIGHT_BG);
    doc.rect(MARGIN_X, y - 14, contentWidth, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(title, MARGIN_X + 8, y + 1);
    y += 18;
  };

  const drawParagraph = (text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean } = {}) => {
    const size = opts.size ?? 10;
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? GREY_TEXT));
    const lines = doc.splitTextToSize(text, contentWidth);
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, MARGIN_X, y);
      y += size + 4;
    }
  };

  // ---------- Cover / header (page 1) ----------
  const drawFirstPageHeader = () => {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("KGIS Sales Training AI", MARGIN_X, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Sales Roleplay Evaluation and Coaching Report", MARGIN_X, 48);
    doc.setFontSize(8);
    doc.setTextColor(200, 214, 232);
    doc.text("Confidential — Internal Training Use", MARGIN_X, 62);
    doc.text(`Report Generated: ${generatedAt}`, pageWidth - MARGIN_X, 62, { align: "right" });
  };

  drawFirstPageHeader();
  y = 100;

  // Trainee details block
  const s = input.record.session;
  const r = input.record;
  const subOptionLabel =
    s.coreModule === "Component-Based Coaching Module"
      ? "Training Stage"
      : s.coreModule === "Assessment Module"
        ? "Assessment Type"
        : "Simulation Type";

  drawSectionHeading("Trainee Details");
  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 4, textColor: GREY_TEXT },
    columnStyles: {
      0: { fontStyle: "bold", textColor: NAVY, cellWidth: 140 },
      1: { cellWidth: contentWidth / 2 - 140 },
      2: { fontStyle: "bold", textColor: NAVY, cellWidth: 140 },
      3: { cellWidth: contentWidth / 2 - 140 },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
    body: [
      ["Trainee Name", fallback(s.salespersonName), "Employee ID", fallback(s.employeeId)],
      ["Batch Name", fallback(s.batchName), "Project", fallback(s.project)],
      ["Telecom Provider", fallback(s.provider), "Core Training Module", fallback(s.coreModule)],
      [subOptionLabel, fallback(s.subOption), "Customer Scenario", fallback(s.scenario)],
      ["Difficulty Level", fallback(s.difficulty), "Roleplay Date", fallback(new Date(r.date).toLocaleDateString())],
      ["Call Duration", formatDuration(r.durationSeconds ?? 0), "Conversation Turns", fallback(r.turns, "0")],
    ],
    didDrawPage: () => {
      // handled globally after build; keeps first page cursor accurate
    },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  // Assessment summary card
  drawSectionHeading("Assessment Summary");
  ensureSpace(120);
  const cardTop = y - 8;
  const cardH = 110;
  doc.setDrawColor(...BORDER);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN_X, cardTop, contentWidth, cardH, 6, 6, "FD");

  // Score block on left
  doc.setFillColor(...NAVY);
  doc.roundedRect(MARGIN_X + 12, cardTop + 12, 130, cardH - 24, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(r.overallScore ?? 0), MARGIN_X + 77, cardTop + 55, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Overall Score / 100", MARGIN_X + 77, cardTop + 72, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(200, 214, 232);
  doc.text(`Call Flow: ${r.callFlowAdherencePct ?? 0}%`, MARGIN_X + 77, cardTop + 88, { align: "center" });

  // Right-side stats
  const rx = MARGIN_X + 160;
  const rowH = 18;
  const rows: [string, string, [number, number, number]][] = [
    ["Readiness Level", fallback(r.readiness), NAVY],
    ["Certification Decision", fallback(input.trainerReview.finalOutcome || r.certification), TEAL],
    ["Critical Compliance", fallback(r.criticalComplianceStatus, "Passed"),
      r.criticalComplianceStatus === "Failed" ? RED : r.criticalComplianceStatus === "Passed with Warning" ? AMBER : SUCCESS],
    ["Assessment Validity", fallback(r.assessmentValidity, "Practice Attempt Only"), NAVY],
    ["Call Flow Adherence", `${r.callFlowAdherencePct ?? 0}%`, NAVY],
  ];
  rows.forEach(([label, val, color], i) => {
    const ry = cardTop + 20 + i * rowH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY_TEXT);
    doc.text(label, rx, ry);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(val, pageWidth - MARGIN_X - 12, ry, { align: "right" });
  });
  y = cardTop + cardH + 16;

  drawParagraph(
    `Reason: ${fallback(r.certificationReason, "Based on the QMF scorecard and call-flow adherence.")}`,
    { size: 9 },
  );

  // ---------- Page 2 — Category-Wise Evaluation ----------
  doc.addPage();
  y = MARGIN_TOP;
  drawSectionHeading("Category-Wise Evaluation");
  const catRows = (r.categoryDetails ?? []).map((c) => {
    const pct = c.max ? c.score / c.max : 0;
    const status =
      pct >= 0.85 ? "Excellent" : pct >= 0.7 ? "Effective" : pct >= 0.5 ? "Needs Improvement" : "Critical Concern";
    const summary = fallback(c.wentWell, "") || fallback(c.improvement, NOEV);
    return [c.name, `${c.score}`, `${c.max}`, status, summary];
  });
  catRows.push(["Total Score", String(r.overallScore ?? 0), "100", fallback(r.readiness), fallback(r.coachingSummary, "")]);

  autoTable(doc, {
    startY: y,
    head: [["Evaluation Category", "Earned", "Max", "Status", "Evaluator Summary"]],
    body: catRows,
    styles: { fontSize: 9, cellPadding: 5, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 140, fontStyle: "bold", textColor: NAVY },
      1: { cellWidth: 45, halign: "center" },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 90 },
      4: { cellWidth: "auto" },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Call Flow Adherence
  drawSectionHeading("Call Flow Adherence");
  const stageRows = (r.callFlow ?? []).map((st) => [
    st.stage,
    st.status,
    st.status === "Not Applicable" ? "—" : `${st.score}/${st.max}`,
    fallback(st.evidence, NOEV),
    fallback(st.missed, "—"),
  ]);
  autoTable(doc, {
    startY: y,
    head: [["Stage", "Status", "Score", "Evidence", "Missed Expectation"]],
    body: stageRows.length ? stageRows : [["No call flow data captured", "—", "—", NOEV, "—"]],
    styles: { fontSize: 8.5, cellPadding: 4, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5, valign: "top" },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: "bold", textColor: NAVY },
      1: { cellWidth: 70 },
      2: { cellWidth: 45, halign: "center" },
      3: { cellWidth: "auto", fontStyle: "italic" },
      4: { cellWidth: 120 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw);
        if (v === "Missed") data.cell.styles.textColor = RED;
        else if (v === "Partially Completed") data.cell.styles.textColor = AMBER;
        else if (v === "Completed") data.cell.styles.textColor = SUCCESS;
      }
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Compliance and Non-Negotiables
  drawSectionHeading("Compliance and Non-Negotiables");
  const compRows = (r.compliance ?? []).map((c) => [
    c.item + (c.critical ? "  (Critical)" : ""),
    fallback(c.status, "Not Applicable"),
    fallback(c.note, "—"),
  ]);
  autoTable(doc, {
    startY: y,
    head: [["Requirement", "Status", "Note"]],
    body: compRows.length ? compRows : [["No compliance items evaluated", "Not Applicable", "—"]],
    styles: { fontSize: 9, cellPadding: 5, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5, valign: "top" },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 220, fontStyle: "bold", textColor: NAVY },
      1: { cellWidth: 90 },
      2: { cellWidth: "auto" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 1) {
        const v = String(data.cell.raw);
        if (v === "Failed") { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = "bold"; }
        else if (v === "Warning") data.cell.styles.textColor = AMBER;
        else if (v === "Passed") data.cell.styles.textColor = SUCCESS;
      }
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  if (r.criticalComplianceStatus === "Failed") {
    ensureSpace(40);
    doc.setFillColor(253, 235, 236);
    doc.setDrawColor(...RED);
    doc.roundedRect(MARGIN_X, y, contentWidth, 30, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...RED);
    doc.text(
      "Critical compliance requirement missed. Certification is not recommended.",
      MARGIN_X + 10,
      y + 19,
    );
    y += 40;
  }

  // Communication and Customer Handling
  drawSectionHeading("Communication and Customer Handling");
  if (!input.voiceEval || !input.voiceEval.available) {
    drawParagraph(
      "Voice-based communication analysis was not available for this roleplay attempt.",
      { size: 10, color: AMBER, bold: true },
    );
  } else {
    const commRows = input.voiceEval.dimensions.map((d) => [
      d.label,
      d.rating,
      fallback(d.explanation, "—"),
      fallback(d.coaching, "—"),
    ]);
    autoTable(doc, {
      startY: y,
      head: [["Area", "Rating", "Explanation", "Coaching Recommendation"]],
      body: commRows,
      styles: { fontSize: 8.5, cellPadding: 4, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5, valign: "top" },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: LIGHT_BG },
      columnStyles: {
        0: { cellWidth: 130, fontStyle: "bold", textColor: NAVY },
        1: { cellWidth: 80 },
        2: { cellWidth: 150 },
        3: { cellWidth: "auto" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 1) {
          const v = String(data.cell.raw);
          if (v === "Critical Concern") { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = "bold"; }
          else if (v === "Needs Improvement") data.cell.styles.textColor = AMBER;
          else if (v === "Excellent" || v === "Effective") data.cell.styles.textColor = SUCCESS;
        }
      },
      margin: { left: MARGIN_X, right: MARGIN_X },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;

    if (input.voiceEval.flags.length > 0) {
      drawSectionHeading("Critical Behaviour Flags");
      autoTable(doc, {
        startY: y,
        head: [["Flag", "Evidence"]],
        body: input.voiceEval.flags.map((f) => [f.label, fallback(f.evidence, NOEV)]),
        styles: { fontSize: 9, cellPadding: 5, textColor: RED, lineColor: BORDER, lineWidth: 0.5, valign: "top" },
        headStyles: { fillColor: RED, textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 0: { cellWidth: 200, fontStyle: "bold" }, 1: { cellWidth: "auto", fontStyle: "italic" } },
        margin: { left: MARGIN_X, right: MARGIN_X },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
    }
  }

  // Coaching and Development Plan
  drawSectionHeading("Coaching and Development Plan");
  drawParagraph("A. Coaching Summary", { bold: true, color: NAVY, size: 10 });
  drawParagraph(fallback(r.coachingSummary, PENDING));
  y += 4;

  drawParagraph("B. Strengths Demonstrated", { bold: true, color: NAVY, size: 10 });
  const strengths = (r.strengths ?? []).slice(0, 3);
  if (strengths.length === 0) drawParagraph("No strengths recorded.");
  else strengths.forEach((s2) => drawParagraph(`•  ${s2}`));
  y += 4;

  drawParagraph("C. Missed Expectations", { bold: true, color: NAVY, size: 10 });
  const missed = (r.missed ?? []).slice(0, 5);
  if (missed.length === 0) drawParagraph("No missed expectations recorded.");
  else missed.forEach((m2) => drawParagraph(`•  ${m2}`, { color: AMBER }));
  y += 4;

  drawParagraph("D. Priority Improvement Actions", { bold: true, color: NAVY, size: 10 });
  const actions = (r.priorityActions ?? []).slice(0, 3);
  if (actions.length === 0) {
    drawParagraph("No priority actions recorded.");
  } else {
    actions.forEach((a, i) => {
      drawParagraph(`${i + 1}. ${fallback(a.what, "Improvement action")}`, { bold: true, color: NAVY });
      drawParagraph(`Why: ${fallback(a.why, "—")}`);
      drawParagraph(`Do: ${fallback(a.do, "—")}`, { color: TEAL });
      y += 2;
    });
  }

  drawParagraph("E. Recommended Practice", { bold: true, color: NAVY, size: 10 });
  const pp = r.practicePrescription;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: NAVY, cellWidth: 200 },
      1: { cellWidth: "auto" },
    },
    body: [
      ["Recommended Next Scenario", fallback(pp?.scenario ?? r.nextScenario, PENDING)],
      ["Recommended Training Module", fallback(pp?.mode, PENDING)],
      ["Recommended Training Stage", fallback(pp?.focus, PENDING)],
      ["Recommended Difficulty", fallback(pp?.difficulty, PENDING)],
      ["Suggested Practice Attempts", pp?.attempts ? String(pp.attempts) : PENDING],
      ["Reassessment Recommendation", r.readiness === "Production Ready" ? "Not required" : "Reassess after completing recommended practice"],
    ],
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Selected Transcript Evidence
  drawSectionHeading("Selected Transcript Evidence");
  const evidence = r.evidence ?? [];
  const evidenceLabels = [
    "Best Discovery Question",
    "Best Product Recommendation",
    "Best Objection-Handling Response",
    "Compliance Statement",
    "Closing Statement",
    "Key Missed Moment",
  ];
  const evRows = evidenceLabels.map((label) => {
    const found = evidence.find((e) => e.label.toLowerCase().includes(label.split(" ")[1]?.toLowerCase() ?? ""));
    return [label, found ? `“${found.quote}”` : NOEV];
  });
  autoTable(doc, {
    startY: y,
    head: [["Moment", "Evidence"]],
    body: evRows,
    styles: { fontSize: 9, cellPadding: 5, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5, valign: "top" },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: LIGHT_BG },
    columnStyles: {
      0: { cellWidth: 180, fontStyle: "bold", textColor: NAVY },
      1: { cellWidth: "auto", fontStyle: "italic" },
    },
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

  // Trainer Review and Final Decision
  drawSectionHeading("Trainer Review and Final Decision");
  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 5, textColor: GREY_TEXT, lineColor: BORDER, lineWidth: 0.5, valign: "top" },
    columnStyles: {
      0: { fontStyle: "bold", textColor: NAVY, cellWidth: 180 },
      1: { cellWidth: "auto" },
    },
    body: [
      ["AI Recommendation", fallback(input.trainerReview.aiRecommendation, r.certification)],
      ["Trainer Decision", fallback(input.trainerReview.decision, PENDING)],
      ["Trainer Name", fallback(input.trainerReview.trainerName, PENDING)],
      ["Trainer Notes", fallback(input.trainerReview.notes, PENDING)],
      ["Review Date", fallback(input.trainerReview.reviewDate, PENDING)],
      ["Final Certification Status", fallback(input.trainerReview.finalOutcome, PENDING)],
    ],
    margin: { left: MARGIN_X, right: MARGIN_X },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  drawParagraph(
    "AI-generated evaluation supports trainer decision-making. The trainer remains the final authority for coaching and certification.",
    { size: 9, color: TEAL, bold: true },
  );

  // POC disclaimer on the final content page
  y += 6;
  ensureSpace(50);
  doc.setFillColor(...LIGHT_BG);
  doc.roundedRect(MARGIN_X, y, contentWidth, 44, 4, 4, "F");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...GREY_TEXT);
  const disc = doc.splitTextToSize(
    "This proof-of-concept report uses sample project, provider, call-flow, and evaluation configurations. Production reports will use KGIS-approved QMF forms, provider rules, mandatory disclosures, certification thresholds, and retention policies.",
    contentWidth - 16,
  );
  doc.text(disc, MARGIN_X + 8, y + 14);
  y += 54;

  // Optional appendix — full transcript
  if (input.includeTranscript && r.transcript) {
    doc.addPage();
    y = MARGIN_TOP;
    drawSectionHeading("Appendix A — Full Roleplay Transcript");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY_TEXT);
    const lines = doc.splitTextToSize(r.transcript, contentWidth);
    for (const line of lines) {
      ensureSpace(12);
      doc.text(line, MARGIN_X, y);
      y += 12;
    }
  }

  // ---------- Global header/footer on every page ----------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Repeat compact header on pages 2+
    if (i > 1) {
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_X, 50, pageWidth - MARGIN_X, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...NAVY);
      doc.text("KGIS Sales Training AI", MARGIN_X, 38);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GREY_TEXT);
      doc.text("Sales Roleplay Evaluation and Coaching Report", MARGIN_X, 50 - 2);
      doc.text(
        `${fallback(s.salespersonName)} · ${fallback(s.employeeId)}`,
        pageWidth - MARGIN_X,
        38,
        { align: "right" },
      );
    }
    // Footer
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_X, pageHeight - 40, pageWidth - MARGIN_X, pageHeight - 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GREY_TEXT);
    doc.text(
      "KGIS Sales Training AI  |  Confidential — Internal Training Use",
      MARGIN_X,
      pageHeight - 25,
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - MARGIN_X,
      pageHeight - 25,
      { align: "right" },
    );
  }

  return doc;
}
