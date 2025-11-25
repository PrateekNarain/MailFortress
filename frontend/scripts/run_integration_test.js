// Simple integration test script that calls the backend endpoints directly
// Use the built-in global `fetch` available in Node 18+

async function run() {
  try {
    console.log('Calling backend /health...');
    const h = await fetch('http://localhost:3001/health');
    console.log('/health status', h.status);

    console.log('Calling /llm/process-email with a short sample...');
    const p = await fetch('http://localhost:3001/llm/process-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailBody: 'Please schedule a meeting next week and prepare the report.', categorizationPrompt: 'Categorize: work|personal', actionItemPrompt: 'List action items with owner and due date', schema: null })
    });
    console.log('/llm/process-email status', p.status);
    const pj = await p.json().catch(() => null);
    console.log('Process result:', pj);

    console.log('Calling /llm/chat sample...');
    const c = await fetch('http://localhost:3001/llm/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailBody: 'Hi, can you review this?', chatInstruction: 'Be concise', userQuery: 'Summarize' })
    });
    console.log('/llm/chat status', c.status);
    const cj = await c.json().catch(() => null);
    console.log('Chat result:', cj);

    console.log('Integration test complete');
    process.exit(0);
  } catch (err) {
    console.error('Integration test failed:', err);
    process.exit(1);
  }
}

run();
