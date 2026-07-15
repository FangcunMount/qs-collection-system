import type { PersonalityReportDimensionViewModel } from "../types";

interface PoleDefinition {
  code: string;
  label: string;
}

export interface PersonalityDimensionScale {
  left: PoleDefinition;
  right: PoleDefinition;
  position: number;
  hasValue: boolean;
  leftPercent: number;
  rightPercent: number;
}

const PAIRS: Record<string, [PoleDefinition, PoleDefinition]> = {
  EI: [{ code: "E", label: "外向" }, { code: "I", label: "内向" }],
  SN: [{ code: "S", label: "实感" }, { code: "N", label: "直觉" }],
  TF: [{ code: "T", label: "思考" }, { code: "F", label: "情感" }],
  JP: [{ code: "J", label: "判断" }, { code: "P", label: "感知" }],
};

const clamp = (value: number, min = 0, max = 100): number => (
  Math.min(Math.max(value, min), max)
);

const lettersOnly = (value: string): string => value.replace(/[^a-z]/gi, "").toUpperCase();

const pairFromCode = (factorCode: string): [PoleDefinition, PoleDefinition] | null => {
  const code = lettersOnly(factorCode);
  const direct = PAIRS[code];
  if (direct) return direct;
  const reversed = PAIRS[code.split("").reverse().join("")];
  return reversed || null;
};

const labelsFromTitle = (title: string): [string, string] | null => {
  const parts = title
    .split(/[-–—_/·]/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length === 2 ? [parts[0], parts[1]] : null;
};

const preferredPoleFromOutcome = (
  outcomeCode: string,
  leftCode: string,
  rightCode: string,
): string => {
  const outcome = lettersOnly(outcomeCode);
  if (outcome.includes(leftCode)) return leftCode;
  if (outcome.includes(rightCode)) return rightCode;
  return "";
};

export const resolvePersonalityDimensionScale = (
  dimension: PersonalityReportDimensionViewModel,
  outcomeCode = "",
): PersonalityDimensionScale => {
  const configuredPair = pairFromCode(dimension.factor_code);
  const explicitLeft = lettersOnly(dimension.left_pole);
  const explicitRight = lettersOnly(dimension.right_pole);
  const fallbackCodes: [PoleDefinition, PoleDefinition] = [
    { code: explicitLeft || "低", label: "较低" },
    { code: explicitRight || "高", label: "较高" },
  ];
  const [baseLeft, baseRight] = configuredPair || fallbackCodes;
  const titleLabels = labelsFromTitle(dimension.title);
  const left = {
    ...baseLeft,
    label: titleLabels?.[0] || baseLeft.label,
  };
  const right = {
    ...baseRight,
    label: titleLabels?.[1] || baseRight.label,
  };

  const rawStrength = dimension.strength;
  const hasStrength = rawStrength !== null && Number.isFinite(Number(rawStrength));
  const preferredPole = lettersOnly(dimension.preference)
    || preferredPoleFromOutcome(outcomeCode, left.code, right.code);
  let position = 50;
  let hasValue = false;

  if (hasStrength && (preferredPole === left.code || preferredPole === right.code)) {
    const halfStrength = clamp(Number(rawStrength)) / 2;
    position = preferredPole === left.code ? 50 - halfStrength : 50 + halfStrength;
    hasValue = true;
  } else if (
    dimension.score !== null
    && dimension.max_score !== null
    && Number(dimension.max_score) > 0
  ) {
    position = clamp((Number(dimension.score) / Number(dimension.max_score)) * 100);
    hasValue = true;

    if (explicitLeft && explicitRight && explicitLeft === right.code && explicitRight === left.code) {
      position = 100 - position;
    } else if (preferredPole === left.code && position > 50) {
      position = 100 - position;
    } else if (preferredPole === right.code && position < 50) {
      position = 100 - position;
    }
  }

  const roundedPosition = Math.round(clamp(position));
  return {
    left,
    right,
    position: roundedPosition,
    hasValue,
    leftPercent: 100 - roundedPosition,
    rightPercent: roundedPosition,
  };
};
