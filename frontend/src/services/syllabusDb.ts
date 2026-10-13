import type { GeneratedPaper, SavedPaper } from '../types/paper'
import type { StoredSyllabus } from '../types/syllabus'

const databaseName = 'papertrail-assessment-library'
const syllabusStoreName = 'syllabi'
const maxFileSize = 20 * 1024 * 1024
const maxExtractedLength = 100_000

let databasePromise: Promise<IDBDatabase> | undefined

const unitHeadingPattern = /^\s*(?:unit|module)\s*[-:–—]?\s*(?:[1-5]|i{1,3}|iv|v)\b\s*[:.)–—-]?\s*(.*)$/i
const stopSyllabusPattern = /^\s*(?:course outcomes?|course objectives?|learning outcomes?|program outcomes?|text\s+books?|textbooks?|reference books?|references?|suggested readings?|prerequisites?|scheme of examination|examination pattern|assessment pattern|question paper pattern|list of experiments|laboratory|lab work)\b/i

export function extractCollegeSyllabusContent(rawText: string, fallbackSubject: string) {
  const text = rawText
    .replace(/\u00a0/g, ' ')
    .replace(/\s+(?=(?:unit|module)\s*[-:–—]?\s*(?:[1-5]|i{1,3}|iv|v)\b)/gi, '\n')
  const lines = text.split(/\r?\n/).map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean)
  const firstUnitIndex = lines.findIndex((line) => unitHeadingPattern.test(line))
  const subjectLinePattern = /^\s*(?:(?:name\s+of\s+)?subject(?:\s+name|\s+title)?|course(?:\s+(?:name|title))?)\s*[:-]\s*(.+)$/i
  const detectedSubject = lines
    .slice(0, firstUnitIndex < 0 ? lines.length : firstUnitIndex)
    .map((line) => line.match(subjectLinePattern)?.[1]?.trim())
    .find((value) => value && !/^(?:code|no\.?)\b/i.test(value))
  const subject = detectedSubject || fallbackSubject.trim()

  if (firstUnitIndex < 0) {
    throw new Error('No unit-wise syllabus sections were found in this PDF. Upload a PDF with Unit I–V headings or enter the syllabus topics manually.')
  }
  if (!subject) {
    throw new Error('Could not identify the subject name in this PDF. Enter the subject name in the upload form and try again.')
  }

  const units: string[] = []
  let currentUnit = ''
  for (const line of lines.slice(firstUnitIndex)) {
    if (stopSyllabusPattern.test(line)) break
    if (/^(?:page\s+)?\d+(?:\s+of\s+\d+)?$/i.test(line)) continue
    if (/^(?:university|college|department of|affiliated to)\b/i.test(line)) continue

    const heading = line.match(unitHeadingPattern)
    if (heading) {
      if (currentUnit) units.push(currentUnit.trim())
      currentUnit = line.slice(0, line.length - heading[1].length).trim()
      if (heading[1].trim()) currentUnit += ` ${heading[1].trim()}`
      continue
    }
    if (currentUnit) currentUnit += `${currentUnit.endsWith(':') ? ' ' : '; '}${line}`
  }
  if (currentUnit) units.push(currentUnit.trim())

  if (units.length === 0 || units.some((unit) => !unitHeadingPattern.test(unit))) {
    throw new Error('Could not extract complete unit-wise syllabus content from this PDF. Check that it contains readable Unit I–V headings and topics.')
  }

  return { subject, text: units.join('\n') }
}

function openDatabase() {
  if (!databasePromise) {
    databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1)

      request.onupgradeneeded = () => {
        request.result.createObjectStore(syllabusStoreName, { keyPath: 'id' })
      }
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close()
          databasePromise = undefined
        }
        resolve(request.result)
      }
      request.onerror = () => reject(request.error ?? new Error('Could not open the browser database.'))
      request.onblocked = () => reject(new Error('Close other Examly AI tabs and try again.'))
    })
  }

  return databasePromise
}

export async function extractTextFromFile(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'txt' || extension === 'md' || extension === 'csv') {
    return file.text()
  }

  if (extension === 'docx') {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
    return result.value
  }

  if (extension === 'pdf') {
    const [{ getDocument, GlobalWorkerOptions }, { default: pdfWorkerUrl }] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) })
    const document = await loadingTask.promise
    try {
      if (document.numPages > 300) {
        throw new Error('PDFs are limited to 300 pages per upload.')
      }

      const pages: string[] = []
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber)
        const content = await page.getTextContent()
        const lines: string[] = []
        let currentLine = ''
        let currentY: number | undefined
        for (const item of content.items) {
          if (!('str' in item) || !item.str.trim()) continue
          const y = 'transform' in item ? item.transform[5] : currentY
          const hasMovedToAnotherLine = y !== undefined && currentY !== undefined && Math.abs(y - currentY) > 2
          if (hasMovedToAnotherLine) {
            if (currentLine.trim()) lines.push(currentLine.trim())
            currentLine = ''
          }
          currentLine = `${currentLine}${currentLine ? ' ' : ''}${item.str.trim()}`
          if (y !== undefined) currentY = y
          if ('hasEOL' in item && item.hasEOL) {
            lines.push(currentLine.trim())
            currentLine = ''
            currentY = undefined
          }
        }
        if (currentLine.trim()) lines.push(currentLine.trim())
        pages.push(lines.join('\n'))
      }
      return pages.join('\n')
    } finally {
      await loadingTask.destroy()
    }
  }

  throw new Error('Upload a PDF, DOCX, TXT, MD, or CSV file.')
}

