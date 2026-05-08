import { getBezierPath, type EdgeProps, type Edge } from '@xyflow/react'

interface AnimatedEdgeData extends Record<string, unknown> {
  animated?: boolean
}

type AnimatedEdgeType = Edge<AnimatedEdgeData>

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<AnimatedEdgeType>) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const isAnimated = data?.animated === true
  const pathId = `edge-path-${id}`

  if (!isAnimated) {
    return (
      <path
        d={edgePath}
        fill="none"
        stroke="#D1D5DB"
        strokeWidth={2}
        strokeLinecap="round"
      />
    )
  }

  return (
    <g>
      {/* Ghost track */}
      <path
        d={edgePath}
        fill="none"
        stroke="#E5E5E5"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Animated dashed overlay */}
      <path
        id={pathId}
        d={edgePath}
        fill="none"
        stroke="#3B82F6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray="6 6"
        style={{
          animation: 'dash-flow 0.5s linear infinite',
        }}
      />
      {/* Travelling dot */}
      <circle r={4} fill="#3B82F6">
        <animateMotion dur="1.8s" repeatCount="indefinite">
          <mpath href={`#${pathId}`} />
        </animateMotion>
      </circle>
    </g>
  )
}
