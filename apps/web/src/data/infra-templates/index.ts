import type { ArchTemplateId, ScaleTierIndex, TierLayout } from '@/types/infra'
import { WEB_APP_TIERS }       from './webApp'
import { SERVERLESS_TIERS }    from './serverless'
import { MICROSERVICES_TIERS } from './microservices'
import { API_WORKERS_TIERS }   from './apiWorkers'
import { ML_INFERENCE_TIERS }  from './mlInference'
import { STATIC_API_TIERS }    from './staticApi'

export interface TemplateDefinition {
  id:          ArchTemplateId
  label:       string
  description: string
  icon:        string   // emoji used in the picker
  tiers:       Record<ScaleTierIndex, TierLayout>
}

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  {
    id:          'web-app',
    label:       'Web App',
    description: 'Classic web tier — ALB → ECS → RDS with optional CDN and cache layers.',
    icon:        '🌐',
    tiers:       WEB_APP_TIERS,
  },
  {
    id:          'serverless',
    label:       'Serverless',
    description: 'API Gateway + Lambda + DynamoDB. Zero servers, scales to zero.',
    icon:        '⚡',
    tiers:       SERVERLESS_TIERS,
  },
  {
    id:          'microservices',
    label:       'Microservices',
    description: 'Multiple ECS services behind an ALB sharing an event bus and per-service DBs.',
    icon:        '🔧',
    tiers:       MICROSERVICES_TIERS,
  },
  {
    id:          'api-workers',
    label:       'API + Workers',
    description: 'REST API that enqueues SQS jobs consumed by auto-scaling worker containers.',
    icon:        '⚙️',
    tiers:       API_WORKERS_TIERS,
  },
  {
    id:          'ml-inference',
    label:       'ML Inference',
    description: 'Sync Lambda inference + async ECS GPU batch workers with S3 model registry.',
    icon:        '🤖',
    tiers:       ML_INFERENCE_TIERS,
  },
  {
    id:          'static-api',
    label:       'Static + API',
    description: 'CloudFront → S3 static site + API Gateway → Lambda backend.',
    icon:        '📄',
    tiers:       STATIC_API_TIERS,
  },
]

export function getTierLayout(templateId: ArchTemplateId, tier: ScaleTierIndex): TierLayout {
  const def = TEMPLATE_REGISTRY.find((t) => t.id === templateId)
  return def ? def.tiers[tier] : WEB_APP_TIERS[tier]
}
