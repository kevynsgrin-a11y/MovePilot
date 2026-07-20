import { Link } from 'react-router-dom';
import { Boxes, Scale, Route as RouteIcon, ShieldCheck, ArrowRight, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { RouteLine } from '@/components/ui/RouteLine';

/**
 * /tools — the Calculators Hub (§3.2). A switchboard of the four instruments as
 * equal-weight cards on a 1200px grid. No fetch on the hub itself; each card routes
 * to its tool page. Instrument-panel framing, generous whitespace.
 */

interface ToolDef {
  to: string;
  name: string;
  jtbd: string;
  icon: LucideIcon;
  flagship?: boolean;
}

const TOOLS: ToolDef[] = [
  {
    to: '/tools/volume',
    name: 'Inventory → Volume',
    jtbd: 'Turn your furniture list into exact cubic feet and CBM.',
    icon: Boxes,
    flagship: true,
  },
  {
    to: '/tools/weight',
    name: 'Dimensional weight',
    jtbd: 'Find the billable weight carriers actually charge you for.',
    icon: Scale,
  },
  {
    to: '/tools/distance',
    name: 'Distance + fuel',
    jtbd: 'Real driving miles, gallons, and fuel cost for your lane.',
    icon: RouteIcon,
  },
  {
    to: '/tools/carrier-check',
    name: 'Verify a carrier',
    jtbd: 'Check any mover against federal FMCSA safety records.',
    icon: ShieldCheck,
  },
];

function ToolCard({ tool }: { tool: ToolDef }) {
  const Icon = tool.icon;
  return (
    <Link
      to={tool.to}
      className="group relative block rounded-lg focus-visible:outline-none"
      aria-label={`${tool.name} — ${tool.jtbd}`}
    >
      <Card
        as="article"
        interactive
        padding="lg"
        className="relative h-full overflow-hidden group-focus-visible:shadow-glow-accent"
      >
        {tool.flagship && (
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 opacity-[0.06]">
            <RouteLine className="h-40 w-72" endpoints={false} />
          </div>
        )}
        <div className="relative flex h-full flex-col gap-4">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-md bg-accent/10 text-accent-ink dark:text-accent">
            <Icon size={24} aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 className="font-sans text-h4 font-semibold text-text">{tool.name}</h2>
            <p className="text-body text-text-muted">{tool.jtbd}</p>
          </div>
          <span className="mt-auto inline-flex items-center gap-1.5 text-body-sm font-semibold text-accent-ink transition-transform duration-fast group-hover:translate-x-0.5 dark:text-accent">
            Try it
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
      </Card>
    </Link>
  );
}

export function ToolsHub() {
  return (
    <div className="container-mp py-16 md:py-24">
      <header className="mx-auto flex max-w-prose flex-col items-start gap-4">
        <Eyebrow chip>Instrument panel</Eyebrow>
        <h1 className="font-display text-h1 font-medium text-text">
          Four calculators. Real math, no phone calls.
        </h1>
        <p className="text-body-lg text-text-muted">
          Each tool runs on live federal data and your own inputs — inputs on the left, a live
          readout on the right. Nothing is a lead form. Pick an instrument to begin.
        </p>
      </header>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <ToolCard key={t.to} tool={t} />
        ))}
      </div>

      <div aria-hidden="true" className="mt-16 opacity-40">
        <RouteLine className="h-16" variant="dashed" />
      </div>
    </div>
  );
}
