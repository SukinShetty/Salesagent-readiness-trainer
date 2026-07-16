// Shared option catalog + session storage for the KGIS Sales Training AI POC.

export const PROJECTS = ["Project 1", "Project 2"] as const;

export const PROVIDERS = [
  "Provider 1",
  "Provider 2",
  "Provider 3",
  "Provider 4",
  "Provider 5",
  "Provider 6",
  "Other Future Provider",
] as const;

export const CORE_MODULES = [
  "Component-Based Coaching Module",
  "Full Call Flow Coaching Module",
  "Assessment Module",
] as const;

export type CoreModule = (typeof CORE_MODULES)[number];

export const COMPONENT_STAGES = [
  "Opening",
  "Discovery and Fact Finding",
  "Product Recommendation and Pitching",
  "Objection Handling",
  "Order Processing and Disclosures",
  "Recap and Call Closing",
] as const;

export const SIMULATION_TYPES = [
  "Sales Scenario",
  "Non-Sales Scenario",
  "Provider-Specific Interaction",
  "End-to-End Call Simulation",
] as const;

export const ASSESSMENT_TYPES = [
  "Final Trainee Evaluation",
  "Certification Before Production",
] as const;

export const SUB_OPTIONS: Record<
  CoreModule,
  { label: string; options: readonly string[] }
> = {
  "Component-Based Coaching Module": {
    label: "Training Stage",
    options: COMPONENT_STAGES,
  },
  "Full Call Flow Coaching Module": {
    label: "Simulation Type",
    options: SIMULATION_TYPES,
  },
  "Assessment Module": {
    label: "Assessment Type",
    options: ASSESSMENT_TYPES,
  },
};

// Kept for back-compat with trainer filters that flatten sub-options.
export const TRAINING_MODES: { group: CoreModule; options: readonly string[] }[] = [
  { group: "Component-Based Coaching Module", options: COMPONENT_STAGES },
  { group: "Full Call Flow Coaching Module", options: SIMULATION_TYPES },
  { group: "Assessment Module", options: ASSESSMENT_TYPES },
];

export const SCENARIOS = [
  "Sales Call",
  "Non-Sale Call",
  "Shopping Customer",
  "Price-Sensitive Customer",
  "Objection-Heavy Customer",
  "Customer Service Inquiry",
  "Genuine Buyer",
  "Impatient Customer",
  "Skeptical Customer",
  "Price Comparison Call",
  "Upsell Opportunity",
  "Cross-Sell Opportunity",
] as const;

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;


export type ScenarioBrief = {
  scenario: string;
  customerName: string;
  personality: string;
  mood: string;
  customerObjective: string;
  customerProfile: string[];
  traineeObjectives: string[];
  trainingFocus: string[];
  callFlowStages: string[];
};

const DEFAULT_STAGES = [
  "Opening & Verification",
  "Discovery",
  "Product Recommendation",
  "Objection Handling",
  "Compliance & Disclosures",
  "Closing & Recap",
];

export const SCENARIO_BRIEFS: Record<string, ScenarioBrief> = {
  "Price-Sensitive Customer": {
    scenario: "Price-Sensitive Customer",
    customerName: "Rachel Miller",
    personality: "Budget-focused, hesitant on spend",
    mood: "Cautious but open",
    customerObjective:
      "Find a reliable internet plan below the current monthly bill.",
    customerProfile: [
      "US home customer",
      "Works from home",
      "Family of four",
      "Uses streaming, online classes, and gaming",
      "Concerned about hidden charges and contract terms",
    ],
    traineeObjectives: [
      "Conduct discovery",
      "Identify customer needs",
      "Recommend a suitable plan",
      "Use Feature-Bridge-Benefit",
      "Handle pricing objections",
      "Explain terms clearly",
      "Recap and close",
    ],
    trainingFocus: [
      "Value framing",
      "FBB pitch",
      "Objection handling",
      "Compliance disclosure",
    ],
    callFlowStages: DEFAULT_STAGES,
  },
};

