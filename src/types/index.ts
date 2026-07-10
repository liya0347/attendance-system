export interface Employee {
  id: string;
  name: string;
  department: '北分' | '火格';
  hireDate: string;
  leaveDate: string;
  status: '正式员工' | '离职' | '停薪留职' | '实习生' | '兼职' | '试用期';
  remark: string;
  
  position: string;
  level: string;
  gender: '男' | '女' | '';
  regularDate: string;
  baseSalary: number;
  performanceSalary: number;
  performanceDays: string;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  nativePlace: string;
  nationality: string;
  householdType: '城镇' | '农村' | '';
  idCard: string;
  birthDate: string;
  age: number;
  education: string;
  school: string;
  major: string;
  maritalStatus: '未婚' | '已婚' | '离异' | '丧偶' | '';
  phone: string;
  address: string;
  emergencyContact: string;
  emergencyRelation: string;
  emergencyPhone: string;
}

export type AttendanceType =
  | 'present'
  | 'late'
  | 'absent'
  | 'rest'
  | 'overtime'
  | 'annual_leave'
  | 'personal_leave'
  | 'sick_leave'
  | 'bereavement_leave'
  | 'comp_time'
  | 'public_holiday';

export interface DailyRecord {
  type: AttendanceType;
  hours: number;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  records: Record<string, DailyRecord>;
}

export interface Statistics {
  lateCount: number;
  annualLeaveHours: number;
  annualLeaveDays: number;
  personalLeaveHours: number;
  personalLeaveDays: number;
  sickLeaveHours: number;
  sickLeaveDays: number;
  bereavementLeaveHours: number;
  bereavementLeaveDays: number;
  absentDays: number;
  overtimeDays: number;
  payableDays: number;
}

export interface DepartmentStats {
  department: string;
  totalEmployees: number;
  avgLateCount: number;
  totalAnnualLeaveDays: number;
  totalPersonalLeaveDays: number;
  totalSickLeaveDays: number;
  totalAbsentDays: number;
  totalOvertimeDays: number;
}

export interface DayInfo {
  day: number;
  weekday: number;
  isWeekend: boolean;
  isPublicHoliday: boolean;
  holidayName: string;
}

export interface Holiday {
  date: string;
  name: string;
  type: 'holiday' | 'workday';
}

export interface MonthInfo {
  year: number;
  month: number;
}
