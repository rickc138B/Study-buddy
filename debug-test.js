require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function test() {
  // Get a real embedding from a domain chunk
  const { data: chunk } = await sb
    .from('domain_chunks')
    .select('embedding')
    .eq('domain_id', '1fccae5b-a8e0-415f-ad54-ac2070764a51')
    .limit(1)
    .single();

  console.log('embedding type:', typeof chunk.embedding);
  console.log('embedding length:', chunk.embedding?.length);
  console.log('embedding sample:', JSON.stringify(chunk.embedding)?.slice(0, 80));

  // Test RPC with that same embedding
  const { data, error } = await sb.rpc('match_domain_chunks', {
    p_domain_id:   '1fccae5b-a8e0-415f-ad54-ac2070764a51',
    p_embedding:   chunk.embedding,
    p_match_count: 5,
    p_threshold:   0.10,
  });

  console.log('RPC results:', data?.length);
  console.log('RPC error:', error);
  console.log('first result:', data?.[0]?.content?.slice(0, 100));
}

test();
