// 클라이언트/서버 공통 문제 DTO

export type ChoiceLayout = "auto" | "row" | "grid" | "column";

export interface ProblemData {
  id?: string;
  title?: string | null;
  body: string;
  type: "multiple" | "short";
  choices: string[];
  choiceLayout: ChoiceLayout;
  bogi: string[];
  points: number;
  answer?: string | null;
  explanation?: string | null;
  memo?: string | null;
  sourceNumber?: number | null;
  sourceYear?: number | null;
  sourceMonth?: number | null;
  sourceOrg: string;
  sourceName?: string | null;
  curriculum: string;
  unitMajor: string;
  unitMiddle: string;
  unitDetail: string;
  originalImage?: string | null;
  figureImage?: string | null;
  figureWidth: number;
  figureAlign: "center" | "right";
  difficulty: number;
  importance: number;
  solveCount?: number;
  wrongCount?: number;
  lastSolvedAt?: string | null;
  handwriting?: string | null;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export const EMPTY_PROBLEM: ProblemData = {
  title: "",
  body: "",
  type: "multiple",
  choices: ["", "", "", "", ""],
  choiceLayout: "auto",
  bogi: [],
  points: 3,
  answer: "",
  explanation: "",
  memo: "",
  sourceNumber: null,
  sourceYear: null,
  sourceMonth: null,
  sourceOrg: "자작",
  sourceName: "",
  curriculum: "2028",
  unitMajor: "",
  unitMiddle: "",
  unitDetail: "",
  originalImage: null,
  figureImage: null,
  figureWidth: 60,
  figureAlign: "center",
  difficulty: 3,
  importance: 3,
  tags: [],
};

export interface ExamItemData {
  id?: string;
  problemId: string;
  order: number;
  spacing: number;
  breakBefore: "none" | "column" | "page";
  problem: ProblemData;
}

export interface ExamData {
  id: string;
  title: string;
  period: string;
  area: string;
  paperSize: "B4" | "A4";
  distribute: boolean;
  showSource: boolean;
  footer: string;
  items: ExamItemData[];
  updatedAt?: string;
}

export const CIRCLED = ["①", "②", "③", "④", "⑤"];
export const BOGI_LABELS = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"];
