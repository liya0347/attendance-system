import type { Employee, AttendanceRecord } from '@/types';
import { isPublicHoliday } from '@/utils/holidayUtils';

const employeeNames = [
  '张伟', '李强', '王芳', '刘洋', '陈静', '杨帆', '赵雪', '孙磊', '周婷', '吴涛',
  '郑浩', '黄丽', '林涛', '何敏', '马强', '朱燕', '胡鹏', '林婷', '郭勇', '何琳',
  '罗浩', '梁燕', '宋涛', '谢敏', '韩雪', '唐磊', '曹静', '蒋涛', '邓芳', '许强',
  '傅丽', '沈磊', '曾静', '彭涛', '吕芳', '苏强', '卢婷', '蒋浩', '蔡芳', '丁强',
  '魏丽', '叶磊', '闫静', '姜涛', '崔芳'
];

export function generateMockEmployees(): Employee[] {
  const employees: Employee[] = [];
  
  employeeNames.forEach((name, index) => {
    const department = index < 23 ? '北分' : '火格';
    const status = index === 43 ? '离职' : '正式员工';
    const gender = index % 2 === 0 ? '男' : '女';
    const maritalStatus = index < 15 ? '未婚' : '已婚';
    const age = 22 + Math.floor(index / 3);
    
    employees.push({
      id: `emp_${String(index + 1).padStart(3, '0')}`,
      name,
      department,
      hireDate: '2025-01-15',
      leaveDate: status === '离职' ? '2026-04-30' : '',
      status,
      remark: '',
      
      position: '',
      level: '',
      gender,
      regularDate: '',
      baseSalary: 0,
      performanceSalary: 0,
      performanceDays: '',
      bankName: '',
      bankBranch: '',
      bankAccount: '',
      nativePlace: '',
      nationality: '',
      householdType: '',
      idCard: '',
      birthDate: '',
      age,
      education: '',
      school: '',
      major: '',
      maritalStatus,
      phone: '',
      address: '',
      emergencyContact: '',
      emergencyRelation: '',
      emergencyPhone: ''
    });
  });
  
  return employees;
}

export function generateInitialAttendance(employees: Employee[]): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const year = 2026;
  const month = 5;
  const totalDays = new Date(year, month, 0).getDate();
  
  employees.forEach(employee => {
    const dailyRecords: Record<string, { type: string; hours: number }> = {};
    
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(dateStr);
      const weekday = date.getDay();
      
      if (isPublicHoliday(year, month, day)) {
        dailyRecords[`day${day}`] = { type: 'public_holiday', hours: 0 };
      } else if (weekday === 0 || weekday === 6) {
        dailyRecords[`day${day}`] = { type: 'rest', hours: 0 };
      } else {
        dailyRecords[`day${day}`] = { type: 'present', hours: 0 };
      }
    }
    
    records.push({
      id: `rec_${employee.id}_${year}_${month}`,
      employeeId: employee.id,
      year,
      month,
      records: dailyRecords as Record<string, { type: import('@/types').AttendanceType; hours: number }>
    });
  });
  
  return records;
}
