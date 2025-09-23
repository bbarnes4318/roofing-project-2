const OpenAI = require('openai');
const { prisma } = require('../config/prisma');

class EmbeddingService {
  constructor() {
    const apiKey = (process.env.OPENAI_API_KEY || '').trim();
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.model = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  // Remove null bytes and problematic control characters, normalize whitespace
  sanitizeText(input) {
    if (!input) return '';
    return String(input)
      .replace(/\u0000/g, ' ')            // strip null bytes
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, ' ') // control chars except tab/newline
      .replace(/\r\n?/g, '\n')
      .replace(/[\t\v\f]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  chunk(text, chunkTokens = 900, overlapTokens = 150) {
    const clean = this.sanitizeText(text || '');
    const sentences = clean.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';
    const approxTokens = (s) => Math.ceil(String(s).length / 4);

    for (const sentence of sentences) {
      const potential = current ? current + ' ' + sentence : sentence;
      if (approxTokens(potential) > chunkTokens && current) {
        chunks.push(current.trim());
        // overlap
        const overlap = current.split(' ').slice(-overlapTokens).join(' ');
        current = overlap + ' ' + sentence;
      } else {
        current = potential;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks;
  }

  async embedTexts(texts) {
    if (!this.client) throw new Error('OpenAI not configured');
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }

  async upsertEmbeddings({ projectId, fileId, chunks, metagen = {} }) {
    // Insert using raw SQL for speed
    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      // NOTE: Use prisma.$executeRawUnsafe to parameterize JSON properly
      await prisma.$executeRawUnsafe(
        `INSERT INTO embeddings (project_id, file_id, chunk_id, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
        projectId || null,
        fileId || null,
        `${i}`,
        content,
        JSON.stringify(metagen),
        // embedding supplied separately; we'll replace with parameter after creating embedding
        []
      );
    }
  }

  async indexText({ projectId, fileId, text, metadata = {} }) {
    const chunks = this.chunk(text).map((c) => this.sanitizeText(c));
    if (chunks.length === 0) return 0;
    const vectors = await this.embedTexts(chunks);

    for (let i = 0; i < chunks.length; i++) {
      const embeddingArray = vectors[i];
      const vectorLiteral = `'[${embeddingArray.join(',')}]'::vector`;
      // Use string interpolation only for the vector literal; parameters for the rest
      await prisma.$executeRawUnsafe(
        `INSERT INTO embeddings (project_id, file_id, chunk_id, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5::jsonb, ${vectorLiteral})`,
        projectId || null,
        fileId || null,
        `${i}`,
        this.sanitizeText(chunks[i]),
        JSON.stringify(metadata)
      );
    }
    return chunks.length;
  }

  /**
   * Index page-aware chunks. Pages: [{ page: number, text: string }]
   * baseMetadata will be merged into each chunk's metadata along with { page }
   */
  async indexPageChunks({ projectId, fileId, pages = [], baseMetadata = {} }) {
    // Build chunk list with page tags
    const chunkTexts = [];
    const chunkMeta = [];
    for (const p of pages) {
      const perPageChunks = this.chunk(p.text);
      for (let i = 0; i < perPageChunks.length; i++) {
        chunkTexts.push(this.sanitizeText(perPageChunks[i]));
        chunkMeta.push({ ...baseMetadata, page: p.page, pageChunk: i + 1 });
      }
    }
    if (chunkTexts.length === 0) return 0;

    const vectors = await this.embedTexts(chunkTexts);
    for (let i = 0; i < chunkTexts.length; i++) {
      const embeddingArray = vectors[i];
      const vectorLiteral = `'[${embeddingArray.join(',')}]'::vector`;
      const page = chunkMeta[i].page;
      const pageChunk = chunkMeta[i].pageChunk;
      const chunkId = `${page}-${pageChunk}`; // page-chunk index

      await prisma.$executeRawUnsafe(
        `INSERT INTO embeddings (project_id, file_id, chunk_id, content, metadata, embedding)
         VALUES ($1, $2, $3, $4, $5::jsonb, ${vectorLiteral})`,
        projectId || null,
        fileId || null,
        chunkId,
        this.sanitizeText(chunkTexts[i]),
        JSON.stringify(chunkMeta[i])
      );
    }
    return chunkTexts.length;
  }

  async semanticSearch({ projectId, query, topK = 8 }) {
    if (!this.client) throw new Error('OpenAI not configured');
    const q = await this.embedTexts([query]);
    const qvec = q[0];
    const vectorLiteral = `'[${qvec.join(',')}]'::vector`;
    const whereProject = projectId ? `WHERE project_id = $1` : '';
    const rows = projectId
      ? await prisma.$queryRawUnsafe(
          `SELECT file_id, chunk_id, content, metadata, 1 - (embedding <=> ${vectorLiteral}) AS score
           FROM embeddings
           ${whereProject}
           ORDER BY embedding <=> ${vectorLiteral}
           LIMIT $2`,
          projectId,
          Number(topK)
        )
      : await prisma.$queryRawUnsafe(
          `SELECT file_id, chunk_id, content, metadata, 1 - (embedding <=> ${vectorLiteral}) AS score
           FROM embeddings
           ORDER BY embedding <=> ${vectorLiteral}
           LIMIT $1`,
          Number(topK)
        );
    return rows.map((r) => ({
      fileId: r.file_id,
      chunkId: r.chunk_id,
      snippet: r.content?.slice(0, 500) || '',
      score: Number(r.score || 0),
      metadata: r.metadata || {}
    }));
  }
}

module.exports = new EmbeddingService();
