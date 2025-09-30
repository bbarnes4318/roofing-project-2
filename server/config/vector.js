const ensureVectorSchema = async (prisma) => {
  try {
    // Enable pgvector extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Check if embeddings table exists and has the correct structure
    const tableCheck = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'embeddings' AND column_name = 'embedding';
    `);

    // Only create vector index if the embedding column is actually a vector type
    if (tableCheck && tableCheck.length > 0 && tableCheck[0].data_type === 'USER-DEFINED') {
      // Helpful indexes - only create if embedding is a vector type
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
      console.log('✅ Vector index created on embeddings table');
    } else {
      console.log('ℹ️ Embeddings table uses text storage - skipping vector index creation');
    }

    // Create indexes on existing columns (document_id and asset_id from Prisma schema)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS embeddings_document_idx ON embeddings (document_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS embeddings_asset_idx ON embeddings (asset_id);`);

    return true;
  } catch (err) {
    console.error('❌ Failed to ensure pgvector schema:', err?.message || err);
    return false;
  }
};

module.exports = { ensureVectorSchema };
