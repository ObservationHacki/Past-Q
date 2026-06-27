export type QuestionType = "mcq" | "essay" | "structured";

export interface Level {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Institution {
  id: string;
  level_id: string;
  name: string;
  slug: string;
  abbreviation: string | null;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  institution_id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  course_id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
  created_at: string;
  updated_at: string;
}

export interface Paper {
  id: string;
  subject_id: string;
  year: number;
  title: string;
  description: string | null;
  total_questions: number;
  duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  paper_id: string;
  number: number;
  type: QuestionType;
  content: string;
  options: Record<string, string> | null;
  answer: string | null;
  explanation: string | null;
  marks: number;
  created_at: string;
  updated_at: string;
}
