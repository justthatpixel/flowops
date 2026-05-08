/**
 * useInfraAI.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * AI hook for the Infrastructure Designer (Phase 8).
 *
 * Sends user messages to /api/ai/infra-chat with the current canvas state as
 * context (template, scale tier, components, liveStats).  Streams the response
 * via SSE and parses a JSON action block to apply canvas mutations.
 *
 * SUPPORTED AI ACTIONS (in ```json block at end of response)
 *   { "actions": [
 *     { "type": "setTemplate",  "templateId": "serverless" },
 *     { "type": "setScaleTier", "tier": 2 },
 *     { "type": "selectComponent", "id": "ecs-1" }
 *   ]}
 *
 * FALLBACK
 *   When the backend is unavailable, a local simulation runs:
 *   it recognises common intent keywords and applies the matching store action
 *   directly, then returns a descriptive response.
 *
 * EXPORTED
 *   sendInfraMessage(userMessage: string) — call from InfraAIPanel on submit
 */

import { useCallback } from 'react'
import { useAIStore } from '@/store/aiStore'
import { useInfraStore } from '@/store/infraStore'
import type { ArchTemplateId, ScaleTierIndex } from '@/types/infra'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// ─── Action types the AI can return ──────────────────────────────────────────

type InfraAction =
  | { type: 'setTemplate';     templateId: ArchTemplateId }
  | { type: 'setScaleTier';    tier: ScaleTierIndex }
  | { type: 'selectComponent'; id: string }

function parseActions(text: string): InfraAction[] {
  const match = text.match(/```json\s*([\s\S]*?)```/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[1]) as { actions?: InfraAction[] }
    return Array.isArray(parsed.actions) ? parsed.actions : []
  } catch {
    return []
  }
}

function applyActions(actions: InfraAction[], store: ReturnType<typeof useInfraStore.getState>) {
  for (const action of actions) {
    switch (action.type) {
      case 'setTemplate':
        store.setTemplate(action.templateId)
        break
      case 'setScaleTier':
        store.setScaleTier(action.tier)
        break
      case 'selectComponent':
        store.selectComponent(action.id)
        break
    }
  }
}

// ─── Local fallback simulation ─────────────────────────────────────────────
// Recognises common intent keywords and applies canvas mutations directly,
// so the AI panel is useful even without a backend connection.

interface FallbackResult {
  text: string
  actions: InfraAction[]
}

