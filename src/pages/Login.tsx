import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, Lock, Mail, PackageCheck, ShieldCheck } from 'lucide-react';
import { Button, Eyebrow, Input, RouteLine } from '@/components/ui';
import { api, ApiError, setAuthToken, setPremium } from '@/lib/api';

/* ==========================================================================
   /login — "Save your work" framing (§3.9). Minimal fields (email + password).
   POST /api/auth/login → persist auth_token + is_premium. Split cockpit panel
   + form. 401 bad-creds surfaces inline; format validation is client-side only.
   ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 24" width={size} height={(size * 22) / 30} aria-hidden="true">
      <path
        d="M4 19 C 11 5, 21 5, 28 19"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="4" cy="19" r="2.4" fill="var(--accent)" />
      <circle cx="28" cy="19" r="2.6" fill="none" stroke="var(--copper)" strokeWidth="2" />
    </svg>
  );
}

function AuthShell({
  eyebrow,
  heading,
  children,
}: {
  eyebrow: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      {/* Left — cockpit reassurance panel */}
      <aside
        data-theme="dark"
        className="relative hidden overflow-hidden bg-[#0B1220] p-12 text-[#EAF1F7] lg:flex lg:flex-col lg:justify-between"
      >
        <div aria-hidden="true" className="mesh-aurora absolute inset-0 opacity-90" />
        <Link to="/" className="relative z-10 flex items-center gap-2" aria-label="MovePilot home">
          <Wordmark />
          <span className="font-display text-h5 font-medium text-[#EAF1F7]">MovePilot</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div aria-hidden="true" className="mb-8 max-w-sm">
            <RouteLine className="h-24" animate />
          </div>
          <h2 className="font-display text-h2 font-medium text-[#EAF1F7]">Welcome back.</h2>
          <p className="mt-4 text-body-lg text-[#A6B6C9]">
            No spam, ever. We never sell your info. Sign in to pick your move back up exactly where
            you left it.
          </p>
          <ul className="mt-8 space-y-3 text-body text-[#A6B6C9]">
            <li className="flex items-center gap-2.5">
              <Lock size={18} aria-hidden="true" className="text-[#2FD3C1]" />
              Private by default
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck size={18} aria-hidden="true" className="text-[#2FD3C1]" />
              FMCSA-verified carrier data
            </li>
            <li className="flex items-center gap-2.5">
              <PackageCheck size={18} aria-hidden="true" className="text-[#2FD3C1]" />
              Your saved inventory, in sync
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-caption text-[#8193A8]">
          Powered by federal FMCSA SAFER records · updated weekly
        </p>
      </aside>

      {/* Right — the form */}
      <div className="flex flex-col justify-center bg-surface px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 lg:hidden"
            aria-label="MovePilot home"
          >
            <Wordmark size={28} />
            <span className="font-display text-h5 font-medium text-text">MovePilot</span>
          </Link>
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 font-display text-h2 font-medium text-text">{heading}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const emailValid = EMAIL_RE.test(email);
  const pwValid = password.length > 0;
  const emailError =
    touched && email !== '' && !emailValid ? 'Enter a valid email address.' : undefined;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || !pwValid) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await api.auth.login({ email, password });
      setAuthToken(res.auth_token);
      setPremium(Boolean(res.is_premium));
      navigate('/timeline');
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'UNAUTHENTICATED' || err.status === 401)) {
        setFormError('Email or password is incorrect.');
      } else {
        setFormError(
          err instanceof ApiError ? err.message : 'Something went wrong — please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Save your work" heading="Sign in to MovePilot">
      <p className="mt-3 text-body text-text-muted">
        Pick your move back up — your inventory, estimates, and timeline are waiting.
      </p>

      <form className="mt-6 flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          prefix={<Mail size={16} aria-hidden="true" />}
          error={emailError}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          prefix={<Lock size={16} aria-hidden="true" />}
        />

        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-[color:var(--danger)]/35 bg-[color:var(--danger)]/10 px-3 py-2 text-body-sm text-[color:var(--danger)]"
          >
            <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
            {formError}
          </p>
        )}

        <Button type="submit" block loading={submitting} className="mt-1">
          Sign in
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-caption uppercase tracking-[0.08em] text-text-faint">
        <span className="h-px flex-1 bg-[color:var(--border)]" />
        or
        <span className="h-px flex-1 bg-[color:var(--border)]" />
      </div>
      <Button
        variant="secondary"
        block
        type="button"
        onClick={() =>
          setFormError('Magic-link sign-in is coming soon — use email and a password for now.')
        }
      >
        <Mail size={16} aria-hidden="true" />
        Email me a sign-in link
      </Button>

      <p className="mt-8 text-body-sm text-text-muted">
        New to MovePilot?{' '}
        <Link to="/join" className="font-semibold text-accent-ink dark:text-accent">
          Create a free account
        </Link>
      </p>
    </AuthShell>
  );
}
