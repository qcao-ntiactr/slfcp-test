import { describe, expect, it } from 'vitest';

import {
  base64ToFile,
  extractOriginalFileName,
} from './FileUploadInputHelpers';

describe('extractOriginalFileName', () => {
  describe('positive tests', () => {
    it('should remove a single UUID prefix', () => {
      const input = '123e4567-e89b-12d3-a456-426614174000-myfile.txt';
      const expected = 'myfile.txt';
      expect(extractOriginalFileName(input)).toBe(expected);
    });

    it('should remove multiple repeated UUID prefixes', () => {
      const input =
        '123e4567-e89b-12d3-a456-426614174000-123e4567-e89b-12d3-a456-426614174001-file.doc';
      const expected = 'file.doc';
      expect(extractOriginalFileName(input)).toBe(expected);
    });

    it('should handle UUID prefixes followed by special characters', () => {
      const input = '123e4567-e89b-12d3-a456-426614174000--another-file.json';
      const expected = '-another-file.json';
      expect(extractOriginalFileName(input)).toBe(expected);
    });
  });

  describe('negative tests', () => {
    it('should return the original string if there is no UUID', () => {
      const input = 'plainfilename.pdf';
      expect(extractOriginalFileName(input)).toBe(input);
    });

    it('should not remove partial UUID-like strings', () => {
      const input = '123e4567-file.txt'; // not a full UUID
      expect(extractOriginalFileName(input)).toBe(input);
    });

    it('should not match if UUID is not at the beginning', () => {
      const input = 'file-123e4567-e89b-12d3-a456-426614174000.txt';
      expect(extractOriginalFileName(input)).toBe(input);
    });
  });
});

const dummyBase64 = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='; // "Hello, World!"
class MockFile extends Blob {
  name: string;
  lastModified: number;

  constructor(parts: BlobPart[], name: string, options: FilePropertyBag = {}) {
    super(parts, options);
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
  }
}

globalThis.File = MockFile as unknown as typeof File;

describe('base64ToFile', () => {
  describe('positive tests', () => {
    it('should convert base64 string to a File object', () => {
      const file = base64ToFile(dummyBase64, 'hello.txt');
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe('hello.txt');
      expect(file.type).toBe('text/plain');
    });

    it('should override MIME type for .xlsx files', () => {
      const xlsxBase64 =
        'data:application/octet-stream;base64,UEsFBgAAAAAAAA=='; // minimal base64
      const file = base64ToFile(xlsxBase64, 'report.xlsx');
      expect(file.type).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should override MIME type for .xls files', () => {
      const xlsBase64 = 'data:application/octet-stream;base64,UEsFBgAAAAAAAA==';
      const file = base64ToFile(xlsBase64, 'report.xls');
      expect(file.type).toBe('application/vnd.ms-excel');
    });

    it('should default to application/octet-stream if MIME type is not found', () => {
      const invalidPrefixBase64 = 'data:;base64,SGVsbG8=';
      const file = base64ToFile(invalidPrefixBase64, 'unknown.bin');
      expect(file.type).toBe('application/octet-stream');
    });
  });

  describe('negative tests', () => {
    it('should throw if base64 is malformed (no comma)', () => {
      const badBase64 = 'notarealbase64string';
      expect(() => base64ToFile(badBase64, 'bad.txt')).toThrow();
    });

    it('should throw if base64 content is not decodable', () => {
      const badBase64 = 'data:text/plain;base64,%%%INVALID%%%';
      expect(() => base64ToFile(badBase64, 'bad.txt')).toThrow();
    });

    it('should still create a file if extension is unknown', () => {
      const file = base64ToFile(dummyBase64, 'weird.ext');
      expect(file).toBeInstanceOf(File);
      expect(file.type).toBe('text/plain'); // from the data URL
    });

    it('should fall back if filename has no extension', () => {
      const file = base64ToFile(dummyBase64, 'noext');
      expect(file.type).toBe('text/plain');
    });
  });
});
