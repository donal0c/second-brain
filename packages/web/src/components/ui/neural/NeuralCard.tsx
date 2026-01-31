import { motion } from 'framer-motion';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';
import type { EntityType } from './NeuralNode';

interface NeuralCardProps extends ComponentPropsWithoutRef<'div'> {
  /** Entity type for color accent */
  entityType?: EntityType;
  /** Whether card is interactive (shows hover effects) */
  interactive?: boolean;
  /** Whether card is currently selected */
  selected?: boolean;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Whether to show the neural border animation */
  animatedBorder?: boolean;
}

const entityAccents: Record<EntityType, { border: string; glow: string; gradient: string }> = {
  task: {
    border: 'border-l-neural-fire-500',
    glow: 'shadow-glow-task',
    gradient: 'from-neural-fire-500/20 to-transparent',
  },
  project: {
    border: 'border-l-neural-pulse-500',
    glow: 'shadow-glow-project',
    gradient: 'from-neural-pulse-500/20 to-transparent',
  },
  idea: {
    border: 'border-l-neural-memory-500',
    glow: 'shadow-glow-idea',
    gradient: 'from-neural-memory-500/20 to-transparent',
  },
  person: {
    border: 'border-l-entity-person',
    glow: 'shadow-glow-person',
    gradient: 'from-entity-person/20 to-transparent',
  },
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export const NeuralCard = forwardRef<HTMLDivElement, NeuralCardProps>(
  (
    {
      entityType,
      interactive = true,
      selected = false,
      padding = 'md',
      animatedBorder = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const accent = entityType ? entityAccents[entityType] : null;

    return (
      <motion.div
        ref={ref}
        className={`
          relative overflow-hidden
          bg-gradient-to-br from-void-50/80 to-void-100/90
          backdrop-blur-xl
          border border-void-border
          rounded-neural
          ${paddingStyles[padding]}
          ${entityType ? `border-l-4 ${accent?.border}` : ''}
          ${selected ? `ring-2 ring-neural-memory-500/50 ${accent?.glow || 'shadow-neural-md'}` : ''}
          ${interactive ? 'cursor-pointer' : ''}
          ${className}
        `}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={
          interactive
            ? {
                borderColor: 'rgba(139, 92, 246, 0.3)',
                boxShadow: '0 0 30px -10px rgba(139, 92, 246, 0.4)',
              }
            : {}
        }
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 25,
        }}
        {...props}
      >
        {/* Animated border gradient */}
        {animatedBorder && (
          <motion.div
            className="absolute inset-0 rounded-neural pointer-events-none"
            style={{
              padding: '1px',
              background: 'linear-gradient(135deg, var(--neural-memory), var(--neural-pulse), var(--neural-fire))',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
            initial={{ opacity: 0.3 }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
        )}

        {/* Entity type gradient overlay */}
        {entityType && (
          <div
            className={`absolute inset-0 bg-gradient-to-r ${accent?.gradient} pointer-events-none opacity-50`}
          />
        )}

        {/* Content */}
        <div className="relative z-10">{children}</div>
      </motion.div>
    );
  }
);

NeuralCard.displayName = 'NeuralCard';

export default NeuralCard;
