import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock, Mail, PackageCheck, ShieldCheck } from 'lucide-react';
import { Button, Eyebrow, Input, RouteLine } from '@/components/ui';
import {
  api,
  ApiError,
  getAuthToken,
  setAuthToken,
  setPremium,
} from '@/lib/api';

/* ==========================================================================
   /join — "Save your work" (§3.9). Minimal fields (email + password ≥8).
   POST /api/auth/register normally; if an anonymous tool session already
   exists, POST /api/session/upgrade instead so saved inventory migrates with
   zero loss ("inventory_migrated: N items saved"). Split cockpit panel + form.
   Client-side format validation only; 409 email-exists surfaces inline.
   ========================================================================== */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reused by /login too via the same visual language, kept local to each page
// (no shared page module — imports stay foundation-only).
export function AuthShell({
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
        <Link
          to="/"
          className="relative z-10 flex items-center gap-2"
          aria-label="MovePilot home"
        >
          <svg viewBox="0 0 32 24" width="30" height="22" aria-hidden="true">
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
          <span className="font-display text-h5 font-medium text-[#EAF1F7]">MovePilot</span>
        </Link>

        <div className="relative z-10 max-w-md">
          <div aria-hidden="true" className="mb-8 max-w-sm">
            <RouteLine className="h-24" animate />
          </div>
          <h2 className="font-display text-h2 font-medium text-[#EAF1F7]">
            Your work stays yours.
          </h2>
          <p className="mt-4 text-body-lg text-[#A6B6C9]">
            No spam, ever. We never sell your info. An account just keeps your inventory, estimates,
            and move timeline in sync across devices.
          </p>
          <ul className="mt-8 space-y-3 text-body text-[#A6B6C9]">
            <li className="flex items-center gap-2.5">
              <Lock size={18} aria-hidden="true" className="text-[#2FD3C1]" />
              No phone number required
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck size={18} aria-hidden="true" className="text-[#2FD3C1]" />
              FMCSA-verified carrier data
            </li>
            <li className="flex items-center gap-2.5">
              <PackageCheck size={18} aria-hidden="true" className="text-[#2FD3C1]" />
              Your saved inventory travels with you
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
            <svg viewBox="0 0 32 24" width="28" height="21" aria-hidden="true">
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

export function Join() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [migrated, setMigrated] = useState<number | null>(null);

  const emailValid = EMAIL_RE.test(email);
  const pwValid = password.length >= 8;
  const emailError = touched && email !== '' && !emailValid ? 'Enter a valid email address.' : undefined;
  const pwError =
    touched && password !== '' && !pwValid ? 'Password must be at least 8 characters.' : undefined;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid || !pwValid) return;
    setSubmitting(true);
    setFormError(null);
    try {
      // If an anonymous session exists, upgrade it so inventory migrates.
      if (getAuthToken()) {
        try {
          const up = await api.session.upgrade({ email, password });
          setAuthToken(up.auth_token);
          setMigrated(up.inventory_migrated);
          navigate('/timeline');
          return;
        } catch (err) {
          // Anon token missing/expired → fall through to a fresh registration.
          if (!(err instanceof ApiError) || !['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].includes(err.code)) {
            throw err;
          }
        }
      }
      const reg = await api.auth.register({ email, password });
      setAuthToken(reg.auth_token);
      setPremium(false);
      navigate('/timeline');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setFormError('An account with that email already exists — sign in instead.');
      } else if (err instanceof ApiError && err.code === 'VALIDATION') {
        setFormError(err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell eyebrow="Save your work" heading="Create your free account">
      <p className="mt-3 text-body text-text-muted">
        Keep your estimates, saved inventory, and move timeline in one private place.
      </p>

      {migrated !== null && (
        <p className="mt-6 flex items-center gap-2 rounded-md border border-[color:var(--success)]/35 bg-[color:var(--success)]/10 px-3 py-2 text-body-sm text-[color:var(--success)]">
          <CheckCircle2 size={16} aria-hidden="true" />
          {migrated} {migrated === 1 ? 'item' : 'items'} saved to your new account.
        </p>
      )}

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          prefix={<Lock size={16} aria-hidden="true" />}
          error={pwError}
          hint={pwError ? undefined : 'Minimum 8 characters.'}
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
          Create account
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
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-accent-ink dark:text-accent">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
