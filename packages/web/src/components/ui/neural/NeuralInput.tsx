import { motion } from 'framer-motion';
import { forwardRef, useState } from 'react';

interface NeuralInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: 'sm' | 'md' | 'lg' | 'hero';
  /** Icon to show on the left */
  icon?: React.ReactNode;
  /** Icon/button to show on the right */
  rightElement?: React.ReactNode;
  /** Error state */
  error?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Whether to show the neural glow effect */
  glowOnFocus?: boolean;
  /** Container class name */
  containerClassName?: string;
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3 text-lg',
  hero: 'px-6 py-4 text-xl font-hero',
};

export const NeuralInput = forwardRef<HTMLInputElement, NeuralInputProps>(
  (
    {
      size = 'md',
      icon,
      rightElement,
      error = false,
      errorMessage,
      glowOnFocus = true,
      className = '',
      containerClassName = '',
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className={`relative ${containerClassName}`}>
        <motion.div
          className={`
            relative flex items-center
            bg-void-100/60
            border rounded-neural overflow-hidden
            transition-colors duration-neural
            ${error ? 'border-error' : isFocused ? 'border-neural-memory-400' : 'border-void-border'}
          `}
          animate={
            glowOnFocus && isFocused
              ? {
                  boxShadow: error
                    ? '0 0 0 3px rgba(239, 68, 68, 0.1), 0 0 20px -4px rgba(239, 68, 68, 0.4)'
                    : '0 0 0 3px rgba(139, 92, 246, 0.1), 0 0 20px -4px rgba(139, 92, 246, 0.4)',
                }
              : { boxShadow: 'none' }
          }
          transition={{ duration: 0.2 }}
        >
          {/* Left icon */}
          {icon && (
            <div className="flex-shrink-0 pl-3 text-slate-400">
              {icon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            className={`
              flex-1 bg-transparent
              text-slate-200 placeholder-slate-500
              focus:outline-none
              ${sizeStyles[size]}
              ${icon ? 'pl-2' : ''}
              ${rightElement ? 'pr-2' : ''}
              ${className}
            `}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {/* Right element */}
          {rightElement && (
            <div className="flex-shrink-0 pr-3">
              {rightElement}
            </div>
          )}

          {/* Focus glow underline */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neural-memory-500 via-neural-pulse-500 to-neural-fire-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: isFocused ? 1 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {/* Error message */}
        {error && errorMessage && (
          <motion.p
            className="mt-1.5 text-sm text-error"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {errorMessage}
          </motion.p>
        )}
      </div>
    );
  }
);

NeuralInput.displayName = 'NeuralInput';

export default NeuralInput;
