import { Buffer } from "node:buffer";

import {
  MAX_RESUME_LENGTH,
} from "./resumeParsingService";

export class ResumeFileExtractionError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(
    message: string,
    status = 400,
    code = "RESUME_FILE_EXTRACTION_ERROR"
  ) {
    super(message);
    this.name = "ResumeFileExtractionError";
    this.status = status;
    this.code = code;
  }
}

export interface ResumeUploadFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

export type ResumeFileKind =
  | "PDF"
  | "DOCX"
  | "TEXT";

export interface ResumeFileExtractionResult {
  fileName: string;
  kind: ResumeFileKind;
  text: string;
  extractedCharacters: number;
}

export const MAX_RESUME_FILE_BYTES =
  8 * 1024 * 1024;

export const MAX_RESUME_PDF_PAGES = 30;

const PDF_MIME_TYPES = new Set([
  "application/pdf",
]);

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

const TEXT_MIME_TYPES = new Set([
  "text/plain",
  "application/octet-stream",
]);

function normalizeFileName(
  value: string
): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 255);
}

function getExtension(
  fileName: string
): string {
  const index = fileName.lastIndexOf(".");

  return index >= 0
    ? fileName.slice(index).toLowerCase()
    : "";
}

function resolveFileKind(
  fileName: string,
  mimeType: string
): ResumeFileKind {
  const extension = getExtension(fileName);
  const normalizedMime = mimeType.trim().toLowerCase();

  if (extension === ".pdf") {
    if (
      normalizedMime &&
      !PDF_MIME_TYPES.has(normalizedMime)
    ) {
      throw new ResumeFileExtractionError(
        "PDF 파일의 콘텐츠 형식이 올바르지 않습니다.",
        400,
        "RESUME_FILE_MIME_MISMATCH"
      );
    }

    return "PDF";
  }

  if (extension === ".docx") {
    if (
      normalizedMime &&
      !DOCX_MIME_TYPES.has(normalizedMime)
    ) {
      throw new ResumeFileExtractionError(
        "DOCX 파일의 콘텐츠 형식이 올바르지 않습니다.",
        400,
        "RESUME_FILE_MIME_MISMATCH"
      );
    }

    return "DOCX";
  }

  if (extension === ".txt") {
    if (
      normalizedMime &&
      !TEXT_MIME_TYPES.has(normalizedMime)
    ) {
      throw new ResumeFileExtractionError(
        "텍스트 파일의 콘텐츠 형식이 올바르지 않습니다.",
        400,
        "RESUME_FILE_MIME_MISMATCH"
      );
    }

    return "TEXT";
  }

  throw new ResumeFileExtractionError(
    "PDF, DOCX, TXT 형식의 이력서만 업로드할 수 있습니다.",
    400,
    "UNSUPPORTED_RESUME_FILE_TYPE"
  );
}

function assertPdfSignature(
  bytes: Uint8Array
): void {
  const signature =
    Buffer.from(bytes.subarray(0, 5)).toString("ascii");

  if (signature !== "%PDF-") {
    throw new ResumeFileExtractionError(
      "PDF 파일 시그니처를 확인할 수 없습니다.",
      400,
      "RESUME_FILE_SIGNATURE_INVALID"
    );
  }
}

function assertDocxSignature(
  bytes: Uint8Array
): void {
  const valid =
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;

  if (!valid) {
    throw new ResumeFileExtractionError(
      "DOCX 파일 시그니처를 확인할 수 없습니다.",
      400,
      "RESUME_FILE_SIGNATURE_INVALID"
    );
  }
}

function normalizeExtractedText(
  value: string
): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function validateExtractedText(
  value: string
): string {
  const text = normalizeExtractedText(value);

  if (!text) {
    throw new ResumeFileExtractionError(
      "파일에서 분석할 수 있는 텍스트를 찾지 못했습니다. 스캔 이미지 PDF라면 텍스트 이력서를 사용해주세요.",
      422,
      "RESUME_FILE_TEXT_EMPTY"
    );
  }

  if (text.length > MAX_RESUME_LENGTH) {
    throw new ResumeFileExtractionError(
      "파일에서 추출된 이력서 텍스트가 너무 깁니다. 40,000자 이하의 이력서를 사용해주세요.",
      413,
      "RESUME_FILE_TEXT_TOO_LONG"
    );
  }

  return text;
}

