import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Fade-in animation — opacity only, no y-translate (product register rule)
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

function RevealSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeIn}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Representative community story cards — placeholder pending real data
const STORY_KEYS = ['card1', 'card2', 'card3'] as const;

const OUTCOME_STYLES: Record<string, string> = {
  Accepted: 'bg-status-success/10 text-status-success',
  'پذیرفته شده': 'bg-status-success/10 text-status-success',
};

const DESTINATION_COUNTS: Record<string, { programs: number }> = {
  germany: { programs: 1200 },
  netherlands: { programs: 480 },
};

export function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Subtle teal glow — only decorative element, intentional */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          aria-hidden="true"
          style={{
            background: isRTL
              ? 'radial-gradient(ellipse 60% 50% at 80% 40%, rgb(13 115 119), transparent)'
              : 'radial-gradient(ellipse 60% 50% at 20% 40%, rgb(13 115 119), transparent)',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 md:py-36">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="max-w-2xl"
          >
            {/* Tagline — quiet, specific */}
            <motion.p
              variants={fadeIn}
              className="text-sm font-medium text-brand-primary mb-6 tracking-wide"
            >
              {t('home.hero.tagline')}
            </motion.p>

            {/* Headline — whitespace-pre-line to honour the newline in the copy */}
            <motion.h1
              variants={fadeIn}
              className="font-display text-4xl sm:text-5xl md:text-[3.25rem] font-bold text-text-primary leading-[1.08] tracking-[-0.02em] text-balance"
              style={{ whiteSpace: 'pre-line' }}
            >
              {t('home.hero.headline')}
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="mt-6 text-lg text-text-secondary leading-relaxed max-w-xl text-pretty"
            >
              {t('home.hero.subheadline')}
            </motion.p>

            <motion.div
              variants={fadeIn}
              className="mt-10 flex flex-col sm:flex-row gap-3"
            >
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors text-base"
                >
                  {t('home.hero.ctaDashboard')}
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-3.5 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors text-base"
                  >
                    {t('home.hero.ctaPrimary')}
                  </Link>
                  <Link
                    to="/explore"
                    className="inline-flex items-center justify-center px-6 py-3.5 border border-border text-text-secondary font-medium rounded-lg hover:bg-elevated hover:text-text-primary transition-colors text-base"
                  >
                    {t('home.hero.ctaSecondary')}
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── CLARITY — what you actually get ───────────────────── */}
      <section className="border-b border-border">
        <RevealSection>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-28">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
              {/* Left: the argument */}
              <div>
                <p className="text-xs font-semibold text-brand-primary tracking-widest uppercase mb-4">
                  {t('home.clarity.label')}
                </p>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary leading-tight tracking-[-0.02em] text-balance">
                  {t('home.clarity.headline')}
                </h2>
                <p className="mt-5 text-text-secondary leading-relaxed text-pretty max-w-md">
                  {t('home.clarity.body')}
                </p>
              </div>

              {/* Right: three data points — not a features list */}
              <div className="grid grid-cols-3 gap-px bg-border rounded-xl overflow-hidden">
                {[
                  { value: '1,680+', key: 'statPrograms' },
                  { value: '420+', key: 'statUniversities' },
                  { value: '6', key: 'statCountries' },
                ].map(({ value, key }) => (
                  <div key={key} className="bg-surface px-5 py-7 flex flex-col gap-1">
                    <span className="font-display text-2xl font-bold text-brand-primary">{value}</span>
                    <span className="text-xs text-text-muted leading-snug">
                      {t(`home.clarity.${key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* The tracker preview — abstract UI representation, no screenshot dependency */}
            <div className="mt-14 rounded-xl border border-border bg-surface overflow-hidden">
              {/* Mock toolbar */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-elevated">
                <span className="text-sm font-semibold text-text-primary">{t('home.programs.title', 'Your programs')}</span>
                <span className="text-xs text-text-muted">3 programs · 1 deadline in 12 days</span>
              </div>
              {/* Three mock program rows */}
              {[
                { name: 'Computer Science MSc', uni: 'TU Delft', days: 12, urgent: true, docs: 5, total: 7 },
                { name: 'Electrical Engineering MSc', uni: 'RWTH Aachen', days: 34, urgent: false, docs: 3, total: 6 },
                { name: 'Data Science MSc', uni: 'Uni Amsterdam', days: 61, urgent: false, docs: 1, total: 5 },
              ].map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 px-5 py-4 border-b last:border-0 border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{row.name}</p>
                    <p className="text-xs text-text-muted">{row.uni}</p>
                  </div>
                  {/* Doc progress */}
                  <div className="hidden sm:flex items-center gap-2 w-28">
                    <div className="flex-1 h-1 bg-elevated rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-primary rounded-full"
                        style={{ width: `${Math.round((row.docs / row.total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">{row.docs}/{row.total}</span>
                  </div>
                  {/* Deadline chip */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${row.urgent ? 'bg-status-warning/10 text-status-warning' : 'bg-elevated text-text-secondary'}`}>
                    {row.days}d
                  </span>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── COMMUNITY STORIES ────────────────────────────────── */}
      <section className="border-b border-border bg-elevated/40">
        <RevealSection>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-28">
            <div className="max-w-2xl mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary tracking-[-0.02em] text-balance">
                {t('home.stories.headline')}
              </h2>
              <p className="mt-3 text-text-secondary text-pretty">
                {t('home.stories.subheadline')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {STORY_KEYS.map((key) => {
                const outcome = t(`home.stories.${key}.outcome`);
                return (
                  <motion.div
                    key={key}
                    variants={fadeIn}
                    className="bg-surface rounded-xl border border-border p-6 flex flex-col gap-4"
                  >
                    {/* Outcome badge */}
                    <div className="flex items-center justify-between gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${OUTCOME_STYLES[outcome] ?? 'bg-elevated text-text-secondary'}`}>
                        {outcome}
                      </span>
                      <span className="text-xs text-text-muted">{t(`home.stories.${key}.year`)}</span>
                    </div>

                    {/* Program + university */}
                    <div>
                      <p className="font-semibold text-text-primary text-sm leading-snug">
                        {t(`home.stories.${key}.program`)}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {t(`home.stories.${key}.university`)} · {t(`home.stories.${key}.country`)}
                      </p>
                    </div>

                    {/* Excerpt — the actual story */}
                    <blockquote className="text-sm text-text-secondary leading-relaxed text-pretty border-s-2 border-brand-primary/30 ps-3 italic flex-1">
                      "{t(`home.stories.${key}.excerpt`)}"
                    </blockquote>

                    {/* Scholarship note */}
                    <p className="text-xs text-text-muted">
                      {t(`home.stories.${key}.scholarship`)}
                    </p>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-10">
              <Link
                to="/experiences"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-primary hover:text-brand-primary/80 transition-colors"
              >
                {t('home.stories.cta')}
                <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── DESTINATIONS ─────────────────────────────────────── */}
      <section className="border-b border-border">
        <RevealSection>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 md:py-28">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary tracking-[-0.02em] text-balance mb-12">
              {t('home.destinations.headline')}
            </h2>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Germany */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="text-2xl font-bold font-display text-brand-primary mb-1">
                  {DESTINATION_COUNTS.germany.programs.toLocaleString()}+
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  {t('home.destinations.germany.name')}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {t('home.destinations.germany.stat')}
                </div>
                <div className="mt-3 text-xs text-text-muted/60 border-t border-border pt-3">
                  {t('home.destinations.germany.note')}
                </div>
              </div>

              {/* Netherlands */}
              <div className="rounded-xl border border-border bg-surface p-6">
                <div className="text-2xl font-bold font-display text-brand-primary mb-1">
                  {DESTINATION_COUNTS.netherlands.programs.toLocaleString()}+
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  {t('home.destinations.netherlands.name')}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {t('home.destinations.netherlands.stat')}
                </div>
                <div className="mt-3 text-xs text-text-muted/60 border-t border-border pt-3">
                  {t('home.destinations.netherlands.note')}
                </div>
              </div>

              {/* Expanding */}
              <div className="rounded-xl border border-border border-dashed bg-elevated/40 p-6">
                <div className="text-2xl font-bold font-display text-text-muted mb-1">+</div>
                <div className="text-sm font-semibold text-text-primary">
                  {t('home.destinations.expanding.name')}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {t('home.destinations.expanding.stat')}
                </div>
                <div className="mt-3 text-xs text-text-muted/60 border-t border-border pt-3">
                  {t('home.destinations.expanding.note')}
                </div>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────────────── */}
      <section>
        <RevealSection>
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 md:py-32">
            <div className="max-w-xl">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-text-primary tracking-[-0.02em] text-balance">
                {t('home.finalCta.headline')}
              </h2>
              <p className="mt-4 text-text-secondary text-pretty">
                {t('home.finalCta.body')}
              </p>
              <div className="mt-8">
                <Link
                  to={isAuthenticated ? '/dashboard' : '/login'}
                  className="inline-flex items-center justify-center px-8 py-4 bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary/90 transition-colors text-base"
                >
                  {isAuthenticated ? t('home.hero.ctaDashboard') : t('home.finalCta.cta')}
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-brand-primary tracking-tight">Ghadam</span>
          </div>
          <p className="text-sm text-text-muted text-center sm:text-end">
            {t('home.footer', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>

    </div>
  );
}
