/**
 * File categories for Act I's opening: documents, code, design.
 *
 * The split is deliberate and must add up to 567: 305 documents, 248 code,
 * 14 design. Office files count as documents (including .xlsx), and only
 * .kra / .blend count as design.
 */
export type FileCategory = 'document' | 'code' | 'design' | 'other';

const DOCUMENT = new Set([
  '.docx',
  '.pdf',
  '.pptx',
  '.tex',
  '.md',
  '.txt',
  '.xlsx',
]);

const CODE = new Set([
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hs',
  '.ipynb',
  '.elm',
]);

const DESIGN = new Set(['.blend', '.kra']);

export function categoryOf(fileName: string): FileCategory {
  const extension = fileName.toLowerCase();
  if (DOCUMENT.has(extension)) return 'document';
  if (CODE.has(extension)) return 'code';
  if (DESIGN.has(extension)) return 'design';
  return 'other';
}

export const CATEGORY_LABEL: Record<FileCategory, string> = {
  document: 'Documents',
  code: 'Code',
  design: 'Design',
  other: 'Other',
};
