import { useState, useEffect, useRef } from "react";

/** Draws a rounded 5-pointed star path centered at (cx, cy) with outer radius R. Uses inner radius 0.4*R. */
function drawRoundedStarPath(ctx, cx, cy, R) {
  const r = R * 0.4;
  const points = [];
  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const innerAngle = -Math.PI / 2 + Math.PI / 5 + (i * 2 * Math.PI) / 5;
    points.push({ x: cx + R * Math.cos(outerAngle), y: cy + R * Math.sin(outerAngle) });
    points.push({ x: cx + r * Math.cos(innerAngle), y: cy + r * Math.sin(innerAngle) });
  }
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const p = (i) => points[i % 10];
  ctx.moveTo(mid(p(9), p(0)).x, mid(p(9), p(0)).y);
  for (let i = 0; i < 10; i++) {
    const curr = p(i);
    const next = p(i + 1);
    ctx.quadraticCurveTo(curr.x, curr.y, mid(curr, next).x, mid(curr, next).y);
  }
  ctx.closePath();
}

/** Accepts only object shape { name?, hip?, x, y, radius?, color? }. Returns normalized { name, hip, x, y, radius, color }. */
export function normalizeStar(s) {
  if (!s || typeof s !== "object") {
    return { name: "", hip: null, x: 0, y: 0, radius: 0.5, color: "#ffffff" };
  }
  const name = s.name ?? s.star_name ?? s.id ?? (typeof s.label === "string" ? s.label : "");
  const hip = s.hip != null ? s.hip : null;
  return {name: String(name), hip:hip, x: s.x, y: s.y, radius: s.radius ?? 0.5,color: s.color ?? s.hex ?? "#ffffff",};
}

export default function StarMap({
  selectedStarIds = [],
  stars: starsProp,
  constellations = [],
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredStar, setHoveredStar] = useState(null);
  
  const stars = starsProp !== undefined && Array.isArray(starsProp) ? starsProp : localStars;


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

  // Hit-test mouse and set hovered star
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !Array.isArray(stars) || stars.length === 0) return;
    const W = dimensions.width;
    const H = dimensions.height;
    const hitPadding = 12;

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found = null;
      let minDist = Infinity;
      for (const star of stars) {
        const x = ((star.x + 1) / 2) * W;
        const y = ((1 - star.y) / 2) * H;
        const radius = (star.radius ?? 0.5) * 4 + hitPadding;
        const dx = mx - x;
        const dy = my - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= radius && d < minDist) {
          minDist = d;
          found = star;
        }
      }
      setHoveredStar((prev) => (found === prev ? prev : found));
    };
    const handleLeave = () => setHoveredStar(null);
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("mouseleave", handleLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [stars, dimensions]);

  // Redraw whenever stars, dimensions, selection, constellation lines, or hover change
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

    // Constellation lines (draw before stars so stars sit on top); uses current constellations prop so updates are reflected
    const conList = Array.isArray(constellations) ? constellations : [];
    const hipToStar = new Map(stars.map((s) => [s.hip, s]));
    conList
      .filter((c) => c && c.hip_ids)
      .forEach((con) => {
        const ids = con.hip_ids;
        for (let i = 0; i + 1 < ids.length; i += 2) {
          const a = hipToStar.get(ids[i]);
          const b = hipToStar.get(ids[i + 1]);
          if (a && b) {
            const x1 = ((a.x + 1) / 2) * W;
            const y1 = ((1 - a.y) / 2) * H;
            const x2 = ((b.x + 1) / 2) * W;
            const y2 = ((1 - b.y) / 2) * H;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = "rgba(150, 180, 255, 0.7)";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      });

    const selectedIds = Array.isArray(selectedStarIds) ? selectedStarIds : [];
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

      const radiusNorm = star.radius ?? 0.5;
      const radius = Math.max(1, radiusNorm * 4);
      let fillColor = star.color ?? star.hex ?? "#ffffff";
      if (typeof fillColor === "string" && fillColor && fillColor[0] !== "#") {
        fillColor = "#" + fillColor;
      }
      // Subtle glow: radial gradient in star color
      let hex = fillColor.replace(/^#/, "");
      if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      const r = parseInt(hex.slice(0, 2), 16) || 255;
      const g = parseInt(hex.slice(2, 4), 16) || 255;
      const b = parseInt(hex.slice(4, 6), 16) || 255;
      const glowRadius = radius * 3.5;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      gradient.addColorStop(0, `rgba(${r},${g},${b},0.3)`);
      gradient.addColorStop(0.5, `rgba(${r},${g},${b},0.1)`);
      gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      // Star core (rounded 5-point star)
      ctx.beginPath();
      drawRoundedStarPath(ctx, x, y, radius*1.5);
      ctx.fillStyle = fillColor;
      ctx.fill();

      const starId = star.hip != null ? star.hip : null;
      const isSelected = star.name && starId != null && selectedIds.includes(starId);
      const isHovered = hoveredStar && star.name && (hoveredStar.name === star.name || (hoveredStar.hip != null && hoveredStar.hip === starId));
      if (star.name && (isSelected || isHovered)) {
        ctx.font = "14px 'Sour Gummy', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fillText(star.name, x, y + radius + 4);
      }
    });

    // Constellation name under the first star of each constellation
    conList
      .filter((c) => c && c.hip_ids && c.name)
      .forEach((con) => {
        const firstHip = con.hip_ids[0];
        const firstStar = firstHip != null ? hipToStar.get(firstHip) : null;
        if (!firstStar) return;
        const rawX = firstStar.x ?? 0;
        const rawY = firstStar.y ?? 0;
        const radiusNorm = firstStar.radius ?? 0.5;
        const x = ((rawX + 1) / 2) * W;
        const y = ((1 - rawY) / 2) * H;
        const radius = radiusNorm * 4;
        ctx.font = "12px 'Sour Gummy', cursive";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(150, 180, 255, 0.9)";
        ctx.fillText(con.name, x, y + radius + 18);
      });
  }, [stars, dimensions, selectedStarIds, constellations, hoveredStar]);

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