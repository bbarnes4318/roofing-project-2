const { getS3 } = require('../config/spaces');
const { prisma } = require('../config/prisma');
const EmbeddingService = require('./EmbeddingService');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const pdfParse = require('pdf-parse');
const { XMLParser } = require('fast-xml-parser');

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

class IngestionService {
  constructor() {
    this.s3 = getS3();
    this.bucket = process.env.DO_SPACES_NAME;
  }

  async getObjectBuffer(key) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.s3.send(cmd);
    const buf = await streamToBuffer(res.Body);
    return buf;
  }

  async extractPdfPages(buffer) {
    // Preferred: pdfjs-dist per-page extraction
    try {
      // Lazy-load to avoid hard dependency
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/legacy/build/pdf.worker.js');
      } catch (_) {}
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const pages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        const pageText = textContent.items.map((t) => t.str).join(' ').replace(/\s+/g, ' ').trim();
        pages.push({ page: i, text: pageText });
      }
      return pages;
    } catch (e) {
      console.warn('⚠️ pdfjs-dist not available or failed; falling back to pdf-parse combined text. Error:', e?.message || e);
      try {
        const data = await pdfParse(buffer);
        const combined = String(data.text || '').trim();
        // Fallback: single-page entry with combined text
        return combined ? [{ page: 1, text: combined }] : [];
      } catch (err) {
        console.error('❌ PDF parse failed:', err?.message || err);
        return [];
      }
    }
  }

  async ocrImageBuffer(buffer) {
    try {
      const Tesseract = require('tesseract.js');
      const langs = process.env.OCR_LANGS || 'eng';
      const { data } = await Tesseract.recognize(buffer, langs);
      const text = String(data?.text || '').replace(/\s+/g, ' ').trim();
      return text;
    } catch (e) {
      console.warn('⚠️ OCR skipped (tesseract.js not installed or failed):', e?.message || e);
      return '';
    }
  }

  async extractText({ key, mimeType }) {
    try {
      const buf = await this.getObjectBuffer(key);
      if (mimeType === 'application/pdf') {
        const pages = await this.extractPdfPages(buf);
        return pages.map((p) => p.text).join('\n\n');
      }
      if (mimeType?.startsWith('text/')) {
        return buf.toString('utf8');
      }
      if (mimeType?.includes('xml')) {
        const parser = new XMLParser({ ignoreAttributes: false });
        const obj = parser.parse(buf.toString('utf8'));
        return JSON.stringify(obj).slice(0, 50000);
      }
      if (mimeType?.startsWith('image/')) {
        // OCR for images if available
        const text = await this.ocrImageBuffer(buf);
        return text;
      }
      // Others: no content
      return '';
    } catch (err) {
      console.error('❌ Ingestion extractText error:', err?.message || err);
      return '';
    }
  }

  async processFile({ documentId, projectId, key, mimeType }) {
    try {
      // 1) Extract page-aware content
      const buf = await this.getObjectBuffer(key);
      let pageEntries = [];
      if (mimeType === 'application/pdf') {
        pageEntries = await this.extractPdfPages(buf); // [{page, text}]
      } else if (mimeType?.startsWith('image/')) {
        const text = await this.ocrImageBuffer(buf);
        if (text) pageEntries = [{ page: 1, text }];
      } else if (mimeType?.startsWith('text/')) {
        const text = buf.toString('utf8');
        if (text) pageEntries = [{ page: 1, text }];
      } else if (mimeType?.includes('xml')) {
        const parser = new XMLParser({ ignoreAttributes: false });
        const obj = parser.parse(buf.toString('utf8'));
        const text = JSON.stringify(obj).slice(0, 50000);
        if (text) pageEntries = [{ page: 1, text }];
      }

      // 2) Index embeddings (page-aware)
      if (pageEntries.length > 0) {
        const baseMeta = { mimeType, key };
        await EmbeddingService.indexPageChunks({
          projectId,
          fileId: documentId,
          pages: pageEntries,
          baseMetadata: baseMeta,
        });
      }

      // 3) Update document processed status (we lack explicit field; set lastDownloadedAt as a heartbeat)
      await prisma.document.update({
        where: { id: documentId },
        data: { lastDownloadedAt: new Date() }
      });

      return { success: true };
    } catch (err) {
      console.error('❌ Ingestion processFile error:', err?.message || err);
      return { success: false, error: err?.message || String(err) };
    }
  }
}

module.exports = new IngestionService();
