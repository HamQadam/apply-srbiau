import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { matchingApi } from '../../api/services';
import { Spinner } from '../Feedback/Spinner';
import { cn } from '../../lib/cn';
import type { MatchingOptions, MatchingProfile } from '../../types';

interface ProfileWizardProps {
  onComplete: (profile: MatchingProfile, bonusAwarded: number) => void;
  onSkip?: () => void;
  initialProfile?: MatchingProfile;
}

const STEPS = ['fields', 'countries', 'budget', 'timeline', 'extras'];
const PAGE_SIZE = 12;

export const ProfileWizard: React.FC<ProfileWizardProps> = ({ onComplete, onSkip, initialProfile }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<MatchingOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [selectedFields, setSelectedFields] = useState<string[]>(initialProfile?.preferred_fields || []);
  const [selectedCountries, setSelectedCountries] = useState<string[]>(initialProfile?.preferred_countries || []);
  const [budgetRange, setBudgetRange] = useState<string>('medium');
  const [preferScholarships, setPreferScholarships] = useState(initialProfile?.prefer_scholarships || false);
  const [degreeLevel, setDegreeLevel] = useState(initialProfile?.preferred_degree_level || 'Master');
  const [targetIntake, setTargetIntake] = useState(initialProfile?.target_intake || 'fall_2026');
  const [languagePreference, setLanguagePreference] = useState(initialProfile?.language_preference || 'English');
  const [greScore, setGreScore] = useState<number | undefined>(initialProfile?.gre_score);
  const [gmatScore, setGmatScore] = useState<number | undefined>(initialProfile?.gmat_score);
  const [gpa, setGpa] = useState<number | undefined>(initialProfile?.gpa);
  const [gpaScale, setGpaScale] = useState(initialProfile?.gpa_scale || '4.0');
  const [fieldQuery, setFieldQuery] = useState('');
  const [countryQuery, setCountryQuery] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  
  useEffect(() => {
    loadOptions();
  }, []);
  
  const loadOptions = async () => {
    try {
      const data = await matchingApi.getOptions();
      setOptions(data);
    } catch (err) {
      const message = t('wizard.loadError');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const filteredFields = useMemo(() => {
    if (!options?.fields) return [];
    return options.fields.filter((field) =>
      field.toLowerCase().includes(fieldQuery.trim().toLowerCase())
    );
  }, [options?.fields, fieldQuery]);

  const filteredCountries = useMemo(() => {
    if (!options?.countries) return [];
    return options.countries.filter((country) =>
      country.toLowerCase().includes(countryQuery.trim().toLowerCase())
    );
  }, [options?.countries, countryQuery]);

  const visibleFields = showAllFields ? filteredFields : filteredFields.slice(0, PAGE_SIZE);
  const visibleCountries = showAllCountries ? filteredCountries : filteredCountries.slice(0, PAGE_SIZE);
  
  const handleFieldToggle = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else if (selectedFields.length < 3) {
      setSelectedFields([...selectedFields, field]);
    }
  };
  
  const handleCountryToggle = (country: string) => {
    if (selectedCountries.includes(country)) {
      setSelectedCountries(selectedCountries.filter(c => c !== country));
    } else {
      setSelectedCountries([...selectedCountries, country]);
    }
  };
  
  const canProceed = () => {
    switch (step) {
      case 0: return selectedFields.length > 0;
      case 1: return selectedCountries.length > 0;
      case 2: return true;
      case 3: return degreeLevel && targetIntake;
      case 4: return true;
      default: return false;
    }
  };
  
  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };
  
  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };
  
  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    
    const budgetValues = options?.budget_ranges[budgetRange] || { min: 0, max: 999999 };
    
    const profile: MatchingProfile = {
      preferred_fields: selectedFields,
      preferred_countries: selectedCountries,
      budget_min: budgetValues.min,
      budget_max: budgetValues.max,
      preferred_degree_level: degreeLevel,
      target_intake: targetIntake,
      language_preference: languagePreference,
      gre_score: greScore,
      gmat_score: gmatScore,
      gpa: gpa,
      gpa_scale: gpaScale,
      prefer_scholarships: preferScholarships,
    };
    
    try {
      const result = await matchingApi.saveProfile(profile);
      onComplete(result.profile, result.bonus_awarded);
      setSaving(false);
    } catch (err) {
      const message = t('wizard.saveError');
      setError(message);
      toast.error(message);
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }
  
  if (!options) {
    return (
      <div className="text-center py-12">
        <p className="text-status-danger">{t('wizard.loadError')}</p>
      </div>
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  i <= step
                    ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white'
                    : 'bg-elevated text-text-muted'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-16 h-1 mx-1 rounded transition-all ${
                    i < step ? 'bg-gradient-to-r from-brand-primary to-brand-secondary' : 'bg-elevated'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-text-muted">
          {STEPS.map((s, i) => (
            <span key={s} className={i === step ? 'text-brand-primary font-medium' : ''}>
              {t(`wizard.steps.${s}`)}
            </span>
          ))}
        </div>
      </div>
      
      {/* Step content */}
      <div className="bg-surface rounded-2xl shadow-lg p-6 min-h-[420px] border border-border">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Fields */}
            {step === 0 && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{t('wizard.fields.title')}</h2>
                <p className="text-text-muted mb-4">{t('wizard.fields.subtitle')}</p>
                <div className="mb-4">
                  <input
                    value={fieldQuery}
                    onChange={(e) => setFieldQuery(e.target.value)}
                    placeholder={t('wizard.fields.searchPlaceholder')}
                    className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {visibleFields.map((field) => (
                    <motion.button
                      key={field}
                      onClick={() => handleFieldToggle(field)}
                      disabled={!selectedFields.includes(field) && selectedFields.length >= 3}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'p-3 rounded-xl text-sm font-medium transition-all',
                        selectedFields.includes(field)
                          ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                          : selectedFields.length >= 3
                          ? 'bg-elevated text-text-muted cursor-not-allowed'
                          : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                      )}
                    >
                      {field}
                    </motion.button>
                  ))}
                </div>
                {filteredFields.length > PAGE_SIZE && (
                  <motion.button
                    onClick={() => setShowAllFields((prev) => !prev)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-4 text-sm text-brand-primary hover:text-brand-secondary"
                  >
                    {showAllFields ? t('wizard.showLess') : t('wizard.showMore')}
                  </motion.button>
                )}
                {selectedFields.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedFields.map((field) => (
                      <motion.button
                        key={field}
                        onClick={() => handleFieldToggle(field)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-3 py-1 rounded-full text-xs bg-brand-primary/10 text-brand-primary"
                      >
                        {field} ×
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Countries */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{t('wizard.countries.title')}</h2>
                <p className="text-text-muted mb-4">{t('wizard.countries.subtitle')}</p>
                <div className="mb-4">
                  <input
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    placeholder={t('wizard.countries.searchPlaceholder')}
                    className="w-full px-4 py-2.5 border border-border rounded-xl bg-background focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {visibleCountries.map((country) => (
                    <motion.button
                      key={country}
                      onClick={() => handleCountryToggle(country)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'p-3 rounded-xl text-sm font-medium transition-all',
                        selectedCountries.includes(country)
                          ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                          : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                      )}
                    >
                      {country}
                    </motion.button>
                  ))}
                </div>
                {filteredCountries.length > PAGE_SIZE && (
                  <motion.button
                    onClick={() => setShowAllCountries((prev) => !prev)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="mt-4 text-sm text-brand-primary hover:text-brand-secondary"
                  >
                    {showAllCountries ? t('wizard.showLess') : t('wizard.showMore')}
                  </motion.button>
                )}
                {selectedCountries.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedCountries.map((country) => (
                      <motion.button
                        key={country}
                        onClick={() => handleCountryToggle(country)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-3 py-1 rounded-full text-xs bg-brand-primary/10 text-brand-primary"
                      >
                        {country} ×
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Budget */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{t('wizard.budget.title')}</h2>
                <p className="text-text-muted mb-6">{t('wizard.budget.subtitle')}</p>
                <div className="space-y-3">
                  {Object.entries(options.budget_ranges).map(([key, range]) => (
                    <motion.button
                      key={key}
                      onClick={() => setBudgetRange(key)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        'w-full p-4 rounded-xl text-start transition-all',
                        budgetRange === key
                          ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                          : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                      )}
                    >
                      <div className="font-medium">{range.label}</div>
                      {key === 'free' && (
                        <div className={`text-sm ${budgetRange === key ? 'text-white/80' : 'text-text-muted'}`}>
                          {t('wizard.budget.freeHint')}
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="mt-6">
                  <label className="flex items-center gap-3 p-4 bg-status-warning/10 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferScholarships}
                      onChange={(e) => setPreferScholarships(e.target.checked)}
                      className="w-5 h-5 rounded text-status-warning focus:ring-status-warning"
                    />
                    <div>
                      <div className="font-medium text-text-primary">{t('wizard.budget.scholarshipsTitle')}</div>
                      <div className="text-sm text-text-muted">{t('wizard.budget.scholarshipsSubtitle')}</div>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 4: Timeline */}
            {step === 3 && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{t('wizard.timeline.title')}</h2>
                <p className="text-text-muted mb-6">{t('wizard.timeline.subtitle')}</p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('wizard.timeline.degreeLevel')}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {options.degree_levels.map((level) => (
                      <motion.button
                        key={level}
                        onClick={() => setDegreeLevel(level)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          'p-3 rounded-xl text-sm font-medium transition-all',
                          degreeLevel === level
                            ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                            : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                        )}
                      >
                        {level}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    {t('wizard.timeline.intake')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {options.intake_options.map((option) => (
                      <motion.button
                        key={option.value}
                        onClick={() => setTargetIntake(option.value)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          'p-3 rounded-xl text-sm font-medium transition-all',
                          targetIntake === option.value
                            ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                            : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                        )}
                      >
                        {option.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Extras */}
            {step === 4 && (
              <div>
                <h2 className="text-2xl font-bold text-text-primary mb-2">{t('wizard.extras.title')}</h2>
                <p className="text-text-muted mb-6">{t('wizard.extras.subtitle')}</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      {t('wizard.extras.language')}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {options.teaching_languages.map((lang) => (
                        <motion.button
                          key={lang}
                          onClick={() => setLanguagePreference(lang)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          className={cn(
                            'p-3 rounded-xl text-sm font-medium transition-all',
                            languagePreference === lang
                              ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white shadow-md'
                              : 'bg-elevated text-text-secondary hover:bg-elevated/80'
                          )}
                        >
                          {lang}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        {t('wizard.extras.gre')}
                      </label>
                      <input
                        type="number"
                        value={greScore || ''}
                        onChange={(e) => setGreScore(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="260-340"
                        className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        {t('wizard.extras.gmat')}
                      </label>
                      <input
                        type="number"
                        value={gmatScore || ''}
                        onChange={(e) => setGmatScore(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="200-800"
                        className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        {t('wizard.extras.gpa')}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={gpa || ''}
                        onChange={(e) => setGpa(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder={t('wizard.extras.gpaPlaceholder')}
                        className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        {t('wizard.extras.gpaScale')}
                      </label>
                      <select
                        value={gpaScale}
                        onChange={(e) => setGpaScale(e.target.value)}
                        className="w-full p-3 border border-border rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-background"
                      >
                        <option value="4.0">{t('wizard.extras.gpaScales.four')}</option>
                        <option value="20">{t('wizard.extras.gpaScales.twenty')}</option>
                        <option value="100">{t('wizard.extras.gpaScales.hundred')}</option>
                        <option value="10">{t('wizard.extras.gpaScales.ten')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <div className="mt-4 p-3 bg-status-danger/10 border border-status-danger/30 rounded-xl text-status-danger text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-4">
          <motion.button
            onClick={handleBack}
            disabled={step === 0}
            whileHover={step === 0 ? undefined : { scale: 1.02 }}
            whileTap={step === 0 ? undefined : { scale: 0.97 }}
            className={cn(
              'px-6 py-3 rounded-xl font-medium transition-all',
              step === 0 ? 'text-text-muted cursor-not-allowed' : 'text-text-secondary hover:bg-elevated'
            )}
          >
            {t('wizard.back')}
          </motion.button>
          {onSkip && (
            <motion.button
              onClick={onSkip}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              {t('wizard.skip')}
            </motion.button>
          )}
        </div>
        <motion.button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          whileHover={canProceed() && !saving ? { scale: 1.02 } : undefined}
          whileTap={canProceed() && !saving ? { scale: 0.97 } : undefined}
          className={cn(
            'px-8 py-3 rounded-xl font-medium transition-all shadow-lg',
            canProceed() && !saving
              ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white hover:shadow-xl shadow-brand-primary/25'
              : 'bg-elevated text-text-muted cursor-not-allowed'
          )}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Spinner className="h-4 w-4 border-white border-t-transparent" />
              {t('wizard.saving')}
            </span>
          ) : step === STEPS.length - 1 ? (
            t('wizard.finish')
          ) : (
            t('wizard.next')
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default ProfileWizard;
