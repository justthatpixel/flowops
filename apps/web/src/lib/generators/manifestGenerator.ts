/**
 * manifestGenerator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure function: ContainerNode[] + ContainerEdge[] + Namespace[] → GeneratedFiles
 * Generates kubectl-ready YAML manifests with proper labels and resource specs.
 */

import type { ContainerNode, ContainerEdge, Namespace, GeneratedFiles } from '@/types/containers'

// ─── Labels helper ────────────────────────────────────────────────────────────

function labels(appName: string, extra: Record<string, string> = {}): string {
  const base: Record<string, string> = {
    app: appName,
    'managed-by': 'flowops',
    version: 'v1',
    ...extra,
  }
  return Object.entries(base)
    .map(([k, v]) => `    ${k}: ${v}`)
    .join('\n')
}

function selectorLabels(appName: string): string {
  return `    app: ${appName}`
}

// ─── Namespace manifests ──────────────────────────────────────────────────────

function generateNamespaces(namespaces: Namespace[]): string {
  if (namespaces.length === 0) {
    return `apiVersion: v1
kind: Namespace
metadata:
  name: default
  labels:
    managed-by: flowops
`
  }
  return namespaces
    .map(
      (ns) => `apiVersion: v1
kind: Namespace
metadata:
  name: ${ns.name}
  labels:
    managed-by: flowops
`
    )
    .join('---\n')
}

// ─── Deployment manifests ─────────────────────────────────────────────────────

function generateDeployments(nodes: ContainerNode[]): string {
  const deployments = nodes.filter((n) => n.type === 'deployment')
  if (deployments.length === 0) return ''

  return deployments
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const image = (c.image as string) || 'your-app:latest'
      const replicas = (c.replicas as number) || 1
      const port = (c.port as number) || 3000
      const cpuReq = (c.cpuRequest as string) || '250m'
      const cpuLim = (c.cpuLimit as string) || '500m'
      const memReq = (c.memRequest as string) || '256Mi'
      const memLim = (c.memLimit as string) || '512Mi'
      const livePath = (c.livenessPath as string) || '/health'
      const readyPath = (c.readinessPath as string) || '/ready'
      const strategy = (c.strategy as string) || 'RollingUpdate'
      const pullPolicy = (c.imagePullPolicy as string) || 'IfNotPresent'

      return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
spec:
  replicas: ${replicas}
  selector:
    matchLabels:
${selectorLabels(name)}
  strategy:
    type: ${strategy}${strategy === 'RollingUpdate' ? '\n    rollingUpdate:\n      maxSurge: 1\n      maxUnavailable: 0' : ''}
  template:
    metadata:
      labels:
${labels(name)}
    spec:
      containers:
        - name: ${name}
          image: ${image}
          imagePullPolicy: ${pullPolicy}
          ports:
            - containerPort: ${port}
              protocol: TCP
          resources:
            requests:
              cpu: ${cpuReq}
              memory: ${memReq}
            limits:
              cpu: ${cpuLim}
              memory: ${memLim}
          livenessProbe:
            httpGet:
              path: ${livePath}
              port: ${port}
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: ${readyPath}
              port: ${port}
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          env:
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
`
    })
    .join('---\n')
}

// ─── StatefulSet manifests ────────────────────────────────────────────────────

function generateStatefulSets(nodes: ContainerNode[]): string {
  const sets = nodes.filter((n) => n.type === 'statefulset')
  if (sets.length === 0) return ''

  return sets
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const image = (c.image as string) || 'postgres:15-alpine'
      const replicas = (c.replicas as number) || 1
      const storageSize = (c.storageSize as string) || '10Gi'
      const storageClass = (c.storageClass as string) || 'standard'
      const cpuReq = (c.cpuRequest as string) || '250m'
      const cpuLim = (c.cpuLimit as string) || '500m'
      const memReq = (c.memRequest as string) || '256Mi'
      const memLim = (c.memLimit as string) || '512Mi'

      return `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
spec:
  serviceName: ${name}
  replicas: ${replicas}
  selector:
    matchLabels:
${selectorLabels(name)}
  template:
    metadata:
      labels:
${labels(name)}
    spec:
      containers:
        - name: ${name}
          image: ${image}
          ports:
            - containerPort: 5432
              name: db
          resources:
            requests:
              cpu: ${cpuReq}
              memory: ${memReq}
            limits:
              cpu: ${cpuLim}
              memory: ${memLim}
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: ${storageClass}
        resources:
          requests:
            storage: ${storageSize}
`
    })
    .join('---\n')
}

// ─── Service manifests ────────────────────────────────────────────────────────

function generateServices(nodes: ContainerNode[]): string {
  const services = nodes.filter((n) => n.type === 'k8s_service')
  if (services.length === 0) return ''

  return services
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const serviceType = (c.serviceType as string) || 'ClusterIP'
      const port = (c.port as number) || 80
      const targetPort = (c.targetPort as number) || 3000

      return `apiVersion: v1
kind: Service
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
spec:
  type: ${serviceType}
  selector:
${selectorLabels(name.replace('-service', '').replace('-svc', ''))}
  ports:
    - name: http
      protocol: TCP
      port: ${port}
      targetPort: ${targetPort}
`
    })
    .join('---\n')
}

// ─── Ingress manifests ────────────────────────────────────────────────────────

function generateIngresses(nodes: ContainerNode[]): string {
  const ingresses = nodes.filter((n) => n.type === 'ingress')
  if (ingresses.length === 0) return ''

  return ingresses
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const ingressClass = (c.ingressClass as string) || 'nginx'
      const host = (c.host as string) || 'app.example.com'
      const tls = c.tls as boolean
      const certManager = c.certManager as boolean

      const annotations: Record<string, string> = {
        'kubernetes.io/ingress.class': ingressClass,
      }
      if (certManager) {
        annotations['cert-manager.io/cluster-issuer'] = 'letsencrypt-prod'
      }

      const annotationsStr = Object.entries(annotations)
        .map(([k, v]) => `    ${k}: "${v}"`)
        .join('\n')

      return `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
  annotations:
${annotationsStr}
spec:
  ingressClassName: ${ingressClass}${tls ? `\n  tls:\n    - hosts:\n        - ${host}\n      secretName: ${name}-tls` : ''}
  rules:
    - host: ${host}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: ${name.replace('-ingress', '-service').replace('-ing', '-svc')}
                port:
                  number: 80
`
    })
    .join('---\n')
}

// ─── ConfigMap manifests ──────────────────────────────────────────────────────

function generateConfigMaps(nodes: ContainerNode[]): string {
  const configmaps = nodes.filter((n) => n.type === 'configmap')
  if (configmaps.length === 0) return ''

  return configmaps
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const dataRaw = (c.data as string) || ''
      const dataLines = dataRaw.split('\n').filter((l) => l.includes('='))

      let dataSection = ''
      for (const line of dataLines) {
        const [key, ...rest] = line.split('=')
        dataSection += `  ${key.trim()}: "${rest.join('=').trim()}"\n`
      }

      return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
data:
${dataSection || '  # Add your key=value pairs\n'}`
    })
    .join('---\n')
}

