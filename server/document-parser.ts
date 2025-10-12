import mammoth from 'mammoth';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParseModule = require('pdf-parse');
// Handle both default and named exports
const pdfParse = pdfParseModule.default || pdfParseModule;
const officeParser = require('officeparser');

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse is invoked as a function with the buffer
    const result = await pdfParse(buffer);
    return result.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from Word document buffer
 */
export async function extractTextFromWord(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Word document parsing error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extract text from PowerPoint buffer
 */
export async function extractTextFromPowerPoint(buffer: Buffer): Promise<string> {
  try {
    const text = await officeParser.parseOfficeAsync(buffer);
    return text;
  } catch (error) {
    console.error('PowerPoint parsing error:', error);
    throw new Error('Failed to extract text from PowerPoint');
  }
}

/**
 * Extract text from uploaded file based on file type
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimetype: string
): Promise<string> {
  if (mimetype === 'application/pdf') {
    return extractTextFromPDF(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    return extractTextFromWord(buffer);
  } else if (
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimetype === 'application/vnd.ms-powerpoint'
  ) {
    return extractTextFromPowerPoint(buffer);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, Word, or PowerPoint document.');
  }
}
