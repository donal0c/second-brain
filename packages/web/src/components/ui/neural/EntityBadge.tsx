import { motion } from 'framer-motion';
import type { EntityType } from './NeuralNode';

interface EntityBadgeProps {
  /** Entity type */
  type: EntityType;
  /** Optional label override */
  label?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Whether to show glow effect */
  glow?: boolean;
  /** Additional classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const typeConfig: Record<EntityType, { label: string; colors: string; icon: JSX.Element }> = {
  task: {
    label: 'Task',
    colors: 'bg-neural-fire-500/15 text-neural-fire-400 border-neural-fire-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  project: {
    label: 'Project',
    colors: 'bg-neural-pulse-500/15 text-neural-pulse-400 border-neural-pulse-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  idea: {
    label: 'Idea',
    colors: 'bg-neural-memory-500/15 text-neural-memory-400 border-neural-memory-500/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  person: {
    label: 'Person',
    colors: 'bg-entity-person/15 text-pink-400 border-entity-person/30',
    icon: (
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

const glowStyles: Record<EntityType, string> = {
  task: 'shadow-[0_0_10px_-2px_rgba(245,158,11,0.4)]',
  project: 'shadow-[0_0_10px_-2px_rgba(6,182,212,0.4)]',
  idea: 'shadow-[0_0_10px_-2px_rgba(139,92,246,0.4)]',
  person: 'shadow-[0_0_10px_-2px_rgba(236,72,153,0.4)]',
};

export function EntityBadge({
  type,
  label,
  size = 'md',
  glow = false,
  className = '',
  onClick,
}: EntityBadgeProps) {
  const config = typeConfig[type];

  const badge = (
    <span
      className={`
        inline-flex items-center
        font-semibold uppercase tracking-wide
        rounded-full border
        ${config.colors}
        ${sizeStyles[size]}
        ${glow ? glowStyles[type] : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
    >
      {config.icon}
      <span>{label || config.label}</span>
    </span>
  );

  if (onClick) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {badge}
      </motion.div>
    );
  }

  return badge;
}

export default EntityBadge;
