"use client";

import { useEffect, useRef } from "react";

type Particle = {
  angle0: number;
  r0: number;
  speed: number;
  phase: number;
  dot: number;
  alpha: number;
};

function parsePrimaryRgb(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim();
  if (raw.startsWith("#")) {
    const hex = raw.slice(1);
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  const m = raw.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }
  return [139, 92, 246];
}

function rebuildParticles(w: number, h: number): Particle[] {
  const base = Math.min(w, h);
  const n = w < 640 ? 42 : 58;
  const golden = 2.39996322972865332;
  /* Tighter radius band so the swarm reads a bit denser / closer together. */
  return Array.from({ length: n }, (_, i) => ({
    angle0: i * golden + Math.random() * 2.1,
    r0: base * (0.14 + Math.random() * 0.26),
    speed: 0.2 + Math.random() * 0.16,
    phase: Math.random() * Math.PI * 2,
    dot: 0.85 + Math.random() * 0.5,
    alpha: 0.38 + Math.random() * 0.42,
  }));
}

export function HeroParticleField() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedRef = useRef(false);
  const pointerRef = useRef({ nx: 0.55, ny: 0.45 });
  const centerRef = useRef({ x: 0, y: 0 });
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1 });
  const rgbRef = useRef<[number, number, number]>([139, 92, 246]);
  const frameRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMq = () => {
      reducedRef.current = mq.matches;
    };
    syncMq();
    mq.addEventListener("change", syncMq);
    return () => mq.removeEventListener("change", syncMq);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let running = false;
    let lastNow = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
      const { width, height } = wrap.getBoundingClientRect();
      sizeRef.current = { w: width, h: height, dpr };
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particlesRef.current = rebuildParticles(width, height);
      centerRef.current = {
        x: width * pointerRef.current.nx,
        y: height * pointerRef.current.ny,
      };
      rgbRef.current = parsePrimaryRgb();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const onPointer = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      pointerRef.current.nx = Math.min(
        1,
        Math.max(0, (e.clientX - r.left) / Math.max(r.width, 1)),
      );
      pointerRef.current.ny = Math.min(
        1,
        Math.max(0, (e.clientY - r.top) / Math.max(r.height, 1)),
      );
    };

    window.addEventListener("pointermove", onPointer, { passive: true });

    const loop = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - lastNow) / 1000, 0.055);
      lastNow = now;

      const { w, h } = sizeRef.current;
      frameRef.current += 1;
      if (frameRef.current % 48 === 0) {
        rgbRef.current = parsePrimaryRgb();
      }

      const t = now * 0.001;
      const reduced = reducedRef.current;
      const tx = pointerRef.current.nx * w;
      const ty = pointerRef.current.ny * h;
      const stiffness = reduced ? 2.2 : 0.62;
      const k = 1 - Math.exp(-stiffness * dt);
      centerRef.current.x += (tx - centerRef.current.x) * k;
      centerRef.current.y += (ty - centerRef.current.y) * k;

      const cx = centerRef.current.x;
      const cy = centerRef.current.y;
      const mx = tx;
      const my = ty;
      const [pr, pg, pb] = rgbRef.current;
      const particles = particlesRef.current;

      ctx.clearRect(0, 0, w, h);

      const speedScale = reduced ? 0.25 : 1;
      const pulseAmp = reduced ? 0.03 : 0.09;
      const baseMin = Math.min(w, h);
      const sigma = baseMin * 0.175;
      const pushCap = baseMin * 0.26;

      for (const p of particles) {
        const ang = p.angle0 + t * p.speed * speedScale;
        const pulse = 1 + pulseAmp * Math.sin(t * 0.65 + p.phase);
        const r = p.r0 * pulse;
        let px = cx + Math.cos(ang) * r;
        let py = cy + Math.sin(ang) * r;

        if (!reduced) {
          const dx = px - mx;
          const dy = py - my;
          const d = Math.max(Math.hypot(dx, dy), 1e-4);
          const push = pushCap * Math.exp(-d / sigma);
          px += (dx / d) * push;
          py += (dy / d) * push;
        }

        if (px < -8 || px > w + 8 || py < -8 || py > h + 8) continue;

        const a = p.alpha * (reduced ? 0.75 : 1);
        ctx.beginPath();
        ctx.fillStyle = `rgba(${pr},${pg},${pb},${a})`;
        ctx.arc(px, py, p.dot, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastNow = performance.now();
      rafRef.current = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries[0]?.isIntersecting ?? true;
        if (vis) start();
        else stop();
      },
      { threshold: 0, rootMargin: "80px" },
    );
    io.observe(wrap);
    start();

    return () => {
      stop();
      window.removeEventListener("pointermove", onPointer);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className="pointer-events-none absolute inset-0 bg-background"
      aria-hidden
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block h-full w-full"
      />
      <div className="hero-particles-glow pointer-events-none" aria-hidden />
    </div>
  );
}
