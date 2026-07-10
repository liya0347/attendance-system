import * as XLSX from 'xlsx';
import type { Employee, AttendanceRecord } from '@/types';
import { getDaysInMonth } from './dateUtils';
import { isPublicHoliday } from './holidayUtils';

const ATTENDANCE_TYPE_MAP: Record<string, string> = {
  'present': '出勤',
  'late': '迟到',
  'absent': '旷工',
  'rest': '休息',
  'overtime': '加班',
  'annual_leave': '年假',
  'personal_leave': '事假',
  'sick_leave': '病假',
  'bereavement_leave': '丧假',
  'comp_time': '调休',
  'public_holiday': '法定假（带薪）'
};

const REVERSE_ATTENDANCE_MAP: Record<string, string> = {
  '出勤': 'present',
  '迟到': 'late',
  '旷工': 'absent',
  '休息': 'rest',
  '加班': 'overtime',
  '年假': 'annual_leave',
  '事假': 'personal_leave',
  '病假': 'sick_leave',
  '丧假': 'bereavement_leave',
  '调休': 'comp_time',
  '法定假': 'public_holiday',
  '法定假（带薪）': 'public_holiday'
};

export function exportToExcel(employees: Employee[], records: AttendanceRecord[], year: number, month: number): any {
  const totalDays = getDaysInMonth(year, month);
  const headerRow = ['序号', '姓名', '隶属部门'];
  
  for (let day = 1; day <= totalDays; day++) {
    headerRow.push(`${day}`);
  }
  
  headerRow.push('迟到次数', '带薪假（年假）时数', '带薪假（年假）天数',
    '事假时数', '事假天数', '病假时数', '病假天数', '丧假时数', '丧假天数', '旷工天数', '加班天数', '计薪天数');

  const dataRows: any[][] = [];
  
  employees.forEach((emp, index) => {
    const record = records.find(r => r.employeeId === emp.id && r.year === year && r.month === month);
    const row: any[] = [index + 1, emp.name, emp.department];
    
    for (let day = 1; day <= totalDays; day++) {
      const dailyRecord = record?.records[`day${day}`];
      if (dailyRecord) {
        const typeName = ATTENDANCE_TYPE_MAP[dailyRecord.type];
        if (dailyRecord.hours > 0) {
          row.push(`${typeName}${dailyRecord.hours}h`);
        } else {
          row.push(typeName);
        }
      } else {
        row.push('');
      }
    }
    
    const stats = calculateStats(record?.records || {}, year, month);
    row.push(
      stats.lateCount,
      stats.annualLeaveHours,
      stats.annualLeaveDays.toFixed(2),
      stats.personalLeaveHours,
      stats.personalLeaveDays.toFixed(2),
      stats.sickLeaveHours,
      stats.sickLeaveDays.toFixed(2),
      stats.bereavementLeaveHours,
      stats.bereavementLeaveDays.toFixed(2),
      stats.absentDays,
      stats.overtimeDays,
      stats.payableDays.toFixed(2)
    );
    
    dataRows.push(row);
  });

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  
  for (let col = 1; col <= totalDays; col++) {
    const day = col;
    const colLetter = XLSX.utils.encode_col(col + 2);
    if (isPublicHoliday(year, month, day)) {
      for (let row = 2; row <= employees.length + 1; row++) {
        worksheet[`${colLetter}${row}`] = {
          ...worksheet[`${colLetter}${row}`],
          s: { fill: { fgColor: { rgb: 'F5F5F5' } } }
        };
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${year}年${month}月考勤表`);
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as unknown as Blob;
}

function calculateStats(records: Record<string, { type: string; hours: number }>, year: number, month: number) {
  const WORK_HOURS_PER_DAY = 7.5;
  const totalDays = getDaysInMonth(year, month);
  let workdayCount = 0;
  let leaveDeduction = 0;
  let holidayCount = 0;
  
  let stats = {
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
  
  for (let day = 1; day <= totalDays; day++) {
    const record = records[`day${day}`];
    const type = record?.type || 'rest';
    const isHoliday = isPublicHoliday(year, month, day);
    const weekday = new Date(year, month - 1, day).getDay();
    const isWeekend = weekday === 0 || weekday === 6;
    
    if (isHoliday) {
      holidayCount++;
      if (type === 'overtime') {
        stats.overtimeDays++;
      }
    } else if (isWeekend) {
      if (type === 'overtime') {
        stats.overtimeDays++;
      }
    } else {
      workdayCount++;
      
      switch (type) {
        case 'late': stats.lateCount++; break;
        case 'absent': stats.absentDays++; leaveDeduction += 1; break;
        case 'overtime': stats.overtimeDays++; break;
        case 'annual_leave': stats.annualLeaveHours += record?.hours || 0; break;
        case 'personal_leave': stats.personalLeaveHours += record?.hours || 0; leaveDeduction += (record?.hours || 0) / WORK_HOURS_PER_DAY; break;
        case 'sick_leave': stats.sickLeaveHours += record?.hours || 0; leaveDeduction += (record?.hours || 0) / WORK_HOURS_PER_DAY; break;
        case 'bereavement_leave': stats.bereavementLeaveHours += record?.hours || 0; break;
        case 'comp_time': break;
        case 'present': break;
      }
    }
  }
  
  stats.annualLeaveDays = stats.annualLeaveHours / WORK_HOURS_PER_DAY;
  stats.personalLeaveDays = stats.personalLeaveHours / WORK_HOURS_PER_DAY;
  stats.sickLeaveDays = stats.sickLeaveHours / WORK_HOURS_PER_DAY;
  stats.bereavementLeaveDays = stats.bereavementLeaveHours / WORK_HOURS_PER_DAY;
  stats.payableDays = Math.max(0, workdayCount - leaveDeduction + holidayCount);
  
  return stats;
}

export function importFromExcel(file: File): Promise<{ employees: Employee[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件内容为空'));
          return;
        }
        
        const employees: Employee[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row[1]) continue;
          
          const employee: Employee = {
            id: `emp_${String(i).padStart(3, '0')}`,
            name: String(row[1]),
            department: row[2] === '火格' ? '火格' : '北分',
            hireDate: '2025-01-15',
            leaveDate: '',
            status: '正式员工',
            remark: '',
            position: '',
            level: '',
            gender: '',
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
            age: 0,
            education: '',
            school: '',
            major: '',
            maritalStatus: '',
            phone: '',
            address: '',
            emergencyContact: '',
            emergencyRelation: '',
            emergencyPhone: ''
          };
          employees.push(employee);
        }
        
        resolve({ employees });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportAttendanceToExcel(employees: Employee[], records: AttendanceRecord[], year: number, month: number): void {
  try {
    const totalDays = getDaysInMonth(year, month);
    const headerRow = ['序号', '姓名', '隶属部门'];
    
    for (let day = 1; day <= totalDays; day++) {
      headerRow.push(`${day}`);
    }
    
    headerRow.push('迟到次数', '带薪假（年假）时数', '带薪假（年假）天数',
      '事假时数', '事假天数', '病假时数', '病假天数', '丧假时数', '丧假天数', '旷工天数', '加班天数', '计薪天数');

    const dataRows: any[][] = [];
    
    employees.forEach((emp, index) => {
      const record = records.find(r => r.employeeId === emp.id && r.year === year && r.month === month);
      const row: any[] = [index + 1, emp.name, emp.department];
      
      for (let day = 1; day <= totalDays; day++) {
        const dailyRecord = record?.records[`day${day}`];
        if (dailyRecord) {
          const typeName = ATTENDANCE_TYPE_MAP[dailyRecord.type];
          if (dailyRecord.hours > 0) {
            row.push(`${typeName}${dailyRecord.hours}h`);
          } else {
            row.push(typeName);
          }
        } else {
          row.push('');
        }
      }
      
      const stats = calculateStats(record?.records || {}, year, month);
      row.push(
        stats.lateCount,
        stats.annualLeaveHours,
        stats.annualLeaveDays.toFixed(2),
        stats.personalLeaveHours,
        stats.personalLeaveDays.toFixed(2),
        stats.sickLeaveHours,
        stats.sickLeaveDays.toFixed(2),
        stats.bereavementLeaveHours,
        stats.bereavementLeaveDays.toFixed(2),
        stats.absentDays,
        stats.overtimeDays,
        stats.payableDays.toFixed(2)
      );
      
      dataRows.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${year}年${month}月考勤表`);
    
    XLSX.writeFile(workbook, `${year}年${month}月考勤表.xlsx`);
    
    console.log(`Excel导出成功: ${year}年${month}月考勤表.xlsx`);
  } catch (error) {
    console.error('Excel导出失败:', error);
    alert(`导出失败，请查看控制台日志：${error}`);
  }
}

export function exportEmployeeToExcel(employees: Employee[]): void {
  const headerRow = ['序号', '姓名', '部门', '入职日期', '离职日期', '状态', '备注'];
  const dataRows = employees.map((emp, index) => [
    index + 1,
    emp.name,
    emp.department,
    emp.hireDate || '',
    emp.leaveDate || '',
    emp.status,
    emp.remark || ''
  ]);
  
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '员工信息');
  
  const blob = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as unknown as Blob;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '员工信息.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importAttendanceFromExcel(file: File): void {
  importFromExcel(file).then(({ employees }) => {
    const employeeData = JSON.parse(localStorage.getItem('attendance_employees') || '[]');
    const newEmployees = employees.filter(e => !employeeData.some((ex: Employee) => ex.name === e.name));
    if (newEmployees.length > 0) {
      localStorage.setItem('attendance_employees', JSON.stringify([...employeeData, ...newEmployees]));
    }
  }).catch(error => {
    console.error('导入失败:', error);
  });
}

