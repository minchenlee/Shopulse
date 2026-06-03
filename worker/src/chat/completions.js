// Chat Completions streaming + tool loop (Track C, Groq).
//
// Replaces the Assistants engine. Runs create → tool_calls → role:'tool' → create
// against an OpenAI-compatible Chat Completions endpoint until finish_reason 'stop'.
// Tool execution + metadata strip/reattach reuse toolRunner.js unchanged; the only
// adaptation is feeding tool results back as Chat Completions role:'tool' messages
// (tool_call_id + JSON content) instead of Assistants submit_tool_outputs.
//
// The ~80s wall-clock budget is enforced INCLUDING the final turn: the caller passes a
// `deadline` (absolute ms timestamp); a check before each create() throws a BudgetError
// so the route emits {type:'error'} and skips persistence/emit.

import { runToolCalls, splitToolResults } from './toolRunner.js';

export class BudgetError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BudgetError';
  }
}

// Merge streamed tool_call deltas by `index`. Groq sends id + function.name in the first
// delta for an index, then function.arguments chunked across following deltas — concatenate.
function accumulateToolCalls(acc, deltaToolCalls) {
  for (const d of deltaToolCalls) {
    const i = d.index;
    if (!acc[i]) acc[i] = { id: '', type: 'function', function: { name: '', arguments: '' } };
    if (d.id) acc[i].id = d.id;
    if (d.function?.name) acc[i].function.name += d.function.name;
    if (d.function?.arguments) acc[i].function.arguments += d.function.arguments;
  }
}

// Run one streamed create() turn; accumulate content + tool_calls, capture finish_reason
// and the response id. Returns { content, toolCalls, finishReason, responseId }.
async function runOneTurn(client, model, messages, tools) {
  const completion = await client.chat.completions.create({ model, messages, tools, stream: true });

  let content = '';
  const toolCallsAcc = [];
  let finishReason = null;
  let responseId = null;

  for await (const chunk of completion) {
    if (chunk.id) responseId = chunk.id;
    const choice = chunk.choices?.[0];
    if (!choice) continue;
    if (choice.delta?.content) content += choice.delta.content;
    if (choice.delta?.tool_calls) accumulateToolCalls(toolCallsAcc, choice.delta.tool_calls);
    if (choice.finish_reason) finishReason = choice.finish_reason;
  }

  // drop sparse holes left by the index-keyed accumulator
  const toolCalls = toolCallsAcc.filter(Boolean);
  return { content, toolCalls, finishReason, responseId };
}

// Run the full loop. `history` is the prior conversation as Chat Completions plain turns
// ([{role,content}]); `userMessage` is the new user text. Returns:
//   { finalText, responseId, toolMetadata } where toolMetadata is the merged
//   splitToolResults metadata accumulated across every tool turn.
export async function runChatCompletion(client, { model, systemPrompt, tools, history, userMessage, sb, deadline }) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  let toolMetadata = {};
  let responseId = null;

  // Loop guarded by the wall-clock deadline (covers the FINAL turn too): check before each
  // create() so a slow final turn can't run past the budget.
  while (true) {
    if (Date.now() > deadline) throw new BudgetError('Chat completion exceeded time budget');

    const turn = await runOneTurn(client, model, messages, tools);
    responseId = turn.responseId ?? responseId;

    if (turn.finishReason === 'tool_calls' && turn.toolCalls.length > 0) {
      const rawResults = await runToolCalls(sb, turn.toolCalls);
      const { modelOutputs, metadata } = splitToolResults(rawResults);
      toolMetadata = { ...toolMetadata, ...metadata };

      // append the assistant turn that requested the tools, then the tool results.
      messages.push({ role: 'assistant', content: turn.content || null, tool_calls: turn.toolCalls });
      for (const o of modelOutputs) {
        messages.push({ role: 'tool', tool_call_id: o.tool_call_id, content: o.output });
      }
      continue;
    }

    // finish_reason 'stop' (or any non-tool terminal) — done.
    return { finalText: turn.content, responseId, toolMetadata };
  }
}
