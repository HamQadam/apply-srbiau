import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { coursesApi } from '../../api';
import type { CourseWithUniversity } from '../../types';

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function ProgramSearch({
  onSelect,
  placeholder = 'جستجوی برنامه از دیتابیس...',
}: {
  onSelect: (course: CourseWithUniversity) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const q = useDebouncedValue(query, 250);

  const { data, isFetching } = useQuery<CourseWithUniversity[]>({
    queryKey: ['courses', 'search', q],
    queryFn: () => coursesApi.list({ course_name: q, limit: 10 }),
    enabled: q.trim().length >= 2,
  });

  const results = useMemo(() => data ?? [], [data]);
  const showDropdown = q.trim().length >= 2;

  return (
    <div className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-300"
        />
        {isFetching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">...</div>
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-72 overflow-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">نتیجه‌ای پیدا نشد.</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-3 hover:bg-gray-50"
                    onClick={() => {
                      onSelect(c);
                      setQuery(`${c.course_name} — ${c.university.name}`);
                    }}
                  >
                    <div className="text-sm font-medium text-gray-900">{c.course_name}</div>
                    <div className="text-xs text-gray-500">
                      {c.university.name} • {c.university.country}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
