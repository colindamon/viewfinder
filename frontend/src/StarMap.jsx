import { useState, useEffect, useRef } from "react";

const MOCK_STARS = Array.from({ length: 80 }, () => ({
  x: Math.random() * 800,
  y: Math.random() * 600
}));

export default function StarMap() {
  const canvasRef = useRef(null);
  const [stars, setStars] = useState([]);

  // Replace this with your actual fetch call
  useEffect(() => {
    async function fetchStars() {
      const res = await fetch("/api/stars");
      const data = await res.json(); // expects [{ x, y }, ...] or [[x, y], ...]
      setStars(data);

    //   setStars(MOCK_STARS); // remove when using real data
    }
    fetchStars();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || stars.length === 0) return;

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    // Clear
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Draw stars
    stars.forEach((star) => {
      // Support both { x, y } objects and [x, y] arrays from the backend
      const x = Array.isArray(star) ? star[0] : star.x;
      const y = Array.isArray(star) ? star[1] : star.y;

      const radius = Math.random() * 1.5 + 0.5;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
      ctx.fill();
    });
  }, [stars]);

  return (
    <div
      style={{
        background: "#000",
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: "block" }}
      />
    </div>
  );
}