// ─── Secret manifests ─────────────────────────────────────────────────────────

function generateSecrets(nodes: ContainerNode[]): string {
  const secrets = nodes.filter((n) => n.type === 'secret')
  if (secrets.length === 0) return ''

  return secrets
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const secretType = (c.secretType as string) || 'Opaque'
      const dataRaw = (c.data as string) || ''
      const dataLines = dataRaw.split('\n').filter((l) => l.includes('='))

      // base64 placeholder values
      let dataSection = ''
      for (const line of dataLines) {
        const [key] = line.split('=')
        dataSection += `  ${key.trim()}: <base64-encoded-value>\n`
      }

      return `apiVersion: v1
kind: Secret
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
type: ${secretType}
data:
${dataSection || '  # Keys are base64-encoded\n'}# To encode: echo -n "value" | base64
# To decode: echo "<base64>" | base64 -d
`
    })
    .join('---\n')
}

// ─── PVC manifests ────────────────────────────────────────────────────────────

function generatePVCs(nodes: ContainerNode[]): string {
  const pvcs = nodes.filter((n) => n.type === 'pvc')
  if (pvcs.length === 0) return ''

  return pvcs
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const storage = (c.storage as string) || '20Gi'
      const accessMode = (c.accessMode as string) || 'ReadWriteOnce'
      const storageClass = (c.storageClass as string) || 'standard'

      return `apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
spec:
  accessModes:
    - ${accessMode}
  storageClassName: ${storageClass}
  resources:
    requests:
      storage: ${storage}
`
    })
    .join('---\n')
}

// ─── HPA manifests ────────────────────────────────────────────────────────────

function generateHPAs(nodes: ContainerNode[]): string {
  const hpas = nodes.filter((n) => n.type === 'hpa')
  if (hpas.length === 0) return ''

  return hpas
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const targetDeployment = (c.targetDeployment as string) || 'web'
      const minReplicas = (c.minReplicas as number) || 2
      const maxReplicas = (c.maxReplicas as number) || 10
      const cpuTarget = (c.cpuTargetPercent as number) || 70
      const memTarget = (c.memTargetPercent as number) || 80

      return `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${targetDeployment}
  minReplicas: ${minReplicas}
  maxReplicas: ${maxReplicas}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: ${cpuTarget}
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: ${memTarget}
`
    })
    .join('---\n')
}

// ─── NetworkPolicy manifests ──────────────────────────────────────────────────

