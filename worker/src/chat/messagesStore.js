// Supabase persistence for chat messages (Track C).
//
// The conversation UNIT is a Supabase `conversations` row (its UUID). Message CONTENT
// lives in the `messages` table (no OpenAI threads). Only 'user'/'assistant' rows are
// persisted — the `role` check constraint forbids 'tool'/'system', which exist only in
// the in-memory array fed to the model each turn.
//
// Schema (data/sql/schema.sql, messages): conversation_id, role, content (default ''),
// tool_call_name, metadata jsonb (default '{}'), response_id, created_at (default now()).

export async function insertUserMessage(sb, convId, content) {
  const { data, error } = await sb
    .from('messages')
    .insert({ conversation_id: convId, role: 'user', content })
    .select()
    .single();
  if (error) throw new Error(`insertUserMessage failed: ${error.message}`);
  return data;
}

export async function insertAssistantMessage(sb, convId, { content, metadata = {}, toolCallName = null, responseId = null }) {
  const { data, error } = await sb
    .from('messages')
    .insert({
      conversation_id: convId,
      role: 'assistant',
      content,
      tool_call_name: toolCallName,
      metadata,
      response_id: responseId,
    })
    .select()
    .single();
  if (error) throw new Error(`insertAssistantMessage failed: ${error.message}`);
  return data;
}

// Read all rows for a conversation, OLDEST→NEWEST (created_at ascending). The history
// builder consumes ascending; the SSE frame builder reverses to newest-first.
export async function listMessages(sb, convId) {
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`listMessages failed: ${error.message}`);
  return data ?? [];
}

// Map ascending Supabase rows to Chat Completions plain turns [{role, content}, ...].
// We replay prior assistant TEXT only (no tool_calls/tool rows) — matching how the old
// Assistants thread replayed: the user never saw raw tool JSON.
export function toHistory(rows) {
  return rows.map((r) => ({ role: r.role, content: r.content }));
}

// Statistics via the conversation_statistics RPC (single-row table). Returns the row
// mapped to the camelCase keys the old /chat/threads/statistics route returned, or null
// if the conversation has no messages.
export async function getStatistics(sb, convId) {
  const { data, error } = await sb.rpc('conversation_statistics', { p_cid: convId });
  if (error) throw new Error(`getStatistics failed: ${error.message}`);
  const row = data?.[0];
  if (!row || !row.message_count) return null;
  return {
    messageCount: row.message_count,
    userMessageCount: row.user_message_count,
    assistantMessageCount: row.assistant_message_count,
    wordCount: row.word_count,
    userWordCount: row.user_word_count,
    assistantWordCount: row.assistant_word_count,
    avgWordCount: row.avg_word_count,
    avgUserWordCount: row.avg_user_word_count,
    avgAssistantWordCount: row.avg_assistant_word_count,
    filterProductCount: row.filter_product_count,
    getProductCount: row.get_product_count,
    getProductReviewCount: row.get_product_review_count,
    duration: row.duration,
    avgDuration: row.avg_duration,
    avgUserResponseTime: row.avg_user_response_time,
    avgAssistantResponseTime: row.avg_assistant_response_time,
  };
}
