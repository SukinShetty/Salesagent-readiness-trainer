// Shared option catalog + session storage for the KGIS Sales Training AI POC.

export const DEPARTMENTS = [
  "Sales",
  "Customer Acquisition",
  "Retention",
  "Upselling",
  "Customer Service",
] as const;

export const PROJECTS = ["Project 1", "Project 2", "Custom Project"] as const;

export const PROVIDERS = [
  "Provider 1",
  "Provider 2",
  "Provider 3",
  "Provider 4",
  "Provider 5",
  "Provider 6",
  "General Telecom Training",
] as const;

export type TrainingModeGroup = {
  group: "Component Practice" | "Full Call Flow Practice" | "Assessment Mode";
  options: string[];
};

export const TRAINING_MODES: TrainingModeGroup[] = [
  {
    group: "Component Practice",
    options: [
      "Opening and Greeting",
      "Discovery and Fact Finding",
      "Product Recommendation",
      "FBB Pitching",
      "Objection Handling",
      "Order Processing and Disclosures",
      "Closing and Recap",
    ],
  },
  {
    group: "Full Call Flow Practice",
    options: [
      "Complete end-to-end sales call",
      "Sales scenario",
      "Non-sales scenario",
      "Provider-specific interaction",
    ],
  },
  {
    group: "Assessment Mode",
    options: [
      "Final simulated call",
      "Performance scoring",
      "Certification readiness",
    ],
  },
];

export const SCENARIOS = [
  "Price-Sensitive Customer",
  "Shopping Customer",
  "Skeptical Customer",
  "Impatient Customer",
  "Objection-Heavy Customer",
  "Genuine Buyer",
  "Customer Service Inquiry",
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
  salespersonName: string;
  employeeId: string;
  department: string;
  batchName: string;
  project: string;
  provider: string;
  trainingMode: string;
  scenario: string;
  difficulty: string;
};

const SESSION_KEY = "kgis:session";
const HISTORY_KEY = "kgis:history";
const LAST_EVAL_KEY = "kgis:lastEvaluation";
const TRANSCRIPT_KEY = "kgis:lastTranscript";

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
  | "Not Certified";

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

/**
 * Simple deterministic evaluation for the POC.
 * A real evaluation engine (LLM-based scoring on the transcript) can replace
 * this function's body without touching the rest of the app.
 */
export function evaluateTranscript(
  transcript: string,
  session: TrainingSession,
  durationSeconds: number,
): EvaluationRecord {
  const text = transcript.toLowerCase();
  const has = (words: string[]) => words.some((w) => text.includes(w));

  const scores = QMF_CATEGORIES.map((cat) => {
    let ratio = 0.55; // baseline
    if (cat.name.startsWith("Opening") && has(["verify", "zip", "account", "may i"]))
      ratio = 0.9;
    if (cat.name.startsWith("Discovery") && has(["what", "how", "family", "work from home", "important"]))
      ratio = 0.8;
    if (cat.name.startsWith("Product") && has(["fiber", "gigabit", "plan", "speed"]))
      ratio = 0.78;
    if (cat.name.startsWith("Objection") && has(["understand", "feel", "however", "actually"]))
      ratio = 0.7;
    if (cat.name.startsWith("Compliance") && has(["credit check", "authoriz", "consent", "terms"]))
      ratio = 0.9;
    if (cat.name.startsWith("Closing") && has(["recap", "schedule", "shall we", "confirm"]))
      ratio = 0.75;
    if (cat.name.startsWith("Soft") && has(["thank you", "absolutely", "of course", "great question"]))
      ratio = 0.8;
    // scenario/difficulty nudge
    if (session.difficulty === "Advanced") ratio -= 0.05;
    if (session.difficulty === "Beginner") ratio += 0.05;
    ratio = Math.max(0.3, Math.min(1, ratio));
    return { name: cat.name, max: cat.max, score: Math.round(cat.max * ratio) };
  });

  const overall = scores.reduce((s, c) => s + c.score, 0);

  return {
    id: `eval_${Date.now()}`,
    date: new Date().toISOString(),
    durationSeconds,
    session,
    overallScore: overall,
    categories: scores,
    readiness: readinessFromScore(overall),
    certification: certificationFromScore(overall),
    strengths: [
      "Followed KGIS opening and verification protocol",
      "Used Feature-Bridge-Benefit framing on the recommended plan",
      "Delivered compliance disclosure before capturing consent",
    ],
    missed: [
      "Did not probe deeply into work-from-home bandwidth needs",
      "Missed an opportunity to bundle for additional savings",
      "Recap lacked confirmation of the customer's specific priorities",
    ],
    improvements: [
      "Pause before responding to price objections to build trust",
      "Use feel-felt-found on competitor price comparisons",
      "End every recap with an explicit close question",
    ],
    coachingSummary:
      "Solid structural call. Strengthen discovery depth and close with a direct question after every recap. One additional targeted roleplay is recommended before production certification.",
    nextScenario:
      session.scenario === "Objection-Heavy Customer"
        ? "Skeptical Customer"
        : "Objection-Heavy Customer",
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
      department: "Sales",
      batchName: "Batch A-14",
      project: "Project 1",
      provider: "Provider 2",
      trainingMode: "Complete end-to-end sales call",
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
      department: "Customer Acquisition",
      batchName: "Batch A-14",
      project: "Project 2",
      provider: "Provider 4",
      trainingMode: "Objection Handling",
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
      department: "Retention",
      batchName: "Batch B-09",
      project: "Project 1",
      provider: "Provider 1",
      trainingMode: "Final simulated call",
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
