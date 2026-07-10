import type { DayInfo } from '@/types';

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getWeekday(year: number, month: number, day: number): number {
  return new Date(year, month - 1, day).getDay();
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = getWeekday(year, month, day);
  return weekday === 0 || weekday === 6;
}

export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getMonthDays(year: number, month: number): DayInfo[] {
  const days: DayInfo[] = [];
  const totalDays = getDaysInMonth(year, month);
  
  for (let day = 1; day <= totalDays; day++) {
    days.push({
      day,
      weekday: getWeekday(year, month, day),
      isWeekend: isWeekend(year, month, day),
      isPublicHoliday: false,
      holidayName: ''
    });
  }
  
  return days;
}

export function getWeekdayName(weekday: number): string {
  const names = ['日', '一', '二', '三', '四', '五', '六'];
  return names[weekday];
}
