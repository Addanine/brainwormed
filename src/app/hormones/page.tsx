// Full UI redux: supports multiple regimens, each with its own hormone/ether, dose, interval, days, and personalized toggle. Redesigned layout with Cards for each regimen, ability to show multiple graphs at once, and a polished, modern UI using reusable components. Now uses a sepia color palette throughout the entire page, the graph area background is #f5ecd8, the graph always fits inside the user's screen, the graph area is no longer visually boxed in, the graph is visually shifted up for better balance, regimen cards are collapsible, and the legend is now in the sidebar to prevent text overlap.
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
// import { MeasurementSelect } from "../../components/ui/measurement-select"; // Removed
import { supabase } from "../../utils/supabaseClient";
import NavBar from "../../components/NavBar";

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

const COLORS = [
  "#60a5fa", // blue
  "#f472b6", // pink
  "#34d399", // green
  "#fbbf24", // yellow
  "#a78bfa", // purple
  "#f87171", // red
  "#38bdf8", // sky
  "#facc15", // amber
];

// PK model: one-compartment, first-order absorption and elimination
function pkConcentration({ Dose, ka, ke, Vd, F, t }: { Dose: number; ka: number; ke: number; Vd: number; F: number; t: number }) {
  // C(t) = (F * Dose * ka) / (Vd * (ka - ke)) * (e^{-ke t} - e^{-ka t})
  if (ka === ke) ke *= 0.999; // avoid div by zero
  return (F * Dose * ka) / (Vd * (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
}

type Ether = typeof ETHERS[number];
type Regimen = {
  id: string;
  ether: Ether;
  dose: number;
  days: number;
  repeatInterval?: number;
  usePersonalized: boolean;
  personalizedKe: number | null | undefined;
  loadingPersonalized: boolean;
};

function defaultRegimen(): Regimen {
  return {
    id: Math.random().toString(36).slice(2),
    ether: ETHERS[0]!,
    dose: 50,
    days: 21,
    usePersonalized: false,
    personalizedKe: undefined,
    loadingPersonalized: false,
  };
}

export default function HormonesPage() {
  const [regimens, setRegimens] = useState<Regimen[]>([defaultRegimen()]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphSize, setGraphSize] = useState({ width: 1200, height: 500 });
  const [expandedRegimenId, setExpandedRegimenId] = useState<string | null>(null);

  // Check auth state on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsSignedIn(!!data?.user?.id);
    });
  }, []);

  // Fetch personalized ke for each regimen if enabled
  useEffect(() => {
    regimens.forEach((reg, idx) => {
      const ether = reg.ether ?? ETHERS[0];
      if (!reg.usePersonalized || !isSignedIn) {
        if (reg.personalizedKe !== undefined || reg.loadingPersonalized) {
          setRegimens(rs => {
            if (rs[idx].personalizedKe === undefined && rs[idx].loadingPersonalized === false) return rs;
            return rs.map((r, i) => i === idx ? { ...r, personalizedKe: undefined, loadingPersonalized: false } : r);
          });
        }
        return;
      }
      if (!reg.loadingPersonalized && reg.personalizedKe === undefined) {
        setRegimens(rs => {
          if (rs[idx].loadingPersonalized) return rs;
          return rs.map((r, i) => i === idx ? { ...r, loadingPersonalized: true } : r);
        });
        (async () => {
          const { data: user } = await supabase.auth.getUser();
          const uuid = user?.user?.id;
          if (!uuid) {
            setRegimens(rs => {
              if (rs[idx].personalizedKe === undefined && rs[idx].loadingPersonalized === false) return rs;
              return rs.map((r, i) => i === idx ? { ...r, personalizedKe: undefined, loadingPersonalized: false } : r);
            });
            return;
          }
          const { data: bloodTests, error } = await supabase
            .from("blood_tests")
            .select("*")
            .eq("user_uuid", uuid)
            .eq("hormone", ether.hormone.toLowerCase());
          if (error || !bloodTests || bloodTests.length === 0) {
            setRegimens(rs => {
              if (rs[idx].personalizedKe === null && rs[idx].loadingPersonalized === false) return rs;
              return rs.map((r, i) => i === idx ? { ...r, personalizedKe: null, loadingPersonalized: false } : r);
            });
            return;
          }
          const etherNorm = (str: string) => str.toLowerCase().replace(/^(testosterone|estradiol)\s+/i, "").replace(/\s+/g, "");
          const selectedEtherNorm = etherNorm(ether.name);
          let filtered = bloodTests.filter((bt: any) => bt.ether && etherNorm(bt.ether) === selectedEtherNorm);
          if (filtered.length === 0) filtered = bloodTests;
          function estimateKe({ value, dose, time_since_injection }: { value: any, dose: any, time_since_injection: any }): number | null {
            const ka = ether.ka;
            const Vd = ether.Vd;
            const F = ether.F;
            const t = Number(time_since_injection);
            const Dose = Number(dose);
            if (!value || !Dose || !t || t <= 0) return null;
            let observed = Number(value);
            if (ether.hormone === "Estradiol") {
              observed = observed / 1000;
            } else {
              observed = observed / 100;
            }
            let bestKe: number | null = null;
            let minDiff = Infinity;
            for (let keTest = 0.01; keTest < 2; keTest += 0.001) {
              const pred = (F * Dose * ka) / (Vd * (ka - keTest)) * (Math.exp(-keTest * t) - Math.exp(-ka * t));
              const diff = Math.abs(pred - observed);
              if (diff < minDiff) {
                minDiff = diff;
                bestKe = keTest;
              }
            }
            return bestKe;
          }
          const keVals = filtered
            .map(estimateKe)
            .filter((k: number | null): k is number => typeof k === "number" && isFinite(k));
          if (!keVals.length) {
            setRegimens(rs => {
              if (rs[idx].personalizedKe === null && rs[idx].loadingPersonalized === false) return rs;
              return rs.map((r, i) => i === idx ? { ...r, personalizedKe: null, loadingPersonalized: false } : r);
            });
            return;
          }
          const avgKe = keVals.reduce((a, b) => a + b, 0) / keVals.length;
          setRegimens(rs => {
            if (rs[idx].personalizedKe === avgKe && rs[idx].loadingPersonalized === false) return rs;
            return rs.map((r, i) => i === idx ? { ...r, personalizedKe: avgKe, loadingPersonalized: false } : r);
          });
        })();
      }
    });
  }, [regimens, isSignedIn]);

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

  // Graph data for all regimens
  type GraphData = {
    id: string;
    ether: Ether;
    color: string;
    displayLevels: number[];
    secondaryLevels?: number[];
    yLabel: string;
    tooltipUnit: string;
    secondaryUnit: string;
    levels: { day: number; conc: number }[];
    days: number;
    dose: number;
  };
  const allGraphData: GraphData[] = regimens.map((reg, idx) => {
    const ether = reg.ether ?? ETHERS[0];
    const halfLife = ether.halfLife;
    const ka = ether.ka;
    const Vd = ether.Vd;
    const F = ether.F;
    const ke = reg.personalizedKe ?? Math.log(2) / halfLife;
    const days = reg.days;
    const dose = reg.dose;
    const repeatInterval = reg.repeatInterval;
    const levels = Array.from({ length: days + 1 }, (_, day) => {
      let conc = 0;
      if (typeof repeatInterval === 'number' && repeatInterval > 0) {
        for (let d = 0; d <= day; d += repeatInterval) {
          conc += pkConcentration({ Dose: dose, ka, ke, Vd, F, t: day - d });
        }
      } else {
        conc = pkConcentration({ Dose: dose, ka, ke, Vd, F, t: day });
      }
      return { day, conc };
    });
    let displayLevels: number[] = [];
    let yLabel = "";
    let tooltipUnit = "";
    let secondaryUnit = "";
    let secondaryLevels: number[] | undefined = undefined;
    if (ether.hormone === "Estradiol") {
      displayLevels = levels.map(l => l.conc * 1000);
      secondaryLevels = displayLevels.map(pg => pg * 3.67);
      yLabel = "estradiol (pg/mL)";
      tooltipUnit = "pg/mL";
      secondaryUnit = "pmol/L";
    } else {
      displayLevels = levels.map(l => l.conc * 100);
      yLabel = "testosterone (ng/dL)";
      tooltipUnit = "ng/dL";
    }
    return {
      id: reg.id,
      ether,
      color: COLORS[idx % COLORS.length] ?? '#000',
      displayLevels,
      secondaryLevels,
      yLabel,
      tooltipUnit,
      secondaryUnit,
      levels,
      days,
      dose,
    };
  });

  // Find max Y for scaling
  const maxDisplayLevel = Math.max(...allGraphData.flatMap((g) => g.displayLevels));
  const width = graphSize.width;
  const height = graphSize.height;
  const padding = 70;
  const graphAreaWidth = width - 2 * padding;
  const graphAreaHeight = height - 2 * padding;
  const yTicks = 6;
  const xTicks = Math.max(...regimens.map((r) => r.days), 10);
  const yTickVals = Array.from({ length: yTicks }, (_, i) => maxDisplayLevel * (1 - i / (yTicks - 1)));
  const xTickVals = Array.from({ length: 11 }, (_, i) => Math.round((Math.max(...regimens.map((r) => r.days)) * i) / 10));
  const getX = (day: number, maxDays: number) => padding + (day / maxDays) * graphAreaWidth;
  const getY = (level: number) => padding + graphAreaHeight - (maxDisplayLevel === 0 ? 0 : (level / maxDisplayLevel) * graphAreaHeight);

  // Hover logic for all regimens
  type HoverState = { day: number; mouseX: number; mouseY: number } | null;
  const [hover, setHover] = useState<HoverState>(null);
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement, MouseEvent>) {
    const rect = (e.target as SVGSVGElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding;
    if (mouseX < 0 || mouseX > graphAreaWidth) {
      setHover(null);
      return;
    }
    const maxDays = Math.max(...regimens.map((r) => r.days));
    const day = Math.round((mouseX / graphAreaWidth) * maxDays);
    setHover({ day, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
  }
  function handleMouseLeave() {
    setHover(null);
  }

  // UI
  return (
    <div className="min-h-screen w-full bg-[#f6ecd9] text-[#3b2f1c] font-mono flex flex-col">
      <NavBar />
      <div className="flex flex-col md:flex-row flex-1">
        {/* Regimen Controls Panel */}
        <aside className="w-full md:w-96 p-6 border-r border-[#bfae8e] flex flex-col gap-6 min-h-screen bg-[#f3e7c4]">
          <h2 className="text-2xl font-bold mb-2 tracking-widest">Regimens</h2>
          {regimens.map((reg, idx) => (
            <div key={reg.id} className="bg-[#f3e7c4] rounded-lg shadow p-4 mb-2 border border-[#bfae8e] flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Hormone + Ether</span>
                <button
                  className="ml-2 text-xl focus:outline-none"
                  aria-label={expandedRegimenId === reg.id ? 'Collapse' : 'Expand'}
                  onClick={() => setExpandedRegimenId(expandedRegimenId === reg.id ? null : reg.id)}
                >
                  {expandedRegimenId === reg.id ? '▲' : '▼'}
                </button>
              </div>
              {expandedRegimenId === reg.id && (
                <>
                  <select
                    className="border-2 border-[#bfae8e] bg-[#f6ecd9] text-[#3b2f1c] px-3 py-2 mb-2 rounded"
                    value={reg.ether.name}
                    onChange={e => {
                      const ether = ETHERS.find(et => et.name === e.target.value) ?? ETHERS[0];
                      setRegimens(rs => rs.map((r, i) => i === idx ? { ...r, ether } : r));
                    }}
                  >
                    {ETHERS.map(e => (
                      <option key={e.name} value={e.name}>{e.hormone} — {e.name} (t½ {e.halfLife}d)</option>
                    ))}
                  </select>
                  <label className="font-semibold">Dose (mg)</label>
                  <Input
                    type="number"
                    value={reg.dose}
                    min={0}
                    onChange={e => setRegimens(rs => rs.map((r, i) => i === idx ? { ...r, dose: Number(e.target.value) } : r))}
                    className="mb-2"
                  />
                  <label className="font-semibold">Days to Simulate</label>
                  <Input
                    type="number"
                    value={reg.days}
                    min={1}
                    max={180}
                    onChange={e => setRegimens(rs => rs.map((r, i) => i === idx ? { ...r, days: Number(e.target.value) } : r))}
                    className="mb-2"
                  />
                  <label className="font-semibold">Repeat Dosage (days)</label>
                  <Input
                    type="number"
                    value={reg.repeatInterval === undefined ? "" : reg.repeatInterval}
                    min={1}
                    max={60}
                    placeholder="leave blank for single dose"
                    onChange={e => {
                      const val = e.target.value;
                      setRegimens(rs => rs.map((r, i) => i === idx ? { ...r, repeatInterval: val === "" ? undefined : Math.max(1, Number(val)) } : r));
                    }}
                    className="mb-2"
                  />
                  {isSignedIn && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id={`personalized-${reg.id}`}
                        checked={reg.usePersonalized}
                        onChange={e => setRegimens(rs => rs.map((r, i) => i === idx ? { ...r, usePersonalized: e.target.checked } : r))}
                        className="w-4 h-4 border-gray-400 accent-blue-500"
                      />
                      <label htmlFor={`personalized-${reg.id}`} className="text-sm select-none">
                        Use my blood test data for personalized metabolism
                      </label>
                      {reg.usePersonalized && reg.loadingPersonalized && (
                        <span className="ml-2 text-xs text-blue-500">calculating…</span>
                      )}
                      {reg.usePersonalized && !reg.loadingPersonalized && reg.personalizedKe !== undefined && reg.personalizedKe !== null && (
                        <span className="ml-2 text-xs text-blue-500">personalized t½: {(Math.log(2)/reg.personalizedKe).toFixed(2)}d</span>
                      )}
                      {reg.usePersonalized && !reg.loadingPersonalized && reg.personalizedKe === null && (
                        <span className="ml-2 text-xs text-red-700">no usable blood test data</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
          <Button variant="secondary" onClick={() => {
            const newRegimen = defaultRegimen();
            setRegimens(rs => [...rs, newRegimen]);
            setExpandedRegimenId(newRegimen.id);
          }}>
            + Add Regimen
          </Button>
          <div className="text-gray-400 font-mono mt-6 text-xs">
            This is a simple exponential decay model. It does not account for absorption delays, metabolism, or individual variation. For educational use only.
          </div>
          <div className="text-gray-400 font-mono mt-6 text-xs">
            Legend:
          </div>
          {regimens.map((reg, idx) => (
            <div key={reg.id} className="text-gray-400 font-mono text-xs">
              {reg.ether.hormone} — {reg.ether.name} ({reg.dose}mg)
            </div>
          ))}
        </aside>
        {/* Main content: Responsive graph area */}
        <main className="flex-1 flex flex-col items-center justify-center p-0 m-0 h-screen bg-[#f6ecd9]">
          <div ref={graphContainerRef} className="flex-1 w-full h-[calc(100vh-5rem)] max-w-full max-h-[calc(100vh-5rem)] flex flex-col items-center justify-center p-0 pt-2 pb-0 m-0 overflow-hidden" style={{ minHeight: 300 }}>
            <div className="relative w-full h-full max-w-full max-h-full" style={{ height: "100%" }}>
              <svg
                width={width}
                height={height}
                className="bg-white rounded"
                style={{ width: "100%", height: "100%", display: "block", background: "#f5ecd8" }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <rect x="0" y="0" width="100%" height="100%" fill="#f5ecd8" />
                {/* Y axis grid and labels */}
                {yTickVals.map((y, i) => (
                  <g key={i}>
                    <line
                      x1={padding}
                      y1={getY(y)}
                      x2={width - padding}
                      y2={getY(y)}
                      stroke="#eee"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={padding - 10}
                      y={getY(y) + 5}
                      fill="#888"
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
                  fill="#222"
                  fontSize={18}
                  textAnchor="start"
                  transform={`rotate(-90,${padding - 50},${padding + 10})`}
                  style={{ fontWeight: "bold" }}
                >
                  Level
                </text>
                {/* X axis grid and labels */}
                {xTickVals.map((x, i) => (
                  <g key={i}>
                    <line
                      x1={getX(x, Math.max(...regimens.map(r => r.days)))}
                      y1={padding}
                      x2={getX(x, Math.max(...regimens.map(r => r.days)))}
                      y2={height - padding}
                      stroke="#eee"
                      strokeDasharray="2 4"
                    />
                    <text
                      x={getX(x, Math.max(...regimens.map(r => r.days)))}
                      y={height - padding + 30}
                      fill="#888"
                      fontSize={16}
                      textAnchor="middle"
                    >
                      {x}
                    </text>
                  </g>
                ))}
                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#222" strokeWidth={2} />
                <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#222" strokeWidth={2} />
                {/* Graph lines for each regimen */}
                {allGraphData.map((g, idx) => (
                  <polyline
                    key={g.id}
                    fill="none"
                    stroke={g.color}
                    strokeWidth={4}
                    points={g.displayLevels.map((v, i) => `${getX(i, g.days)},${getY(v)}`).join(" ")}
                  />
                ))}
                {/* Hover marker and tooltip for all regimens at hovered day */}
                {hover && (
                  <g>
                    {/* Vertical hover line */}
                    <line
                      x1={getX(hover.day, Math.max(...regimens.map(r => r.days)))}
                      y1={padding}
                      x2={getX(hover.day, Math.max(...regimens.map(r => r.days)))}
                      y2={height - padding}
                      stroke="#222"
                      strokeDasharray="2 2"
                      strokeWidth={2}
                      opacity={0.7}
                    />
                    {/* Circles for each regimen at hovered day */}
                    {allGraphData.map((g, idx) =>
                      g.displayLevels[hover.day] !== undefined ? (
                        <circle
                          key={g.id}
                          cx={getX(hover.day, g.days)}
                          cy={getY(g.displayLevels[hover.day])}
                          r={8}
                          fill="#fff"
                          stroke={g.color}
                          strokeWidth={4}
                        />
                      ) : null
                    )}
                    {/* Tooltip box with all regimens' values at hovered day, positioned near mouse and never cut off */}
                    {(() => {
                      const tooltipWidth = 250;
                      const tooltipHeight = 60 + 60 * allGraphData.length;
                      let x = hover.mouseX + 20;
                      let y = hover.mouseY - 20;
                      if (x + tooltipWidth > width - 10) x = hover.mouseX - tooltipWidth - 20;
                      if (x < 10) x = 10;
                      if (y + tooltipHeight > height - 10) y = height - tooltipHeight - 10;
                      if (y < 10) y = 10;
                      return (
                        <foreignObject
                          x={x}
                          y={y}
                          width={tooltipWidth}
                          height={tooltipHeight}
                        >
                          <div
                            style={{
                              background: '#fff',
                              border: '1px solid #222',
                              borderRadius: 10,
                              padding: 14,
                              opacity: 0.98,
                              fontSize: 15,
                              width: '100%',
                              maxHeight: '100%',
                              overflow: 'visible',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
                            }}
                          >
                            <div style={{ fontWeight: 'bold', marginBottom: 10, textAlign: 'center', fontSize: 16 }}>day {hover.day}</div>
                            {allGraphData.map((g, idx) =>
                              g.displayLevels[hover.day] !== undefined ? (
                                <div key={g.id} style={{ 
                                  color: g.color, 
                                  display: 'flex', 
                                  flexDirection: 'column',
                                  marginBottom: 16,
                                  borderBottom: idx < allGraphData.length - 1 ? '1px solid #eee' : 'none',
                                  paddingBottom: 10
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: 6
                                  }}>
                                    <span style={{ 
                                      width: 14, 
                                      height: 14, 
                                      background: g.color, 
                                      borderRadius: 7, 
                                      display: 'inline-block', 
                                      marginRight: 8
                                    }}></span>
                                    <span style={{ 
                                      fontWeight: 600,
                                      fontSize: 15,
                                      wordBreak: 'break-word'
                                    }}>{g.ether.hormone} — {g.ether.name}</span>
                                  </div>
                                  <div style={{
                                    marginLeft: 22,
                                    display: 'flex',
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                  }}>
                                    <span style={{ 
                                      fontWeight: 500,
                                      marginRight: 10,
                                      fontSize: 16
                                    }}>{g.displayLevels[hover.day].toFixed(0)} {g.tooltipUnit}</span>
                                    {g.secondaryLevels && g.secondaryLevels[hover.day] !== undefined && (
                                      <span style={{ 
                                        color: '#555', 
                                        fontSize: 14
                                      }}>({g.secondaryLevels[hover.day].toFixed(0)} {g.secondaryUnit})</span>
                                    )}
                                  </div>
                                </div>
                              ) : null
                            )}
                          </div>
                        </foreignObject>
                      );
                    })()}
                  </g>
                )}
              </svg>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 