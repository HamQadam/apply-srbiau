import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { experiencesApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { formatDate } from '../../lib/format';
import { cn } from '../../lib/cn';
import type { ExperienceApplicationStatus, PublicExperience } from '../../types';

const statusOptions: ExperienceApplicationStatus[] = ['accepted', 'rejected', 'waitlisted', 'withdrawn'];

// Outcome badge — semantic, no decoration
function OutcomeBadge({ status, label }: { status: ExperienceApplicationStatus; label: string }) {
  const cls =
    status === 'accepted' ? 'bg-status-success/10 text-status-success' :
    status === 'rejected' ? 'bg-status-danger/10 text-status-danger' :
    status === 'waitlisted' ? 'bg-status-warning/10 text-status-warning' :
    'bg-elevated text-text-muted';
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0', cls)}>
      {status === 'accepted' && (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M9.78 3.47a.75.75 0 0 1 0 1.06L5.53 8.78a.75.75 0 0 1-1.06 0L2.22 6.53a.75.75 0 0 1 1.06-1.06L5 7.19l3.72-3.72a.75.75 0 0 1 1.06 0z"/>
        </svg>
      )}
      {label}
    </span>
  );
}

// Active filter pill
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 text-xs font-medium bg-brand-primary/10 text-brand-primary rounded-full">
      {label}
      <button onClick={onRemove} aria-label={`Remove ${label} filter`} className="hover:text-brand-primary/60 transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 12 12" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 2l8 8M10 2l-8 8"/>
        </svg>
      </button>
    </span>
  );
}

