export async function createUser(supabase, id) {
  const { data, error } = await supabase.from('users').upsert({ id }, { onConflict: 'id' }).select().single();
  if (error) throw new Error(`createUser failed: ${error.message}`);
  return data;
}

export async function getUser(supabase, id) {
  const { data } = await supabase.from('users').select('id').eq('id', id).maybeSingle();
  return data ?? null;
}

export async function getThreadsForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('conversations').select('*').eq('user_id', userId).order('last_active', { ascending: false });
  if (error) throw new Error(`getThreadsForUser failed: ${error.message}`);
  return data ?? [];
}

export async function createThread(supabase, userId, { uiVariant = null, openaiThreadId = null } = {}) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, ui_variant: uiVariant, openai_thread_id: openaiThreadId })
    .select().single();
  if (error) throw new Error(`createThread failed: ${error.message}`);
  return data;
}

export async function deleteThread(supabase, userId, conversationId) {
  const { error } = await supabase.from('conversations').delete().eq('user_id', userId).eq('id', conversationId);
  if (error) throw new Error(`deleteThread failed: ${error.message}`);
}

export async function touchThread(supabase, conversationId) {
  await supabase.from('conversations').update({ last_active: new Date().toISOString() }).eq('id', conversationId);
}
