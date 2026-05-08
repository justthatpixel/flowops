/**
 * terminalStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * State for the embedded terminal drawer (Phase 4).
 *
 *  open       – whether the drawer is visible
 *  tabs       – array of terminal sessions (multi-tab)
 *  activeTabId
 *
 * The terminal is a pure simulation — no real shell process.  Commands are
 * matched against a built-in response table; unknown commands get a "command
 * not found" response.  Destructive commands (rm -rf, kubectl delete, etc.)
 * set `pendingDestructiveCmd` which the UI intercepts with a confirm modal.
 */

import { create } from 'zustand'

export interface TerminalLine {
  id: string
  text: string
  kind: 'prompt' | 'output' | 'error' | 'system'
}

export interface TerminalTab {
  id: string
  name: string
  cwd: string
  lines: TerminalLine[]
}

interface TerminalStore {
  open: boolean
  tabs: TerminalTab[]
  activeTabId: string
  pendingDestructiveCmd: { tabId: string; cmd: string } | null

  toggleOpen: () => void
  setOpen: (open: boolean) => void
  addTab: () => void
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  submitCommand: (tabId: string, cmd: string) => void
  confirmDestructive: () => void
  cancelDestructive: () => void
}

let _lineSeq = 0
let _tabSeq = 1

function lineId() {
  return `ln-${++_lineSeq}`
}

function makeTab(name?: string): TerminalTab {
  const id = `tab-${++_tabSeq}`
  return {
    id,
    name: name ?? `Terminal ${_tabSeq}`,
    cwd: '~/flowops',
    lines: [
      { id: lineId(), kind: 'system', text: `FlowOps Terminal — session ${_tabSeq}` },
      { id: lineId(), kind: 'system', text: 'Type a command to get started.' },
    ],
  }
}

const INITIAL_TAB: TerminalTab = {
  id: 'tab-1',
  name: 'Terminal 1',
  cwd: '~/flowops',
  lines: [
    { id: lineId(), kind: 'system', text: 'FlowOps Terminal — session 1' },
    { id: lineId(), kind: 'system', text: 'Type a command to get started.' },
  ],
}

// ─── Destructive command patterns ─────────────────────────────────────────────

const DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf?/i,
  /kubectl\s+delete/i,
  /terraform\s+destroy/i,
  /git\s+reset\s+--hard/i,
  /git\s+push\s+--force/i,
  /docker\s+system\s+prune/i,
  /DROP\s+TABLE/i,
]

function isDestructive(cmd: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((p) => p.test(cmd))
}

// ─── Simulated responses ──────────────────────────────────────────────────────

