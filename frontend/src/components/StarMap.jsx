import { useState, useEffect, useRef } from "react";

const MOCK_STARS = Array.from({ length: 80 }, () => ({
  x: Math.random() * 800,
  y: Math.random() * 600
}));

export default function StarMap() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [stars, setStars] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () =>
      setDimensions({ width: el.clientWidth, height: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Replace this with your actual fetch call
  useEffect(() => {
    async function fetchStars() {
      // const res = await fetch("/api/stars");
      // const data = await res.json(); // expects [{ x, y }, ...] or [[x, y], ...]
      // setStars(data);

       setStars(MOCK_STARS); // remove when using real data
    }
    fetchStars();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stars.length === 0) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");

    // Clear
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const scaleX = width / 800;
    const scaleY = height / 600;

    // Draw stars
    stars.forEach((star) => {
      const x = (Array.isArray(star) ? star[0] : star.x) * scaleX;
      const y = (Array.isArray(star) ? star[1] : star.y) * scaleY;

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
      style={{
        background: "#000",
        width: "100%",
        height: "100%",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
        width={dimensions.width}
        height={dimensions.height}
      />
    </div>
  );
}