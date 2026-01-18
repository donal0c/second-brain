import { useEffect, useRef } from "react";
import { motion, useAnimation, type Variants } from "framer-motion";

interface ConfettiPieceProps {
  color: string;
  delay: number;
  x: number;
}

function ConfettiPiece({ color, delay, x }: ConfettiPieceProps) {
  const controls = useAnimation();

  const variants: Variants = {
    hidden: { opacity: 0, y: 0, x: 0, rotate: 0, scale: 0 },
    visible: {
      opacity: [0, 1, 1, 0],
      y: [0, -100, -50, 100],
      x: [0, x * 0.5, x, x * 1.2],
      rotate: [0, 180, 360, 540],
      scale: [0, 1, 1, 0.5],
      transition: {
        duration: 1.5,
        delay,
        ease: "easeOut",
      },
    },
  };

  useEffect(() => {
    controls.start("visible");
  }, [controls]);

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{ backgroundColor: color }}
      variants={variants}
      initial="hidden"
      animate={controls}
    />
  );
}

const COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

export function Confetti({ trigger }: { trigger: boolean }) {
  const prevTrigger = useRef(trigger);
  const key = useRef(0);

  if (trigger && !prevTrigger.current) {
    key.current += 1;
  }
  prevTrigger.current = trigger;

  if (!trigger) return null;

  const pieces = Array.from({ length: 20 }, (_, i) => ({
    id: `${key.current}-${i}`,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 0.3,
    x: (Math.random() - 0.5) * 300,
  }));

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {pieces.map((piece) => (
        <ConfettiPiece
          key={piece.id}
          color={piece.color}
          delay={piece.delay}
          x={piece.x}
        />
      ))}
    </div>
  );
}
