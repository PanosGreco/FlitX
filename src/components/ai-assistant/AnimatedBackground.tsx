import { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      // Clear with white background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Draw flowing gradients
      const gradient1 = ctx.createRadialGradient(
        width * 0.3 + Math.sin(time * 0.5) * 100,
        height * 0.4 + Math.cos(time * 0.3) * 80,
        0,
        width * 0.3,
        height * 0.4,
        width * 0.5
      );
      gradient1.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
      gradient1.addColorStop(0.5, 'rgba(96, 165, 250, 0.08)');
      gradient1.addColorStop(1, 'rgba(59, 130, 246, 0)');

      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);

      const gradient2 = ctx.createRadialGradient(
        width * 0.7 + Math.cos(time * 0.4) * 120,
        height * 0.6 + Math.sin(time * 0.6) * 100,
        0,
        width * 0.7,
        height * 0.6,
        width * 0.4
      );
      gradient2.addColorStop(0, 'rgba(37, 99, 235, 0.12)');
      gradient2.addColorStop(0.5, 'rgba(59, 130, 246, 0.06)');
      gradient2.addColorStop(1, 'rgba(37, 99, 235, 0)');

      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Subtle wave effect
      const gradient3 = ctx.createLinearGradient(
        0,
        height * 0.5 + Math.sin(time * 0.2) * 50,
        width,
        height * 0.5 + Math.cos(time * 0.2) * 50
      );
      gradient3.addColorStop(0, 'rgba(59, 130, 246, 0.03)');
      gradient3.addColorStop(0.5, 'rgba(147, 197, 253, 0.05)');
      gradient3.addColorStop(1, 'rgba(59, 130, 246, 0.03)');

      ctx.fillStyle = gradient3;
      ctx.fillRect(0, 0, width, height);

      time += 0.01;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.8 }}
    />
  );
}
