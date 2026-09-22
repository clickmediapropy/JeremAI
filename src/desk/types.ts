export const STEPS = [
  "set-up",
  "add-notes",
  "find-footage",
  "write-script",
  "approve-script",
  "check-price",
  "make-clip",
  "rough-cut",
  "spending",
  "practice",
] as const;

export type StepId = (typeof STEPS)[number];

export interface RunBody {
  step: string;
  brand: string;
  notesPath?: string;
  footage?: string;
  seconds?: number;
  backend?: string;
  resolution?: "768P" | "2K";
  confirm?: boolean;
  countQuote?: boolean;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  sentence: string;
}
