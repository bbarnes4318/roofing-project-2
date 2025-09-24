#!/usr/bin/env node
/**
 * Setup Vapi Custom Knowledge Base and attach it to an Assistant.
 *
 * Reads configuration from environment variables and/or CLI flags:
 * - VAPI_API_KEY (required)
 * - VAPI_WEBHOOK_SECRET (required unless --secret provided)
 * - REACT_APP_VAPI_ASSISTANT_ID (optional unless --assistant-id provided)
 * - PUBLIC_API_BASE (optional, used to build kb url if --kb-url not provided)
 *
 * CLI flags:
 *   --assistant-id <id>
 *   --kb-url <url> (default derived from PUBLIC_API_BASE or your prod URL)
 *   --secret <webhook_secret> (overrides env VAPI_WEBHOOK_SECRET)
 *
 * Example (PowerShell):
 *   $env:VAPI_API_KEY = "<YOUR_VAPI_API_KEY>"; \
 *   node server/scripts/setup-vapi-kb.js \
 *     --assistant-id 1ad2d156-7732-4f8b-97d3-41addce2d6a7 \
 *     --kb-url https://goldfish-app-4yuma.ondigitalocean.app/api/vapi/kb/search
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Load .env files similar to server startup
try {
  const dotenv = require('dotenv');
  const tryLoad = (p) => { if (fs.existsSync(p)) dotenv.config({ path: p }); };
  dotenv.config();
  tryLoad(path.resolve(__dirname, '..', '.env'));
  tryLoad(path.resolve(__dirname, '..', '..', '.env'));
  tryLoad(path.resolve(__dirname, '..', '..', '.env.backup'));
} catch (_) {}

function getArg(flag, fallback = undefined) {
  const i = process.argv.indexOf(flag);
  if (i !== -1 && i + 1 < process.argv.length) return process.argv[i + 1];
  return fallback;
}

(async () => {
  try {
    const apiKey = (process.env.VAPI_API_KEY || '').trim();
    if (!apiKey) {
      console.error('❌ VAPI_API_KEY not set. Set it in env before running.');
      process.exit(1);
    }

    const assistantId = getArg('--assistant-id', process.env.REACT_APP_VAPI_ASSISTANT_ID || '').trim();
    if (!assistantId) {
      console.error('❌ Assistant ID missing. Pass --assistant-id or set REACT_APP_VAPI_ASSISTANT_ID.');
      process.exit(1);
    }

    const defBase = process.env.PUBLIC_API_BASE || 'https://goldfish-app-4yuma.ondigitalocean.app';
    const kbUrl = getArg('--kb-url', `${defBase.replace(/\/$/, '')}/api/vapi/kb/search`).trim();
    const secret = (getArg('--secret') || process.env.VAPI_WEBHOOK_SECRET || '').trim();
    if (!secret) {
      console.error('❌ VAPI_WEBHOOK_SECRET missing. Pass --secret or set env VAPI_WEBHOOK_SECRET.');
      process.exit(1);
    }

    const client = axios.create({
      baseURL: 'https://api.vapi.ai',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 20000,
    });

    // 1) Create the Custom Knowledge Base
    console.log('🧠 Creating Custom Knowledge Base...');
    const kbRes = await client.post('/knowledge-base', {
      provider: 'custom-knowledge-base',
      server: { url: kbUrl, secret }
    });
    const kbId = kbRes.data?.id || kbRes.data?._id || kbRes.data?.knowledgeBase?.id;
    if (!kbId) {
      console.error('❌ Failed to obtain knowledge base ID from response:', kbRes.data);
      process.exit(1);
    }
    console.log('✅ KB created:', kbId);

    // 2) Fetch existing assistant to preserve full model
    console.log('🔍 Fetching assistant model...');
    const asstRes = await client.get(`/assistant/${assistantId}`);
    const assistant = asstRes.data || {};
    const model = assistant.model || {};
    const messages = Array.isArray(model.messages) ? model.messages : (assistant.messages || []);

    if (!messages || messages.length === 0) {
      console.warn('⚠️ Assistant has no messages; adding a minimal system prompt to satisfy API.');
    }

    // 3) Attach KB by patching full model object
    const nextModel = {
      ...model,
      knowledgeBaseId: kbId,
      // Ensure required fields exist
      model: model.model || 'gpt-4o',
      provider: model.provider || 'openai',
      messages: messages && messages.length > 0 ? messages : [
        { role: 'system', content: 'You are a helpful voice assistant. Use the knowledge base when the user asks about company documents.' }
      ],
    };

    console.log('🪄 Attaching KB to assistant...');
    await client.patch(`/assistant/${assistantId}`, { model: nextModel });
    console.log('✅ Assistant updated with knowledgeBaseId');

    console.log('\n🎉 Done. Your Vapi assistant will now call your custom KB at:', kbUrl);
    console.log('   KB ID:', kbId);
  } catch (err) {
    const data = err.response?.data; 
    console.error('❌ Setup failed:', err.message);
    if (data) console.error('🔍 Response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }
})();
