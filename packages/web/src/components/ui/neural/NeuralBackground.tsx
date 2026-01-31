import { useEffect, useRef, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface NeuralBackgroundProps {
  /** Number of nodes to render */
  nodeCount?: number;
  /** Whether to show connection lines */
  showConnections?: boolean;
  /** Maximum connection distance */
  connectionDistance?: number;
  /** Intensity of the effect (0-1) */
  intensity?: number;
  /** Whether nodes cluster around a focal point */
  focalPoint?: { x: number; y: number } | null;
  /** Additional CSS classes */
  className?: string;
}

interface Node {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
}

const COLORS = [
  'rgba(139, 92, 246, 0.6)',  // violet (memory)
  'rgba(6, 182, 212, 0.5)',   // cyan (pulse)
  'rgba(245, 158, 11, 0.4)',  // amber (fire)
  'rgba(139, 92, 246, 0.4)',  // violet dim
  'rgba(6, 182, 212, 0.3)',   // cyan dim
];

function createNode(id: number, width: number, height: number): Node {
  return {
    id,
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    size: Math.random() * 3 + 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    opacity: Math.random() * 0.5 + 0.3,
  };
}

export function NeuralBackground({
  nodeCount = 50,
  showConnections = true,
  connectionDistance = 150,
  intensity = 0.5,
  focalPoint = null,
  className = '',
}: NeuralBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animationRef = useRef<number>();
  const prefersReducedMotion = useReducedMotion();

  // Initialize nodes
  const initNodes = useMemo(() => {
    return (width: number, height: number) => {
      nodesRef.current = Array.from({ length: nodeCount }, (_, i) =>
        createNode(i, width, height)
      );
    };
  }, [nodeCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Reinitialize nodes on resize
      initNodes(rect.width, rect.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Animation loop
    const animate = () => {
      if (!canvas || !ctx) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Skip animation if reduced motion is preferred
      if (prefersReducedMotion) {
        // Just draw static nodes
        nodesRef.current.forEach((node) => {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();
        });
        return;
      }

      // Update and draw nodes
      nodesRef.current.forEach((node) => {
        // Apply focal point attraction
        if (focalPoint) {
          const dx = focalPoint.x * width - node.x;
          const dy = focalPoint.y * height - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 50) {
            node.vx += (dx / dist) * 0.01 * intensity;
            node.vy += (dy / dist) * 0.01 * intensity;
          }
        }

        // Update position
        node.x += node.vx;
        node.y += node.vy;

        // Damping
        node.vx *= 0.99;
        node.vy *= 0.99;

        // Bounce off edges with soft boundary
        const margin = 50;
        if (node.x < margin) node.vx += 0.05;
        if (node.x > width - margin) node.vx -= 0.05;
        if (node.y < margin) node.vy += 0.05;
        if (node.y > height - margin) node.vy -= 0.05;

        // Keep in bounds
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Draw subtle glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, 0,
          node.x, node.y, node.size * 4
        );
        gradient.addColorStop(0, node.color.replace(/[\d.]+\)$/, `${node.opacity * 0.3})`));
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Draw connections
      if (showConnections) {
        nodesRef.current.forEach((nodeA, i) => {
          nodesRef.current.slice(i + 1).forEach((nodeB) => {
            const dx = nodeA.x - nodeB.x;
            const dy = nodeA.y - nodeB.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < connectionDistance) {
              const alpha = (1 - dist / connectionDistance) * 0.2 * intensity;
              ctx.beginPath();
              ctx.moveTo(nodeA.x, nodeA.y);
              ctx.lineTo(nodeB.x, nodeB.y);
              ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initNodes, showConnections, connectionDistance, intensity, focalPoint, prefersReducedMotion]);

  return (
    <motion.canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      aria-hidden="true"
    />
  );
}

export default NeuralBackground;
