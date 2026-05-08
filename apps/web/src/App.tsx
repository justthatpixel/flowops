import { AnimatePresence } from 'framer-motion'
import { ReactFlowProvider } from '@xyflow/react'
import TopBar from '@/components/toolbar/TopBar'
import NodePalette from '@/components/toolbar/NodePalette'
import PipelineCanvas from '@/components/canvas/PipelineCanvas'
import NodeConfigPanel from '@/components/sidebar/NodeConfigPanel'
import GroupConfigPanel from '@/components/sidebar/GroupConfigPanel'
import AISidebar from '@/components/sidebar/AISidebar'
import TemplatePickerModal from '@/components/modals/TemplatePickerModal'
import InfraDesigner from '@/components/infra/InfraDesigner'
import ContainerDesigner from '@/components/containers/ContainerDesigner'
import NodeDashboard from '@/components/observability/NodeDashboard'
import DashboardBoard from '@/components/observability/DashboardBoard'
import LogAggregator from '@/components/observability/LogAggregator'
import TerminalDrawer from '@/components/observability/TerminalDrawer'
import { usePipelineStore } from '@/store/pipelineStore'
import { useInfraStore } from '@/store/infraStore'
import { useDashboardStore } from '@/store/dashboardStore'
import { useContainerStore } from '@/store/containerStore'
import { useExecution } from '@/hooks/useExecution'

function Layout() {
  useExecution()
  const selectedNodeId  = usePipelineStore((s) => s.selectedNodeId)
  const selectedGroupId = usePipelineStore((s) => s.selectedGroupId)
  const infraOpen        = useInfraStore((s) => s.isOpen)
  const containerOpen    = useContainerStore((s) => s.isOpen)
  const { activeView, nodeDashboardId } = useDashboardStore()

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden font-dm-sans">
      <TopBar />

      {/* ── Main content area — switches by activeView ────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {activeView === 'pipeline' && (
          <>
            <AISidebar />
            <NodePalette />
            {/* Canvas + config panel wrapper — relative so panels can overlay */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <ReactFlowProvider>
                <PipelineCanvas />
              </ReactFlowProvider>
              <AnimatePresence mode="wait">
                {selectedNodeId  && <NodeConfigPanel  key={selectedNodeId}  />}
                {selectedGroupId && <GroupConfigPanel key={selectedGroupId} />}
              </AnimatePresence>
            </div>
          </>
        )}

        {activeView === 'dashboard' && <DashboardBoard />}

        {activeView === 'logs' && <LogAggregator />}
      </div>

      {/* Template picker renders above everything */}
      <TemplatePickerModal />

      {/* Infrastructure Designer — full-screen overlay */}
      <AnimatePresence>
        {infraOpen && <InfraDesigner />}
      </AnimatePresence>

      {/* Container Designer — full-screen overlay (z-100) */}
      <AnimatePresence>
        {containerOpen && <ContainerDesigner />}
      </AnimatePresence>

      {/* Node Dashboard — full-screen overlay (z-500) */}
      <AnimatePresence>
        {nodeDashboardId && <NodeDashboard key={nodeDashboardId} />}
      </AnimatePresence>

      {/* Terminal drawer — slides up from bottom */}
      <TerminalDrawer />
    </div>
  )
}

export default function App() {
  return <Layout />
}
