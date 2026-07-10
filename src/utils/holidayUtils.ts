import type { Holiday } from '@/types';

const PUBLIC_HOLIDAYS_2026: Holiday[] = [
  { date: '2026-01-01', name: '元旦', type: 'holiday' },
  { date: '2026-01-02', name: '元旦', type: 'holiday' },
  { date: '2026-01-03', name: '元旦', type: 'holiday' },
  
  { date: '2026-02-16', name: '春节', type: 'holiday' },
  { date: '2026-02-17', name: '春节', type: 'holiday' },
  { date: '2026-02-18', name: '春节', type: 'holiday' },
  { date: '2026-02-19', name: '春节', type: 'holiday' },
  { date: '2026-02-20', name: '春节', type: 'holiday' },
  
  { date: '2026-04-04', name: '清明节', type: 'holiday' },
  { date: '2026-04-05', name: '清明节', type: 'holiday' },
  
  { date: '2026-05-01', name: '劳动节', type: 'holiday' },
  { date: '2026-05-02', name: '劳动节', type: 'holiday' },
  { date: '2026-05-03', name: '劳动节', type: 'holiday' },
  
  { date: '2026-06-19', name: '端午节', type: 'holiday' },
  
  { date: '2026-09-25', name: '中秋节', type: 'holiday' },
  { date: '2026-09-26', name: '中秋节', type: 'holiday' },
  
  { date: '2026-10-01', name: '国庆节', type: 'holiday' },
  { date: '2026-10-02', name: '国庆节', type: 'holiday' },
  { date: '2026-10-03', name: '国庆节', type: 'holiday' },
  { date: '2026-10-04', name: '国庆节', type: 'holiday' },
  { date: '2026-10-05', name: '国庆节', type: 'holiday' },
];

export function getPublicHolidays(year: number): Holiday[] {
  if (year === 2026) {
    return PUBLIC_HOLIDAYS_2026;
  }
  return [];
}

export function isPublicHoliday(year: number, month: number, day: number): boolean {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return getPublicHolidays(year).some(h => h.date === dateStr && h.type === 'holiday');
}

export function getHolidayName(year: number, month: number, day: number): string {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const holiday = getPublicHolidays(year).find(h => h.date === dateStr);
  return holiday?.name || '';
}