async function extractPdfText(
  bytes: Uint8Array
): Promise<string> {
  assertPdfSignature(bytes);

  const {
    getDocument,
  } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const loadingTask = getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  });

  const document = await loadingTask.promise;

  try {
    if (document.numPages > MAX_RESUME_PDF_PAGES) {
      throw new ResumeFileExtractionError(
        `PDF 이력서는 ${MAX_RESUME_PDF_PAGES}페이지 이하만 업로드할 수 있습니다.`,
        413,
        "RESUME_PDF_TOO_MANY_PAGES"
      );
    }

    const pageTexts: string[] = [];

    for (
      let pageNumber = 1;
      pageNumber <= document.numPages;
      pageNumber += 1
    ) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      const text = content.items
        .map((item) => {
          if (
            typeof item === "object" &&
            item !== null &&
            "str" in item &&
            typeof item.str === "string"
          ) {
            return item.str;
          }

          return "";
        })
        .filter(Boolean)
        .join(" ");

      if (text.trim()) {
        pageTexts.push(text.trim());
      }
    }

    return pageTexts.join("\n\n");
  } finally {
    await document.destroy();
  }
}

async function extractDocxText(
  bytes: Uint8Array
): Promise<string> {
  assertDocxSignature(bytes);

  const mammothModule =
    await import("mammoth");

  const mammoth =
    mammothModule.default ?? mammothModule;

  const result = await mammoth.extractRawText({
    buffer: Buffer.from(bytes),
  });

  return result.value;
}

function extractPlainText(
  bytes: Uint8Array
): string {
  return new TextDecoder("utf-8", {
    fatal: false,
  }).decode(bytes);
}

export async function extractResumeTextFromFile(
  file: ResumeUploadFile
): Promise<ResumeFileExtractionResult> {
  const fileName = normalizeFileName(file.name);

  if (!fileName) {
    throw new ResumeFileExtractionError(
      "업로드 파일 이름을 확인할 수 없습니다.",
      400,
      "RESUME_FILE_NAME_REQUIRED"
    );
  }

  if (
    !Number.isFinite(file.size) ||
    file.size <= 0
  ) {
    throw new ResumeFileExtractionError(
      "비어 있는 파일은 업로드할 수 없습니다.",
      400,
      "RESUME_FILE_EMPTY"
    );
  }

  if (file.size > MAX_RESUME_FILE_BYTES) {
    throw new ResumeFileExtractionError(
      "이력서 파일은 8MB 이하만 업로드할 수 있습니다.",
      413,
      "RESUME_FILE_TOO_LARGE"
    );
  }

  const kind = resolveFileKind(
    fileName,
    file.type || ""
  );

  let bytes: Uint8Array;

  try {
    bytes = new Uint8Array(
      await file.arrayBuffer()
    );
  } catch (error) {
    console.error(
      "Resume file read failed:",
      error
    );

    throw new ResumeFileExtractionError(
      "이력서 파일을 읽을 수 없습니다.",
      400,
      "RESUME_FILE_READ_FAILED"
    );
  }

  if (bytes.byteLength !== file.size) {
    throw new ResumeFileExtractionError(
      "업로드 파일 크기 정보가 일치하지 않습니다.",
      400,
      "RESUME_FILE_SIZE_MISMATCH"
    );
  }

  let extractedText: string;

  try {
    if (kind === "PDF") {
      extractedText = await extractPdfText(bytes);
    } else if (kind === "DOCX") {
      extractedText = await extractDocxText(bytes);
    } else {
      extractedText = extractPlainText(bytes);
    }
  } catch (error) {
    if (error instanceof ResumeFileExtractionError) {
      throw error;
    }

    console.error(
      "Resume file extraction failed:",
      error
    );

    throw new ResumeFileExtractionError(
      "이력서 파일에서 텍스트를 추출하지 못했습니다.",
      422,
      "RESUME_FILE_EXTRACTION_FAILED"
    );
  }

  const text = validateExtractedText(
    extractedText
  );

  return {
    fileName,
    kind,
    text,
    extractedCharacters: text.length,
  };
}
