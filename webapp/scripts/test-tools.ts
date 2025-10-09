/**
 * Test Script for AI Agent Tools
 * Run: npm run test-tools
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local explicitly
config({ path: resolve(__dirname, '../.env.local') });

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables!');
  console.error('Make sure .env.local has:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create a simple Supabase client (for testing - no auth needed)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...\n');

  try {
    // Test 1: Basic connection - fetch sessions
    console.log('📊 Test 1: Fetching sessions from database...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, student_id, created_at')
      .limit(5);

    if (sessionsError) {
      console.error('❌ Failed to fetch sessions:', sessionsError.message);
      return false;
    }

    console.log(`✅ Found ${sessions?.length || 0} sessions`);
    if (sessions && sessions.length > 0) {
      console.log('   Sample session:', sessions[0]);
    }

    // Get a student ID for testing
    const testStudentId = sessions?.[0]?.student_id;
    if (!testStudentId) {
      console.warn('⚠️  No sessions found in database. Cannot test further.');
      return false;
    }

    console.log(`\n🧪 Using student_id for tests: ${testStudentId}\n`);

    // Test 2: SQL Function - get_recent_lessons
    console.log('📊 Test 2: Testing get_recent_lessons() SQL function...');
    const { data: recentLessons, error: recentError } = await supabase.rpc(
      'get_recent_lessons',
      {
        p_student_id: testStudentId,
        p_limit: 3,
      }
    );

    if (recentError) {
      console.error('❌ SQL function failed:', recentError.message);
      console.error('   This might mean:');
      console.error('   1. The function does not exist in the database');
      console.error('   2. Run the migration: npx supabase db push');
      return false;
    }

    console.log(`✅ get_recent_lessons() returned ${recentLessons?.length || 0} lessons`);

    // Test 3: Check for embeddings
    console.log('\n📊 Test 3: Checking for vector embeddings...');
    const { data: embeddedSessions, error: embeddingError } = await supabase
      .from('sessions')
      .select('id, embeddings_generated_at, embedding_model')
      .not('summary_embedding', 'is', null)
      .limit(3);

    if (embeddingError) {
      console.error('❌ Failed to check embeddings:', embeddingError.message);
      return false;
    }

    console.log(`✅ Found ${embeddedSessions?.length || 0} sessions with embeddings`);
    if (embeddedSessions && embeddedSessions.length > 0) {
      console.log('   Sample:', embeddedSessions[0]);
    } else {
      console.warn('⚠️  No embeddings found. RAG search will not work.');
      console.warn('   Run: npm run generate-embeddings');
    }

    // Test 4: Try hybrid_search_lessons function
    console.log('\n📊 Test 4: Testing hybrid_search_lessons() SQL function...');

    // Create a dummy embedding (1536 dimensions of 0.1)
    const dummyEmbedding = Array(1536).fill(0.1);

    const { data: searchResults, error: searchError } = await supabase.rpc(
      'hybrid_search_lessons',
      {
        p_student_id: testStudentId,
        p_query_embedding: dummyEmbedding,
        p_match_threshold: 0.1,
        p_match_count: 3,
      }
    );

    if (searchError) {
      console.error('❌ hybrid_search_lessons() failed:', searchError.message);
      console.error('   This function is needed for RAG search');
      return false;
    }

    console.log(`✅ hybrid_search_lessons() returned ${searchResults?.length || 0} results`);

    console.log('\n✅ All tests passed! Database is ready for the agent.\n');
    return true;
  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
    return false;
  }
}

// Run tests
testDatabaseConnection().then((success) => {
  if (success) {
    console.log('🎉 Ready to test the AI agent at /ai-test\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Fix the issues above before testing the agent.\n');
    process.exit(1);
  }
});
