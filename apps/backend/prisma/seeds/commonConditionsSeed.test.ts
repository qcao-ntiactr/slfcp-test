import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const commonConditionsDir = path.resolve(
  currentDir,
  '../../../frontend/src/components/ViewDetails/Feedback/FeedbackTable/CommonConditions/conditions-markdown'
);

describe('common condition seed markdown', () => {
  it('stores common condition bodies without leading title headings', async () => {
    const filenames = (await readdir(commonConditionsDir)).filter((filename) =>
      filename.endsWith('.md')
    );
    const filesWithLeadingHeadings: string[] = [];

    for (const filename of filenames) {
      const markdown = await readFile(
        path.join(commonConditionsDir, filename),
        'utf8'
      );

      if (/^#{1,6}\s+/u.test(markdown.trimStart())) {
        filesWithLeadingHeadings.push(filename);
      }
    }

    expect(filenames.length).toBeGreaterThan(0);
    expect(filesWithLeadingHeadings).toEqual([]);
  });
});
