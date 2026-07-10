import type { Employee, DailyRecord, Statistics, DepartmentStats, AttendanceRecord } from '@/types';
import { getDaysInMonth } from './dateUtils';
import { isPublicHoliday } from './holidayUtils';

const WORK_HOURS_PER_DAY = 7.5;

export function convertHoursToDays(hours: number): number {
  return Math.round((hours / WORK_HOURS_PER_DAY) * 10) / 10;
}

export function isEmployeeActiveOnDate(employee: Employee, date: Date): boolean {
  if (employee.status === '停薪留职') {
    return false;
  }
  
  const hireDate = employee.hireDate ? new Date(employee.hireDate) : null;
  const leaveDate = employee.leaveDate ? new Date(employee.leaveDate) : null;
  
  if (hireDate && date < hireDate) {
    return false;
  }
  
  if (leaveDate && date > leaveDate) {
    return false;
  }
  
  return true;
}

export function calculateStatistics(
  records: Record<string, DailyRecord>,
  employee: Employee,
  year: number,
  month: number
): Statistics {
  const totalDays = getDaysInMonth(year, month);
  let stats: Statistics = {
    lateCount: 0,
    annualLeaveHours: 0,
    annualLeaveDays: 0,
    personalLeaveHours: 0,
    personalLeaveDays: 0,
    sickLeaveHours: 0,
    sickLeaveDays: 0,
    bereavementLeaveHours: 0,
    bereavementLeaveDays: 0,
    absentDays: 0,
    overtimeDays: 0,
    payableDays: 0
  };
  
  let workdayCount = 0;
  let leaveDeduction = 0;
  let holidayCount = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    if (!isEmployeeActiveOnDate(employee, new Date(dateStr))) {
      continue;
    }
    
    const record = records[`day${day}`];
    const isHoliday = isPublicHoliday(year, month, day);
    const weekday = new Date(year, month - 1, day).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    
    if (isHoliday) {
      holidayCount++;
      if (record?.type === 'overtime') {
        stats.overtimeDays++;
      }
    } else if (isWeekend) {
      if (record?.type === 'overtime') {
        stats.overtimeDays++;
      }
    } else {
      workdayCount++;
      const type = record?.type || 'present';
      
      switch (type) {
        case 'late':
          stats.lateCount++;
          break;
        case 'absent':
          stats.absentDays++;
          leaveDeduction += 1;
          break;
        case 'overtime':
          stats.overtimeDays++;
          break;
        case 'annual_leave':
          stats.annualLeaveHours += record?.hours || 0;
          break;
        case 'personal_leave':
          stats.personalLeaveHours += record?.hours || 0;
          leaveDeduction += (record?.hours || 0) / WORK_HOURS_PER_DAY;
          break;
        case 'sick_leave':
          stats.sickLeaveHours += record?.hours || 0;
          leaveDeduction += (record?.hours || 0) / WORK_HOURS_PER_DAY;
          break;
        case 'bereavement_leave':
          stats.bereavementLeaveHours += record?.hours || 0;
          break;
        case 'comp_time':
          break;
        case 'rest':
          break;
        case 'public_holiday':
          break;
        case 'present':
        default:
          break;
      }
    }
  }
  
  stats.annualLeaveDays = convertHoursToDays(stats.annualLeaveHours);
  stats.personalLeaveDays = convertHoursToDays(stats.personalLeaveHours);
  stats.sickLeaveDays = convertHoursToDays(stats.sickLeaveHours);
  stats.bereavementLeaveDays = convertHoursToDays(stats.bereavementLeaveHours);
  stats.payableDays = Math.max(0, workdayCount - leaveDeduction + holidayCount);
  
  return stats;
}

export function calculateDepartmentStats(
  employees: Employee[],
  attendanceRecords: AttendanceRecord[],
  year: number,
  month: number
): DepartmentStats[] {
  const departments: string[] = ['北分', '火格'];
  
  return departments.map(dept => {
    const deptEmployees = employees.filter(e => e.department === dept);
    const deptRecords = attendanceRecords.filter(r => 
      deptEmployees.some(e => e.id === r.employeeId)
    );
    
    const statsList = deptEmployees.map(emp => {
      const record = deptRecords.find(r => r.employeeId === emp.id && r.year === year && r.month === month);
      return calculateStatistics(record?.records || {}, emp, year, month);
    });
    
    return {
      department: dept,
      totalEmployees: deptEmployees.length,
      avgLateCount: statsList.reduce((sum, s) => sum + s.lateCount, 0) / deptEmployees.length,
      totalAnnualLeaveDays: statsList.reduce((sum, s) => sum + s.annualLeaveDays, 0),
      totalPersonalLeaveDays: statsList.reduce((sum, s) => sum + s.personalLeaveDays, 0),
      totalSickLeaveDays: statsList.reduce((sum, s) => sum + s.sickLeaveDays, 0),
      totalAbsentDays: statsList.reduce((sum, s) => sum + s.absentDays, 0),
      totalOvertimeDays: statsList.reduce((sum, s) => sum + s.overtimeDays, 0)
    };
  });
}

export function calculateAttendanceRate(presentDays: number, totalWorkDays: number): number {
  if (totalWorkDays === 0) return 0;
  return (presentDays / totalWorkDays) * 100;
}
