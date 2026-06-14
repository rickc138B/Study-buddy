require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

(async () => {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY },
    body: JSON.stringify({ model: 'openai/text-embedding-3-small', input: ['Compare candidates positions on education'] }),
  });
  const vec = (await res.json()).data[0].embedding;

  const { data: chunks } = await c.rpc('match_domain_chunks', {
    p_domain_id: '1fccae5b-a8e0-415f-ad54-ac2070764a51',
    p_embedding: vec,
    p_match_count: 5,
    p_threshold: 0.1
  });

  console.log('chunks:', chunks?.length);
  chunks?.forEach(ch => console.log('---\nsource:', ch.metadata?.source_file, '\nsnippet:', ch.content?.slice(0, 150)));
})();
