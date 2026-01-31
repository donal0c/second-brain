import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { EntityType } from './NeuralNode';

interface Point {
  x: number;
  y: number;
}

interface ConnectionLineProps {
  /** Starting point */
  from: Point;
  /** Ending point */
  to: Point;
  /** Color based on entity type */
  entityType?: EntityType;
  /** Custom color override */
  color?: string;
  /** Whether to animate the line drawing */
  animated?: boolean;
  /** Animation duration in seconds */
  duration?: number;
  /** Line width */
  strokeWidth?: number;
  /** Whether to show a curved line */
  curved?: boolean;
  /** Opacity */
  opacity?: number;
  /** Whether to show a glow effect */
  glow?: boolean;
  /** Additional classes for the SVG container */
  className?: string;
}

const entityColors: Record<EntityType, string> = {
  task: 'rgba(245, 158, 11, 0.6)',
  project: 'rgba(6, 182, 212, 0.6)',
  idea: 'rgba(139, 92, 246, 0.6)',
  person: 'rgba(236, 72, 153, 0.6)',
};

export function ConnectionLine({
  from,
  to,
  entityType,
  color,
  animated = true,
  duration = 0.8,
  strokeWidth = 1.5,
  curved = true,
  opacity = 0.6,
  glow = true,
  className = '',
}: ConnectionLineProps) {
  const lineColor = color || (entityType ? entityColors[entityType] : 'rgba(139, 92, 246, 0.6)');

  // Calculate path
  const path = useMemo(() => {
    if (!curved) {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }

    // Create a smooth curve
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    // Control point offset perpendicular to the line
    const offset = Math.min(Math.abs(dx), Math.abs(dy)) * 0.2;
    const cx = midX - dy * 0.1;
    const cy = midY + dx * 0.1;

    return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
  }, [from, to, curved]);

  // Calculate path length for animation
  const pathLength = useMemo(() => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.sqrt(dx * dx + dy * dy) * (curved ? 1.1 : 1);
  }, [from, to, curved]);

  // Unique ID for gradient
  const gradientId = useMemo(
    () => `connection-gradient-${from.x}-${from.y}-${to.x}-${to.y}`,
    [from, to]
  );

  const filterId = useMemo(
    () => `connection-glow-${from.x}-${from.y}-${to.x}-${to.y}`,
    [from, to]
  );

  return (
    <svg
      className={`absolute inset-0 pointer-events-none overflow-visible ${className}`}
      style={{ width: '100%', height: '100%' }}
    >
      <defs>
        {/* Gradient for the line */}
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={lineColor} stopOpacity={0} />
          <stop offset="20%" stopColor={lineColor} stopOpacity={opacity} />
          <stop offset="80%" stopColor={lineColor} stopOpacity={opacity} />
          <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
        </linearGradient>

        {/* Glow filter */}
        {glow && (
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {/* Glow layer */}
      {glow && (
        <motion.path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth * 3}
          strokeLinecap="round"
          opacity={0.3}
          filter={`url(#${filterId})`}
          initial={animated ? { pathLength: 0, opacity: 0 } : {}}
          animate={animated ? { pathLength: 1, opacity: 0.3 } : {}}
          transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* Main line */}
      <motion.path
        d={path}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={animated ? { pathLength: 0, opacity: 0 } : {}}
        animate={animated ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
        style={{
          strokeDasharray: pathLength,
          strokeDashoffset: animated ? pathLength : 0,
        }}
      />

      {/* Traveling particle effect */}
      {animated && (
        <motion.circle
          r={2}
          fill={lineColor}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            duration: duration * 2,
            repeat: Infinity,
            repeatDelay: 3,
            delay: duration,
          }}
        >
          <animateMotion
            dur={`${duration * 2}s`}
            repeatCount="indefinite"
            path={path}
            begin={`${duration}s`}
          />
        </motion.circle>
      )}
    </svg>
  );
}

export default ConnectionLine;
