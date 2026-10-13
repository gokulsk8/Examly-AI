export type StoredSyllabus = {
  kind?: 'syllabus'
  id: string
  title: string
  curriculum?: string
  gradeLevel?: string
  subject: string
  subjectCode: string
  fileName: string
  mimeType: string
  size: number
  text: string
  file: Blob
  createdAt: string
}