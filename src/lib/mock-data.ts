export type Scenario = {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  personality: string;
  focusSkills: string[];
  duration: string;
  description: string;
};

export const scenarios: Scenario[] = [
  {
    id: "price-sensitive",
    title: "Price-Sensitive Customer",
    difficulty: "Intermediate",
    personality: "Budget-focused, hesitant on spend",
    focusSkills: ["Value framing", "FBB pitch", "Objection handling"],
    duration: "10-12 min",
    description: "Customer is comparing providers and pushing hard on monthly cost.",
  },
  {
    id: "skeptical",
    title: "Skeptical Customer",
    difficulty: "Advanced",
    personality: "Questions every claim",
    focusSkills: ["Discovery", "Proof points", "Compliance"],
    duration: "12-15 min",
    description: "Customer challenges reliability, speeds, and hidden fees.",
  },
  {
    id: "impatient",
    title: "Impatient Customer",
    difficulty: "Intermediate",
    personality: "Wants a fast decision",
    focusSkills: ["Concise pitch", "Closing", "Soft skills"],
    duration: "6-8 min",
    description: "Customer has limited time and wants a direct recommendation.",
  },
  {
    id: "objection-heavy",
    title: "Objection-Heavy Customer",
    difficulty: "Advanced",
    personality: "Layered objections, guarded",
    focusSkills: ["Rebuttals", "Empathy", "Recap"],
    duration: "12-18 min",
    description: "Every recommendation triggers a new objection or concern.",
  },
  {
    id: "genuine-buyer",
    title: "Genuine Buyer",
    difficulty: "Beginner",
    personality: "Warm, ready to buy",
    focusSkills: ["Verification", "Recap", "Compliance close"],
    duration: "5-8 min",
    description: "Straightforward buyer, tests opening, verification and close.",
  },
];

export type Trainee = {
  id: string;
  name: string;
  batch: string;
  lastScenario: string;
  score: number;
  readiness: "Production Ready" | "Coaching" | "Needs Practice";
};

export const trainees: Trainee[] = [
  { id: "t1", name: "Aditi Sharma", batch: "Batch A-14", lastScenario: "Price-Sensitive", score: 82, readiness: "Production Ready" },
  { id: "t2", name: "Marcus Johnson", batch: "Batch A-14", lastScenario: "Objection-Heavy", score: 68, readiness: "Coaching" },
  { id: "t3", name: "Priya Nair", batch: "Batch B-09", lastScenario: "Genuine Buyer", score: 88, readiness: "Production Ready" },
  { id: "t4", name: "Diego Alvarez", batch: "Batch B-09", lastScenario: "Skeptical", score: 61, readiness: "Needs Practice" },
  { id: "t5", name: "Chen Wei", batch: "Batch A-14", lastScenario: "Impatient", score: 74, readiness: "Coaching" },
  { id: "t6", name: "Fatima Rahman", batch: "Batch C-02", lastScenario: "Price-Sensitive", score: 79, readiness: "Production Ready" },
  { id: "t7", name: "Jordan Blake", batch: "Batch C-02", lastScenario: "Objection-Heavy", score: 57, readiness: "Needs Practice" },
  { id: "t8", name: "Neha Patel", batch: "Batch B-09", lastScenario: "Skeptical", score: 71, readiness: "Coaching" },
];

export const dashboardMetrics = {
  activeTrainees: 24,
  roleplaysCompleted: 156,
  averageScore: 72,
  productionReady: 9,
};

export const demoTranscript = `Agent: Good afternoon, thank you for calling KGIS. My name is Sarah, may I have your full name and account zip code to verify?
Customer (Rachel): Hi, Rachel Miller, zip 30044. Look, I'll be honest — I'm shopping around. My current bill is too high.
Agent: Absolutely, I hear you Rachel. Before we look at options, can I ask what's most important to you — price, speed, or reliability?
Customer: All three, but honestly price. We're a family of four, I work from home, and the kids are always streaming.
Agent: Got it. So work-from-home reliability plus multi-device streaming. Our Fiber Boost plan at $69.99 gives you symmetric gigabit — that's the same speed up and down, which matters for your video calls.
Customer: $69.99? My neighbor said they're paying $59.
Agent: That's a great question. The $59 promo is a 6-month intro that jumps to $89. Our $69.99 is locked for 24 months with no equipment fee, so over two years you actually save about $340.
Customer: Hmm. What about installation?
Agent: Free professional install this month, and a 30-day money-back guarantee. Would you like me to check availability at 30044?
Customer: Yeah, go ahead.
Agent: Perfect. And just to confirm before we proceed — you're authorizing me to run a soft credit check for service qualification, no impact to your score. Is that okay?
Customer: Yes that's fine.
Agent: Thank you. Let me recap: Fiber Boost gigabit, $69.99 locked 24 months, free install, 30-day guarantee. Shall we get you scheduled?`;

export const mockEvaluation = {
  overallScore: 78,
  readiness: "Coaching Recommended" as const,
  certification: "Conditional Pass" as const,
  categories: [
    { name: "Opening and Verification", score: 88 },
    { name: "Discovery and Fact Finding", score: 82 },
    { name: "Product Recommendation and FBB", score: 76 },
    { name: "Objection Handling", score: 70 },
    { name: "Compliance and Ethical Selling", score: 90 },
    { name: "Closing and Recap", score: 74 },
    { name: "Soft Skills", score: 68 },
  ],
  strengths: [
    "Strong opening with proper KGIS verification protocol",
    "Effective use of Feature-Benefit-Benefit framing on Fiber Boost",
    "Clear compliance disclosure before soft credit check",
  ],
  missed: [
    "Did not probe deeper into work-from-home bandwidth needs",
    "Missed opportunity to bundle mobile line for additional savings",
    "Recap lacked confirmation of customer's specific priorities",
  ],
  coaching: [
    "Slow down during price objections — pause before responding to build trust",
    "Use the 'feel, felt, found' technique on the neighbor-price objection",
    "Always end recap with an explicit close question, not an open one",
  ],
  nextScenario: "Objection-Heavy Customer",
};
