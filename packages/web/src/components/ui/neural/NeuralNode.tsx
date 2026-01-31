import { motion } from 'framer-motion';
import { forwardRef } from 'react';

export type EntityType = 'task' | 'project' | 'idea' | 'person';
export type NodeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface NeuralNodeProps {
  /** Entity type determines color */
  type?: EntityType;
  /** Size of the node */
  size?: NodeSize;
  /** Whether the node is active/selected */
  active?: boolean;
  /** Whether to show pulse animation */
  pulse?: boolean;
  /** Custom color override (hex or CSS variable) */
  color?: string;
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Child content (usually an icon) */
  children?: React.ReactNode;
}

const sizeMap: Record<NodeSize, { node: string; glow: string }> = {
  xs: { node: 'w-2 h-2', glow: '4px' },
  sm: { node: 'w-3 h-3', glow: '6px' },
  md: { node: 'w-4 h-4', glow: '8px' },
  lg: { node: 'w-6 h-6', glow: '12px' },
  xl: { node: 'w-8 h-8', glow: '16px' },
};

const colorMap: Record<EntityType, { bg: string; glow: string; border: string }> = {
  task: {
    bg: 'bg-neural-fire-500',
    glow: 'rgba(245, 158, 11, 0.6)',
    border: 'border-neural-fire-400',
  },
  project: {
    bg: 'bg-neural-pulse-500',
    glow: 'rgba(6, 182, 212, 0.6)',
    border: 'border-neural-pulse-400',
  },
  idea: {
    bg: 'bg-neural-memory-500',
    glow: 'rgba(139, 92, 246, 0.6)',
    border: 'border-neural-memory-400',
  },
  person: {
    bg: 'bg-entity-person',
    glow: 'rgba(236, 72, 153, 0.6)',
    border: 'border-pink-400',
  },
};

export const NeuralNode = forwardRef<HTMLDivElement, NeuralNodeProps>(
  (
    {
      type = 'idea',
      size = 'md',
      active = false,
      pulse = false,
      color,
      className = '',
      onClick,
      children,
    },
    ref
  ) => {
    const sizeClasses = sizeMap[size];
    const colorClasses = colorMap[type];
    const glowColor = color || colorClasses.glow;

    return (
      <motion.div
        ref={ref}
        onClick={onClick}
        className={`
          relative rounded-full cursor-pointer
          ${sizeClasses.node}
          ${color ? '' : colorClasses.bg}
          ${active ? colorClasses.border + ' border-2' : ''}
          ${onClick ? 'cursor-pointer' : ''}
          ${className}
        `}
        style={color ? { backgroundColor: color } : undefined}
        initial={{ scale: 0, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          boxShadow: active
            ? `0 0 ${sizeClasses.glow} ${glowColor}, 0 0 calc(${sizeClasses.glow} * 2) ${glowColor}`
            : `0 0 ${sizeClasses.glow} ${glowColor}`,
        }}
        whileHover={{
          scale: 1.2,
          boxShadow: `0 0 calc(${sizeClasses.glow} * 2) ${glowColor}, 0 0 calc(${sizeClasses.glow} * 3) ${glowColor}`,
        }}
        whileTap={{ scale: 0.9 }}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 20,
        }}
      >
        {/* Pulse ring animation */}
        {pulse && (
          <motion.div
            className={`absolute inset-0 rounded-full ${color ? '' : colorClasses.bg}`}
            style={color ? { backgroundColor: color } : undefined}
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{
              scale: [1, 2, 2.5],
              opacity: [0.6, 0.3, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        )}

        {/* Content */}
        {children && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            {children}
          </div>
        )}
      </motion.div>
    );
  }
);

NeuralNode.displayName = 'NeuralNode';

export default NeuralNode;
