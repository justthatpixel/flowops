import { create } from 'zustand'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIStore {
  messages: AIMessage[]
  isStreaming: boolean
  appContext: string
  sidebarOpen: boolean

  addMessage: (role: AIMessage['role'], content: string) => void
  appendToLast: (chunk: string) => void
  setStreaming: (v: boolean) => void
  setAppContext: (ctx: string) => void
  setSidebarOpen: (open: boolean) => void
  clearMessages: () => void
}

let _id = 0
const uid = () => String(++_id)

export const useAIStore = create<AIStore>((set) => ({
  messages: [],
  isStreaming: false,
  appContext: '',
  sidebarOpen: true,

  addMessage: (role, content) =>
    set((s) => ({
      messages: [...s.messages, { id: uid(), role, content }],
    })),

  appendToLast: (chunk) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length === 0) return s
      const last = msgs[msgs.length - 1]
      msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
      return { messages: msgs }
    }),

  setStreaming: (v) => set({ isStreaming: v }),
  setAppContext: (ctx) => set({ appContext: ctx }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  clearMessages: () => set({ messages: [] }),
}))
