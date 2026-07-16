// Voice-based communication heuristics for the KGIS POC.
// Real acoustic analysis (prosody, volume, interruption detection from audio
// itself) requires KGIS-supplied models in production. These heuristics are
// derived from what we can measure reliably from transcript + duration.

export type CommRating =
  | "Excellent"
  | "Effective"
  | "Needs Improvement"
  | "Critical Concern"
  | "Not Enough Evidence";

export type CommDimension = {
  key: string;
  label: string;
  rating: CommRating;
  explanation: string;
  evidence?: string;
  coaching: string;
};

export type CriticalFlag = {
  key: string;
  label: string;
  evidence?: string;
};

export type VoiceEvaluation = {
  available: boolean;
  reason?: string;
  dimensions: CommDimension[];
  flags: CriticalFlag[];
  metrics: {
    wordsPerMinute: number | null;
    fillerCount: number;
    traineeTurns: number;
    avgTraineeTurnWords: number;
    shortTurnRatio: number;
  };
};

const FILLERS = ["um", "uh", "erm", "like", "you know", "sort of", "kind of", "basically"];
const RUDE = [
  "shut up",
  "stupid",
  "idiot",
  "dumb",
  "whatever",
  "not my problem",
  "calm down",
  "listen to me",
  "i already told you",
];
const AGGRESSIVE = ["you have to", "you must", "you need to just", "no. no.", "wrong."];
const POLITE = ["please", "thank you", "appreciate", "of course", "certainly", "absolutely"];
const EMPATHY = ["i understand", "i hear you", "that makes sense", "i can see why", "i'm sorry"];

