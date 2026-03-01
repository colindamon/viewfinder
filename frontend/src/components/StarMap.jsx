import { useState, useEffect, useRef } from "react";

/** Accepts only object shape { name?, hip?, x, y, radius?, color? }. Returns normalized { name, hip, x, y, radius, color }. */
export function normalizeStar(s) {
  if (!s || typeof s !== "object" || Array.isArray(s) || !("x" in s) || !("y" in s)) {
    return { name: "", hip: null, x: 0, y: 0, radius: 0.5, color: "#ffffff" };
  }
  const name = s.name ?? s.star_name ?? s.id ?? (typeof s.label === "string" ? s.label : "");
  const hip = s.hip != null ? s.hip : null;
  return {name: String(name), hip, x: s.x, y: s.y, radius: s.radius ?? 0.5,color: s.color ?? s.hex ?? "#ffffff",};
}

const STARS_API = "http://127.0.0.1:8521/stars";

export default function StarMap({
  selectedStarIds = [],
  stars: starsProp,
  constellations = [],
  selectedConstellationIds = [],
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

  // Fetch stars from board
  useEffect(() => {
    async function fetchStars() {
      try {
        const res = await fetch(STARS_API);
        const data = await res.json();
        setStars(Array.isArray(data) ? data : []);
      } catch (e) {
        setStars([[-0.40576192514494985,0.3451111084649369],[-0.5914978540804372,-0.7170030954421401],[-0.9715462205914551,0.04160203304070043],[0.8925463904539088,-0.6158671253788274],[0.4604050572889368,0.5637755523177171],[0.7070173049830311,0.41953878931256233],[-0.3182887343855583,-0.20729725643554178],[-0.15258534173148663,0.18172757923542407],[0.5421084429434894,0.546159425819435],[0.8092228438483666,-0.19044099176711396],[-0.2227576299841516,-0.42689203616808336],[0.9674622779441048,0.8341517178140798],[-0.43626106836419676,0.3639821508952296],[-0.43631792662357305,0.3639983814603577],[0.8954056725793402,-0.16502271896648868],[0.014327519982456616,-0.8780088818630097],[-0.38612883826731537,-0.1788180517829953],[0.5539584440503244,0.023679934073593076],[0.07546590069957947,0.7847255000205945],[-0.6803503908174705,-0.5354039078591697],[-0.25911721616297867,0.9412512816865602],[-0.495499038709325,0.23308428535764028]]);
        console.error("Failed to fetch stars:", e);
      }
    }
    fetchStars();

    // Poll every 100ms for live updates
    const interval = setInterval(fetchStars, 100);
    return () => clearInterval(interval);
  }, [starsProp]);

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

    // Constellation lines (draw before stars so stars sit on top)
    const selectedConIds = Array.isArray(selectedConstellationIds) ? selectedConstellationIds : [];
    const conList = Array.isArray(constellations) ? constellations : [];
    const hipToStar = new Map(stars.map((s) => [s.hip, s]));
    conList
      .filter((c) => c && c.hip_ids && selectedConIds.includes(c.constellation_id))
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

      const radius = 1 * 1.5 + 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${1 * 0.5 + 0.5})`;
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

    // Constellation name under the first star of each selected constellation
    conList
      .filter((c) => c && c.hip_ids && c.name && selectedConIds.includes(c.constellation_id))
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
  }, [stars, dimensions, selectedStarIds, selectedConstellationIds, constellations, hoveredStar]);

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