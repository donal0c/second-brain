import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface TextShimmerProps {
  children: string;
  className?: string;
  shimmerWidth?: number;
}

export function TextShimmer({
  children,
  className,
  shimmerWidth = 100,
}: TextShimmerProps) {
  return (
    <motion.span
      className={cn(
        "relative inline-block bg-clip-text text-transparent",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(
          90deg,
          #fff 0%,
          #fff 40%,
          #a5b4fc 50%,
          #fff 60%,
          #fff 100%
        )`,
        backgroundSize: `${shimmerWidth * 3}% 100%`,
      }}
      animate={{
        backgroundPosition: ["100% 0%", "-100% 0%"],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.span>
  );
}
