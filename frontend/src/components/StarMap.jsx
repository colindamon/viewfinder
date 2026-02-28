import { useState, useEffect, useRef } from "react";

// Array of { name, x, y, radius (0–1), color }
const tmp_star_data = [
  { name: "Sirius", x: -0.406, y: 0.345, radius: 0.9, color: "#ffffff" },
  { name: "Canopus", x: -0.591, y: -0.717, radius: 0.85, color: "#f0f4ff" },
  { name: "Arcturus", x: -0.972, y: 0.042, radius: 0.7, color: "#fff4e6" },
  { name: "Vega", x: 0.893, y: -0.616, radius: 0.8, color: "#e8f4ff" },
  { name: "Capella", x: 0.460, y: 0.564, radius: 0.75, color: "#fff8dc" },
  { name: "Rigel", x: 0.707, y: 0.420, radius: 0.95, color: "#e6f2ff" },
  { name: "Procyon", x: -0.318, y: -0.207, radius: 0.65, color: "#f5f5ff" },
  { name: "Betelgeuse", x: -0.153, y: 0.182, radius: 0.88, color: "#ffddd0" },
  { name: "Altair", x: 0.542, y: 0.546, radius: 0.7, color: "#faf0e6" },
  { name: "Aldebaran", x: 0.809, y: -0.190, radius: 0.78, color: "#ffebcd" },
  { name: "Spica", x: -0.223, y: -0.427, radius: 0.6, color: "#e0f0ff" },
  { name: "Antares", x: 0.967, y: 0.834, radius: 0.82, color: "#FF69B4" },
  { name: "Pollux", x: -0.436, y: 0.364, radius: 0.68, color: "#fff0e6" },
  { name: "Fomalhaut", x: -0.436, y: 0.364, radius: 0.55, color: "#f0f8ff" },
  { name: "Deneb", x: 0.895, y: -0.165, radius: 0.92, color: "#e6f0ff" },
  { name: "Regulus", x: 0.014, y: -0.878, radius: 0.72, color: "#fff5ee" },
  { name: "Castor", x: -0.386, y: -0.179, radius: 0.58, color: "#f8f8ff" },
  { name: "Bellatrix", x: 0.554, y: 0.024, radius: 0.62, color: "#e8eeff" },
  { name: "Algol", x: 0.075, y: 0.785, radius: 0.5, color: "#f5f5f5" },
  { name: "Mira", x: -0.680, y: -0.535, radius: 0.45, color: "#ffd4c4" },
  { name: "Polaris", x: -0.259, y: 0.941, radius: 0.74, color: "#f0f4ff" },
  { name: "Alcyone", x: -0.495, y: 0.233, radius: 0.52, color: "#e6eeff" },
];

function normalizeStar(s) {
  if (s && typeof s === "object" && !Array.isArray(s) && "x" in s && "y" in s)
    return { name: s.name ?? "", x: s.x, y: s.y, radius: s.radius ?? 0.5, color: s.color ?? s.hex ?? "#ffffff" };
  if (Array.isArray(s)) {
    if (s.length >= 5) return { name: s[0], x: s[1], y: s[2], radius: s[3], color: s[4] };
    if (s.length >= 2) return { name: "", x: s[0], y: s[1], radius: 0.5, color: "#ffffff" };
  }
  return { name: "", x: 0, y: 0, radius: 0.5, color: "#ffffff" };
}

export default function StarMap({ selectedStarNames = [] }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [stars, setStars] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Size canvas to container
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

  // Fetch stars from board
  useEffect(() => {
    async function fetchStars() {
      try {
        const res = await fetch("http://127.0.0.1:8521/stars");
        const data = await res.json();
        const list = Array.isArray(data) ? data : tmp_star_data;
        setStars(list.map((s) => normalizeStar(s)));
      } catch (e) {
        setStars(tmp_star_data);
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
    if (!canvas || !Array.isArray(stars) || stars.length === 0) return;

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);

    const showLabels = Array.isArray(selectedStarNames) && selectedStarNames.length > 0;
    stars.forEach((star) => {
      const rawX = star.x ?? 0;
      const rawY = star.y ?? 0;
      const radiusNorm = star.radius ?? 0.5;
      const color = star.color ?? star.hex ?? "#ffffff";

      const x = ((rawX + 1) / 2) * W;
      const y = ((1 - rawY) / 2) * H;

      if (x < 0 || x > W || y < 0 || y > H) return;

      const radius = Math.max(0.5, radiusNorm * 3);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (showLabels && star.name && selectedStarNames.includes(star.name)) {
        ctx.font = "14px 'Sour Gummy', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillText(star.name, x, y + radius + 4);
      }
    });
  }, [stars, dimensions, selectedStarNames]);

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