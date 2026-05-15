
# FlowOps

<div align="center">
<img width="100%" alt="flowops-banner" src="https://github.com/user-attachments/assets/7e779480-315e-4d47-837f-61432978a45b" />

<br />
<br />

<p>
  <strong>Visual CI/CD pipeline builder · AWS infrastructure designer · AI-powered · Terraform-ready</strong>
</p>

<p>
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#project-structure">Structure</a>
</p>

<p>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude_AI-Anthropic-D97757?style=flat-square&logo=anthropic&logoColor=white" />
  <img src="https://img.shields.io/badge/Terraform-IaC-7B42BC?style=flat-square&logo=terraform&logoColor=white" />
</p>

</div>

---

## What is FlowOps?

FlowOps is an all-in-one DevOps platform that lets you **design CI/CD pipelines and AWS infrastructure visually**, generate Terraform from your architecture, enforce policy guardrails, and monitor your stack — all in one place.

Describe your app to the AI and it configures the entire pipeline for you. Switch to Architect Mode to lay out your AWS infrastructure, see live cost estimates, and generate production-ready Terraform. No more context switching between a dozen tools.

---

## Features

### 🤖 AI Pipeline Configurator
Describe your stack in plain English — Claude configures a complete, production-grade CI/CD pipeline for you instantly. Every node is fully customisable after generation.

<img src="./docs/gifs/ai-pipeline-configurator.gif" alt="AI Pipeline Configurator" width="100%" />
<img width="1840" height="1074" alt="Screenshot 2026-05-15 at 20 48 39" src="https://github.com/user-attachments/assets/de6e933b-2ad6-452b-b632-7427664e6cac" />


---

### 🔀 Visual Pipeline Builder
Drag-and-drop CI/CD pipeline canvas with animated edges, group boxes, and a full library of node types: Trigger, Build, Test, Docker, Deploy, Security Audit, Observability, and more.

<img src="./docs/gifs/pipeline-builder.gif" alt="Pipeline Builder" width="100%" />
<img width="1440" height="841" alt="Templates" src="https://github.com/user-attachments/assets/dcd81e64-7294-4dc4-ba67-2ede6e69ae0c" />
---

### 🏗️ Infrastructure Designer
Design your AWS architecture on a visual canvas. Supports 30+ AWS services across Compute, Networking, Database, Storage, Security, and Messaging. Drag from the sidebar, connect services, and configure each resource inline.

<img src="./docs/gifs/infra-designer.gif" alt="Infrastructure Designer" width="100%" />
![Uploading Screenshot 2026-05-15 at 20.53.42.png…]()

<img width="1867" height="1107" alt="Screenshot 2026-05-15 at 20 52 22" src="https://github.com/user-attachments/assets/50c090b5-1637-49ce-99fd-b4c16f689283" />






---

### 💰 Live Cost Estimation & Scale Tiers
See estimated monthly cost update in real time as you add resources. Switch between scale tiers (10 / 1k / 10k / 100k / 1M users) to understand how your costs change with growth.

<img src="./docs/gifs/cost-estimation.gif" alt="Cost Estimation & Scale Tiers" width="100%" />
<img width="1853" height="1086" alt="Screenshot 2026-05-15 at 20 51 15" src="https://github.com/user-attachments/assets/083f7d3e-28c0-4653-90f6-0a3447ec3915" />

---

### 📋 Terraform Generation & Plan View
Generate production-ready Terraform from your architecture with one click. Switch to Plan View to see a visual diff of what will be **created**, **updated**, **replaced**, or **destroyed** — colour-coded directly on the canvas.

<img src="./docs/gifs/terraform-plan.gif" alt="Terraform Generation & Plan View" width="100%" />
<img width="1440" height="841" alt="Guardrails" src="https://github.com/user-attachments/assets/8c6b2275-1063-4803-a7b6-63e6bec3d215" />

---

