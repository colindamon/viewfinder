import { useMemo } from "react";

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function StarLoader({ message = "Loading" }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: randomBetween(-85, 85),
        y: randomBetween(-85, 85),
        size: randomBetween(2, 5),
        delay: randomBetween(0, 2.5),
        duration: randomBetween(1.5, 3),
      })),
    []
  );

  return (
    <div className="relative bg-black inline-flex h-40 w-40 items-center justify-center">
      {/* Twinkling stars scattered around center */}
      <div className="absolute inset-0">
        {stars.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full bg-[#e8d5a3]"
            style={{
              left: `calc(50% + ${s.x}px)`,
              top: `calc(50% + ${s.y}px)`,
              width: s.size,
              height: s.size,
              boxShadow: `0 0 ${s.size * 2}px #c4a55a`,
              animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Central star + label */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <div
          className="text-4xl leading-none text-[#c4a55a] drop-shadow-[0_0_12px_rgba(196,165,90,0.5)]"
          style={{ animation: "pulse 2s ease-in-out infinite" }}
        >
          ✦
        </div>
        <p className="loading-dots font-sour-gummy text-[11px] font-normal uppercase tracking-[0.2em] text-[#c4a55a]">
          {message}
        </p>
      </div>
    </div>
  );
}