export function getScenarioBrief(scenario: string): ScenarioBrief {
  return (
    SCENARIO_BRIEFS[scenario] ?? {
      scenario,
      customerName: "Rachel Miller",
      personality: "Realistic US telecom customer",
      mood: "Neutral",
      customerObjective:
        "Get a clear answer that helps them decide on a telecom plan.",
      customerProfile: [
        "US home or mobile customer",
        "Comparing telecom options",
        "Sensitive to compliance and clarity",
      ],
      traineeObjectives: [
        "Verify the customer",
        "Discover needs",
        "Recommend a suitable plan",
        "Handle objections",
        "Recap and close",
      ],
      trainingFocus: ["Discovery", "Recommendation", "Objection handling", "Closing"],
      callFlowStages: DEFAULT_STAGES,
    }
  );
}

export type TrainingSession = {
  salespersonName: string; // Trainee Name (UI label)
  employeeId: string; // Trainee ID (UI label)
  batchName: string;
  project: string;
  provider: string;
  coreModule: CoreModule;
  subOption: string;
  scenario: string;
  difficulty: string;
  // Legacy optional fields (older stored sessions may include these)
  trainingMode?: string;
  department?: string;
  telecomService?: string;
};


const SESSION_KEY = "kgis:session";
const HISTORY_KEY = "kgis:history";
const LAST_EVAL_KEY = "kgis:lastEvaluation";
const TRANSCRIPT_KEY = "kgis:lastTranscript";
const DB_SESSION_KEY = "kgis:dbSessionId";
const CLIENT_SESSION_KEY = "kgis:clientSessionId";

export function saveSession(session: TrainingSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): TrainingSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TrainingSession;
  } catch {
    return null;
  }
}

export function saveTranscript(text: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(TRANSCRIPT_KEY, text);
}
export function loadTranscript(): string {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(TRANSCRIPT_KEY) ?? "";
}

