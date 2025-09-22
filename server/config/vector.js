const ensureVectorSchema = async (prisma) => {
  try {
    // Enable pgvector extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Create embeddings table if it doesn't exist
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS embeddings (
        id BIGSERIAL PRIMARY KEY,
        project_id TEXT,
        file_id TEXT,
        chunk_id TEXT,
        content TEXT,
        metadata JSONB,
        embedding VECTOR(1536)
      );
    `);

    // Annotations table for file versions/annotations
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS document_annotations (
        id BIGSERIAL PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        annotations JSONB
      );
    `);

    // Helpful indexes
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'embeddings_embedding_ivfflat_idx'
        ) THEN
          CREATE INDEX embeddings_embedding_ivfflat_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
        END IF;
      END$$;
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS embeddings_project_idx ON embeddings (project_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS embeddings_file_idx ON embeddings (file_id);`);

    return true;
  } catch (err) {
    console.error('❌ Failed to ensure pgvector schema:', err?.message || err);
    return false;
  }
};

module.exports = { ensureVectorSchema };