export async function getSyllabi(): Promise<StoredSyllabus[]> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readonly')
    const request = transaction.objectStore(syllabusStoreName).getAll() as IDBRequest<(StoredSyllabus | SavedPaper)[]>
    request.onsuccess = () => resolve(
      request.result
        .filter((record): record is StoredSyllabus => record.kind !== 'paper')
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    )
    request.onerror = () => reject(request.error ?? new Error('Could not read the syllabus library.'))
  })
}

export async function saveSyllabus(
  file: File,
  title: string,
  subject: string,
  subjectCode: string,
  curriculum: string,
  gradeLevel: string,
) {
  if (file.size > maxFileSize) {
    throw new Error('Syllabus files must be 20 MB or smaller.')
  }

  const extractedText = (await extractTextFromFile(file)).trim()
  const { subject: extractedSubject, text } = file.name.split('.').pop()?.toLowerCase() === 'pdf'
    ? extractCollegeSyllabusContent(extractedText, subject)
    : { subject: subject.trim(), text: extractedText }
  if (!text) {
    throw new Error('No selectable text was found. For scanned PDFs, paste the syllabus text in the paper builder instead.')
  }
  if (!extractedSubject) {
    throw new Error('Enter the subject name before saving this syllabus.')
  }
  if (text.length > maxExtractedLength) {
    throw new Error('Extracted syllabus text is over 100,000 characters. Split the file into smaller parts.')
  }

  const syllabus: StoredSyllabus = {
    kind: 'syllabus',
    id: crypto.randomUUID(),
    title: title.trim() || file.name.replace(/\.[^.]+$/, ''),
    curriculum,
    gradeLevel: gradeLevel.trim(),
    subject: extractedSubject,
    subjectCode: subjectCode.trim(),
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    text,
    file,
    createdAt: new Date().toISOString(),
  }

  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readwrite')
    transaction.objectStore(syllabusStoreName).add(syllabus)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this syllabus.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving this syllabus was cancelled.'))
  })

  return syllabus
}

export async function deleteSyllabus(id: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readwrite')
    transaction.objectStore(syllabusStoreName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete this syllabus.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Deleting this syllabus was cancelled.'))
  })
}

export async function getSavedPapers(): Promise<SavedPaper[]> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readonly')
    const request = transaction.objectStore(syllabusStoreName).getAll() as IDBRequest<(StoredSyllabus | SavedPaper)[]>
    request.onsuccess = () => resolve(
      request.result
        .filter((record): record is SavedPaper => record.kind === 'paper')
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    )
    request.onerror = () => reject(request.error ?? new Error('Could not read saved papers.'))
  })
}

export async function saveGeneratedPaper(
  paper: GeneratedPaper,
  examDate: string,
  examTime: string,
  paperSets: GeneratedPaper[] = [paper],
) {
  const savedPaper: SavedPaper = {
    kind: 'paper',
    id: crypto.randomUUID(),
    paper,
    paperSets,
    examDate,
    examTime,
    createdAt: new Date().toISOString(),
  }

  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readwrite')
    transaction.objectStore(syllabusStoreName).add(savedPaper)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this paper.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Saving this paper was cancelled.'))
  })

  return savedPaper
}

export async function deleteSavedPaper(id: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readwrite')
    transaction.objectStore(syllabusStoreName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not delete this paper.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Deleting this paper was cancelled.'))
  })
}

export async function markSavedPaperSynced(id: string, cloudId: string) {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(syllabusStoreName, 'readwrite')
    const store = transaction.objectStore(syllabusStoreName)
    const request = store.get(id) as IDBRequest<StoredSyllabus | SavedPaper | undefined>
    request.onsuccess = () => {
      if (!request.result || request.result.kind !== 'paper') {
        transaction.abort()
        reject(new Error('The local question paper could not be found for cloud sync.'))
        return
      }
      store.put({ ...request.result, cloudId })
    }
    request.onerror = () => reject(request.error ?? new Error('Could not prepare the local paper for cloud sync.'))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not mark the local paper as synced.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Marking the local paper as synced was cancelled.'))
  })
}