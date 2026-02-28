import { useState, useEffect, useRef } from "react";

export default function StarMap() {
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