### 📊 Observability Dashboard
Build a custom monitoring dashboard by dragging widgets into a grid layout. Includes Commit Feed, CI Status, Core Web Vitals, Log Error Rate, Trivy Scan, Grafana Chart, Prometheus Metrics, Deployment Health, Docker Builds, and Terraform Plan diffs.

<img src="./docs/gifs/dashboard.gif" alt="Observability Dashboard" width="100%" />
<img width="1440" height="841" alt="Dashboard" src="https://github.com/user-attachments/assets/e071c521-fad6-4ebb-a8d8-95ccfc5a7299" />

---

### 🌐 Source Browser
Open GitHub, GitLab, Grafana, Prometheus, Datadog, ArgoCD, Jenkins, or any custom URL in a full-screen in-app browser panel — no tab switching required. Each pipeline node links directly to its relevant source.

<img src="./docs/gifs/source-browser.gif" alt="Source Browser" width="100%" />
<img width="1080" height="630" alt="iframe-shortened" src="https://github.com/user-attachments/assets/97ccf51f-03b2-4b10-9063-777a19aed921" />

---

### 🛡️ Policy Guardrails
Enforce OPA (Open Policy Agent) Rego policies across your pipeline and infrastructure. Guardrails check cost caps, naming conventions, connection rules, and SCP compliance — with a live audit log.

<img src="./docs/gifs/guardrails.gif" alt="Policy Guardrails" width="100%" />
<img width="1440" height="841" alt="Infastructure-fixed" src="https://github.com/user-attachments/assets/d238a759-5879-44a9-a374-b133674e67e9" />
---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Installation

```bash
# Clone the repo
git clone https://github.com/your-org/flowops.git
cd flowops

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

The web app runs at `http://localhost:5173` and the API at `http://localhost:3001`.

### Docker

```bash
docker-compose up -d
```

---

## Project Structure

```
flowops/
├── apps/
│   ├── web/                    # React frontend
│   │   └── src/
│   │       ├── components/
│   │       │   ├── canvas/     # Pipeline canvas (nodes, edges)
│   │       │   ├── infra/      # AWS infrastructure designer
│   │       │   ├── containers/ # Container designer
│   │       │   ├── observability/ # Dashboard, logs, terminal
│   │       │   ├── sidebar/    # Node & group config panels
│   │       │   ├── toolbar/    # TopBar, NodePalette
│   │       │   └── modals/     # Template picker
│   │       ├── store/          # Zustand stores (pipeline, infra, dashboard)
│   │       ├── lib/            # Node config, generators, helpers
│   │       ├── hooks/          # useAI, useExecution
│   │       └── types/          # TypeScript types
│   └── api/                    # Express backend
│       └── src/
│           └── index.ts        # API + WebSocket server
└── policies/                   # OPA Rego policy files
```

---

## Tech Stack

### Frontend

| | Technology | Purpose |
|---|---|---|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="20" /> | **React 18** | UI framework |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="20" /> | **TypeScript 5** | Type safety |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="20" /> | **Vite** | Build tool & dev server |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="20" /> | **Tailwind CSS** | Styling |
| 🔀 | **React Flow** (`@xyflow/react`) | Pipeline & infra canvas |
| 🎞 | **Framer Motion** | Animations & transitions |
| 🐻 | **Zustand** | State management |
| ✨ | **Lucide React** | Icons |

### Backend

| | Technology | Purpose |
|---|---|---|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/express/express-original.svg" width="20" /> | **Express** | REST API |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/prisma/prisma-original.svg" width="20" /> | **Prisma** | Database ORM |
| 🔌 | **WebSockets** (`ws`) | Real-time pipeline execution |

### Platform & AI

| | Technology | Purpose |
|---|---|---|
| 🤖 | **Claude (Anthropic)** | AI pipeline generation & node config |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/terraform/terraform-original.svg" width="20" /> | **Terraform** | Infrastructure as Code generation |
| ⚖️ | **OPA / Rego** | Policy-as-code guardrails |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" width="20" /> | **Docker** | Containerised deployment |
| 📦 | **pnpm workspaces** | Monorepo management |

---

## License

MIT © FlowOps
