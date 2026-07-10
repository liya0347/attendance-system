import { computed } from 'vue';
import type { AttendanceRecord, DailyRecord, Employee, MonthInfo } from '@/types';
import { useStorage } from './useStorage';
import { getDaysInMonth } from '@/utils/dateUtils';
import { isPublicHoliday } from '@/utils/holidayUtils';
import { calculateStatistics } from '@/utils/calcUtils';

export function useAttendance() {
  const { attendanceRecords, currentMonth, saveAttendance, saveCurrentMonth, initMonthRecords } = useStorage();

  const records = computed(() => attendanceRecords.value);

  function getAttendanceRecord(employeeId: string, year: number, month: number): AttendanceRecord | undefined {
    return attendanceRecords.value.find(
      r => r.employeeId === employeeId && r.year === year && r.month === month
    );
  }

  function createRecord(data: Omit<AttendanceRecord, 'id'>): AttendanceRecord {
    const newRecord: AttendanceRecord = {
      ...data,
      id: `rec_${Date.now()}`
    };
    attendanceRecords.value.push(newRecord);
    return newRecord;
  }

  function updateRecord(id: string, updates: Partial<AttendanceRecord>) {
    const index = attendanceRecords.value.findIndex(r => r.id === id);
    if (index !== -1) {
      attendanceRecords.value[index] = { ...attendanceRecords.value[index], ...updates };
      saveAttendance(attendanceRecords.value);
    }
  }

  function addRecords(record: AttendanceRecord) {
    attendanceRecords.value.push(record);
  }

  function addEmployees(employee: any) {
    const { employees } = useStorage();
    employees.value.push(employee);
  }

  function createOrUpdateAttendance(employeeId: string, year: number, month: number, records: Record<string, DailyRecord>) {
    const existingIndex = attendanceRecords.value.findIndex(
      r => r.employeeId === employeeId && r.year === year && r.month === month
    );

    if (existingIndex !== -1) {
      attendanceRecords.value[existingIndex].records = records;
    } else {
      attendanceRecords.value.push({
        id: `rec_${Date.now()}`,
        employeeId,
        year,
        month,
        records
      });
    }
    saveAttendance(attendanceRecords.value);
  }

  function updateDailyRecord(employeeId: string, year: number, month: number, day: number, record: DailyRecord) {
    let recordData = getAttendanceRecord(employeeId, year, month);

    if (!recordData) {
      const totalDays = getDaysInMonth(year, month);
      const initialRecords: Record<string, DailyRecord> = {};
      
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const date = new Date(dateStr);
        const weekday = date.getDay();
        
        if (weekday === 0 || weekday === 6) {
          initialRecords[`day${d}`] = { type: 'rest', hours: 0 };
        } else if (isPublicHoliday(year, month, d)) {
          initialRecords[`day${d}`] = { type: 'public_holiday', hours: 0 };
        } else {
          initialRecords[`day${d}`] = { type: 'present', hours: 0 };
        }
      }
      
      recordData = {
        id: `rec_${Date.now()}`,
        employeeId,
        year,
        month,
        records: initialRecords
      };
      attendanceRecords.value.push(recordData);
    }

    recordData.records[`day${day}`] = record;
    saveAttendance(attendanceRecords.value);
  }

  function getDailyRecord(employeeId: string, year: number, month: number, day: number): DailyRecord | undefined {
    const record = getAttendanceRecord(employeeId, year, month);
    return record?.records[`day${day}`];
  }

  function setMonth(month: MonthInfo) {
    saveCurrentMonth(month);
    initMonthRecords(month.year, month.month);
  }

  function getMonthStatistics(employee: Employee, year: number, month: number) {
    const record = getAttendanceRecord(employee.id, year, month);
    return calculateStatistics(record?.records || {}, employee, year, month);
  }

  const allMonthRecords = computed(() => {
    return attendanceRecords.value.filter(
      r => r.year === currentMonth.value.year && r.month === currentMonth.value.month
    );
  });

  return {
    records,
    attendanceRecords,
    currentMonth,
    getAttendanceRecord,
    createRecord,
    updateRecord,
    addRecords,
    addEmployees,
    createOrUpdateAttendance,
    updateDailyRecord,
    getDailyRecord,
    setMonth,
    getMonthStatistics,
    allMonthRecords,
    saveAttendance
  };
}
