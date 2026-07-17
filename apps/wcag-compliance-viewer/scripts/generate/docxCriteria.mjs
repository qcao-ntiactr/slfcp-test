import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

function extractDocxText(docxPath) {
  if (!docxPath || !existsSync(docxPath)) return '';

  try {
    const xml = execFileSync('unzip', ['-p', docxPath, 'word/document.xml'], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
    });

    return xml
      .replace(/<w:tab\/>/g, ' ')
      .replace(/<\/w:p>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  } catch {
    return '';
  }
}

export function extractDocxCriteria(docxPath, fallbackCriteria) {
  const text = extractDocxText(docxPath);
  if (!text) return [];

  const normalizedText = text.toLowerCase();
  return fallbackCriteria
    .map((criterion) => ({
      ...criterion,
      docxIndex: normalizedText.indexOf(criterion.criteria.toLowerCase()),
      source: 'docx',
    }))
    .filter((criterion) => criterion.docxIndex !== -1)
    .sort((first, second) => first.docxIndex - second.docxIndex)
    .map(({ docxIndex, ...criterion }) => criterion);
}