export function importEmployeeFromExcel(file: File): void {
  importFromExcel(file).then(({ employees }) => {
    const existingEmployees = JSON.parse(localStorage.getItem('attendance_employees') || '[]');
    const newEmployees = employees.filter(e => !existingEmployees.some((ex: Employee) => ex.name === e.name));
    if (newEmployees.length > 0) {
      localStorage.setItem('attendance_employees', JSON.stringify([...existingEmployees, ...newEmployees]));
    }
  }).catch(error => {
    console.error('导入失败:', error);
  });
}

export function importAttendanceDataFromExcel(file: File): Promise<{ attendanceData: Array<{ name: string; department: string; records: Record<string, { type: string; hours: number }> }> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length < 2) {
          reject(new Error('Excel文件内容为空'));
          return;
        }
        
        const headerRow = jsonData[0] as string[];
        const dayColumns: number[] = [];
        headerRow.forEach((header, index) => {
          const headerStr = String(header).trim();
          const day = parseInt(headerStr);
          if (!isNaN(day) && day >= 1 && day <= 31) {
            dayColumns.push(index);
          }
        });
        
        console.log('导入调试 - 日期列:', dayColumns);
        
        const attendanceData: Array<{ name: string; department: string; records: Record<string, { type: string; hours: number }> }> = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (!row[1]) continue;
          
          const name = String(row[1]).trim();
          const department = row[2] ? String(row[2]).trim() : '';
          const records: Record<string, { type: string; hours: number }> = {};
          
          dayColumns.forEach(colIndex => {
            const day = parseInt(headerRow[colIndex]);
            const cellValue = row[colIndex];
            const cellStr = cellValue !== undefined && cellValue !== null ? String(cellValue).trim() : '';
            
            if (cellStr) {
              let type = 'present';
              let hours = 0;
              
              for (const [chineseName, code] of Object.entries(REVERSE_ATTENDANCE_MAP)) {
                if (cellStr.includes(chineseName)) {
                  type = code;
                  const hoursMatch = cellStr.match(/(\d+\.?\d*)h/);
                  if (hoursMatch) {
                    hours = parseFloat(hoursMatch[1]);
                  }
                  break;
                }
              }
              
              records[`day${day}`] = { type, hours };
            }
          });
          
          attendanceData.push({ name, department, records });
        }
        
        console.log('导入调试 - 考勤数据:', attendanceData);
        resolve({ attendanceData });
      } catch (error) {
        console.error('导入失败:', error);
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export function generateTemplate(employees: Employee[]): Blob {
  const headerRow = ['序号', '姓名', '隶属部门', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25',
    '26', '27', '28', '29', '30', '31'];
  
  const dataRows: any[][] = [];
  employees.forEach((emp, index) => {
    const row = [index + 1, emp.name, emp.department];
    for (let i = 0; i < 31; i++) {
      row.push('');
    }
    dataRows.push(row);
  });
  
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '考勤模板');
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as unknown as Blob;
}
