// Refactored /hormones simulator page: PK model, clinical units, full-page responsive graph, and removed the text below the graph that displayed hormone/ether info.
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "../../components/ui/input";

// Expanded list of ethers for both hormones, with PK defaults
const ETHERS = [
  // Testosterone ethers (ng/dL)
  { hormone: "Testosterone", name: "Testosterone Enanthate", halfLife: 4.5, ka: 1.2, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Cypionate", halfLife: 8, ka: 1.0, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Propionate", halfLife: 0.8, ka: 1.5, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Undecanoate", halfLife: 20.9, ka: 0.7, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Isocaproate", halfLife: 4, ka: 1.2, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Phenylpropionate", halfLife: 1.5, ka: 1.3, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Decanoate", halfLife: 15, ka: 0.8, Vd: 70, F: 1 },
  { hormone: "Testosterone", name: "Testosterone Acetate", halfLife: 0.7, ka: 1.7, Vd: 70, F: 1 },
  // Estradiol ethers (pg/mL)
  { hormone: "Estradiol", name: "Estradiol Valerate", halfLife: 3.5, ka: 1.2, Vd: 70, F: 1 },
  { hormone: "Estradiol", name: "Estradiol Cypionate", halfLife: 8, ka: 1.0, Vd: 70, F: 1 },
  { hormone: "Estradiol", name: "Estradiol Benzoate", halfLife: 0.5, ka: 1.7, Vd: 70, F: 1 },
  { hormone: "Estradiol", name: "Estradiol Enanthate", halfLife: 4.5, ka: 1.2, Vd: 70, F: 1 },
  { hormone: "Estradiol", name: "Estradiol Acetate", halfLife: 0.7, ka: 1.7, Vd: 70, F: 1 },
  { hormone: "Estradiol", name: "Estradiol Undecylate", halfLife: 14, ka: 0.8, Vd: 70, F: 1 },
  { hormone: "Estradiol", name: "Estradiol Hexahydrobenzoate", halfLife: 11, ka: 0.9, Vd: 70, F: 1 },
];