export function evaluateCommunication(
  transcript: string,
  durationSeconds: number,
  audioAvailable: boolean,
): VoiceEvaluation {
  const lines = transcript
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const traineeLines = lines
    .filter((l) => /^trainee\s*:/i.test(l))
    .map((l) => l.replace(/^trainee\s*:\s*/i, ""));
  const traineeText = traineeLines.join(" ").toLowerCase();
  const wordCount = traineeText.split(/\s+/).filter(Boolean).length;
  const minutes = durationSeconds > 0 ? durationSeconds / 60 : 0;
  const wpm = minutes > 0 ? Math.round(wordCount / minutes) : null;

  const fillerCount = FILLERS.reduce(
    (acc, f) => acc + countOccurrences(traineeText, f),
    0,
  );
  const traineeTurns = traineeLines.length;
  const traineeWordsPerTurn = traineeLines.map((l) => l.split(/\s+/).filter(Boolean).length);
  const avgWords = traineeTurns
    ? Math.round(traineeWordsPerTurn.reduce((a, b) => a + b, 0) / traineeTurns)
    : 0;
  const shortTurns = traineeWordsPerTurn.filter((w) => w > 0 && w < 4).length;
  const shortRatio = traineeTurns ? shortTurns / traineeTurns : 0;

  const metrics = {
    wordsPerMinute: wpm,
    fillerCount,
    traineeTurns,
    avgTraineeTurnWords: avgWords,
    shortTurnRatio: Math.round(shortRatio * 100) / 100,
  };

  // Without a recording we do not invent tone/emotion scores.
  if (!audioAvailable) {
    return {
      available: false,
      reason:
        "Voice-based communication analysis was not completed. Audio recording was not available for this attempt.",
      dimensions: [],
      flags: [],
      metrics,
    };
  }

  const politeHits = POLITE.reduce((acc, p) => acc + countOccurrences(traineeText, p), 0);
  const empathyHits = EMPATHY.reduce((acc, p) => acc + countOccurrences(traineeText, p), 0);
  const rudeHits = RUDE.filter((p) => traineeText.includes(p));
  const aggressiveHits = AGGRESSIVE.filter((p) => traineeText.includes(p));
  const anyCustomerConcern = /price|expensive|cancel|angry|frustrat/i.test(transcript);
  const acknowledgedConcern = /understand|hear you|makes sense|i can see|appreciate/i.test(
    traineeText,
  );

  const dims: CommDimension[] = [];
  const flags: CriticalFlag[] = [];

  const paceRating: CommRating =
    wpm == null
      ? "Not Enough Evidence"
      : wpm < 90
        ? "Needs Improvement"
        : wpm <= 170
          ? "Excellent"
          : wpm <= 200
            ? "Effective"
            : "Needs Improvement";
  dims.push({
    key: "pace",
    label: "Speaking Pace",
    rating: paceRating,
    explanation:
      wpm == null
        ? "Not enough transcribed speech to estimate speaking pace."
        : `Trainee spoke at approximately ${wpm} words per minute.`,
    coaching:
      wpm == null
        ? "Complete a longer call to enable pace analysis."
        : wpm < 90
          ? "Increase pace slightly to hold customer attention."
          : wpm > 200
            ? "Slow down — the customer needs time to absorb pricing and terms."
            : "Maintain this natural, conversational pace.",
  });
  if (wpm != null && wpm > 220) {
    flags.push({ key: "too_fast", label: "Excessively fast speech" });
  } else if (wpm != null && wpm < 70 && wordCount > 30) {
    flags.push({ key: "too_slow", label: "Excessively slow speech" });
  }

  dims.push({
    key: "hesitation",
    label: "Hesitation & Filler Words",
    rating:
      fillerCount === 0
        ? "Excellent"
        : fillerCount <= 3
          ? "Effective"
          : fillerCount <= 8
            ? "Needs Improvement"
            : "Critical Concern",
    explanation: `Detected ${fillerCount} filler word${fillerCount === 1 ? "" : "s"} in trainee speech.`,
    coaching:
      fillerCount <= 3
        ? "Continue to keep phrasing crisp."
        : "Practice slowing before objections to reduce fillers.",
  });

  dims.push({
    key: "politeness",
    label: "Politeness & Professionalism",
    rating: rudeHits.length
      ? "Critical Concern"
      : politeHits >= 4
        ? "Excellent"
        : politeHits >= 2
          ? "Effective"
          : "Needs Improvement",
    explanation: rudeHits.length
      ? `Detected potentially rude language: "${rudeHits.join('", "')}".`
      : `Detected ${politeHits} courteous phrase${politeHits === 1 ? "" : "s"}.`,
    evidence: rudeHits[0] ? findEvidence(traineeLines, rudeHits[0]) : undefined,
    coaching: rudeHits.length
      ? "Rephrase without dismissive or condescending language."
      : "Continue to open and close each exchange with courtesy.",
  });
  if (rudeHits.length)
    flags.push({
      key: "rude",
      label: "Rude or disrespectful language",
      evidence: findEvidence(traineeLines, rudeHits[0]),
    });

  dims.push({
    key: "empathy",
    label: "Empathy",
    rating:
      empathyHits >= 2
        ? "Excellent"
        : empathyHits === 1
          ? "Effective"
          : anyCustomerConcern
            ? "Needs Improvement"
            : "Not Enough Evidence",
    explanation: empathyHits
      ? `Used ${empathyHits} empathetic acknowledgement${empathyHits === 1 ? "" : "s"}.`
      : anyCustomerConcern
        ? "Customer raised concerns without acknowledgement."
        : "No customer concern surfaced to test empathy.",
    coaching:
      empathyHits >= 1
        ? "Continue to acknowledge before responding."
        : "Lead each objection response with a short empathy statement.",
  });

  dims.push({
    key: "aggression",
    label: "Calmness Under Objection",
    rating: aggressiveHits.length
      ? "Critical Concern"
      : anyCustomerConcern
        ? "Effective"
        : "Not Enough Evidence",
    explanation: aggressiveHits.length
      ? `Directive/aggressive phrasing detected: "${aggressiveHits.join('", "')}".`
      : anyCustomerConcern
        ? "Handled customer objections without escalation."
        : "No objection surfaced during the call.",
    coaching: aggressiveHits.length
      ? "Replace directive phrasing with collaborative language."
      : "Continue to keep tone neutral when handling pushback.",
  });
  if (aggressiveHits.length)
    flags.push({
      key: "aggressive",
      label: "Aggressive tone",
      evidence: findEvidence(traineeLines, aggressiveHits[0]),
    });

  dims.push({
    key: "clarity",
    label: "Clarity",
    rating:
      avgWords === 0
        ? "Not Enough Evidence"
        : avgWords >= 8 && avgWords <= 30
          ? "Effective"
          : avgWords > 30
            ? "Needs Improvement"
            : "Needs Improvement",
    explanation:
      avgWords === 0
        ? "No trainee speech captured."
        : `Average trainee turn length ${avgWords} words.`,
    coaching:
      avgWords > 30
        ? "Break long explanations into shorter, verifiable sentences."
        : avgWords < 8
          ? "Give the customer complete answers rather than short replies."
          : "Continue to keep answers focused.",
  });

  dims.push({
    key: "active_listening",
    label: "Active Listening",
    rating:
      shortRatio > 0.5
        ? "Needs Improvement"
        : empathyHits + politeHits >= 3
          ? "Effective"
          : "Not Enough Evidence",
    explanation:
      shortRatio > 0.5
        ? "Many trainee turns were very short, suggesting limited engagement."
        : "Trainee responded in full sentences with acknowledgements.",
    coaching:
      shortRatio > 0.5
        ? "Paraphrase the customer before answering to demonstrate listening."
        : "Continue to acknowledge details the customer shares.",
  });

  dims.push({
    key: "acknowledge_concern",
    label: "Acknowledged Customer Concern",
    rating: anyCustomerConcern
      ? acknowledgedConcern
        ? "Effective"
        : "Needs Improvement"
      : "Not Enough Evidence",
    explanation: anyCustomerConcern
      ? acknowledgedConcern
        ? "Concerns were acknowledged verbally before responding."
        : "Customer concerns were raised but not explicitly acknowledged."
      : "No customer concern surfaced.",
    coaching: acknowledgedConcern
      ? "Continue to name the concern before answering."
      : "Always acknowledge the concern in one sentence before answering.",
  });
  if (anyCustomerConcern && !acknowledgedConcern)
    flags.push({ key: "no_ack", label: "Failure to acknowledge customer concern" });

  dims.push({
    key: "confidence",
    label: "Confidence",
    rating:
      fillerCount > 8
        ? "Needs Improvement"
        : avgWords >= 10 && fillerCount <= 3
          ? "Effective"
          : "Not Enough Evidence",
    explanation:
      fillerCount > 8
        ? "Frequent hesitation suggests low delivery confidence."
        : "Trainee delivered answers steadily.",
    coaching:
      fillerCount > 8
        ? "Rehearse the pitch aloud until fillers drop below 3 per call."
        : "Continue to project steady confidence.",
  });
  if (fillerCount > 12) flags.push({ key: "low_confidence", label: "Low confidence" });

  // Dimensions we cannot measure without acoustic analysis get labelled honestly.
  const acousticOnly: { key: string; label: string; coaching: string }[] = [
    {
      key: "volume",
      label: "Volume Consistency",
      coaching: "Requires acoustic analysis provided by KGIS in production.",
    },
    {
      key: "interruptions",
      label: "Interruptions",
      coaching: "Requires overlap detection from raw audio in production.",
    },
    {
      key: "monotone",
      label: "Vocal Variety",
      coaching: "Requires pitch/prosody analysis in production.",
    },
    {
      key: "rapport",
      label: "Customer Rapport",
      coaching: "Requires acoustic sentiment analysis in production.",
    },
    {
      key: "call_control",
      label: "Call Control",
      coaching: "Requires turn-timing analysis from raw audio in production.",
    },
  ];
  for (const a of acousticOnly) {
    dims.push({
      key: a.key,
      label: a.label,
      rating: "Not Enough Evidence",
      explanation:
        "Not measurable from transcript alone. Requires KGIS-provided acoustic analysis for production.",
      coaching: a.coaching,
    });
  }

  return {
    available: true,
    dimensions: dims,
    flags,
    metrics,
  };
}

function countOccurrences(hay: string, needle: string) {
  if (!needle) return 0;
  let i = 0;
  let n = 0;
  while ((i = hay.indexOf(needle, i)) !== -1) {
    n++;
    i += needle.length;
  }
  return n;
}

function findEvidence(lines: string[], phrase: string) {
  const l = lines.find((x) => x.toLowerCase().includes(phrase));
  return l ? `"${l.trim()}"` : undefined;
}

export function ratingToneClass(rating: CommRating): string {
  switch (rating) {
    case "Excellent":
      return "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_60%,black)]";
    case "Effective":
      return "bg-teal-soft text-teal";
    case "Needs Improvement":
      return "bg-[color-mix(in_oklab,var(--warning)_25%,transparent)] text-[color-mix(in_oklab,var(--warning)_50%,black)]";
    case "Critical Concern":
      return "bg-[color-mix(in_oklab,var(--destructive)_18%,transparent)] text-destructive";
    case "Not Enough Evidence":
      return "bg-secondary text-secondary-foreground";
  }
}