export function ExperienceBrowsePage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<PublicExperience[]>([]);
  const [loading, setLoading] = useState(true);

  const query = searchParams.get('query') || '';
  const country = searchParams.get('country') || '';
  const status = (searchParams.get('status') || '') as ExperienceApplicationStatus | '';
  const scholarship = searchParams.get('scholarship') === 'true';

  const params = useMemo(
    () => ({
      query: query || undefined,
      country: country || undefined,
      status: status || undefined,
      scholarship_received: scholarship || undefined,
      limit: 40,
    }),
    [query, country, status, scholarship]
  );

  useEffect(() => {
    setLoading(true);
    experiencesApi
      .browse(params)
      .then(setItems)
      .catch(() => toast.error(t('experiences.loadError')))
      .finally(() => setLoading(false));
  }, [params, t]);

  const update = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, String(value));
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const hasActiveFilters = query || country || status || scholarship;
  const clearAll = () => setSearchParams({}, { replace: true });

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('experiences.title')}</h1>
            <p className="mt-1 text-sm text-text-secondary text-pretty">{t('experiences.subtitle')}</p>
          </div>
          <Link
            to="/experiences/share"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-primary/90 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            {t('experiences.shareLink')}
          </Link>
        </div>

        {/* Filter row */}
        <div className="rounded-xl border border-border bg-surface p-4 mb-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute inset-y-0 start-3 my-auto w-4 h-4 text-text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input
                value={query}
                onChange={e => update('query', e.target.value)}
                placeholder={t('experiences.filters.searchPlaceholder')}
                aria-label={t('experiences.filters.searchPlaceholder')}
                className="w-full ps-9 pe-3 py-2 border border-border rounded-lg bg-background text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
              />
            </div>

            {/* Country */}
            <input
              value={country}
              onChange={e => update('country', e.target.value)}
              placeholder={t('experiences.filters.countryPlaceholder')}
              aria-label={t('experiences.filters.countryPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
            />

            {/* Outcome */}
            <select
              value={status}
              onChange={e => update('status', e.target.value)}
              aria-label={t('experiences.filters.allOutcomes')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none"
            >
              <option value="">{t('experiences.filters.allOutcomes')}</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{t(`experiences.status.${s}`, { defaultValue: s })}</option>
              ))}
            </select>

            {/* Scholarship toggle */}
            <label className="flex items-center gap-2.5 px-3 py-2 border border-border rounded-lg bg-background cursor-pointer hover:bg-elevated transition-colors text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={scholarship}
                onChange={e => update('scholarship', e.target.checked)}
                className="h-4 w-4 rounded border-border text-brand-primary focus:ring-brand-primary"
              />
              {t('experiences.filters.scholarshipLabel')}
            </label>
          </div>

          {/* Active filter pills + result count */}
          {(hasActiveFilters || !loading) && (
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
              {query && <FilterPill label={`"${query}"`} onRemove={() => update('query', '')} />}
              {country && <FilterPill label={country} onRemove={() => update('country', '')} />}
              {status && <FilterPill label={t(`experiences.status.${status}`, { defaultValue: status })} onRemove={() => update('status', '')} />}
              {scholarship && <FilterPill label={t('experiences.filters.scholarshipLabel')} onRemove={() => update('scholarship', false)} />}
              {hasActiveFilters && (
                <button onClick={clearAll} className="text-xs text-text-muted hover:text-text-secondary underline-offset-2 hover:underline transition-colors">
                  {t('experiences.clearFilters')}
                </button>
              )}
              {!loading && (
                <span className="ms-auto text-xs text-text-muted">
                  {t('experiences.resultCount', { count: items.length })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-elevated flex items-center justify-center mx-auto mb-4" aria-hidden="true">
              <svg className="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/>
              </svg>
            </div>
            <p className="text-text-primary font-medium">{t('experiences.empty')}</p>
            {hasActiveFilters && (
              <button onClick={clearAll} className="mt-3 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors">
                {t('experiences.clearFilters')}
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Contribute prompt — shown when filters are clear */}
            {!hasActiveFilters && (
              <div className="rounded-xl border border-border bg-brand-primary/5 p-5 mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-text-primary text-sm">{t('experiences.contribute.title')}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{t('experiences.contribute.body')}</p>
                </div>
                <Link to="/experiences/share" className="text-xs font-medium text-brand-primary hover:text-brand-primary/80 transition-colors whitespace-nowrap flex-shrink-0">
                  {t('experiences.contribute.cta')} →
                </Link>
              </div>
            )}

            {/* Experience list — editorial, not a card grid */}
            <motion.div
              className="space-y-0 divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {items.map((item) => (
                <motion.article
                  key={item.id}
                  variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                  className="group px-6 py-5 hover:bg-elevated/40 transition-colors"
                >
                  {/* Row 1: program + university + outcome badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="font-semibold text-text-primary text-sm leading-snug">{item.program_name}</h2>
                        {item.scholarship_received && (
                          <span className="text-[10px] font-medium text-status-success bg-status-success/10 px-1.5 py-0.5 rounded-full">
                            {t('experiences.card.scholarshipReceived')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {item.university_name || t('experiences.card.customUniversity')}
                        {item.country ? ` · ${item.country}` : ''}
                        {item.degree_level ? ` · ${t(`degree.${item.degree_level}`, { defaultValue: item.degree_level })}` : ''}
                        {item.application_year ? ` · ${item.application_year}` : ''}
                      </p>
                    </div>
                    <OutcomeBadge
                      status={item.status as ExperienceApplicationStatus}
                      label={t(`experiences.status.${item.status}`, { defaultValue: item.status })}
                    />
                  </div>

                  {/* Row 2: excerpt — the story is the content */}
                  {item.notes && (
                    <blockquote className="mt-3 text-sm leading-6 text-text-secondary line-clamp-3 border-s-2 border-brand-primary/30 ps-4 italic">
                      {item.notes}
                    </blockquote>
                  )}

                  {/* Row 3: metadata + unlock */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span>{t('experiences.card.sharedOn', {
                      date: formatDate(item.created_at, i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }),
                    })}</span>
                    {item.requires_unlock && (
                      <span className="text-brand-primary font-medium">
                        {t('experiences.card.fullProfile', { price: item.view_price })}
                      </span>
                    )}
                  </div>
                </motion.article>
              ))}
            </motion.div>
          </>
        )}
      </div>
    </PageTransition>
  );
}
