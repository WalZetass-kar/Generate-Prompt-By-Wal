import React, { useEffect, useRef } from 'react';

interface ParticleNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
}

/**
 * Architectural animated canvas backdrop for the Hero section:
 * renders smooth multi-layered topographic wave ribbons and subtle
 * cursor-responsive geometric constellation lines on a deep obsidian canvas.
 * Automatically respects prefers-reduced-motion.
 */
export const HeroAnimatedBackdrop: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animationFrameId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let time = 0;

    const pointer = { x: -1000, y: -1000, active: false };
    let nodes: ParticleNode[] = [];

    const initNodes = (w: number, h: number) => {
      const count = Math.min(54, Math.max(24, Math.floor((w * h) / 26000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.22,
        radius: Math.random() * 1.4 + 0.9,
        alpha: Math.random() * 0.45 + 0.2,
      }));
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNodes(width, height);
    };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.active =
        pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    };

    const handlePointerLeave = () => {
      pointer.active = false;
    };

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Flowing multi-layer topographic silk ribbons
      const ribbonCount = 6;
      for (let r = 0; r < ribbonCount; r++) {
        const progress = r / (ribbonCount - 1);
        const baseY = height * (0.28 + progress * 0.52);
        const amplitude = 24 + r * 9;
        const frequency = 0.0022 + r * 0.00045;
        const phase = time * (0.42 + r * 0.09) + r * 1.15;

        ctx.beginPath();
        const step = 18;
        for (let x = 0; x <= width + step; x += step) {
          const wave1 = Math.sin(x * frequency + phase) * amplitude;
          const wave2 = Math.cos(x * (frequency * 1.7) - phase * 0.65) * (amplitude * 0.42);
          const pointerLift = pointer.active
            ? Math.exp(-Math.pow((x - pointer.x) / 220, 2)) *
              ((pointer.y - baseY) * 0.08)
            : 0;
          const y = baseY + wave1 + wave2 + pointerLift;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        const grad = ctx.createLinearGradient(0, baseY - 40, width, baseY + 40);
        if (r % 2 === 0) {
          grad.addColorStop(0, 'rgba(16, 185, 129, 0.01)');
          grad.addColorStop(0.32, 'rgba(16, 185, 129, 0.20)');
          grad.addColorStop(0.68, 'rgba(56, 189, 248, 0.14)');
          grad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');
        } else {
          grad.addColorStop(0, 'rgba(148, 163, 184, 0.01)');
          grad.addColorStop(0.45, 'rgba(148, 163, 184, 0.13)');
          grad.addColorStop(0.75, 'rgba(16, 185, 129, 0.12)');
          grad.addColorStop(1, 'rgba(148, 163, 184, 0.01)');
        }

        ctx.strokeStyle = grad;
        ctx.lineWidth = r === 2 ? 1.45 : 1;
        ctx.stroke();
      }

      // 2. Subtle geometric constellation nodes & hairline connectors
      const maxLinkDist = 148;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (!reducedMotion) {
          n.x += n.vx;
          n.y += n.vy;

          if (n.x < -10) n.x = width + 10;
          if (n.x > width + 10) n.x = -10;
          if (n.y < -10) n.y = height + 10;
          if (n.y > height + 10) n.y = -10;
        }

        // Draw links to nearby nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxLinkDist) {
            const strength = (1 - dist / maxLinkDist) * 0.16;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(m.x, m.y);
            ctx.strokeStyle = `rgba(148, 163, 184, ${strength.toFixed(3)})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }

        // Subtle link to cursor when hovering hero
        if (pointer.active) {
          const pdx = n.x - pointer.x;
          const pdy = n.y - pointer.y;
          const pdist = Math.hypot(pdx, pdy);
          if (pdist < 175) {
            const pStrength = (1 - pdist / 175) * 0.3;
            ctx.beginPath();
            ctx.moveTo(n.x, n.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.strokeStyle = `rgba(16, 185, 129, ${pStrength.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }

        // Draw node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226, 232, 240, ${n.alpha.toFixed(2)})`;
        ctx.fill();
      }

      if (!reducedMotion) {
        time += 0.012;
        animationFrameId = window.requestAnimationFrame(drawFrame);
      }
    };

    resize();
    drawFrame();

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    canvas.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handlePointerMove);
      canvas.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
    >
      {/* Base Deep Architectural Obsidian Surface */}
      <div className="absolute inset-0 bg-[#070B14]" />

      {/* Subtle Architectural Perspective Grid with Soft Edge Fade */}
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 42%, black 25%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 70% at 50% 42%, black 25%, transparent 100%)',
        }}
      />

      {/* Ambient Drifting Atmospheric Light Orbs (GPU-composited transform/opacity only) */}
      <div className="animate-hero-aurora absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-emerald-500/20 blur-[130px]" />
      <div className="animate-hero-aurora-alt absolute -bottom-36 right-[-8%] w-[560px] h-[560px] rounded-full bg-sky-500/15 blur-[140px]" />
      <div className="animate-hero-aurora absolute top-1/3 left-[42%] w-[360px] h-[360px] rounded-full bg-teal-400/10 blur-[120px]" />

      {/* Subtle Diagonal Light Sweep */}
      <div className="animate-hero-beam absolute inset-y-0 left-0 w-[34%] bg-gradient-to-r from-transparent via-emerald-400/10 to-transparent" />

      {/* Interactive 60fps Canvas: Flowing Wave Ribbons + Constellation Nodes */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Bottom Edge Scrim for Clean Transition */}
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#070B14] to-transparent" />
    </div>
  );
};
