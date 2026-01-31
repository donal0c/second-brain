import { motion } from 'framer-motion';
import type { ComponentPropsWithoutRef } from 'react';
import { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface SynapseButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'size'> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Loading state */
  loading?: boolean;
  /** Icon to show before text */
  icon?: React.ReactNode;
  /** Icon to show after text */
  iconRight?: React.ReactNode;
  /** Full width button */
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-neural-memory-600 to-neural-memory-700
    hover:from-neural-memory-500 hover:to-neural-memory-600
    text-white
    shadow-neural-md hover:shadow-neural-lg
  `,
  secondary: `
    bg-void-50/50 hover:bg-void-50
    text-slate-200 hover:text-white
    border border-void-border hover:border-neural-memory-500/30
  `,
  ghost: `
    bg-transparent hover:bg-void-50/30
    text-slate-300 hover:text-white
  `,
  danger: `
    bg-gradient-to-r from-error to-red-600
    hover:from-red-500 hover:to-red-600
    text-white
    shadow-[0_0_20px_-4px_rgba(239,68,68,0.4)]
    hover:shadow-[0_0_30px_-4px_rgba(239,68,68,0.5)]
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2.5 text-base gap-2',
  lg: 'px-6 py-3 text-lg gap-2.5',
};

export const SynapseButton = forwardRef<HTMLButtonElement, SynapseButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconRight,
      fullWidth = false,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        className={`
          relative inline-flex items-center justify-center
          font-semibold rounded-neural
          transition-all duration-neural ease-neural
          focus:outline-none focus-visible:ring-2 focus-visible:ring-neural-memory-400 focus-visible:ring-offset-2 focus-visible:ring-offset-void-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        whileHover={isDisabled ? {} : { y: -1 }}
        whileTap={isDisabled ? {} : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        {...props}
      >
        {/* Synapse glow effect on hover */}
        <motion.div
          className="absolute inset-0 rounded-neural opacity-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.3), transparent 70%)',
          }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Loading spinner */}
        {loading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          </motion.div>
        )}

        {/* Content */}
        <span
          className={`relative z-10 flex items-center gap-inherit ${loading ? 'opacity-0' : ''}`}
        >
          {icon && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </span>
      </motion.button>
    );
  }
);

SynapseButton.displayName = 'SynapseButton';

export default SynapseButton;
