import type { AssessmentType, QuestionTypeId } from '../types/paper'

export const QUESTION_TYPES: {
  id: QuestionTypeId
  label: string
  description: string
  marks: number
  section: string
}[] = [
  { id: 'one-mark', label: '1-mark question', description: 'Objective or one-line response', marks: 1, section: 'Section A · Objective Questions' },
  { id: 'two-mark', label: '2-mark question', description: 'Brief response', marks: 2, section: 'Section B · Short Answers' },
  { id: 'three-mark', label: '3-mark question', description: 'Short explanation', marks: 3, section: 'Section B · Short Answers' },
  { id: 'five-mark', label: '5-mark question', description: 'Detailed response', marks: 5, section: 'Section B · Extended Answers' },
  { id: 'seven-mark', label: '7-mark question', description: 'Structured response', marks: 7, section: 'Section C · Long Answers' },
  { id: 'fourteen-mark', label: '14-mark question', description: 'Extended response or problem', marks: 14, section: 'Section C · Long Answers' },
]

export const UNIVERSITY_QUESTION_TYPE_IDS: QuestionTypeId[] = [
  'one-mark',
  'two-mark',
  'three-mark',
  'five-mark',
  'seven-mark',
  'fourteen-mark',
]

export const ASSESSMENT_FORMATS: Record<AssessmentType, {
  label: string
  title: string
  description: string
  durationMinutes: number
  targetMarks: number | null
  questionCounts: Record<QuestionTypeId, number>
  marksPerQuestion: Record<QuestionTypeId, number>
}> = {
  semester: {
    label: 'Semester',
    title: 'End-Semester Examination',
    description: 'Standard university paper · 3 sections',
    durationMinutes: 180,
    targetMarks: 100,
    questionCounts: { 'one-mark': 10, 'two-mark': 10, 'three-mark': 0, 'five-mark': 0, 'seven-mark': 0, 'fourteen-mark': 5 },
    marksPerQuestion: { 'one-mark': 1, 'two-mark': 2, 'three-mark': 3, 'five-mark': 5, 'seven-mark': 7, 'fourteen-mark': 14 },
  },
  internal: {
    label: 'Internal',
    title: 'Internal Assessment',
    description: 'In-semester evaluation · 3 sections',
    durationMinutes: 90,
    targetMarks: 60,
    questionCounts: { 'one-mark': 8, 'two-mark': 6, 'three-mark': 4, 'five-mark': 0, 'seven-mark': 2, 'fourteen-mark': 1 },
    marksPerQuestion: { 'one-mark': 1, 'two-mark': 2, 'three-mark': 3, 'five-mark': 5, 'seven-mark': 7, 'fourteen-mark': 14 },
  },
  assessment: {
    label: 'Assessment test',
    title: 'Assessment Test',
    description: 'Custom question selection and marks',
    durationMinutes: 60,
    targetMarks: null,
    questionCounts: { 'one-mark': 4, 'two-mark': 4, 'three-mark': 4, 'five-mark': 0, 'seven-mark': 2, 'fourteen-mark': 1 },
    marksPerQuestion: { 'one-mark': 1, 'two-mark': 2, 'three-mark': 3, 'five-mark': 5, 'seven-mark': 7, 'fourteen-mark': 14 },
  },
}

export const BLOOM_LEVELS = [
  { name: 'Remember', verb: 'Recall facts', color: 'bg-[#e9f2ff] text-[#3a69a5]' },
  { name: 'Understand', verb: 'Explain ideas', color: 'bg-[#eeeaff] text-[#6b55a0]' },
  { name: 'Apply', verb: 'Use knowledge', color: 'bg-[#e7f5ef] text-[#347d5c]' },
  { name: 'Analyze', verb: 'Find connections', color: 'bg-[#fff2df] text-[#a36b25]' },
  { name: 'Evaluate', verb: 'Justify choices', color: 'bg-[#fff0ec] text-[#b85c46]' },
  { name: 'Create', verb: 'Build something', color: 'bg-[#e4f4f4] text-[#3f7d7c]' },
]

export const BLOOM_LEVEL_NAMES = BLOOM_LEVELS.map((level) => level.name)