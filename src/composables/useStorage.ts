import { ref, watch } from 'vue';
import type { Employee, AttendanceRecord, MonthInfo } from '@/types';
import { generateMockEmployees, generateInitialAttendance } from '@/data/mockData';
import { isPublicHoliday } from '@/utils/holidayUtils';

const STORAGE_KEYS = {
  EMPLOYEES: 'attendance_employees',
  ATTENDANCE: 'attendance_records',
  CURRENT_MONTH: 'attendance_current_month',
  DELETED_EMPLOYEES: 'attendance_deleted_employees'
};

const employees = ref<Employee[]>([]);
const attendanceRecords = ref<AttendanceRecord[]>([]);
const currentMonth = ref<MonthInfo>({ year: 2026, month: 5 });
const deletedEmployees = ref<(Employee & { deletedAt: string })[]>([]);

function loadEmployees(): Employee[] {
  const stored = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.error('Failed to parse employees:', e);
    }
  }
  const mockData = generateMockEmployees();
  saveEmployees(mockData);
  return mockData;
}

function saveEmployees(data?: Employee[]) {
  const targetData = data !== undefined ? data : employees.value;
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(targetData));
  employees.value = targetData;
}

function loadAttendance(): AttendanceRecord[] {
  const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.error('Failed to parse attendance:', e);
    }
  }
  const mockData = generateInitialAttendance(employees.value);
  saveAttendance(mockData);
  return mockData;
}

function saveAttendance(data: AttendanceRecord[]) {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(data));
  attendanceRecords.value = data;
}

function loadCurrentMonth(): MonthInfo {
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_MONTH);
  if (stored) {
    return JSON.parse(stored);
  }
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function saveCurrentMonth(data: MonthInfo) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_MONTH, JSON.stringify(data));
  currentMonth.value = data;
}

function initMonthRecords(year: number, month: number) {
  employees.value.forEach(emp => {
    if ((emp.status === '正式员工' || emp.status === '试用期' || emp.status === '实习生' || emp.status === '兼职') && emp.leaveDate) {
      emp.leaveDate = '';
    }
    
    const existingRecord = attendanceRecords.value.find(
      r => r.employeeId === emp.id && r.year === year && r.month === month
    );
    
    if (!existingRecord) {
      const totalDays = new Date(year, month, 0).getDate();
      const initialRecords: Record<string, { type: string; hours: number }> = {};
      
      for (let d = 1; d <= totalDays; d++) {
        const date = new Date(year, month - 1, d);
        const weekday = date.getDay();
        
        if (isPublicHoliday(year, month, d)) {
          initialRecords[`day${d}`] = { type: 'public_holiday', hours: 0 };
        } else if (weekday === 0 || weekday === 6) {
          initialRecords[`day${d}`] = { type: 'rest', hours: 0 };
        } else {
          initialRecords[`day${d}`] = { type: 'present', hours: 0 };
        }
      }
      
      attendanceRecords.value.push({
        id: `rec_${emp.id}_${year}_${month}`,
        employeeId: emp.id,
        year,
        month,
        records: initialRecords as any
      });
    } else {
      const totalDays = new Date(year, month, 0).getDate();
      let updated = false;
      
      for (let d = 1; d <= totalDays; d++) {
        const dayKey = `day${d}`;
        const existingDay = existingRecord.records[dayKey];
        
        if (isPublicHoliday(year, month, d)) {
          if (!existingDay || existingDay.type !== 'public_holiday') {
            if (!existingDay || ['present', 'rest'].includes(existingDay.type)) {
              existingRecord.records[dayKey] = { type: 'public_holiday', hours: 0 };
              updated = true;
            }
          }
        }
      }
      
      if (updated) {
        saveAttendance(attendanceRecords.value);
      }
    }
  });
}

function loadDeletedEmployees(): (Employee & { deletedAt: string })[] {
  const stored = localStorage.getItem(STORAGE_KEYS.DELETED_EMPLOYEES);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.error('Failed to parse deleted employees:', e);
    }
  }
  return [];
}

function saveDeletedEmployees(data: (Employee & { deletedAt: string })[]) {
  localStorage.setItem(STORAGE_KEYS.DELETED_EMPLOYEES, JSON.stringify(data));
  deletedEmployees.value = data;
}

function initData() {
  employees.value = loadEmployees();
  currentMonth.value = loadCurrentMonth();
  attendanceRecords.value = loadAttendance();
  deletedEmployees.value = loadDeletedEmployees();
  
  initMonthRecords(currentMonth.value.year, currentMonth.value.month);
}

watch(employees, (newVal) => {
  saveEmployees(newVal);
}, { deep: true });

watch(attendanceRecords, (newVal) => {
  saveAttendance(newVal);
}, { deep: true });

watch(currentMonth, (newVal) => {
  saveCurrentMonth(newVal);
}, { deep: true });

export function useStorage() {
  return {
    employees,
    attendanceRecords,
    currentMonth,
    deletedEmployees,
    initData,
    saveEmployees,
    saveAttendance,
    saveCurrentMonth,
    saveDeletedEmployees,
    initMonthRecords
  };
}
