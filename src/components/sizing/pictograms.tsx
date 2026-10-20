/**
 * Side-view schematics of siting variants. The vaporizer is the hatched block,
 * walls/roofs are solid, ground is the baseline. Stroke uses currentColor.
 */

const Unit = ({ x = 22, w = 12, h = 22 }: { x?: number; w?: number; h?: number }) => (
  <g>
    <rect x={x} y={34 - h} width={w} height={h} rx={1.5} fill="none" stroke="currentColor" strokeWidth={1.4} />
    {[0.25, 0.5, 0.75].map((f) => (
      <line key={f} x1={x + w * f} x2={x + w * f} y1={34 - h + 2} y2={32} stroke="currentColor" strokeWidth={0.8} opacity={0.6} />
    ))}
  </g>
);

const Ground = () => <line x1={2} x2={54} y1={34} y2={34} stroke="currentColor" strokeWidth={1.4} />;
const Wall = ({ x }: { x: number }) => <rect x={x} y={4} width={4} height={30} fill="currentColor" opacity={0.85} />;
const Roof = ({ y, x1 = 8, x2 = 48 }: { y: number; x1?: number; x2?: number }) => (
  <line x1={x1} x2={x2} y1={y} y2={y} stroke="currentColor" strokeWidth={3} />
);
const Cold = () => (
  <path d="M20 33 q-6 0 -10 0 M36 33 q6 0 10 0" stroke="var(--s1)" strokeWidth={1.4} fill="none" strokeDasharray="2 2" />
);

const ICONS: Record<string, React.ReactNode> = {
  free: (
    <>
      <Ground />
      <Unit />
      <Cold />
    </>
  ),
  wall: (
    <>
      <Ground />
      <Wall x={6} />
      <Unit x={24} />
    </>
  ),
  wallNear: (
    <>
      <Ground />
      <Wall x={10} />
      <Unit x={18} />
    </>
  ),
  wallTouch: (
    <>
      <Ground />
      <Wall x={14} />
      <Unit x={18} />
    </>
  ),
  corner: (
    <>
      <Ground />
      <Wall x={6} />
      <rect x={6} y={4} width={14} height={4} fill="currentColor" opacity={0.5} />
      <Unit x={26} />
    </>
  ),
  alley: (
    <>
      <Ground />
      <Wall x={6} />
      <Wall x={46} />
      <Unit x={22} />
      <path d="M2 20 h6 M48 20 h6" stroke="var(--s1)" strokeWidth={1.2} strokeDasharray="2 2" />
    </>
  ),
  court: (
    <>
      <Ground />
      <Wall x={6} />
      <Wall x={46} />
      <Unit x={22} />
      <rect x={10} y={28} width={36} height={6} fill="var(--s1)" opacity={0.35} />
    </>
  ),
  roofHigh: (
    <>
      <Ground />
      <Roof y={4} />
      <Unit />
    </>
  ),
  roofMid: (
    <>
      <Ground />
      <Roof y={8} />
      <Unit />
    </>
  ),
  roofLow: (
    <>
      <Ground />
      <Roof y={11} />
      <Unit />
    </>
  ),
  shelter: (
    <>
      <Ground />
      <Roof y={5} x1={6} x2={48} />
      <Wall x={6} />
      <Unit x={24} />
    </>
  ),
  pit: (
    <>
      <path d="M2 18 H12 V34 H44 V18 H54" stroke="currentColor" strokeWidth={1.4} fill="none" />
      <Unit x={22} h={20} />
      <rect x={12} y={26} width={32} height={8} fill="var(--s1)" opacity={0.4} />
    </>
  ),
  room: (
    <>
      <rect x={6} y={4} width={44} height={30} fill="none" stroke="currentColor" strokeWidth={3} />
      <Unit x={22} h={20} />
    </>
  ),
  battery: (
    <>
      <Ground />
      <Unit x={8} w={10} />
      <Unit x={23} w={10} />
      <Unit x={38} w={10} />
    </>
  ),
  batteryTight: (
    <>
      <Ground />
      <Unit x={12} w={10} />
      <Unit x={23} w={10} />
      <Unit x={34} w={10} />
    </>
  ),
  custom: (
    <>
      <Ground />
      <Unit />
      <text x={44} y={14} fontSize={11} fill="currentColor" textAnchor="middle">
        φ
      </text>
    </>
  ),
};

export function Pictogram({ name, className }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 56 38" className={className} aria-hidden>
      {ICONS[name] ?? ICONS.free}
    </svg>
  );
}
