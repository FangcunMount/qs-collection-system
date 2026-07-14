export interface ChoiceOption {
  code: string;
  content?: string | number;
  is_select?: string;
}

export const normalizeRadioValue = (options: ChoiceOption[], value: unknown): string => (
  options.some((option) => option.code === value) ? String(value) : ""
);

export const normalizeCheckboxValues = (options: ChoiceOption[], value: unknown): string[] => {
  if (Array.isArray(value) && value.length > 0) return value.map(String);
  return options.filter((option) => option.is_select === "1").map((option) => option.code);
};

export const parseQuestionDate = (value: unknown): Date => {
  const parsed = value ? new Date(String(value).replace(/-/g, "/")) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const formatQuestionDate = (date: Date, format = "YYYY-MM-DD"): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return format
    .replace(/YYYY|yyyy/g, year)
    .replace(/MM/g, month)
    .replace(/DD|dd/g, day);
};

export const getScoreRange = (options: ChoiceOption[]) => {
  const contents = options.map((option) => Number(option.content));
  const min = Math.min(...contents);
  const max = Math.max(...contents);
  return { min, count: max - min + 1 };
};

export const getRatingForScoreCode = (options: ChoiceOption[], code: unknown): number | null => {
  const { min } = getScoreRange(options);
  const selected = options.find((option) => option.code == code);
  return selected ? Number(selected.content) - min + 1 : null;
};

export const getScoreCodeForRating = (options: ChoiceOption[], rating: number): string | undefined => {
  const { min } = getScoreRange(options);
  const score = rating + min - 1;
  return options.find((option) => Number(option.content) === score)?.code;
};
