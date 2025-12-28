import type { TrackedProgramStatus } from '../../types';
import { Select } from '../ui';

const OPTIONS: { value: TrackedProgramStatus; label: string }[] = [
  { value: 'researching', label: 'در حال بررسی' },
  { value: 'preparing', label: 'در حال آماده‌سازی' },
  { value: 'submitted', label: 'ارسال‌شده' },
  { value: 'interview', label: 'مصاحبه' },
  { value: 'accepted', label: 'قبول‌شده' },
  { value: 'rejected', label: 'رد‌شده' },
  { value: 'waitlisted', label: 'لیست انتظار' },
];

export function StatusDropdown({
  value,
  onChange,
  disabled,
}: {
  value: TrackedProgramStatus;
  onChange: (next: TrackedProgramStatus) => void;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      options={OPTIONS}
      onChange={(e) => onChange(e.target.value as TrackedProgramStatus)}
    />
  );
}
