"use client";
import { useEffect, useRef } from "react";

type Star = { x: number; y: number; r: number; depth: number; phase: number; speed: number };
type Meteor = { x: number; y: number; vx: number; vy: number; life: number };

// Full-screen drifting, twinkling stars with an occasional shooting star. Static when reduced motion is preferred.
export function Starfield() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0, height = 0, stars: Star[] = [], meteor: Meteor | null = null, nextMeteor = 4000, frame = 0, last = performance.now();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      el.width = width * dpr; el.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(420, Math.round(width * height / 4200));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();
        return { x: Math.random() * width, y: Math.random() * height, r: 0.3 + depth * 1.3, depth, phase: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 1.6 };
      });
    };
    const draw = (now: number) => {
      const dt = Math.min(now - last, 50); last = now;
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        if (!still) {
          s.x -= (0.004 + s.depth * 0.012) * dt;
          s.y -= (0.002 + s.depth * 0.006) * dt;
          if (s.x < -2) s.x = width + 2;
          if (s.y < -2) s.y = height + 2;
        }
        const twinkle = still ? 0.8 : 0.55 + 0.45 * Math.sin(now / 1000 * s.speed + s.phase);
        ctx.globalAlpha = (0.25 + s.depth * 0.75) * twinkle;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
      }
      if (!still) {
        nextMeteor -= dt;
        if (!meteor && nextMeteor <= 0) {
          meteor = { x: width * (0.3 + Math.random() * 0.7), y: height * Math.random() * 0.4, vx: -(0.6 + Math.random() * 0.4), vy: 0.25 + Math.random() * 0.2, life: 1 };
          nextMeteor = 6000 + Math.random() * 9000;
        }
        if (meteor) {
          meteor.x += meteor.vx * dt; meteor.y += meteor.vy * dt; meteor.life -= dt / 1100;
          const tail = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x - meteor.vx * 140, meteor.y - meteor.vy * 140);
          tail.addColorStop(0, "rgba(255,255,255,0.9)"); tail.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalAlpha = Math.max(meteor.life, 0); ctx.strokeStyle = tail; ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.moveTo(meteor.x, meteor.y); ctx.lineTo(meteor.x - meteor.vx * 140, meteor.y - meteor.vy * 140); ctx.stroke();
          if (meteor.life <= 0) meteor = null;
        }
        frame = requestAnimationFrame(draw);
      }
      ctx.globalAlpha = 1;
    };
    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvas} className="starfield" aria-hidden="true" />;
}
