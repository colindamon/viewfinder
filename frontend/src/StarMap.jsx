import { useState, useEffect, useRef, useCallback } from "react";

export default function StarMap() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [stars, setStars] = useState([]);

  // Resize canvas to fill window
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Fetch stars from board
  useEffect(() => {
    async function fetchStars() {
      try {
        const res = await fetch("http://127.0.0.1:1714/stars");
        const data = await res.json();
        setStars(data);
      } catch (e) {
        console.error("Failed to fetch stars:", e);
      }
    }
    fetchStars();

    // Poll every 100ms for live updates
    const interval = setInterval(fetchStars, 100);
    return () => clearInterval(interval);
  }, []);

  // Draw stars
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stars.length === 0) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    stars.forEach((star) => {
      // Support both [x, y] arrays and {x, y} objects
      const rawX = Array.isArray(star) ? star[0] : star.x;
      const rawY = Array.isArray(star) ? star[1] : star.y;

      // Scale from -1..1 to canvas pixels
      // x: -1 = left edge, 1 = right edge
      // y: -1 = bottom, 1 = top (flip because canvas y goes down)
      const x = ((rawX + 1) / 2) * W;
      const y = ((1 - rawY) / 2) * H;

      // Filter out stars outside the canvas
      if (x < 0 || x > W || y < 0 || y > H) return;

      const radius = Math.random() * 1.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
      ctx.fill();
    });
  }, [stars, dimensions]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden bg-black p-0 m-0"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}