/** Stable per-browser identifier for correlating DB rows in this POC. */
export function getClientSessionId(): string {
  if (typeof window === "undefined") return "server";
  let id = window.localStorage.getItem(CLIENT_SESSION_KEY);
  if (!id) {
    id = `cs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(CLIENT_SESSION_KEY, id);
  }
  return id;
}

export function saveDbSessionId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.sessionStorage.setItem(DB_SESSION_KEY, id);
  else window.sessionStorage.removeItem(DB_SESSION_KEY);
}
export function loadDbSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(DB_SESSION_KEY);
}

export type EvaluationMode = CoreModule;


export type StageStatus =
  | "Completed"
  | "Partially Completed"
  | "Missed"
  | "Not Applicable";

export type ComplianceStatus = "Passed" | "Warning" | "Failed" | "Not Applicable";

export type CategoryDetail = {
  name: string;
  score: number;
  max: number;
  wentWell: string;
  missed: string;
  evidence: string;
  improvement: string;
};

export type CallFlowStage = {
  stage: string;
  status: StageStatus;
  score: number;
  max: number;
  evidence: string;
  missed: string;
  coaching: string;
};

export type EvidenceSnippet = { label: string; quote: string };

export type PriorityAction = { what: string; why: string; do: string };

export type PracticePrescription = {
  scenario: string;
  mode: string;
  difficulty: string;
  focus: string;
  attempts: number;
};

export type CriticalComplianceStatus = "Passed" | "Passed with Warning" | "Failed";
export type AssessmentValidity =
  | "Valid for Certification"
  | "Practice Attempt Only"
  | "Invalid Due to Incomplete Call";

export type EvaluationRecord = {
  id: string;
  date: string; // ISO
  durationSeconds: number;
  session: TrainingSession;
  overallScore: number;
  categories: { name: string; score: number; max: number }[];
  readiness: ReadinessBand;
  certification: CertificationOutcome;
  strengths: string[];
  missed: string[];
  improvements: string[];
  coachingSummary: string;
  nextScenario: string;
  // Extended L&D fields (optional for back-compat with older records)
  turns?: number;
  transcript?: string;
  mode?: EvaluationMode;
  callFlowAdherencePct?: number;
  criticalComplianceStatus?: CriticalComplianceStatus;
  assessmentValidity?: AssessmentValidity;
  callFlow?: CallFlowStage[];
  categoryDetails?: CategoryDetail[];
  compliance?: { item: string; status: ComplianceStatus; note?: string; critical?: boolean }[];
  evidence?: EvidenceSnippet[];
  priorityActions?: PriorityAction[];
  practicePrescription?: PracticePrescription;
  certificationReason?: string;
  previousScore?: number | null;
  strongestStage?: string;
  weakestStage?: string;
  dbSessionId?: string; // Server-side row id for audio + persisted transcript
};

export type ReadinessBand =
  | "Production Ready"
  | "Needs Minor Coaching"
  | "Needs More Practice"
  | "Not Ready";

export type CertificationOutcome =
  | "Certified for Production"
  | "Conditional Pass"
  | "Needs More Practice"
  | "Not Certified"
  | "Practice Attempt Only";

export function readinessFromScore(score: number): ReadinessBand {
  if (score >= 85) return "Production Ready";
  if (score >= 70) return "Needs Minor Coaching";
  if (score >= 50) return "Needs More Practice";
  return "Not Ready";
}

export function certificationFromScore(score: number): CertificationOutcome {
  if (score >= 85) return "Certified for Production";
  if (score >= 70) return "Conditional Pass";
  if (score >= 50) return "Needs More Practice";
  return "Not Certified";
}

export const QMF_CATEGORIES: { name: string; max: number }[] = [
  { name: "Opening and Verification", max: 10 },
  { name: "Discovery and Fact Finding", max: 20 },
  { name: "Product Recommendation and FBB", max: 20 },
  { name: "Objection Handling", max: 15 },
  { name: "Compliance and Ethical Selling", max: 20 },
  { name: "Closing and Recap", max: 10 },
  { name: "Soft Skills", max: 5 },
];

export const CALL_FLOW_STAGES: { name: string; max: number }[] = [
  { name: "Opening and Branding", max: 5 },
  { name: "Customer Verification", max: 5 },
  { name: "Discovery and Fact Finding", max: 10 },
  { name: "Need Identification", max: 10 },
  { name: "Product Recommendation", max: 10 },
  { name: "Feature-Bridge-Benefit", max: 10 },
  { name: "Offer Presentation", max: 10 },
  { name: "Upsell or Cross-sell", max: 5 },
  { name: "Objection Handling", max: 10 },
  { name: "Compliance and Mandatory Disclosures", max: 10 },
  { name: "Recap and Confirmation", max: 5 },
  { name: "Closing the Sale", max: 5 },
  { name: "Customer Experience and Soft Skills", max: 5 },
];

export function deriveMode(coreModule: string | undefined): EvaluationMode {
  if (coreModule && (CORE_MODULES as readonly string[]).includes(coreModule)) {
    return coreModule as EvaluationMode;
  }
  return "Full Call Flow Coaching Module";
}


type Match = { keys: string[]; evidence: string };
function findLine(traineeLines: string[], keys: string[]): string {
  const lower = keys.map((k) => k.toLowerCase());
  const hit = traineeLines.find((l) =>
    lower.some((k) => l.toLowerCase().includes(k)),
  );
  return hit ?? "";
}

/**
 * Deterministic POC evaluation. All scores are grounded in transcript pattern
 * matches so trainers can trace every number back to evidence.
 */
export function evaluateTranscript(
  transcript: string,
  session: TrainingSession,
  durationSeconds: number,
): EvaluationRecord {
  const text = transcript.toLowerCase();
  const has = (words: string[]) => words.some((w) => text.includes(w.toLowerCase()));
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const traineeLines = lines
    .filter((l) => /^trainee\s*:/i.test(l))
    .map((l) => l.replace(/^trainee\s*:\s*/i, ""));
  const turns = lines.length;
  const mode = deriveMode(session.coreModule);
  const componentFocus =
    mode === "Component-Based Coaching Module" ? session.subOption : null;


  // ---- Category scoring with detail ----
  const categoryDefs: {
    key: string;
    match: Match;
    good: string;
    miss: string;
    improve: string;
  }[] = [
    {
      key: "Opening and Verification",
      match: {
        keys: ["kgis", "verify", "zip", "account", "may i", "thank you for calling"],
        evidence: "Branded opening and identity verification",
      },
      good: "Opened with brand and requested account verification",
      miss: "Did not clearly brand the call or verify the customer",
      improve: "Always state 'Thank you for calling KGIS' and verify by account or ZIP",
    },
    {
      key: "Discovery and Fact Finding",
      match: {
        keys: ["what", "how", "family", "work from home", "important", "usage"],
        evidence: "Asked open-ended discovery questions",
      },
      good: "Uncovered household usage and priorities before recommending",
      miss: "Recommended without asking about current provider or budget",
      improve: "Use at least four discovery questions before pitching a plan",
    },
    {
      key: "Product Recommendation and FBB",
      match: {
        keys: ["fiber", "gigabit", "plan", "speed", "which means", "so you", "symmetric"],
        evidence: "Named plan with feature-bridge-benefit framing",
      },
      good: "Recommended a specific plan and tied features to customer needs",
      miss: "Recommended without bridging features to the customer's stated needs",
      improve: "Follow every feature with 'which means…' and 'so you…' phrasing",
    },
    {
      key: "Objection Handling",
      match: {
        keys: ["understand", "however", "actually", "felt", "found", "great question"],
        evidence: "Acknowledged the objection before responding",
      },
      good: "Acknowledged the concern and reframed with value",
      miss: "Responded to price objection without acknowledging first",
      improve: "Use feel-felt-found on price and competitor comparisons",
    },
    {
      key: "Compliance and Ethical Selling",
      match: {
        keys: ["credit check", "authoriz", "consent", "terms", "24 month", "locked", "guarantee"],
        evidence: "Disclosed terms and captured consent",
      },
      good: "Disclosed contract term and captured explicit consent",
      miss: "Missed a mandatory disclosure or captured consent implicitly",
      improve: "Read the disclosure verbatim and pause for an explicit 'yes'",
    },
    {
      key: "Closing and Recap",
      match: {
        keys: ["recap", "to confirm", "shall we", "schedule", "confirm"],
        evidence: "Recapped the offer and asked to close",
      },
      good: "Recapped price, term, and included services before closing",
      miss: "Closed without a clear recap or without asking for the sale",
      improve: "End every recap with an explicit close question",
    },
    {
      key: "Soft Skills",
      match: {
        keys: ["thank you", "absolutely", "of course", "great question", "i understand"],
        evidence: "Warm, courteous tone throughout",
      },
      good: "Maintained a courteous, professional tone",
      miss: "Tone became transactional in the mid-call",
      improve: "Mirror the customer's pace and thank them at each transition",
    },
  ];

  const categoryDetails: CategoryDetail[] = QMF_CATEGORIES.map((c) => {
    const def = categoryDefs.find((d) => d.key === c.name)!;
    const hit = has(def.match.keys);
    let ratio = hit ? 0.85 : 0.55;
    if (session.difficulty === "Advanced") ratio -= 0.05;
    if (session.difficulty === "Beginner") ratio += 0.05;
    // In component practice, downgrade unrelated categories to keep focus.
    if (componentFocus && !componentFocus.toLowerCase().includes(c.name.split(" ")[0].toLowerCase())) {
      if (!c.name.includes("Soft") && !c.name.includes("Compliance")) {
        ratio = Math.min(ratio, 0.7);
      }
    }
    ratio = Math.max(0.3, Math.min(1, ratio));
    const score = Math.round(c.max * ratio);
    const ev = findLine(traineeLines, def.match.keys);
    return {
      name: c.name,
      score,
      max: c.max,
      wentWell: hit ? def.good : "Limited evidence of this competency",
      missed: hit && ratio >= 0.8 ? "Minor refinements only" : def.miss,
      evidence: ev || "No evidence found in transcript.",
      improvement: def.improve,
    };
  });

  const categories = categoryDetails.map((c) => ({ name: c.name, score: c.score, max: c.max }));
  const overall = categories.reduce((s, c) => s + c.score, 0);

  // ---- Call flow adherence ----
  const stageMatchers: Record<
    string,
    { keys: string[]; missed: string; coaching: string }
  > = {
    "Opening and Branding": {
      keys: ["kgis", "thank you for calling", "good morning", "good afternoon"],
      missed: "Did not brand the greeting",
      coaching: "Always open with 'Thank you for calling KGIS'",
    },
    "Customer Verification": {
      keys: ["verify", "zip", "account", "may i have"],
      missed: "Did not verify the customer",
      coaching: "Verify account or ZIP before discussing offers",
    },
    "Discovery and Fact Finding": {
      keys: ["what", "how", "important", "usage", "current"],
      missed: "Skipped discovery questions",
      coaching: "Ask four discovery questions before recommending",
    },
    "Need Identification": {
      keys: ["important to you", "priority", "matters most", "work from home", "family"],
      missed: "Did not summarize the customer's core need",
      coaching: "Restate the need in the customer's words before pitching",
    },
    "Product Recommendation": {
      keys: ["fiber", "gigabit", "plan", "recommend"],
      missed: "Did not recommend a specific plan",
      coaching: "Name the plan and price clearly",
    },
    "Feature-Bridge-Benefit": {
      keys: ["which means", "so you", "symmetric", "same speed"],
      missed: "Listed features without a benefit bridge",
      coaching: "Follow every feature with 'which means…' + 'so you…'",
    },
    "Offer Presentation": {
      keys: ["$", "per month", "locked", "24 month", "included"],
      missed: "Did not present the complete offer",
      coaching: "Present price, term, and inclusions together",
    },
    "Upsell or Cross-sell": {
      keys: ["add", "bundle", "mobile line", "also", "upgrade"],
      missed: "No upsell or cross-sell attempted",
      coaching: "Offer one relevant bundle option after acceptance",
    },
    "Objection Handling": {
      keys: ["understand", "however", "actually", "felt", "found"],
      missed: "Did not acknowledge the objection before responding",
      coaching: "Use feel-felt-found on price objections",
    },
    "Compliance and Mandatory Disclosures": {
      keys: ["credit check", "authoriz", "consent", "terms", "guarantee", "install"],
      missed: "Missed a mandatory disclosure",
      coaching: "Read disclosures verbatim before capturing consent",
    },
    "Recap and Confirmation": {
      keys: ["recap", "to confirm", "just to confirm"],
      missed: "No recap before closing",
      coaching: "Recap price, term, and inclusions before the close",
    },
    "Closing the Sale": {
      keys: ["shall we", "schedule", "get you started", "proceed"],
      missed: "Did not ask for the sale",
      coaching: "Close with a direct question: 'Shall we get you scheduled?'",
    },
    "Customer Experience and Soft Skills": {
      keys: ["thank you", "absolutely", "great question", "of course"],
      missed: "Tone was flat or transactional",
      coaching: "Acknowledge and thank the customer at each transition",
    },
  };

  const callFlow: CallFlowStage[] = CALL_FLOW_STAGES.map((s) => {
    const m = stageMatchers[s.name];
    const strong = m.keys.filter((k) => text.includes(k.toLowerCase())).length;
    let status: StageStatus;
    let ratio: number;
    if (componentFocus && !s.name.toLowerCase().includes(componentFocus.split(" ")[0].toLowerCase()) &&
        !s.name.includes("Compliance") && !s.name.includes("Soft")) {
      // Non-focus stages in component practice → Not Applicable
      return {
        stage: s.name,
        status: "Not Applicable",
        score: 0,
        max: s.max,
        evidence: "Out of scope for this component practice session",
        missed: "",
        coaching: "",
      };
    }
    if (strong >= 2) { status = "Completed"; ratio = 0.95; }
    else if (strong === 1) { status = "Partially Completed"; ratio = 0.6; }
    else { status = "Missed"; ratio = 0.2; }
    const ev = findLine(traineeLines, m.keys);
    return {
      stage: s.name,
      status,
      score: Math.round(s.max * ratio),
      max: s.max,
      evidence: ev || (status === "Missed" ? "No evidence found in transcript." : ""),
      missed: status === "Completed" ? "" : m.missed,
      coaching: status === "Completed" ? "" : m.coaching,
    };
  });

  const applicableStages = callFlow.filter((c) => c.status !== "Not Applicable");
  const adherenceScore = applicableStages.reduce(
    (a, c) => a + (c.status === "Completed" ? 1 : c.status === "Partially Completed" ? 0.5 : 0),
    0,
  );
  const callFlowAdherencePct = applicableStages.length
    ? Math.round((adherenceScore / applicableStages.length) * 100)
    : 0;

  // ---- Compliance gates ----
  const complianceChecks: {
    item: string;
    critical: boolean;
    keys: string[];
    warnKeys?: string[];
  }[] = [
    { item: "Correct branding", critical: false, keys: ["kgis"] },
    { item: "Customer verification", critical: true, keys: ["verify", "zip", "account"] },
    { item: "Accurate pricing explanation", critical: true, keys: ["$", "per month", "price"] },
    { item: "Installation fee disclosure", critical: false, keys: ["install"] },
    { item: "Contract or term disclosure", critical: true, keys: ["24 month", "term", "contract", "locked"] },
    { item: "Promotional price explanation", critical: false, keys: ["promo", "intro", "jumps", "6-month", "6 month"] },
    { item: "Consent confirmation", critical: true, keys: ["authoriz", "consent", "is that okay", "is that ok"] },
    { item: "No false promises", critical: true, keys: [], warnKeys: ["guarantee unlimited", "always fastest", "never drop"] },
    { item: "Ethical sales behaviour", critical: false, keys: [] },
    { item: "Mandatory recap", critical: false, keys: ["recap", "to confirm"] },
    { item: "Customer understanding confirmed", critical: false, keys: ["shall we", "does that work", "sound good", "make sense"] },
  ];

  const compliance = complianceChecks.map((c) => {
    let status: ComplianceStatus;
    if (c.warnKeys && c.warnKeys.length > 0) {
      status = c.warnKeys.some((k) => text.includes(k)) ? "Failed" : "Passed";
    } else if (c.keys.length === 0) {
      status = "Passed";
    } else {
      const hits = c.keys.filter((k) => text.includes(k.toLowerCase())).length;
      status = hits >= 1 ? "Passed" : c.critical ? "Failed" : "Warning";
    }
    return { item: c.item, status, critical: c.critical };
  });

  const criticalFailed = compliance.some((c) => c.critical && c.status === "Failed");
  const anyWarning = compliance.some((c) => c.status === "Warning");
  const criticalComplianceStatus: CriticalComplianceStatus = criticalFailed
    ? "Failed"
    : anyWarning
      ? "Passed with Warning"
      : "Passed";

  // ---- Assessment validity ----
  const tooShort = turns < 6 || durationSeconds < 60;
  const noClose = !has(["shall we", "schedule", "proceed", "get you started"]);
  let assessmentValidity: AssessmentValidity;
  if (mode === "Assessment Module") {
    if (tooShort) assessmentValidity = "Invalid Due to Incomplete Call";
    else assessmentValidity = "Valid for Certification";
  } else {
    assessmentValidity = "Practice Attempt Only";
  }

  // ---- Certification with gates ----
  let certification: CertificationOutcome = certificationFromScore(overall);
  let certificationReason = `Overall score ${overall}/100 falls in the ${readinessFromScore(overall)} band.`;
  const gateReasons: string[] = [];
  if (criticalFailed) gateReasons.push("critical compliance item failed");
  if (tooShort) gateReasons.push("call transcript too short to fully evaluate");
  if (mode === "Assessment Module" && noClose) gateReasons.push("no closing attempt in assessment mode");
  const missedDisclosure = compliance.find(
    (c) => c.item === "Contract or term disclosure" && c.status === "Failed",
  );
  if (missedDisclosure) gateReasons.push("mandatory disclosure was missed");

  if (mode !== "Assessment Module") {
    certification = "Practice Attempt Only";
    certificationReason = "Practice session — no certification decision recorded.";
  } else if (gateReasons.length > 0) {
    // Cap outcome
    const capped: CertificationOutcome =
      overall >= 50 ? "Needs More Practice" : "Not Certified";
    certification = capped;
    certificationReason = `Certification capped: ${gateReasons.join("; ")}.`;
  }

  const readiness =
    mode === "Assessment Module" && gateReasons.length > 0 && readinessFromScore(overall) === "Production Ready"
      ? "Needs More Practice"
      : readinessFromScore(overall);

  // ---- Evidence snippets ----
  const evidence: EvidenceSnippet[] = [
    { label: "Best discovery question", quote: findLine(traineeLines, ["what", "how", "important"]) },
    { label: "Best product recommendation", quote: findLine(traineeLines, ["fiber", "gigabit", "plan", "$"]) },
    { label: "Best objection-handling response", quote: findLine(traineeLines, ["actually", "however", "great question", "understand"]) },
    { label: "Compliance statement", quote: findLine(traineeLines, ["authoriz", "credit check", "terms", "guarantee"]) },
    { label: "Closing statement", quote: findLine(traineeLines, ["shall we", "schedule", "get you started"]) },
    {
      label: "Weak or missed moment",
      quote:
        callFlow.find((c) => c.status === "Missed")?.missed
          ? `Missed stage: ${callFlow.find((c) => c.status === "Missed")!.stage}`
          : "",
    },
  ].map((e) => ({ label: e.label, quote: e.quote || "No evidence found in transcript." }));

  // ---- Strengths / missed / priority actions ----
  const sortedByGap = [...categoryDetails].sort(
    (a, b) => a.score / a.max - b.score / b.max,
  );
  const weakest = sortedByGap.slice(0, 3);
  const strongest = [...categoryDetails]
    .sort((a, b) => b.score / b.max - a.score / a.max)
    .slice(0, 3);

  const strengths = strongest.map((c) => `${c.name}: ${c.wentWell}`);
  const missedList = weakest
    .map((c) => `${c.name}: ${c.missed}`)
    .concat(callFlow.filter((s) => s.status === "Missed").map((s) => `${s.stage}: ${s.missed}`))
    .slice(0, 5);

  const priorityActions: PriorityAction[] = weakest.slice(0, 3).map((c) => ({
    what: `Strengthen ${c.name.toLowerCase()}`,
    why: c.missed,
    do: c.improvement,
  }));

  const focus = weakest[0]?.name ?? "Discovery and Fact Finding";
  const practicePrescription: PracticePrescription = {
    scenario:
      session.scenario === "Objection-Heavy Customer" ? "Skeptical Customer" : "Objection-Heavy Customer",
    mode: overall >= 70 ? "Full Call Flow Practice" : "Component Practice",
    difficulty: overall >= 80 ? "Advanced" : overall >= 60 ? "Intermediate" : "Beginner",
    focus,
    attempts: overall >= 80 ? 1 : overall >= 60 ? 2 : 3,
  };

  // ---- Previous score lookup ----
  let previousScore: number | null = null;
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (raw) {
      try {
        const list = JSON.parse(raw) as EvaluationRecord[];
        const prev = list.find((r) => r.session.employeeId === session.employeeId);
        if (prev) previousScore = prev.overallScore;
      } catch {
        /* noop */
      }
    }
  }

  const coachingSummary =
    overall >= 85
      ? "Confident, well-structured call. Ready for production with light reinforcement on the weakest category."
      : overall >= 70
        ? "Solid structural call. One targeted practice recommended before certification."
        : overall >= 50
          ? "Foundational skills present but discovery and closing need reinforcement before assessment."
          : "Return to component practice on discovery, compliance, and closing before attempting an assessment.";

  return {
    id: `eval_${Date.now()}`,
    date: new Date().toISOString(),
    durationSeconds,
    session,
    overallScore: overall,
    categories,
    readiness,
    certification,
    strengths,
    missed: missedList,
    improvements: priorityActions.map((a) => a.do),
    coachingSummary,
    nextScenario: practicePrescription.scenario,
    turns,
    transcript,
    mode,
    callFlowAdherencePct,
    criticalComplianceStatus,
    assessmentValidity,
    callFlow,
    categoryDetails,
    compliance,
    evidence,
    priorityActions,
    practicePrescription,
    certificationReason,
    previousScore,
    strongestStage: strongest[0]?.name,
    weakestStage: weakest[0]?.name,
  };
}

export function saveEvaluation(record: EvaluationRecord) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LAST_EVAL_KEY, JSON.stringify(record));
  const raw = window.localStorage.getItem(HISTORY_KEY);
  const list: EvaluationRecord[] = raw ? (JSON.parse(raw) as EvaluationRecord[]) : [];
  list.unshift(record);
  window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 50)));
}

export function loadLastEvaluation(): EvaluationRecord | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LAST_EVAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EvaluationRecord;
  } catch {
    return null;
  }
}

export function loadHistory(): EvaluationRecord[] {
  if (typeof window === "undefined") return SAMPLE_HISTORY;
  const raw = window.localStorage.getItem(HISTORY_KEY);
  if (!raw) return SAMPLE_HISTORY;
  try {
    const list = JSON.parse(raw) as EvaluationRecord[];
    return list.length > 0 ? list : SAMPLE_HISTORY;
  } catch {
    return SAMPLE_HISTORY;
  }
}

// Three sample trainer records for the Trainer View.
const now = Date.now();
const day = 86_400_000;

export const SAMPLE_HISTORY: EvaluationRecord[] = [
  {
    id: "sample_1",
    date: new Date(now - 1 * day).toISOString(),
    durationSeconds: 9 * 60,
    session: {
      salespersonName: "Aditi Sharma",
      employeeId: "KGIS-1042",
      batchName: "Batch A-14",
      project: "Project 1",
      provider: "Provider 2",
      coreModule: "Full Call Flow Coaching Module",
      subOption: "End-to-End Call Simulation",
      scenario: "Price-Sensitive Customer",
      difficulty: "Intermediate",
    },

    overallScore: 88,
    categories: QMF_CATEGORIES.map((c) => ({
      name: c.name,
      max: c.max,
      score: Math.round(c.max * 0.88),
    })),
    readiness: "Production Ready",
    certification: "Certified for Production",
    strengths: [],
    missed: [],
    improvements: [],
    coachingSummary: "",
    nextScenario: "Objection-Heavy Customer",
  },
  {
    id: "sample_2",
    date: new Date(now - 2 * day).toISOString(),
    durationSeconds: 12 * 60,
    session: {
      salespersonName: "Marcus Johnson",
      employeeId: "KGIS-1187",
      batchName: "Batch A-14",
      project: "Project 2",
      provider: "Provider 4",
      coreModule: "Component-Based Coaching Module",
      subOption: "Objection Handling",
      scenario: "Objection-Heavy Customer",
      difficulty: "Advanced",
    },

    overallScore: 72,
    categories: QMF_CATEGORIES.map((c) => ({
      name: c.name,
      max: c.max,
      score: Math.round(c.max * 0.72),
    })),
    readiness: "Needs Minor Coaching",
    certification: "Conditional Pass",
    strengths: [],
    missed: [],
    improvements: [],
    coachingSummary: "",
    nextScenario: "Skeptical Customer",
  },
  {
    id: "sample_3",
    date: new Date(now - 4 * day).toISOString(),
    durationSeconds: 7 * 60,
    session: {
      salespersonName: "Priya Nair",
      employeeId: "KGIS-1256",
      batchName: "Batch B-09",
      project: "Project 1",
      provider: "Provider 1",
      coreModule: "Assessment Module",
      subOption: "Final Trainee Evaluation",
      scenario: "Genuine Buyer",
      difficulty: "Beginner",
    },

    overallScore: 62,
    categories: QMF_CATEGORIES.map((c) => ({
      name: c.name,
      max: c.max,
      score: Math.round(c.max * 0.62),
    })),
    readiness: "Needs More Practice",
    certification: "Needs More Practice",
    strengths: [],
    missed: [],
    improvements: [],
    coachingSummary: "",
    nextScenario: "Genuine Buyer",
  },
];

export const DEMO_TRANSCRIPT = `AI Customer: Hi, this is Rachel. Look, I'll be honest — I'm shopping around. My current bill is too high.
Trainee: Good afternoon Rachel, thank you for calling KGIS. May I have your account zip code to verify?
AI Customer: 30044.
Trainee: Thank you. Before we look at options, what's most important to you — price, speed, or reliability?
AI Customer: All three, but honestly price. We're a family of four, I work from home, and the kids are always streaming.
Trainee: Got it. Our Fiber Boost plan at $69.99 gives you symmetric gigabit — same speed up and down, which matters for your video calls.
AI Customer: $69.99? My neighbor said they're paying $59.
Trainee: Great question. The $59 promo is a 6-month intro that jumps to $89. Our $69.99 is locked for 24 months with no equipment fee, so over two years you actually save about $340.
AI Customer: Hmm. What about installation?
Trainee: Free professional install this month, and a 30-day money-back guarantee. Just to confirm before we proceed — you're authorizing me to run a soft credit check for service qualification, no impact to your score. Is that okay?
AI Customer: Yes that's fine.
Trainee: Thank you. Fiber Boost gigabit, $69.99 locked 24 months, free install, 30-day guarantee. Shall we get you scheduled?`;
