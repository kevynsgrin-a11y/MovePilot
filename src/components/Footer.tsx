import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface FooterColumn {
  title: string;
  links: { label: string; to: string }[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: 'Tools',
    links: [
      { label: 'Inventory → Volume', to: '/tools/volume' },
      { label: 'Dimensional Weight', to: '/tools/weight' },
      { label: 'Distance & Fuel', to: '/tools/distance' },
      { label: 'Verify a Carrier', to: '/tools/carrier-check' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'How It Works', to: '/trust' },
      { label: 'Timeline', to: '/timeline' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Verify a Carrier', to: '/tools/carrier-check' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { label: 'Privacy Promise', to: '/trust' },
      { label: 'We never sell your data', to: '/trust' },
      { label: 'FMCSA data source', to: '/trust' },
      { label: 'Legal', to: '/trust' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/trust' },
      { label: 'Popular routes', to: '/#routes' },
      { label: 'Sign in', to: '/login' },
      { label: 'Save your work', to: '/join' },
    ],
  },
];

/**
 * Footer — global 4-column dark footer (always cockpit ink, both themes) with the
 * prominent Trust column and the "not a broker" closing strip (blueprint §4).
 */
export function Footer() {
  return (
    <footer data-theme="dark" className="mt-auto bg-[#0B1220] text-[#EAF1F7]">
      <div className="container-mp py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="mb-4 font-sans text-overline font-bold uppercase tracking-[0.08em] text-[#8193A8]">
                {col.title}
              </h2>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="text-body-sm text-[#A6B6C9] transition-colors hover:text-[#EAF1F7]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center gap-2 border-t border-[#1D2B40] pt-6 text-body-sm text-[#8193A8]">
          <ShieldCheck size={16} aria-hidden="true" className="shrink-0 text-[#2FD3C1]" />
          <span>Powered by federal FMCSA SAFER records · updated weekly</span>
        </div>
        <p className="mt-3 text-body-sm text-[#8193A8]">
          MovePilot is not a moving broker or lead-generation service.
        </p>
      </div>
    </footer>
  );
}
