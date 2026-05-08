/**
 * ManagedCanvas.tsx — Extends KubernetesCanvas with cloud-specific nodes
 */

import { useContainerStore } from '@/store/containerStore'
import KubernetesCanvas, { K8S_NODE_TYPES } from '../kubernetes/KubernetesCanvas'
import CloudSelector from './CloudSelector'
import {
  NodeGroupNode,
  FargateProfileNode,
  IrsaNode,
  GkeNodePoolNode,
  GkeWorkloadIdentityNode,
  AksNodePoolNode,
  AksManagedIdentityNode,
} from './ManagedNodes'

const MANAGED_NODE_TYPES = {
  ...K8S_NODE_TYPES,
  nodegroup: NodeGroupNode,
  fargateprofile: FargateProfileNode,
  irsa: IrsaNode,
  gke_nodepool: GkeNodePoolNode,
  gke_workload_identity: GkeWorkloadIdentityNode,
  aks_nodepool: AksNodePoolNode,
  aks_managed_identity: AksManagedIdentityNode,
}

export default function ManagedCanvas() {
  const { cloudProvider, setCloudProvider } = useContainerStore()

  return (
    <KubernetesCanvas
      nodeTypes={MANAGED_NODE_TYPES as never}
      extraTopContent={
        <CloudSelector active={cloudProvider} onChange={setCloudProvider} />
      }
    />
  )
}
