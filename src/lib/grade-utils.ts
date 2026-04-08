const V_GRADES = [
  "VB", "V0", "V1", "V2", "V3", "V4", "V5", "V6",
  "V7", "V8", "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16",
];

export function gradeLabel(grade: number | null | undefined): string {
  if (grade === null || grade === undefined) return "Ungraded";
  return V_GRADES[grade] ?? `V${grade}`;
}

export type GradeDisplayMode = "setter" | "community_low" | "community" | "disputed";

export function gradeDisplayMode(
  voteCount: number,
  confidence: number
): GradeDisplayMode {
  if (voteCount < 3) return "setter";
  if (voteCount < 5) return "community_low";
  if (confidence >= 0.6) return "community";
  return "disputed";
}

export function computeConsensus(
  votes: { grade: number; experienceLevel: number; isSetterAtGym: boolean }[]
): { consensusGrade: number; confidence: number } {
  if (votes.length === 0) return { consensusGrade: 0, confidence: 0 };

  const MINIMUM_VOTES = 5;

  const weighted = votes.map((v) => {
    let weight = 1.0;
    if (v.isSetterAtGym) weight += 0.5;
    weight += Math.min(v.experienceLevel / 10, 1.0);
    weight = Math.max(0.5, Math.min(2.5, weight));
    return { grade: v.grade, weight };
  });

  const totalWeight = weighted.reduce((s, v) => s + v.weight, 0);
  const weightedGrade = weighted.reduce((s, v) => s + v.grade * v.weight, 0) / totalWeight;
  const consensusGrade = Math.round(weightedGrade);

  const mean = votes.reduce((s, v) => s + v.grade, 0) / votes.length;
  const variance = votes.reduce((s, v) => s + Math.pow(v.grade - mean, 2), 0) / votes.length;
  const stdDev = Math.sqrt(variance);

  let confidence: number;
  if (votes.length < MINIMUM_VOTES) {
    confidence = votes.length / MINIMUM_VOTES;
  } else {
    confidence = Math.max(0, 1 - stdDev / 4.0);
  }

  return { consensusGrade, confidence: Math.min(1, Math.max(0, confidence)) };
}
