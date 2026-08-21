const SUPABASE_URL = 'https://ftriqhglcljmloaqgtgr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1frnpoJWFAb9cfA93-ejEw_IGbHgNNt';

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);