function localFallback(
  message: string,
  store: ReturnType<typeof useInfraStore.getState>,
): FallbackResult {
  const m = message.toLowerCase()

  // Template switching
  if (m.includes('serverless') || m.includes('lambda') && m.includes('only')) {
    return {
      text: "Switched to the **Serverless** template — API Gateway → Lambda → DynamoDB. No servers to manage, scales to zero, perfect for event-driven APIs.",
      actions: [{ type: 'setTemplate', templateId: 'serverless' }],
    }
  }
  if (m.includes('microservice') || m.includes('micro service')) {
    return {
      text: "Switched to the **Microservices** template — multiple ECS services behind an ALB with an SQS event bus and per-service databases.",
      actions: [{ type: 'setTemplate', templateId: 'microservices' }],
    }
  }
  if (m.includes('web app') || m.includes('webapp') || m.includes('web-app') || m.includes('three tier') || m.includes('3-tier')) {
    return {
      text: "Switched to the **Web App** template — classic 3-tier: ALB → ECS Fargate → RDS Postgres with ElastiCache Redis.",
      actions: [{ type: 'setTemplate', templateId: 'web-app' }],
    }
  }
  if (m.includes('ml') || m.includes('machine learning') || m.includes('inference')) {
    return {
      text: "Switched to the **ML Inference** template — Lambda for sync inference + ECS GPU batch workers + S3 model registry + ElastiCache for results.",
      actions: [{ type: 'setTemplate', templateId: 'ml-inference' }],
    }
  }
  if (m.includes('static') || m.includes('cdn') && m.includes('s3')) {
    return {
      text: "Switched to the **Static + API** template — CloudFront → S3 for the frontend, API Gateway → Lambda → DynamoDB for the backend.",
      actions: [{ type: 'setTemplate', templateId: 'static-api' }],
    }
  }
  if (m.includes('worker') || m.includes('queue') && m.includes('api')) {
    return {
      text: "Switched to the **API + Workers** template — API Server produces jobs into SQS, worker fleet consumes them with a Dead Letter Queue for failures.",
      actions: [{ type: 'setTemplate', templateId: 'api-workers' }],
    }
  }

  // Scale tier switching
  if (m.includes('dev') || m.includes('hobby') || m.includes('prototype') || m.includes('smallest')) {
    return {
      text: `Scaled down to **Dev / Hobby** (Tier 0) — 10 users, ~$18/mo. Great for prototyping and development.`,
      actions: [{ type: 'setScaleTier', tier: 0 }],
    }
  }
  if (m.includes('startup') || m.includes('1k') || m.includes('1,000 user')) {
    return {
      text: `Set to **Early Startup** (Tier 1) — 1k users, ~$120/mo. Adds CloudFront CDN and basic redundancy.`,
      actions: [{ type: 'setScaleTier', tier: 1 }],
    }
  }
  if (m.includes('growing') || m.includes('10k') || m.includes('10,000 user')) {
    return {
      text: `Set to **Growing** (Tier 2) — 10k users, ~$340/mo. Adds ElastiCache Redis for session/query caching, SQS for async processing.`,
      actions: [{ type: 'setScaleTier', tier: 2 }],
    }
  }
  if (m.includes('scaling') || m.includes('100k') || m.includes('scale up') || m.includes('scale tier')) {
    return {
      text: `Set to **Scaling** (Tier 3) — 100k users, ~$1,240/mo. Adds WAF, Route 53, and multi-AZ databases. Watch the bottleneck warnings in StatsBar.`,
      actions: [{ type: 'setScaleTier', tier: 3 }],
    }
  }
  if (m.includes('enterprise') || m.includes('1m') || m.includes('1 million') || m.includes('production')) {
    return {
      text: `Set to **Enterprise** (Tier 4) — 1M users, ~$8,200/mo. Full Shield Advanced + WAF, multi-region S3, Route 53 failover, maximum auto-scaling.`,
      actions: [{ type: 'setScaleTier', tier: 4 }],
    }
  }

  // Cost / capacity questions
  if (m.includes('cost') || m.includes('price') || m.includes('expensive') || m.includes('cheap')) {
    const stats = store.liveStats
    return {
      text: `**Current estimated cost: ${stats.costLabel}/mo** (us-east-1, on-demand).\n\nTo reduce cost: scale down the tier, switch Lambda-based templates (serverless is typically much cheaper at low traffic), or switch to Spot capacity for ECS. The biggest cost drivers are usually RDS and NAT Gateways.`,
      actions: [],
    }
  }
  if (m.includes('bottleneck') || m.includes('slow') || m.includes('performance') || m.includes('capacity')) {
    const stats = store.liveStats
    const bn = stats.bottleneck
    return {
      text: `**Headroom: ${stats.headroom}×** (${stats.headroomStatus})\n**Capacity: ${stats.reqLabel} req/min** (~${stats.userCount})\n\n${bn ? `⚠️ Bottleneck detected: ${bn}` : '✅ No bottlenecks detected at this scale.'}`,
      actions: [],
    }
  }
  if (m.includes('explain') || m.includes('what is') || m.includes('how does') || m.includes('describe')) {
    const { templateId, scaleTier } = store
    const TEMPLATE_LABELS: Record<string, string> = {
      'web-app': 'Web App (3-tier)', 'serverless': 'Serverless', 'microservices': 'Microservices',
      'api-workers': 'API + Workers', 'ml-inference': 'ML Inference', 'static-api': 'Static + API',
    }
    const tierLabels = ['Dev/Hobby', 'Early Startup', 'Growing', 'Scaling', 'Enterprise']
    return {
      text: `**Current Architecture: ${TEMPLATE_LABELS[templateId] ?? templateId}** at **${tierLabels[scaleTier]}** scale.\n\n${store.components.length} AWS services on the canvas. Estimated cost: ${store.liveStats.costLabel}/mo supporting ~${store.liveStats.userCount}.\n\nClick any service node to see its config form and adjust instance sizes. Use "Generate Terraform" in the top bar to export HCL.`,
      actions: [],
    }
  }

  // Default fallback
  return {
    text: `I can help you design your AWS infrastructure. Try asking me to:\n\n• **Switch templates** — "use serverless" or "switch to microservices"\n• **Change scale** — "scale to enterprise" or "set to startup tier"\n• **Explain** — "what's the bottleneck?" or "how much does this cost?"\n\nOr use the template picker and scale slider directly on the canvas.`,
    actions: [],
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInfraAI() {
  const { addMessage, appendToLast, setStreaming } = useAIStore()

  const sendInfraMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return

    addMessage('user', userMessage)
    addMessage('assistant', '')
    setStreaming(true)

    const store = useInfraStore.getState()

    // Build context payload for the backend
    const context = {
      templateId:   store.templateId,
      scaleTier:    store.scaleTier,
      componentCount: store.components.length,
      components:   store.components.map((c) => ({ id: c.id, type: c.type, label: c.label, config: c.config })),
      liveStats:    {
        costLabel:       store.liveStats.costLabel,
        reqLabel:        store.liveStats.reqLabel,
        headroom:        store.liveStats.headroom,
        headroomStatus:  store.liveStats.headroomStatus,
        bottleneck:      store.liveStats.bottleneck,
        userCount:       store.liveStats.userCount,
      },
    }

    try {
      const res = await fetch(`${API}/api/ai/infra-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''
      let fullText  = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk = JSON.parse(line.slice(6)) as string
              appendToLast(chunk)
              fullText += chunk
            } catch { /* ignore */ }
          }
          if (line.startsWith('event: done')) {
            const actions = parseActions(fullText)
            applyActions(actions, store)
            setStreaming(false)
            return
          }
        }
      }

      const actions = parseActions(fullText)
      applyActions(actions, store)
      setStreaming(false)
    } catch {
      // Backend unavailable — run local simulation
      const { text, actions } = localFallback(userMessage, store)

      // Stream the response character by character for a typing effect
      const words = text.split(' ')
      for (let i = 0; i < words.length; i++) {
        await new Promise<void>((r) => setTimeout(r, 18))
        appendToLast((i === 0 ? '' : ' ') + words[i])
      }

      applyActions(actions, useInfraStore.getState())
      setStreaming(false)
    }
  }, [addMessage, appendToLast, setStreaming])

  return { sendInfraMessage }
}
