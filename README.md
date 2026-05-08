# FlowOps

A visual CI/CD pipeline and infrastructure designer. Build pipelines by dragging and connecting nodes on a canvas, then visualise the resulting AWS infrastructure — all with OPA-backed policy guardrails.

## Features

- **Pipeline Canvas** — drag-and-drop CI/CD pipeline builder using React Flow; supports group boxes, animated edges, and custom node types (Build, Test, Deploy, Docker, Trigger)
- **Infra Canvas** — AWS infrastructure visualiser with VPC boundaries, subnet boxes, and service nodes
- **Dream Mode** — natural-language infrastructure generation
- **Guardrail Panel** — 6 OPA Rego policies enforced via a `PolicyManager` (node limits, connection rules, naming conventions)
- **Template Picker** — pre-built pipeline templates to get started quickly

## Tech Stack

- React 18 + TypeScript
- React Flow (`@xyflow/react`) for the canvas
- Framer Motion for animations
- Zustand for state management
- OPA (Open Policy Agent) Rego policies
- pnpm workspaces monorepo

## Getting Started

```bash
pnpm install
pnpm dev
```

The app runs at `http://localhost:5173` by default.

## Project Structure

```
apps/
  web/
    src/
      components/
        canvas/        # Pipeline canvas nodes and edges
        infra/         # AWS infrastructure nodes and panels
        sidebar/       # Node and group config panels
        toolbar/       # TopBar and NodePalette
        modals/        # Template picker
      store/           # Zustand stores (pipeline, infra, guardrail)
      lib/             # Node config, AWS node config, helpers
      types/           # TypeScript types
policies/              # OPA Rego policy files
```
