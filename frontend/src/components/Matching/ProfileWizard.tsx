import React, { useState, useEffect } from 'react';
import { matchingApi } from '../../api/services';
import type { MatchingOptions, MatchingProfile } from '../../types';

interface ProfileWizardProps {
  onComplete: (profile: MatchingProfile, bonusAwarded: number) => void;
  onSkip?: () => void;
  initialProfile?: MatchingProfile;
}

const STEPS = ['Fields', 'Countries', 'Budget', 'Timeline', 'Extras'];

export const ProfileWizard: React.FC<ProfileWizardProps> = ({ onComplete, onSkip, initialProfile }) => {
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
  
  useEffect(() => {
    loadOptions();
  }, []);
  
  const loadOptions = async () => {
    try {
      const data = await matchingApi.getOptions();
      setOptions(data);
    } catch (err) {
      setError('Failed to load options');
    } finally {
      setLoading(false);
    }
  };
  
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
    } catch (err) {
      setError('Failed to save profile');
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (!options) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load options. Please refresh.</p>
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                i <= step 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 h-1 mx-1 rounded transition-all ${
                  i < step ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          {STEPS.map((s, i) => (
            <span key={s} className={i === step ? 'text-indigo-600 font-medium' : ''}>{s}</span>
          ))}
        </div>
      </div>
      
      {/* Step content */}
      <div className="bg-white rounded-2xl shadow-lg p-6 min-h-[400px]">
        {/* Step 1: Fields */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What do you want to study?</h2>
            <p className="text-gray-500 mb-6">Select up to 3 fields of interest</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {options.fields.map(field => (
                <button
                  key={field}
                  onClick={() => handleFieldToggle(field)}
                  disabled={!selectedFields.includes(field) && selectedFields.length >= 3}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    selectedFields.includes(field)
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : selectedFields.length >= 3
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {field}
                </button>
              ))}
            </div>
            {selectedFields.length > 0 && (
              <p className="mt-4 text-sm text-indigo-600">
                Selected: {selectedFields.join(', ')}
              </p>
            )}
          </div>
        )}
        
        {/* Step 2: Countries */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Where do you want to study?</h2>
            <p className="text-gray-500 mb-6">Select your preferred countries</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {options.countries.map(country => (
                <button
                  key={country}
                  onClick={() => handleCountryToggle(country)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    selectedCountries.includes(country)
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {country}
                </button>
              ))}
            </div>
            {selectedCountries.length > 0 && (
              <p className="mt-4 text-sm text-indigo-600">
                Selected: {selectedCountries.join(', ')}
              </p>
            )}
          </div>
        )}
        
        {/* Step 3: Budget */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your budget?</h2>
            <p className="text-gray-500 mb-6">Select your annual tuition budget range</p>
            <div className="space-y-3">
              {Object.entries(options.budget_ranges).map(([key, range]) => (
                <button
                  key={key}
                  onClick={() => setBudgetRange(key)}
                  className={`w-full p-4 rounded-xl text-left transition-all ${
                    budgetRange === key
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="font-medium">{range.label}</div>
                  {key === 'free' && (
                    <div className={`text-sm ${budgetRange === key ? 'text-indigo-100' : 'text-gray-500'}`}>
                      🎓 Many programs in Germany, Norway, etc.
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-6">
              <label className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferScholarships}
                  onChange={(e) => setPreferScholarships(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <div className="font-medium text-amber-800">Prioritize programs with scholarships</div>
                  <div className="text-sm text-amber-600">We'll highlight programs offering financial aid</div>
                </div>
              </label>
            </div>
          </div>
        )}
        
        {/* Step 4: Timeline */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">When do you plan to start?</h2>
            <p className="text-gray-500 mb-6">Select your target degree and intake</p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Degree Level</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {options.degree_levels.map(level => (
                  <button
                    key={level}
                    onClick={() => setDegreeLevel(level)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      degreeLevel === level
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Intake</label>
              <div className="grid grid-cols-2 gap-2">
                {options.intake_options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTargetIntake(option.value)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      targetIntake === option.value
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Step 5: Extras */}
        {step === 4 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost done!</h2>
            <p className="text-gray-500 mb-6">Add optional details for better matches</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teaching Language</label>
                <div className="grid grid-cols-3 gap-2">
                  {options.teaching_languages.map(lang => (
                    <button
                      key={lang}
                      onClick={() => setLanguagePreference(lang)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        languagePreference === lang
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GRE Score (optional)</label>
                  <input
                    type="number"
                    value={greScore || ''}
                    onChange={(e) => setGreScore(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="260-340"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GMAT Score (optional)</label>
                  <input
                    type="number"
                    value={gmatScore || ''}
                    onChange={(e) => setGmatScore(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="200-800"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPA (optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={gpa || ''}
                    onChange={(e) => setGpa(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="Your GPA"
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">GPA Scale</label>
                  <select
                    value={gpaScale}
                    onChange={(e) => setGpaScale(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="4.0">4.0 Scale</option>
                    <option value="20">20 Scale (French)</option>
                    <option value="100">100 Scale</option>
                    <option value="10">10 Scale (Indian)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              step === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Back
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Skip for now
            </button>
          )}
        </div>
        <button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          className={`px-8 py-3 rounded-xl font-medium transition-all shadow-lg ${
            canProceed() && !saving
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl shadow-indigo-500/25'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </span>
          ) : step === STEPS.length - 1 ? (
            '🎉 Get Recommendations'
          ) : (
            'Next'
          )}
        </button>
      </div>
    </div>
  );
};

export default ProfileWizard;
