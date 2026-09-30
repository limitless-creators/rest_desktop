import { useId, useState, useRef, useEffect, type PointerEvent } from 'react';
import { TrendPoint, trendGeometry, shortMoney } from '../lib/financialTrend';
import { formatValue } from '../data';

export default function FinancialLineChart({ data, language }: { data: TrendPoint[]; language: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(280, entries[0].contentRect.width)));
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  const [selected, setSelected] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);
  const gradient = useId().replace(/:/g, '');
  const pt = language !== 'en';
  const index = data.findIndex(p => p.key === selected);
  const point = data[index];
  const g = trendGeometry(data, width, 260);
  const series = [{ field: 'a' as const, label: pt ? 'Receitas' : 'Revenue', color: '#0ea5a4' }, { field: 'b' as const, label: pt ? 'Despesas' : 'Expenses', color: '#f97362' }];
  if (!data.length) return <p className="py-10 text-center text-sm text-slate-500">{pt ? 'Sem dados neste período.' : 'No data in this period.'}</p>;
  const choose = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setSelected(data[g.nearest((event.clientX - box.left) / box.width * width)].key);
  };
  return <div ref={container} data-testid="financial-chart">
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex gap-5">{series.map(s => <span key={s.field} className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300"><span className="inline-block h-0.5 w-5 rounded" style={{ background: s.color }} />{s.label}</span>)}</div>
      <span className="text-slate-400">MT</span>
    </div>
    <div className="relative mt-3" style={{ paddingTop: 84 }}>
      {point ? <div data-testid="chart-tooltip" role="status" className="absolute top-0 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-800"
        style={{ left: 'clamp(0px, calc(' + (g.x(index) / width * 100) + '% - 150px), calc(100% - 300px))', width: 300, maxWidth: '100%', pointerEvents: 'none' }}>
        <div className="mb-2 text-xs font-medium capitalize text-slate-500 dark:text-slate-300">{point.detail}</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1">{series.map(s => <span key={s.field} className="text-xs"><span style={{ color: s.color }}>{s.label} </span><strong className="text-slate-800 dark:text-white">{formatValue(point[s.field])}</strong></span>)}</div>
      </div> : <p className="absolute top-6 text-xs text-slate-400">{pt ? 'Passe o rato para consultar. Clique para fixar um ponto.' : 'Hover to explore. Click to pin a point.'}</p>}
      <svg role="slider" tabIndex={0} aria-label={pt ? 'Receitas e despesas por período' : 'Revenue and expenses by period'}
        aria-valuemin={1} aria-valuemax={data.length} aria-valuenow={index < 0 ? 1 : index + 1}
        aria-valuetext={point ? point.detail + ': ' + series.map(s => s.label + ' ' + formatValue(point[s.field])).join(', ') : (pt ? 'Use as setas para consultar os valores' : 'Use arrow keys to explore values')}
        onFocus={() => { if (!point) setSelected(data[0].key); }}
        onKeyDown={e => {
          if (e.key === 'Escape') { setPinned(false); setSelected(null); }
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
            e.preventDefault(); setPinned(true);
            const next = e.key === 'Home' ? 0 : e.key === 'End' ? data.length - 1 : Math.max(0, Math.min(data.length - 1, Math.max(0, index) + (e.key === 'ArrowRight' ? 1 : -1)));
            setSelected(data[next].key);
          }
        }}
        onPointerMove={e => { if (!pinned || e.buttons === 1) choose(e); }}
        onPointerDown={e => { choose(e); setPinned(true); }}
        onPointerLeave={() => { if (!pinned) setSelected(null); }}
        viewBox={`0 0 ${width} 260`} width="100%" height={260} preserveAspectRatio="none"
        className="cursor-crosshair rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        style={{ touchAction: 'pan-y' }}>
        <defs>{series.map(s => <linearGradient key={s.field} id={gradient + s.field} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={s.color} stopOpacity=".15" /><stop offset="100%" stopColor={s.color} stopOpacity="0" /></linearGradient>)}</defs>
        {g.ticks.map(v => <g key={v}><line x1={g.left} x2={g.right} y1={g.y(v)} y2={g.y(v)} stroke="currentColor" className="text-slate-100 dark:text-slate-800" /><text x={g.left - 10} y={g.y(v) + 4} textAnchor="end" fill="currentColor" className="text-slate-400" fontSize="11">{shortMoney(v, language)}</text></g>)}
        {series.map(s => <g key={s.field}><path d={g.area(s.field)} fill={'url(#' + gradient + s.field + ')'} /><path d={g.path(s.field)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {data.length === 1 && <circle cx={g.x(0)} cy={g.y(data[0][s.field])} r="4" fill={s.color} />}</g>)}
        {point && <g><line x1={g.x(index)} x2={g.x(index)} y1={g.top} y2={g.bottom} stroke="#94a3b8" strokeDasharray="4 4" />{series.map(s => <circle key={s.field} cx={g.x(index)} cy={g.y(point[s.field])} r="5" fill={s.color} stroke="white" strokeWidth="2" />)}</g>}
        {g.labels.map(i => <text key={i} x={g.x(i)} y={252} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} fontSize="11" fill="currentColor" className="text-slate-400">{data[i].label}</text>)}
      </svg>
    </div>
    <div className="mt-2 flex min-h-6 items-center justify-between text-xs text-slate-400">
      <span>{pt ? 'Receitas: valores facturados no período.' : 'Revenue: amounts invoiced in this period.'}</span>
      {pinned && <button className="text-teal-600 dark:text-teal-400" onClick={() => { setPinned(false); setSelected(null); }}>{pt ? 'Libertar selecção' : 'Unpin selection'}</button>}
    </div>
  </div>;
}
