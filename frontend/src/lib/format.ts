const resolveLocale = (language: string) =>
  language.toLowerCase().startsWith('fa') ? 'fa-IR' : 'en-US';

export const formatDate = (
  date: string | Date,
  language: string,
  options: Intl.DateTimeFormatOptions
) => new Intl.DateTimeFormat(resolveLocale(language), options).format(new Date(date));

export const formatNumber = (
  value: number,
  language: string,
  options?: Intl.NumberFormatOptions
) => new Intl.NumberFormat(resolveLocale(language), options).format(value);

export const formatCurrency = (
  value: number,
  language: string,
  currency = 'EUR'
) =>
  new Intl.NumberFormat(resolveLocale(language), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
