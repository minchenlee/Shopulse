// Thin wrappers over the OpenAI Assistants API.
//
// Logic is identical to the utility functions in the old Express backend
// (backend/routes/chat.js) — the only change is that the module-level `openai`
// client is now passed in as the first argument, because a Cloudflare Worker has
// no module-scope access to env/secrets (they arrive per-request on `c.env`).
//
// Track B keeps message CONTENT in OpenAI threads, so getMessages reads from
// OpenAI here. The flat product metadata is reattached on the SSE `messages`
// frame instead of via OpenAI message metadata — so no modifyMessage is needed.

// add message to the thread
export async function addMessageToThread(openai, threadId, textContent) {
  const message = await openai.beta.threads.messages.create(
    threadId,
    {
      role: 'user',
      content: textContent,
    }
  );

  if (!message) {
    throw new Error(`Failed to add message to thread, ${threadId}`);
  }
}

// run the message
export async function runMessage(openai, threadId, assistantId) {
  const run = await openai.beta.threads.runs.create(
    threadId,
    { assistant_id: assistantId }
  );

  if (!run) {
    throw new Error(`Failed to run message for thread ${threadId}`);
  }

  return run;
}

// check the run status
export async function checkRunStatus(openai, threadId, runId) {
  const run = await openai.beta.threads.runs.retrieve(threadId, runId);
  return run;
}

// submit tool outputs to run
export async function submitToolOutputs(openai, threadId, runId, toolOutputs) {
  const requestBody = {
    tool_outputs: toolOutputs,
  };

  const run = await openai.beta.threads.runs.submitToolOutputs(
    threadId,
    runId,
    requestBody
  );

  if (!run) {
    throw new Error(`Failed to submit tool outputs for thread ${threadId}`);
  }

  return run;
}

// get the messages
export async function getMessages(openai, threadId) {
  try {
    const limit = 100;
    let messages = await openai.beta.threads.messages.list(threadId, { limit: limit });

    // Check if there are more messages
    // if there are more messages, get the additional messages
    while (messages.body.has_more) {
      const additionalMessages = await openai.beta.threads.messages.list(
        threadId, {
        limit: limit,
        after: messages.body.last_id,
      });
      messages.body.data = [...messages.body.data, ...additionalMessages.body.data];
      messages.data = [...messages.data, ...additionalMessages.data];
      messages.body.has_more = additionalMessages.body.has_more;
      messages.body.last_id = additionalMessages.body.last_id;
    }
    return messages;
  } catch (error) {
    throw new Error(`Failed to retrieve messages for thread ${threadId}`);
  }
}
