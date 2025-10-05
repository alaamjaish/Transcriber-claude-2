/**
 * Embedding Generation Script
 *
 * This script generates embeddings for all sessions that don't have them yet.
 *
 * Usage:
 *   npx tsx scripts/generate-embeddings.ts
 *
 * Environment variables required:
 *   - OPENAI_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding, prepareCombinedContent } from '../src/lib/ai/embeddings';

// Load .env.local explicitly
config({ path: resolve(__dirname, '../.env.local') });

// Check required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('Failed to load OPENAI_API_KEY from .env.local');
  throw new Error('OPENAI_API_KEY is required');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

// Initialize Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

interface SessionToEmbed {
  id: string;
  summary_md: string | null;
  homework_md: string | null;
  created_at: string;
}

async function main() {
  console.log('🚀 Starting embedding generation...\n');

  // Step 1: Fetch sessions needing embeddings
  console.log('📋 Fetching sessions without embeddings...');
  const { data: sessions, error: fetchError } = await supabase
    .rpc('get_sessions_needing_embeddings');

  if (fetchError) {
    console.error('❌ Error fetching sessions:', fetchError);
    process.exit(1);
  }

  if (!sessions || sessions.length === 0) {
    console.log('✅ All sessions already have embeddings!');
    process.exit(0);
  }

  console.log(`📊 Found ${sessions.length} sessions needing embeddings\n`);

  // Step 2: Process each session
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i] as SessionToEmbed;
    const progress = `[${i + 1}/${sessions.length}]`;

    console.log(`${progress} Processing session ${session.id.slice(0, 8)}...`);

    try {
      // Prepare combined content
      const combinedContent = prepareCombinedContent(
        session.summary_md,
        session.homework_md
      );

      if (!combinedContent.trim()) {
        console.log(`${progress} ⚠️  Skipping - no content to embed`);
        continue;
      }

      // Generate embeddings
      const summaryEmbedding = session.summary_md?.trim()
        ? await generateEmbedding(session.summary_md)
        : null;

      const homeworkEmbedding = session.homework_md?.trim()
        ? await generateEmbedding(session.homework_md)
        : null;

      // Update session in database
      const { error: updateError } = await supabase
        .from('sessions')
        .update({
          summary_embedding: summaryEmbedding,
          homework_embedding: homeworkEmbedding,
          combined_content: combinedContent,
          embeddings_generated_at: new Date().toISOString(),
          embedding_model: 'text-embedding-3-small',
        })
        .eq('id', session.id);

      if (updateError) {
        console.error(`${progress} ❌ Error updating:`, updateError.message);
        errorCount++;
        continue;
      }

      console.log(`${progress} ✅ Success`);
      successCount++;

      // Small delay to avoid rate limits (optional)
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`${progress} ❌ Error:`, error instanceof Error ? error.message : error);
      errorCount++;
    }
  }

  // Step 3: Summary
  console.log('\n📊 SUMMARY:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📈 Total: ${sessions.length}`);

  // Step 4: Verify
  console.log('\n🔍 Verifying embeddings...');
  const { count, error: countError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .not('summary_embedding', 'is', null);

  if (!countError && count !== null) {
    console.log(`✅ ${count} sessions now have embeddings`);
  }

  console.log('\n🎉 Done!');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