// PK model: one-compartment, first-order absorption and elimination
function pkConcentration({ Dose, ka, ke, Vd, F, t }: { Dose: number; ka: number; ke: number; Vd: number; F: number; t: number }) {
  // C(t) = (F * Dose * ka) / (Vd * (ka - ke)) * (e^{-ke t} - e^{-ka t})
  if (ka === ke) ke *= 0.999; // avoid div by zero
  return (F * Dose * ka) / (Vd * (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
}

export default function HormonesPage() {
  const [selectedEther, setSelectedEther] = useState<typeof ETHERS[0] | undefined>(ETHERS[0]);
  const [dose, setDose] = useState(50);
  const [days, setDays] = useState(21);
  const [repeatInterval, setRepeatInterval] = useState<number | undefined>(undefined);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 1200, height: 500 });

  // Responsive graph sizing
  useEffect(() => {
    function handleResize() {
      if (graphContainerRef.current) {
        const rect = graphContainerRef.current.getBoundingClientRect();
        setGraphSize({
          width: Math.max(400, rect.width),
          height: Math.max(300, rect.height),
        });
      }
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!selectedEther) {
    return (
      <div className="min-h-screen w-full bg-black text-white font-mono flex items-center justify-center">
        <div className="text-xl">No ether selected. Please refresh the page.</div>
      </div>
    );
  }

  // PK params
  const { halfLife, ka, Vd, F } = selectedEther;
  const ke = Math.log(2) / halfLife;

  // Calculate plasma concentrations for each day (sum repeated doses)
  const levels = Array.from({ length: days + 1 }, (_, day) => {
    let conc = 0;
    if (repeatInterval && repeatInterval > 0) {
      for (let d = 0; d <= day; d += repeatInterval) {
        conc += pkConcentration({ Dose: dose, ka, ke, Vd, F, t: day - d });
      }
    } else {
      conc = pkConcentration({ Dose: dose, ka, ke, Vd, F, t: day });
    }
    return { day, conc };
  });

  // Convert to clinical units
  let displayLevels: number[] = [];
  let yLabel = "";
  let tooltipUnit = "";
  let secondaryUnit = "";
  let secondaryLevels: number[] | undefined = undefined;
  if (selectedEther.hormone === "Estradiol") {
    // ng/mL to pg/mL: 1 ng/mL = 1000 pg/mL
    displayLevels = levels.map(l => l.conc * 1000);
    secondaryLevels = displayLevels.map(pg => pg * 3.67); // pmol/L
    yLabel = "estradiol (pg/mL)";
    tooltipUnit = "pg/mL";
    secondaryUnit = "pmol/L";
  } else {
    // ng/mL to ng/dL: 1 ng/mL = 100 ng/dL
    displayLevels = levels.map(l => l.conc * 100);
    yLabel = "testosterone (ng/dL)";
    tooltipUnit = "ng/dL";
  }
  const maxDisplayLevel = Math.max(...displayLevels);

  // Use graphSize for SVG
  const width = graphSize.width;
  const height = graphSize.height;
  const padding = 70;
  const graphAreaWidth = width - 2 * padding;
  const graphAreaHeight = height - 2 * padding;

  // X/Y scale helpers
  const getX = (day: number) => padding + (day / days) * graphAreaWidth;
  const getY = (level: number) => padding + graphAreaHeight - (maxDisplayLevel === 0 ? 0 : (level / maxDisplayLevel) * graphAreaHeight);

  // Polyline points for the hormone curve
  const graphPoints = displayLevels.map((v, i) => `${getX(i)},${getY(v)}`).join(" ");

  // Calculate injection markers if repeatInterval is set
  let injectionMarkers: { x: number; day: number }[] = [];
  if (repeatInterval && repeatInterval > 0) {
    for (let d = 0; d <= days; d += repeatInterval) {
      injectionMarkers.push({ x: getX(d), day: d });
    }
  }

  // Axis ticks
  const yTicks = 6;
  const xTicks = Math.min(days, 10);
  const yTickVals = Array.from({ length: yTicks }, (_, i) => maxDisplayLevel * (1 - i / (yTicks - 1)));
  const xTickVals = Array.from({ length: xTicks + 1 }, (_, i) => Math.round((days * i) / xTicks));

  // Mouse hover logic
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const rect = (e.target as SVGSVGElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding;
    if (mouseX < 0 || mouseX > graphAreaWidth) {
      setHoverIdx(null);
      return;
    }
    const day = Math.round((mouseX / graphAreaWidth) * days);
    setHoverIdx(Math.max(0, Math.min(days, day)));
  }

  function handleMouseLeave() {
    setHoverIdx(null);
  }

  return (
    <div className="min-h-screen w-full bg-black text-white font-mono text-base flex flex-row">
      {/* Sidebar settings */}
      <aside className="w-full md:w-80 p-6 border-r-4 border-black flex flex-col gap-8 min-h-screen justify-start bg-gray-900" style={{ maxWidth: 350 }}>
        <h2 className="text-2xl font-bold lowercase mb-4 tracking-widest">settings</h2>
        <div className="flex flex-col gap-4">
          <label className="lowercase">hormone + ether</label>
          <select
            className="border-2 border-black bg-black text-white px-3 py-2 mb-2"
            value={selectedEther.name}
            onChange={e => {
              const ether = ETHERS.find(et => et.name === e.target.value);
              setSelectedEther(ether);
            }}
          >
            {ETHERS.map(e => (
              <option key={e.name} value={e.name}>{e.hormone} — {e.name} (t½ {e.halfLife}d)</option>
            ))}
          </select>
          <label className="lowercase">dose (mg)</label>
          <Input
            type="number"
            value={dose}
            min={0}
            placeholder={dose.toString()}
            onChange={e => setDose(Number(e.target.value))}
            className="mb-2"
          />
          <label className="lowercase">days to simulate</label>
          <Input
            type="number"
            value={days}
            min={1}
            max={180}
            onChange={e => setDays(Number(e.target.value))}
            className="mb-2"
          />
          <label className="lowercase">repeat dosage (days)</label>
          <Input
            type="number"
            value={repeatInterval === undefined ? "" : repeatInterval}
            min={1}
            max={60}
            placeholder="leave blank for single dose"
            onChange={e => {
              const val = e.target.value;
              setRepeatInterval(val === "" ? undefined : Math.max(1, Number(val)));
            }}
            className="mb-2"
          />
        </div>
        <div className="text-gray-400 font-mono lowercase mt-6 text-xs">
          this is a simple exponential decay model. it does not account for absorption delays, metabolism, or individual variation. for educational use only.
        </div>
      </aside>
      {/* Main content: Full-page responsive graph */}
      <main className="flex-1 flex flex-col items-center justify-center p-0 m-0 h-screen">
        <h1 className="text-3xl font-bold mb-6 lowercase">hormone injection simulator</h1>
        <div ref={graphContainerRef} className="flex-1 w-full h-[calc(100vh-5rem)] bg-black border-2 border-black rounded-lg flex flex-col items-center justify-center p-0 m-0" style={{ minHeight: 300 }}>
          <div className="relative w-full h-full" style={{ height: "100%" }}>
            <svg
              width={width}
              height={height}
              className="bg-gray-900 rounded"
              style={{ width: "100%", height: "100%" }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Y axis grid and labels */}
              {yTickVals.map((y, i) => (
                <g key={i}>
                  <line
                    x1={padding}
                    y1={getY(y)}
                    x2={width - padding}
                    y2={getY(y)}
                    stroke="#444"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={padding - 10}
                    y={getY(y) + 5}
                    fill="#fff"
                    fontSize={16}
                    textAnchor="end"
                  >
                    {y.toFixed(0)}
                  </text>
                </g>
              ))}
              {/* Y axis label */}
              <text
                x={padding - 50}
                y={padding + 10}
                fill="#fff"
                fontSize={18}
                textAnchor="start"
                transform={`rotate(-90,${padding - 50},${padding + 10})`}
                style={{ fontWeight: "bold" }}
              >
                {yLabel}
              </text>
              {/* X axis grid and labels */}
              {xTickVals.map((x, i) => (
                <g key={i}>
                  <line
                    x1={getX(x)}
                    y1={padding}
                    x2={getX(x)}
                    y2={height - padding}
                    stroke="#444"
                    strokeDasharray="2 4"
                  />
                  <text
                    x={getX(x)}
                    y={height - padding + 30}
                    fill="#fff"
                    fontSize={16}
                    textAnchor="middle"
                  >
                    {x}
                  </text>
                </g>
              ))}
              {/* Axes */}
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#fff" strokeWidth={2} />
              <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#fff" strokeWidth={2} />
              {/* Injection markers */}
              {injectionMarkers.map(marker => (
                <g key={marker.day}>
                  <line
                    x1={marker.x}
                    y1={padding}
                    x2={marker.x}
                    y2={height - padding}
                    stroke="#fbbf24"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    opacity={0.7}
                  />
                  <circle
                    cx={marker.x}
                    cy={height - padding}
                    r={4}
                    fill="#fbbf24"
                    opacity={0.7}
                  />
                </g>
              ))}
              {/* Graph line */}
              <polyline
                fill="none"
                stroke={selectedEther.hormone === "Testosterone" ? "#60a5fa" : "#f472b6"}
                strokeWidth={4}
                points={graphPoints}
              />
              {/* Hover marker and tooltip */}
              {hoverIdx !== null && displayLevels[hoverIdx] !== undefined && levels[hoverIdx] !== undefined && (
                <g>
                  {/* Vertical hover line */}
                  <line
                    x1={getX(hoverIdx)}
                    y1={padding}
                    x2={getX(hoverIdx)}
                    y2={height - padding}
                    stroke="#fff"
                    strokeDasharray="2 2"
                    strokeWidth={2}
                    opacity={0.7}
                  />
                  {/* Marker dot */}
                  <circle
                    cx={getX(hoverIdx)}
                    cy={getY(displayLevels[hoverIdx])}
                    r={8}
                    fill="#fff"
                    stroke={selectedEther.hormone === "Testosterone" ? "#60a5fa" : "#f472b6"}
                    strokeWidth={4}
                  />
                  {/* Tooltip */}
                  <rect
                    x={getX(hoverIdx) - 70}
                    y={getY(displayLevels[hoverIdx]) - 70}
                    width={140}
                    height={secondaryLevels && secondaryLevels[hoverIdx] !== undefined ? 70 : 48}
                    rx={10}
                    fill="#222"
                    stroke="#fff"
                    strokeWidth={1}
                    opacity={0.95}
                  />
                  <text
                    x={getX(hoverIdx)}
                    y={getY(displayLevels[hoverIdx]) - (secondaryLevels && secondaryLevels[hoverIdx] !== undefined ? 50 : 40)}
                    fill="#fff"
                    fontSize={18}
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    day {levels[hoverIdx].day}
                  </text>
                  <text
                    x={getX(hoverIdx)}
                    y={getY(displayLevels[hoverIdx]) - (secondaryLevels && secondaryLevels[hoverIdx] !== undefined ? 28 : 18)}
                    fill="#fff"
                    fontSize={16}
                    textAnchor="middle"
                  >
                    {displayLevels[hoverIdx].toFixed(0)} {tooltipUnit}
                  </text>
                  {secondaryLevels && secondaryLevels[hoverIdx] !== undefined && (
                    <text
                      x={getX(hoverIdx)}
                      y={getY(displayLevels[hoverIdx]) - 8}
                      fill="#fff"
                      fontSize={14}
                      textAnchor="middle"
                    >
                      {secondaryLevels[hoverIdx].toFixed(0)} {secondaryUnit}
                    </text>
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
} 