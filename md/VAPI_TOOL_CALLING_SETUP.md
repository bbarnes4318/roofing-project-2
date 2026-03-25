# VAPI.ai Tool Calling Setup Guide

## Current Implementation (Server-Side Tool Calling) ✅ **RECOMMENDED**

**You do NOT need to configure tools in VAPI.ai's dashboard** because we're using **Server URL mode**.

### How It Works:
1. VAPI.ai calls your server endpoint: `POST /api/vapi/assistant-query`
2. Your server (`vapi.js`) handles everything:
   - Receives the user's voice query
   - Calls OpenAI with tools included
   - Executes function calls server-side
   - Returns final response text
3. VAPI.ai speaks the response to the user

### VAPI Dashboard Configuration Required:
- **Assistant Model**: Configure your assistant to use a **Server URL** endpoint
- **Server URL**: `https://your-domain.com/api/vapi/assistant-query`
- **Authentication**: Ensure `X-VAPI-KEY` header matches your `VAPI_INTERNAL_KEY`
- **Tools**: ❌ **NOT NEEDED** - Your server handles all tool calling

### Benefits:
- ✅ All tool logic stays in your codebase
- ✅ Easier to update and maintain
- ✅ Consistent with chat interface
- ✅ Full control over tool execution

---

## Alternative: Native VAPI Tools (Optional)

If you want VAPI.ai to handle function calling natively, you would:

1. **Configure Tools in VAPI Dashboard**:
   - Go to your assistant in VAPI.ai dashboard
   - Add "Custom Tools" or "Server Tools"
   - For each tool, provide:
     - Tool name (e.g., `get_all_projects`)
     - Server URL (e.g., `https://your-domain.com/api/vapi/tools/get-all-projects`)
     - Authentication headers
     - Tool schema (parameters, descriptions)

2. **Create Tool Endpoints**:
   - Create separate endpoints for each tool: `/api/vapi/tools/get-all-projects`, `/api/vapi/tools/get-all-tasks`, etc.
   - Each endpoint handles one specific tool execution
   - Returns tool results in VAPI's expected format

3. **Update Assistant Model**:
   - VAPI will automatically call your tool endpoints when needed
   - Your `/api/vapi/assistant-query` endpoint would only handle non-tool queries

### Benefits:
- ✅ VAPI handles function calling flow
- ✅ Better debugging in VAPI dashboard
- ✅ Tools visible in VAPI UI

### Drawbacks:
- ❌ More complex setup
- ❌ Need to create separate endpoints for each tool
- ❌ Harder to maintain consistency with chat interface

---

## Recommendation: **Keep Current Server-Side Approach**

The current implementation where your server handles all tool calling is:
- ✅ **Simpler** - One endpoint handles everything
- ✅ **Consistent** - Same logic as chat interface
- ✅ **Easier to maintain** - All tool logic in one place
- ✅ **Already working** - No additional VAPI configuration needed

**No action needed in VAPI.ai dashboard** - your server handles everything!

---

## Verification Checklist

To verify tool calling is working for voice:

1. ✅ Your server has `/api/vapi/assistant-query` endpoint
2. ✅ Endpoint includes tools in OpenAI API call
3. ✅ Endpoint executes tools via `executeToolCall()` function
4. ✅ Endpoint handles follow-up calls with tool results
5. ✅ VAPI assistant is configured to call your server URL
6. ✅ Authentication (`VAPI_INTERNAL_KEY`) is configured

**Test:** Ask voice assistant: "What tasks are overdue?" 
- Should trigger `get_all_tasks` tool with `overdue: true`
- Should return concise voice response with results

