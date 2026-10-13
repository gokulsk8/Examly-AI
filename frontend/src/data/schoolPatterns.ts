import type { QuestionTypeId } from '../types/paper'

export type SchoolExamId = 'quarterly' | 'half-yearly' | 'annual' | 'tn-sslc' | 'tn-hse'
export const SCHOOL_MAX_MARKS = 100
export const SCHOOL_QUESTION_TYPE_IDS: QuestionTypeId[] = ['one-mark', 'two-mark', 'three-mark', 'five-mark']

export type SchoolExamTemplate = {
  id: SchoolExamId
  title: string
  category: 'School term examination' | 'Tamil Nadu public examination'
  gradeLevel: string
  durationMinutes: number
  description: string
  questionCounts: Record<QuestionTypeId, number>
}

export const SCHOOL_EXAM_TEMPLATES: SchoolExamTemplate[] = [
  {
    id: 'quarterly',
    title: 'Quarterly examination',
    category: 'School term examination',
    gradeLevel: 'School',
    durationMinutes: 120,
    description: 'A shorter term-paper layout with a customizable question mix.',
    questionCounts: { 'one-mark': 10, 'two-mark': 10, 'three-mark': 6, 'five-mark': 6, 'seven-mark': 0, 'fourteen-mark': 0 },
  },
  {
    id: 'half-yearly',
    title: 'Half-yearly examination',
    category: 'School term examination',
    gradeLevel: 'School',
    durationMinutes: 180,
    description: 'A mid-year paper layout with a broader syllabus and editable counts.',
    questionCounts: { 'one-mark': 10, 'two-mark': 10, 'three-mark': 8, 'five-mark': 8, 'seven-mark': 0, 'fourteen-mark': 0 },
  },
  {
    id: 'annual',
    title: 'Annual examination',
    category: 'School term examination',
    gradeLevel: 'School',
    durationMinutes: 180,
    description: 'An end-of-year paper layout with an editable full-paper question mix.',
    questionCounts: { 'one-mark': 10, 'two-mark': 10, 'three-mark': 10, 'five-mark': 8, 'seven-mark': 0, 'fourteen-mark': 0 },
  },
  {
    id: 'tn-sslc',
    title: 'Tamil Nadu SSLC public examination',
    category: 'Tamil Nadu public examination',
    gradeLevel: 'Class 10',
    durationMinutes: 180,
    description: 'Class 10 public-exam paper layout. Adjust the mix to the subject blueprint.',
    questionCounts: { 'one-mark': 10, 'two-mark': 10, 'three-mark': 6, 'five-mark': 8, 'seven-mark': 0, 'fourteen-mark': 0 },
  },
  {
    id: 'tn-hse',
    title: 'Tamil Nadu HSE public examination',
    category: 'Tamil Nadu public examination',
    gradeLevel: 'Class 12',
    durationMinutes: 180,
    description: 'Class 12 public-exam paper layout. Adjust the mix to the subject blueprint.',
    questionCounts: { 'one-mark': 10, 'two-mark': 10, 'three-mark': 10, 'five-mark': 8, 'seven-mark': 0, 'fourteen-mark': 0 },
  },
]

export function createSchoolPatternCounts() {
  return Object.fromEntries(
    SCHOOL_EXAM_TEMPLATES.map(({ id, questionCounts }) => [id, { ...questionCounts }]),
  ) as Record<SchoolExamId, Record<QuestionTypeId, number>>
}
