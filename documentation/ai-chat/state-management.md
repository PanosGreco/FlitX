# AI Chat — State Management

## State Ownership

All chat state is owned by the `useAIChat()` hook (instantiated in `AIAssistantLayout.tsx`):

| State | Type | Initial | Owner |
|-------|------|---------|-------|
| `messages` | `Message[]` | `[]` | useAIChat |
| `isLoading` | `boolean` | `false` | useAIChat |
| `error` | `string \| null` | `null` | useAIChat |
| `usage` | `{ used: number; limit: number }` | `{ used: 0, limit: 20 }` | useAIChat |
| `conversations` | `Conversation[]` | `[]` | useAIChat |
| `activeConversation` | `string \| null` | `null` | useAIChat |

Component-level state:

| State | Owner | Purpose |
|-------|-------|---------|
| `sidebarOpen` | AIAssistantLayout | Mobile sidebar toggle |
| Inline rename input | ChatSidebar | Per-conversation rename editing |

## Initialization Flow

On mount (when `user` becomes available):
1. `fetchConversations()` — queries `ai_chat_conversations` ordered by `updated_at DESC`
2. `fetchUsage()` — queries `ai_chat_usage` for today's date → sets `usage.used`

No conversation is auto-selected — user starts in empty state.

## Message Send Flow

```
sendMessage(content, presetType?)
│
├── Guard: if (!user) return
├── setIsLoading(true), setError(null)
├── Create userMessage object (id: crypto.randomUUID(), role: 'user')
├── OPTIMISTIC: setMessages(prev => [...prev, userMessage])
│
├── Build apiMessages from current messages + userMessage
│   → map to { role, content } objects
│
├── Get auth token from supabase.auth.getSession()
├── fetch(CHAT_URL) with POST body: { messages, conversationId, presetType, language }
│
├── IF response not OK:
│   ├── 429 + "Daily limit reached" → setError(limit msg), update usage, remove user msg
│   ├── 429 (other) → setError("AI is busy"), remove user msg
│   ├── 402 → setError("Service unavailable"), remove user msg
│   └── Other → throw Error
│
├── SSE STREAMING:
│   ├── Create ReadableStream reader
│   ├── Add empty assistant message to state (id: assistantId)
│   ├── Buffer string accumulates decoded chunks
│   ├── Parse line-by-line:
│   │   ├── Skip comments (`:`) and empty lines
│   │   ├── Extract `data: ` prefix → JSON string
│   │   ├── `[DONE]` → break
│   │   ├── Parse JSON → extract `choices[0].delta.content`
│   │   └── Append delta to assistantContent string
│   └── Update assistant message via setMessages on each delta
│
├── ASYNC SAVE (non-blocking):
│   ├── fetch(SAVE_URL) with { conversationId, userMessage, assistantMessage, title }
│   ├── IF new conversation → setActiveConversation(data.conversationId)
│   └── fetchConversations() to refresh sidebar list
│
├── Increment usage locally: setUsage(prev => ({ ...prev, used: prev.used + 1 }))
│
└── CATCH: setError(message), remove optimistic user msg
└── FINALLY: setIsLoading(false)
```

## SSE Buffer Parsing

The streaming parser handles partial JSON chunks:

```typescript
let buffer = '';
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });

  // Process complete lines
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    let line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    // Parse SSE data lines...
    try {
      const parsed = JSON.parse(jsonStr);
      // Extract delta content
    } catch {
      // Incomplete JSON → put back in buffer
      buffer = line + '\n' + buffer;
      break;
    }
  }
}
```

## Conversation Management State

### createNewChat()
- Clears `messages` → `[]`
- Clears `activeConversation` → `null`
- Clears `error` → `null`
- No database call — purely local state reset

### switchConversation(id)
- Sets `activeConversation` to `id`
- Clears `error`
- Fetches `ai_chat_messages` WHERE `conversation_id = id` ORDER BY `created_at ASC`
- Replaces entire `messages` array with fetched data

### deleteConversation(id)
- Deletes from `ai_chat_conversations` (cascade deletes messages)
- Removes from local `conversations` array
- If deleted conversation was active → triggers `createNewChat()`
- Toast: "Conversation deleted"

### renameConversation(id, newTitle)
- Updates `ai_chat_conversations.title` and `updated_at`
- Updates local `conversations` array in-place
- Toast: "Conversation renamed" / "Failed to rename conversation"

## Cross-Section State

- **No Supabase Realtime** — all state is local + manual fetch
- AI Chat does not subscribe to changes in `financial_records`, `vehicles`, etc.
- Data freshness: context is fetched on every message send → always uses latest data
- No shared state with other sections — AI Chat is fully self-contained
- `useAIChat` hook dependencies: `[user]` for effects, `[user, messages, activeConversation]` for sendMessage callback
