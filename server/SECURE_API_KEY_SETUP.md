# 🔐 SECURE OpenAI API Key Setup

## ⚠️ CRITICAL SECURITY STEPS

### 1. IMMEDIATELY Revoke Any Exposed Keys
If you've shared your API key anywhere (including in chat), revoke it immediately:
1. Go to https://platform.openai.com/api-keys
2. Find the exposed key
3. Click "Revoke key"
4. Generate a new key

### 2. Add Your NEW API Key Securely

**NEVER** commit your API key to version control!

Add to your `server/.env` file (this file is gitignored):
```env
OPENAI_API_KEY="sk-proj-your-new-key-here"
```

### 3. Verify .gitignore
Make sure `server/.env` is in your `.gitignore`:
```gitignore
server/.env
.env
```

### 4. Test the Integration
```bash
cd server
npm start
```

You should see:
```
✅ OpenAI service initialized successfully with GPT-4
```

## 📊 Available Models

The system is configured to use **GPT-4 Turbo** (fastest and most capable):
- `gpt-4-turbo-preview` - Latest GPT-4 Turbo model
- Cost-effective and fast
- 128k token context window

Note: GPT-5 doesn't exist yet. GPT-4 Turbo is currently the most advanced available model.

## 🔒 Security Best Practices

1. **Never share API keys** in code, chat, or emails
2. **Use environment variables** (.env files)
3. **Rotate keys regularly** (monthly recommended)
4. **Set usage limits** on OpenAI dashboard
5. **Monitor usage** for unusual activity

## 💰 Cost Management

Set up usage limits in OpenAI dashboard:
1. Go to https://platform.openai.com/account/limits
2. Set monthly budget
3. Set alert thresholds

Typical costs with GPT-4 Turbo:
- ~$0.01 per 1K input tokens
- ~$0.03 per 1K output tokens
- Average Bubbles conversation: ~$0.02-0.05

## ✅ Verification Checklist

- [ ] Old/exposed API key revoked
- [ ] New API key generated
- [ ] Key added to `server/.env` (NOT committed)
- [ ] `.gitignore` includes `.env`
- [ ] Server starts without errors
- [ ] Bubbles responds with OpenAI-powered answers

## 🚀 Ready!

Once configured, Bubbles will use GPT-4 Turbo for:
- Advanced natural language understanding
- Context-aware project insights
- Intelligent workflow automation
- Predictive analytics and recommendations