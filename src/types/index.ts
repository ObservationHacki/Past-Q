export type Level = {
  id: string
  name: string
  slug: string
  description: string | null
  order: number
  created_at: string
}

export type Institution = {
  id: string
  level_id: string
  name: string
  slug: string
  abbreviation: string | null
  description: string | null
  order: number
  created_at: string
}

export type Course = {
  id: string
  institution_id: string
  name: string
  slug: string
  description: string | null
  order: number
  created_at: string
}

export type Subject = {
  id: string
  course_id: string
  name: string
  slug: string
  description: string | null
  order: number
  created_at: string
}

export type Paper = {
  id: string
  subject_id: string
  year: number
  title: string | null
  description: string | null
  total_questions: number
  duration_minutes: number | null
  created_at: string
}

export type Question = {
  id: string
  paper_id: string
  number: number
  type: 'mcq' | 'essay' | 'structured'
  content: string
  options: Record<string, string> | null
  answer: string | null
  explanation: string | null
  marks: number
  created_at: string
}

export type BrowseState = {
  level: Level | null
  institution: Institution | null
  course: Course | null
  subject: Subject | null
  paper: Paper | null
}
