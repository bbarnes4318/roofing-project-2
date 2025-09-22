// Enable pgvector extension and ensure embeddings schema
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Connected. Enabling pgvector and ensuring schema...');

    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);

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

    console.log('✅ pgvector enabled and embeddings schema ensured.');
  } catch (err) {
    console.error('❌ Failed to enable vector or ensure schema:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