function simulate(cmd: string, cwd: string): { lines: string[]; newCwd?: string; isError?: boolean } {
  const c = cmd.trim()

  if (!c) return { lines: [] }

  if (c === 'clear') return { lines: ['__CLEAR__'] }

  if (c === 'pwd' || c === 'cwd') return { lines: [cwd] }

  if (c.startsWith('cd ')) {
    const dir = c.slice(3).trim()
    if (dir === '..') {
      const parts = cwd.split('/')
      parts.pop()
      return { lines: [], newCwd: parts.join('/') || '~' }
    }
    return { lines: [], newCwd: `${cwd}/${dir}` }
  }

  if (c === 'ls' || c === 'ls -la' || c === 'ls -l') {
    return {
      lines: [
        'total 48',
        'drwxr-xr-x   8 user  staff   256 May  2 09:14 .',
        'drwxr-xr-x  42 user  staff  1344 May  2 08:00 ..',
        '-rw-r--r--   1 user  staff   512 May  2 09:14 .env.local',
        '-rw-r--r--   1 user  staff  1284 May  2 09:14 package.json',
        'drwxr-xr-x  14 user  staff   448 May  2 09:14 node_modules',
        'drwxr-xr-x   8 user  staff   256 May  2 09:14 src',
        '-rw-r--r--   1 user  staff   820 May  2 09:14 tsconfig.json',
        '-rw-r--r--   1 user  staff   380 May  2 09:14 vite.config.ts',
      ],
    }
  }

  if (c === 'git status') {
    return {
      lines: [
        'On branch main',
        "Your branch is up to date with 'origin/main'.",
        '',
        'Changes not staged for commit:',
        '  (use "git add <file>..." to update what will be committed)',
        '',
        '\tmodified:   src/App.tsx',
        '\tmodified:   src/store/dashboardStore.ts',
        '',
        'no changes added to commit',
      ],
    }
  }

  if (c === 'git log --oneline -5') {
    return {
      lines: [
        'a3f9c12 feat: add observability dashboard (Epic 4)',
        'b8e21aa feat: infra sidebar 38-type rewrite',
        'c4d05fb fix: black flash bug on node selection',
        'd2b3911 feat: InfraDesigner Phase 1',
        'e9a0c3d chore: initial commit',
      ],
    }
  }

  if (c === 'git diff --stat') {
    return {
      lines: [
        ' src/App.tsx                          |  24 ++++-',
        ' src/components/toolbar/TopBar.tsx    |  68 +++++++++++-',
        ' src/store/dashboardStore.ts          |  72 ++++++++++++',
        ' src/store/terminalStore.ts           | 120 ++++++++++++++',
        ' 4 files changed, 284 insertions(+), 12 deletions(-)',
      ],
    }
  }

  if (c === 'pnpm install' || c === 'npm install' || c === 'yarn') {
    return {
      lines: [
        'Lockfile is up to date, resolution step is skipped',
        'Progress: resolved 842, reused 841, downloaded 1, added 1',
        '',
        'dependencies:',
        '+ framer-motion 11.2.0',
        '',
        'Done in 2.4s',
      ],
    }
  }

  if (c === 'pnpm build' || c === 'npm run build') {
    return {
      lines: [
        'vite v5.2.0 building for production...',
        '✓ 1284 modules transformed.',
        'dist/index.html                  0.46 kB │ gzip:  0.30 kB',
        'dist/assets/index-BwZzp9eP.css  24.12 kB │ gzip:  5.42 kB',
        'dist/assets/index-C2_fMnap.js  521.38 kB │ gzip: 167.81 kB',
        '✓ built in 8.43s',
      ],
    }
  }

  if (c === 'pnpm dev' || c === 'npm run dev') {
    return {
      lines: [
        'VITE v5.2.0  ready in 812 ms',
        '',
        '  ➜  Local:   http://localhost:5173/',
        '  ➜  Network: use --host to expose',
        '  ➜  press h + enter to show help',
      ],
    }
  }

  if (c === 'docker ps') {
    return {
      lines: [
        'CONTAINER ID   IMAGE                  COMMAND                  STATUS         PORTS',
        'a1b2c3d4e5f6   flowops-api:latest     "node dist/index.js"     Up 2 hours     0.0.0.0:3001->3001/tcp',
        'b2c3d4e5f6a7   postgres:15-alpine     "docker-entrypoint.s…"   Up 2 hours     5432/tcp',
        'c3d4e5f6a7b8   redis:7-alpine         "docker-entrypoint.s…"   Up 2 hours     6379/tcp',
      ],
    }
  }

  if (c === 'docker images') {
    return {
      lines: [
        'REPOSITORY          TAG       IMAGE ID       CREATED         SIZE',
        'flowops-api         latest    a1b2c3d4e5f6   2 hours ago     182MB',
        'flowops-web         latest    b2c3d4e5f6a7   2 hours ago     24.3MB',
        'postgres            15-alpine c3d4e5f6a7b8   3 days ago      243MB',
        'redis               7-alpine  d4e5f6a7b8c9   5 days ago      40.1MB',
      ],
    }
  }

  if (c === 'kubectl get pods' || c === 'kubectl get pods -n default') {
    return {
      lines: [
        'NAME                              READY   STATUS    RESTARTS   AGE',
        'api-deployment-7d9c8b6f5-xk2p4   1/1     Running   0          2h',
        'api-deployment-7d9c8b6f5-mn8l9   1/1     Running   0          2h',
        'web-deployment-5f4d3c2b1-qr7t6   1/1     Running   0          2h',
        'redis-0                          1/1     Running   0          2h',
        'postgres-0                       1/1     Running   0          2h',
      ],
    }
  }

  if (c === 'kubectl get nodes') {
    return {
      lines: [
        'NAME                        STATUS   ROLES    AGE   VERSION',
        'ip-10-0-1-42.ec2.internal   Ready    <none>   5d    v1.29.3',
        'ip-10-0-2-87.ec2.internal   Ready    <none>   5d    v1.29.3',
        'ip-10-0-3-15.ec2.internal   Ready    <none>   5d    v1.29.3',
      ],
    }
  }

  if (c === 'terraform plan') {
    return {
      lines: [
        'Refreshing Terraform state in-memory prior to plan...',
        '',
        'Terraform used the selected providers to generate the following execution plan.',
        '',
        'Plan: 3 to add, 1 to change, 0 to destroy.',
        '',
        '  + aws_ecs_task_definition.api (new resource)',
        '  + aws_ecs_service.api (new resource)',
        '  + aws_lb_target_group.api (new resource)',
        '  ~ aws_lb_listener.https (update in-place)',
      ],
    }
  }

  if (c === 'terraform apply') {
    return {
      lines: [
        'Apply complete! Resources: 3 added, 1 changed, 0 destroyed.',
        '',
        'Outputs:',
        '',
        'api_url = "https://api.flowops-prod.example.com"',
        'cluster_name = "flowops-prod"',
      ],
    }
  }

  if (c === 'pnpm test' || c === 'npm test' || c === 'vitest run') {
    return {
      lines: [
        ' RUN  v1.6.0 /flowops/apps/web',
        '',
        ' ✓ src/store/pipelineStore.test.ts (12 tests) 84ms',
        ' ✓ src/lib/nodeConfig.test.ts (6 tests) 12ms',
        ' ✓ src/components/sidebar/NodeConfigPanel.test.tsx (8 tests) 241ms',
        '',
        ' Test Files  3 passed (3)',
        '      Tests  26 passed (26)',
        '   Start at  09:14:32',
        '   Duration  1.84s (transform 612ms)',
      ],
    }
  }

  if (c === 'echo $PATH') {
    return {
      lines: ['/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin'],
    }
  }

  if (c === 'node --version' || c === 'node -v') return { lines: ['v20.12.2'] }
  if (c === 'pnpm --version') return { lines: ['9.1.0'] }
  if (c === 'docker --version') return { lines: ['Docker version 26.1.1, build 4cf5afa'] }
  if (c === 'kubectl version --client') return { lines: ['Client Version: v1.29.3'] }
  if (c === 'terraform --version') return { lines: ['Terraform v1.8.1\non darwin_arm64'] }
  if (c === 'git --version') return { lines: ['git version 2.44.0'] }

  if (c === 'help') {
    return {
      lines: [
        'Available simulated commands:',
        '',
        '  ls, pwd, cd <dir>',
        '  git status, git log --oneline -5, git diff --stat',
        '  pnpm install, pnpm build, pnpm dev, pnpm test',
        '  docker ps, docker images',
        '  kubectl get pods, kubectl get nodes',
        '  terraform plan, terraform apply',
        '  node -v, pnpm --version, docker --version',
        '  clear',
      ],
    }
  }

  // Unknown command
  const bin = c.split(' ')[0]
  return {
    isError: true,
    lines: [`zsh: command not found: ${bin}`],
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTerminalStore = create<TerminalStore>((set, get) => ({
  open: false,
  tabs: [INITIAL_TAB],
  activeTabId: INITIAL_TAB.id,
  pendingDestructiveCmd: null,

  toggleOpen: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),

  addTab: () => {
    const tab = makeTab()
    set((s) => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }))
  },

  closeTab: (id) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.id !== id)
      if (tabs.length === 0) {
        const fresh = makeTab()
        return { tabs: [fresh], activeTabId: fresh.id }
      }
      const activeTabId =
        s.activeTabId === id ? tabs[tabs.length - 1].id : s.activeTabId
      return { tabs, activeTabId }
    }),

  setActiveTab: (id) => set({ activeTabId: id }),

  submitCommand: (tabId, cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return

    // Check destructive first
    if (isDestructive(trimmed)) {
      set({ pendingDestructiveCmd: { tabId, cmd: trimmed } })
      return
    }
    _executeCommand(tabId, trimmed, set, get)
  },

  confirmDestructive: () => {
    const { pendingDestructiveCmd } = get()
    if (!pendingDestructiveCmd) return
    const { tabId, cmd } = pendingDestructiveCmd
    set({ pendingDestructiveCmd: null })
    _executeCommand(tabId, cmd, set, get)
  },

  cancelDestructive: () => set({ pendingDestructiveCmd: null }),
}))

function _executeCommand(
  tabId: string,
  cmd: string,
  set: (partial: Partial<TerminalStore> | ((s: TerminalStore) => Partial<TerminalStore>)) => void,
  get: () => TerminalStore,
) {
  const tab = get().tabs.find((t) => t.id === tabId)
  if (!tab) return

  const promptLine: TerminalLine = {
    id: lineId(),
    kind: 'prompt',
    text: `${tab.cwd} $ ${cmd}`,
  }

  if (cmd === 'clear') {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === tabId
          ? { ...t, lines: [{ id: lineId(), kind: 'system', text: 'Session cleared.' }] }
          : t
      ),
    }))
    return
  }

  const { lines: outLines, newCwd, isError } = simulate(cmd, tab.cwd)

  const outputLines: TerminalLine[] = outLines.map((text) => ({
    id: lineId(),
    kind: (isError ? 'error' : 'output') as TerminalLine['kind'],
    text,
  }))

  set((s) => ({
    tabs: s.tabs.map((t) => {
      if (t.id !== tabId) return t
      return {
        ...t,
        cwd: newCwd ?? t.cwd,
        lines: [...t.lines, promptLine, ...outputLines],
      }
    }),
  }))
}