function generateNetworkPolicies(nodes: ContainerNode[]): string {
  const policies = nodes.filter((n) => n.type === 'networkpolicy')
  if (policies.length === 0) return ''

  return policies
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const podSelector = (c.podSelector as string) || 'app=web'
      const [podKey, podVal] = podSelector.split('=')
      const ingressPort = (c.ingressPort as number) || 80
      const egressPort = (c.egressPort as number) || 443

      return `apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
spec:
  podSelector:
    matchLabels:
      ${podKey.trim()}: ${(podVal || '').trim()}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - ports:
        - protocol: TCP
          port: ${ingressPort}
  egress:
    - ports:
        - protocol: TCP
          port: ${egressPort}
        - protocol: TCP
          port: 53
      to: []
`
    })
    .join('---\n')
}

// ─── ServiceAccount manifests ─────────────────────────────────────────────────

function generateServiceAccounts(nodes: ContainerNode[]): string {
  const accounts = nodes.filter((n) => n.type === 'serviceaccount')
  if (accounts.length === 0) return ''

  return accounts
    .map((node) => {
      const c = node.config
      const name = node.label
      const namespace = (c.namespace as string) || 'default'
      const annotationsRaw = (c.annotations as string) || ''
      const annotationLines = annotationsRaw.split('\n').filter((l) => l.includes('='))

      let annotationsSection = ''
      if (annotationLines.length > 0) {
        annotationsSection = '  annotations:\n'
        for (const line of annotationLines) {
          const [key, ...rest] = line.split('=')
          annotationsSection += `    ${key.trim()}: "${rest.join('=').trim()}"\n`
        }
      }

      return `apiVersion: v1
kind: ServiceAccount
metadata:
  name: ${name}
  namespace: ${namespace}
  labels:
${labels(name)}
${annotationsSection}automountServiceAccountToken: false
`
    })
    .join('---\n')
}

// ─── Kustomization ────────────────────────────────────────────────────────────

function generateKustomization(files: string[]): string {
  const resources = files.map((f) => `  - ${f}`).join('\n')
  return `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Generated by FlowOps Container Designer
metadata:
  name: app

resources:
${resources}

commonLabels:
  managed-by: flowops

# Uncomment to override images:
# images:
#   - name: your-app
#     newTag: v1.2.3
`
}

// ─── Main generator ───────────────────────────────────────────────────────────

export function generateManifests(
  nodes: ContainerNode[],
  _edges: ContainerEdge[],
  namespaces: Namespace[]
): GeneratedFiles {
  const files: GeneratedFiles = {}
  const resourceFiles: string[] = []

  // Namespace
  const nsContent = generateNamespaces(namespaces)
  files['k8s/namespace.yaml'] = nsContent
  resourceFiles.push('namespace.yaml')

  // Deployments
  const depContent = generateDeployments(nodes)
  if (depContent) {
    files['k8s/deployment.yaml'] = depContent
    resourceFiles.push('deployment.yaml')
  }

  // StatefulSets
  const ssContent = generateStatefulSets(nodes)
  if (ssContent) {
    files['k8s/statefulset.yaml'] = ssContent
    resourceFiles.push('statefulset.yaml')
  }

  // Services
  const svcContent = generateServices(nodes)
  if (svcContent) {
    files['k8s/service.yaml'] = svcContent
    resourceFiles.push('service.yaml')
  }

  // Ingresses
  const ingContent = generateIngresses(nodes)
  if (ingContent) {
    files['k8s/ingress.yaml'] = ingContent
    resourceFiles.push('ingress.yaml')
  }

  // ConfigMaps
  const cmContent = generateConfigMaps(nodes)
  if (cmContent) {
    files['k8s/configmap.yaml'] = cmContent
    resourceFiles.push('configmap.yaml')
  }

  // Secrets
  const secretContent = generateSecrets(nodes)
  if (secretContent) {
    files['k8s/secret.yaml'] = secretContent
    resourceFiles.push('secret.yaml')
  }

  // PVCs
  const pvcContent = generatePVCs(nodes)
  if (pvcContent) {
    files['k8s/pvc.yaml'] = pvcContent
    resourceFiles.push('pvc.yaml')
  }

  // HPAs
  const hpaContent = generateHPAs(nodes)
  if (hpaContent) {
    files['k8s/hpa.yaml'] = hpaContent
    resourceFiles.push('hpa.yaml')
  }

  // NetworkPolicies
  const npContent = generateNetworkPolicies(nodes)
  if (npContent) {
    files['k8s/networkpolicy.yaml'] = npContent
    resourceFiles.push('networkpolicy.yaml')
  }

  // ServiceAccounts
  const saContent = generateServiceAccounts(nodes)
  if (saContent) {
    files['k8s/serviceaccount.yaml'] = saContent
    resourceFiles.push('serviceaccount.yaml')
  }

  // Kustomization
  files['k8s/kustomization.yaml'] = generateKustomization(resourceFiles)

  return files
}
