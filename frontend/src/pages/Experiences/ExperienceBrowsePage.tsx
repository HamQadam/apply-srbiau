import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import { experiencesApi } from '../../api/services';
import { PageTransition } from '../../components/Transitions/PageTransition';
import { Skeleton } from '../../components/Feedback/Skeleton';
import { formatDate } from '../../lib/format';
import type { ExperienceApplicationStatus, PublicExperience } from '../../types';

const statusOptions: ExperienceApplicationStatus[] = ['accepted', 'rejected', 'waitlisted', 'withdrawn'];

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
      .catch((err) => {
        console.error('Failed to load experiences:', err);
        toast.error(t('experiences.loadError'));
      })
      .finally(() => setLoading(false));
  }, [params, t]);

  const update = (key: string, value: string | boolean) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, String(value));
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{t('experiences.title')}</h1>
            <p className="mt-1 text-sm text-text-muted">{t('experiences.subtitle')}</p>
            <Link
              to="/experiences/share"
              className="mt-4 inline-flex rounded-lg bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-brand-primary/90 transition-colors"
            >
              {t('experiences.shareLink')}
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:w-[720px]">
            <input
              value={query}
              onChange={(e) => update('query', e.target.value)}
              placeholder={t('experiences.filters.searchPlaceholder')}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label={t('experiences.filters.searchPlaceholder')}
            />
            <input
              value={country}
              onChange={(e) => update('country', e.target.value)}
              placeholder={t('experiences.filters.countryPlaceholder')}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label={t('experiences.filters.countryPlaceholder')}
            />
            <select
              value={status}
              onChange={(e) => update('status', e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label={t('experiences.filters.allOutcomes')}
            >
              <option value="">{t('experiences.filters.allOutcomes')}</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {t(`experiences.status.${item}`, { defaultValue: item.replace('_', ' ') })}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-secondary cursor-pointer hover:bg-elevated transition-colors">
              <input
                type="checkbox"
                checked={scholarship}
                onChange={(e) => update('scholarship', e.target.checked)}
                className="h-4 w-4 rounded text-brand-primary focus:ring-brand-primary"
              />
              {t('experiences.filters.scholarshipLabel')}
            </label>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-text-muted">
            {t('experiences.empty')}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-surface p-5 hover:shadow-[0_4px_16px_rgba(13,115,119,0.10)] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-text-primary">{item.program_name}</h2>
                    <p className="mt-1 text-sm text-text-muted">
                      {item.university_name || t('experiences.card.customUniversity')}
                      {item.country ? ` · ${item.country}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-elevated px-2.5 py-1 text-xs font-medium capitalize text-text-secondary flex-shrink-0">
                    {t(`experiences.status.${item.status}`, { defaultValue: item.status.replace('_', ' ') })}
                  </span>
                </div>
                <p className="mt-4 line-clamp-5 text-sm leading-6 text-text-secondary">{item.notes}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
                  {item.degree_level && <span>{t(`degree.${item.degree_level}`, { defaultValue: item.degree_level })}</span>}
                  {item.application_year && <span>{item.application_year}</span>}
                  {item.scholarship_received && (
                    <span className="text-status-success">{t('experiences.card.scholarshipReceived')}</span>
                  )}
                  {item.requires_unlock && (
                    <span className="text-brand-primary">
                      {t('experiences.card.fullProfile', { price: item.view_price })}
                    </span>
                  )}
                </div>
                <div className="mt-3 text-xs text-text-muted">
                  {t('experiences.card.sharedOn', {
                    date: formatDate(item.created_at, i18n.language, { year: 'numeric', month: 'short', day: 'numeric' }),
                  })}
                </div>
              </motion.article>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
