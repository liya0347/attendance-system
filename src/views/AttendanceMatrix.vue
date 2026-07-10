<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ElDatePicker, ElButton, ElSelect, ElOption, ElTable, ElTableColumn, ElTooltip, ElDivider } from 'element-plus';
import { Users, Edit, Trash2, AlertTriangle } from 'lucide-vue-next';
import { useEmployee } from '@/composables/useEmployee';
import { useAttendance } from '@/composables/useAttendance';
import { isWeekend, getDaysInMonth } from '@/utils/dateUtils';
import { isPublicHoliday } from '@/utils/holidayUtils';
import { calculateStatistics, isEmployeeActiveOnDate } from '@/utils/calcUtils';
import { exportAttendanceToExcel, importAttendanceDataFromExcel } from '@/utils/excelUtils';
import { useStorage } from '@/composables/useStorage';
import type { AttendanceType, Employee } from '@/types';

const { employees, addEmployee, updateEmployee, saveEmployees } = useEmployee();
const { records, updateRecord, createRecord, setMonth, currentMonth, attendanceRecords, saveAttendance } = useAttendance();
useStorage();

const getPreviousMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
};

const currentDate = ref(getPreviousMonth());

watch(currentDate, (newDate) => {
  setMonth({
    year: newDate.getFullYear(),
    month: newDate.getMonth() + 1
  });
}, { immediate: true });

const batchDepartment = ref('');
const searchKeyword = ref('');
const showImportDialog = ref(false);

const tableMaxHeight = 720;

const selectedType = ref<AttendanceType>('present');
const hours = ref(7.5);

const attendanceOptions = [
  { value: 'present', label: '出勤', class: 'status-present' },
  { value: 'late', label: '迟到', class: 'status-late' },
  { value: 'absent', label: '旷工', class: 'status-absent' },
  { value: 'rest', label: '休息', class: 'status-rest' },
  { value: 'overtime', label: '加班', class: 'status-overtime' },
  { value: 'annual_leave', label: '年假', class: 'status-annual-leave' },
  { value: 'personal_leave', label: '事假', class: 'status-personal-leave' },
  { value: 'sick_leave', label: '病假', class: 'status-sick-leave' },
  { value: 'bereavement_leave', label: '丧假', class: 'status-bereavement-leave' },
  { value: 'comp_time', label: '调休', class: 'status-comp-time' },
];

const requiresHours = ['overtime', 'annual_leave', 'personal_leave', 'sick_leave', 'bereavement_leave', 'comp_time'];

const showEmployeeDialog = ref(false);
const editingEmployee = ref<Employee | null>(null);
const employeeForm = ref<Omit<Employee, 'id'>>({
  name: '',
  department: '北分',
  hireDate: '',
  status: '正式员工',
  leaveDate: '',
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
});

function openEmployeeDialog(employee?: any) {
  if (employee) {
    editingEmployee.value = employee;
    employeeForm.value = {
      name: employee.name,
      department: employee.department,
      hireDate: employee.hireDate || '',
      status: employee.status,
      leaveDate: (employee as any).leaveDate || '',
      remark: employee.remark || '',
      position: (employee as any).position || '',
      level: (employee as any).level || '',
      gender: (employee as any).gender || '',
      regularDate: (employee as any).regularDate || '',
      baseSalary: (employee as any).baseSalary || 0,
      performanceSalary: (employee as any).performanceSalary || 0,
      performanceDays: (employee as any).performanceDays || 0,
      bankName: (employee as any).bankName || '',
      bankBranch: (employee as any).bankBranch || '',
      bankAccount: (employee as any).bankAccount || '',
      nativePlace: (employee as any).nativePlace || '',
      nationality: (employee as any).nationality || '',
      householdType: (employee as any).householdType || '',
      idCard: (employee as any).idCard || '',
      birthDate: (employee as any).birthDate || '',
      age: (employee as any).age || 0,
      education: (employee as any).education || '',
      school: (employee as any).school || '',
      major: (employee as any).major || '',
      maritalStatus: (employee as any).maritalStatus || '',
      phone: (employee as any).phone || '',
      address: (employee as any).address || '',
      emergencyContact: (employee as any).emergencyContact || '',
      emergencyRelation: (employee as any).emergencyRelation || '',
      emergencyPhone: (employee as any).emergencyPhone || ''
    };
  } else {
    editingEmployee.value = null;
    employeeForm.value = {
      name: '',
      department: '北分',
      hireDate: '',
      status: '正式员工',
      leaveDate: '',
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
  }
  showEmployeeDialog.value = true;
}

const confirmDeleteDialog = ref(false);
const deletingEmployeeId = ref('');

function confirmRemoveEmployee(id: string) {
  deletingEmployeeId.value = id;
  confirmDeleteDialog.value = true;
}

function removeEmployee() {
  const newEmployees = employees.value.filter(e => e.id !== deletingEmployeeId.value);
  saveEmployees(newEmployees);
  confirmDeleteDialog.value = false;
}

function saveEmployee() {
  if (!employeeForm.value.name.trim()) {
    return;
  }
  
  if (employeeForm.value.status === '离职' && !employeeForm.value.leaveDate.trim()) {
    return;
  }
  
  const formData = { ...employeeForm.value };
  if (formData.status === '正式员工') {
    formData.leaveDate = '';
  }
  
  if (editingEmployee.value) {
    const wasInactive = editingEmployee.value.status === '离职' || editingEmployee.value.status === '停薪留职';
    updateEmployee(editingEmployee.value.id, formData);
    
    if (wasInactive && formData.status === '正式员工') {
      const year = currentDate.value.getFullYear();
      const month = currentDate.value.getMonth() + 1;
      const empId = editingEmployee.value.id;
      
      const existingRecord = attendanceRecords.value.find(
        r => r.employeeId === empId && r.year === year && r.month === month
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
          id: `rec_${empId}_${year}_${month}`,
          employeeId: empId,
          year,
          month,
          records: initialRecords as any
        });
        
        saveAttendance(attendanceRecords.value);
      }
    }
  } else {
    addEmployee(formData);
  }
  showEmployeeDialog.value = false;
}

const surnamePinyinMap: Record<string, string> = {
  '曾': 'zeng',
  '查': 'zha',
  '解': 'xie',
  '乐': 'yue',
  '仇': 'qiu',
  '单': 'shan',
  '区': 'ou',
  '朴': 'piao',
  '冼': 'xian',
  '折': 'she',
  '芮': 'rui',
  '亓': 'qi',
  '阚': 'kan',
  '乜': 'nie',
  '逄': 'pang',
  '仝': 'tong',
  '郗': 'xi',
  '訾': 'zi',
  '荀': 'xun',
  '晁': 'chao',
  '酆': 'feng',
  '卞': 'bian',
  '厍': 'she',
  '辜': 'gu',
  '瞿': 'qu',
};

function getPinyinSortKey(name: string): string {
  let result = '';
  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    if (surnamePinyinMap[char]) {
      result += surnamePinyinMap[char];
    } else {
      result += char;
    }
  }
  return result;
}

const filteredEmployees = computed(() => {
  let result = [...employees.value];
  
  if (batchDepartment.value) {
    result = result.filter(e => e.department === batchDepartment.value);
  }
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(e => 
      e.name.toLowerCase().includes(keyword)
    );
  }
  
  return result.sort((a, b) => {
    if (a.status === '停薪留职' && b.status !== '停薪留职') return 1;
    if (a.status !== '停薪留职' && b.status === '停薪留职') return -1;
    const keyA = getPinyinSortKey(a.name);
    const keyB = getPinyinSortKey(b.name);
    return keyA.localeCompare(keyB, 'zh-CN', { sensitivity: 'accent' });
  });
});

const daysInMonth = computed(() => {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  return getDaysInMonth(year, month);
});

const monthYear = computed(() => {
  return `${currentDate.value.getFullYear()}年${currentDate.value.getMonth() + 1}月`;
});

const attendanceLegend = [
  { type: 'present', label: '出勤', class: 'status-present' },
  { type: 'late', label: '迟到', class: 'status-late' },
  { type: 'absent', label: '旷工', class: 'status-absent' },
  { type: 'rest', label: '休息', class: 'status-rest' },
  { type: 'overtime', label: '加班', class: 'status-overtime' },
  { type: 'annual_leave', label: '年假', class: 'status-annual-leave' },
  { type: 'personal_leave', label: '事假', class: 'status-personal-leave' },
  { type: 'sick_leave', label: '病假', class: 'status-sick-leave' },
  { type: 'comp_time', label: '调休', class: 'status-comp-time' },
  { type: 'public_holiday', label: '法定假', class: 'status-public-holiday' },
];

function getDayInfo(day: number) {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  return {
    isWeekend: isWeekend(year, month, day),
    isHoliday: isPublicHoliday(year, month, day)
  };
}

function getEmployeeRecords(employeeId: string) {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  const record = records.value.find(r => r.employeeId === employeeId && r.year === year && r.month === month);
  return record?.records || {};
}

function getCellValue(employeeId: string, day: number) {
  const records = getEmployeeRecords(employeeId);
  return records[`day${day}`];
}

function getCellClass(employeeId: string, day: number) {
  const employee = employees.value.find(e => e.id === employeeId);
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  if (!isEmployeeActiveOnDate(employee!, new Date(dateStr))) {
    return 'status-disabled';
  }
  
  const cell = getCellValue(employeeId, day);
  const dayInfo = getDayInfo(day);
  
  let type = cell?.type;
  if (!type || type === 'present') {
    if (dayInfo.isHoliday) {
      type = 'public_holiday';
    } else if (dayInfo.isWeekend) {
      type = 'rest';
    } else {
      type = 'present';
    }
  }
  
  const classMap: Record<string, string> = {
    'present': 'status-present',
    'late': 'status-late',
    'absent': 'status-absent',
    'rest': 'status-rest',
    'overtime': 'status-overtime',
    'annual_leave': 'status-annual-leave',
    'personal_leave': 'status-personal-leave',
    'sick_leave': 'status-sick-leave',
    'bereavement_leave': 'status-bereavement-leave',
    'comp_time': 'status-comp-time',
    'public_holiday': 'status-public-holiday',
  };
  
  return classMap[type] || '';
}

function getCellText(employeeId: string, day: number) {
  const employee = employees.value.find(e => e.id === employeeId);
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  if (!isEmployeeActiveOnDate(employee!, new Date(dateStr))) {
    return '';
  }
  
  const cell = getCellValue(employeeId, day);
  const dayInfo = getDayInfo(day);
  
  let type = cell?.type;
  if (!type || type === 'present') {
    if (dayInfo.isHoliday) {
      type = 'public_holiday';
    } else if (dayInfo.isWeekend) {
      type = 'rest';
    } else {
      type = 'present';
    }
  }
  
  const hours = cell?.hours || 0;
  
  const textMap: Record<string, string> = {
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
    'public_holiday': '法定假'
  };
  
  const baseText = textMap[type] || '';
  return hours > 0 ? `${baseText}${hours}h` : baseText;
}

const showDropdown = ref(false);
const dropdownPosition = ref({ x: 0, y: 0 });
const dropdownEmployeeId = ref('');
const dropdownDay = ref(0);

function handleCellClick(event: MouseEvent, employeeId: string, day: number) {
  const employee = employees.value.find(e => e.id === employeeId);
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  if (!isEmployeeActiveOnDate(employee!, new Date(dateStr))) {
    return;
  }
  
  const target = event.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  
  const dropdownHeight = 180;
  const windowHeight = window.innerHeight;
  const bottomSpace = windowHeight - rect.bottom;
  
  let dropdownY = rect.bottom + 8;
  if (bottomSpace < dropdownHeight) {
    dropdownY = rect.top - dropdownHeight - 8;
  }
  
  dropdownPosition.value = {
    x: rect.left,
    y: dropdownY
  };
  
  dropdownEmployeeId.value = employeeId;
  dropdownDay.value = day;
  
  const cell = getCellValue(employeeId, day);
  selectedType.value = cell?.type || 'present';
  hours.value = cell?.hours || 7.5;
  
  showDropdown.value = true;
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement;
  const dropdown = document.getElementById('attendance-dropdown');
  if (dropdown && !dropdown.contains(target)) {
    showDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

function getStatistics(employeeId: string) {
  const employee = employees.value.find(e => e.id === employeeId);
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  const record = records.value.find(r => r.employeeId === employeeId && r.year === year && r.month === month);
  return calculateStatistics(record?.records || {}, employee!, year, month);
}

function getStatusColor(stat: ReturnType<typeof getStatistics>) {
  if (stat.absentDays >= 1) return 'text-red-600 font-bold';
  if (stat.lateCount >= 3) return 'text-orange-600 font-bold';
  if (stat.personalLeaveDays >= 3) return 'text-yellow-600';
  return 'text-gray-800';
}

function getRowClassName({ row }: { row: any }) {
  return row.status === '停薪留职' ? 'suspended-employee' : '';
}

const lastSaveTime = ref('');

function handleSave() {
  saveEmployees();
  localStorage.setItem('attendance_records', JSON.stringify(records.value));
  localStorage.setItem('attendance_current_month', JSON.stringify(currentMonth.value));
  
  const now = new Date();
  lastSaveTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  alert(`保存成功！\n时间：${lastSaveTime.value}\n员工数据：${employees.value.length} 人\n考勤记录：${records.value.length} 条`);
}

function updateAttendance() {
  const year = currentDate.value.getFullYear();
  const month = currentDate.value.getMonth() + 1;
  
  let record = records.value.find(r => r.employeeId === dropdownEmployeeId.value && r.year === year && r.month === month);
  
  if (!record) {
    record = createRecord({
      employeeId: dropdownEmployeeId.value,
      year,
      month,
      records: {}
    });
  }
  
  const newRecords = { ...record.records };
  newRecords[`day${dropdownDay.value}`] = {
    type: selectedType.value,
    hours: requiresHours.includes(selectedType.value) ? hours.value : 0
  };
  updateRecord(record.id, { records: newRecords });
  
  const now = new Date();
  lastSaveTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  showDropdown.value = false;
}

function handleExport() {
  exportAttendanceToExcel(employees.value, records.value, currentMonth.value.year, currentMonth.value.month);
}

function triggerFileSelect() {
  const input = document.getElementById('import-file') as HTMLInputElement;
  if (input) {
    input.click();
  }
}

async function handleImport(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    try {
      const { attendanceData } = await importAttendanceDataFromExcel(file);
      let updatedCount = 0;
      let newEmployeeCount = 0;
      
      attendanceData.forEach(item => {
        const employee = employees.value.find(e => e.name === item.name);
        
        if (employee) {
          const existingIndex = attendanceRecords.value.findIndex(
            r => r.employeeId === employee.id && r.year === currentMonth.value.year && r.month === currentMonth.value.month
          );
          
          if (existingIndex !== -1) {
            const existingRecord = attendanceRecords.value[existingIndex];
            attendanceRecords.value[existingIndex] = {
              ...existingRecord,
              records: { ...existingRecord.records, ...(item.records as Record<string, { type: AttendanceType; hours: number }>) }
            };
            updatedCount++;
          } else {
            attendanceRecords.value.push({
              id: `record_${Date.now()}_${employee.id}`,
              employeeId: employee.id,
              year: currentMonth.value.year,
              month: currentMonth.value.month,
              records: { ...(item.records as Record<string, { type: AttendanceType; hours: number }>) }
            });
            updatedCount++;
          }
        } else {
          const newEmployee = {
            id: `emp_${Date.now()}`,
            name: item.name,
            department: item.department || '北分',
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
          addEmployee({ 
            ...newEmployee, 
            department: (newEmployee.department as '北分' | '火格') || '北分',
            status: '正式员工' as const,
            gender: '' as const,
            householdType: '' as const,
            maritalStatus: '' as const
          });
          
          attendanceRecords.value.push({
            id: `record_${Date.now()}_${newEmployee.id}`,
            employeeId: newEmployee.id,
            year: currentMonth.value.year,
            month: currentMonth.value.month,
            records: { ...(item.records as Record<string, { type: AttendanceType; hours: number }>) }
          });
          newEmployeeCount++;
        }
      });
      
      saveAttendance(attendanceRecords.value);
      showImportDialog.value = false;
      alert(`导入成功！更新 ${updatedCount} 名员工考勤数据，新增 ${newEmployeeCount} 名员工`);
    } catch (error) {
      alert(`导入失败：${(error as Error).message}`);
    }
    target.value = '';
  }
}
</script>

<template>
  <div class="app-wrapper">
    <header class="app-header">
      <div class="logo-section">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 10px;"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" x2="12" y1="6" y2="6"/><line x1="8" x2="8" y1="6" y2="6"/><line x1="16" x2="16" y1="6" y2="6"/><line x1="12" x2="12" y1="10" y2="10"/><line x1="8" x2="8" y1="10" y2="10"/><line x1="16" x2="16" y1="10" y2="10"/><line x1="12" x2="12" y1="14" y2="14"/><line x1="8" x2="8" y1="14" y2="14"/><line x1="16" x2="16" y1="14" y2="14"/><path d="M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/></svg>
        <span style="font-size: 24px; font-weight: 800; color: #ffffff;">考勤管理系统</span>
      </div>
    </header>
    
    <main class="app-main">
      <div class="content-container">
        <div class="toolbar">
          <div class="toolbar-left">
            <div class="page-title-section">
              <h2 class="page-title">{{ monthYear }}考勤矩阵</h2>
            </div>
            <div class="department-filter">
              <Users :size="14" class="text-gray-500 mr-1" />
              <span class="text-xs text-gray-500 mr-1">隶属公司：</span>
              <ElSelect v-model="batchDepartment" placeholder="全部" style="width: 80px">
                <ElOption label="全部" value="" />
                <ElOption label="北分" value="北分" />
                <ElOption label="火格" value="火格" />
              </ElSelect>
            </div>
            <div class="search-input-wrapper">
              <input
                v-model="searchKeyword"
                type="text"
                placeholder="搜索姓名..."
                class="search-input"
              />
              <button class="search-btn" @click="searchKeyword = searchKeyword.trim()">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              </button>
            </div>
          </div>
          
          <div class="toolbar-right">
            <div class="header-actions">
              <ElDatePicker
                v-model="currentDate"
                type="month"
                placeholder="选择月份"
                style="width: 140px"
              />
              <ElButton type="success" @click="openEmployeeDialog()" size="small">
                新增员工
              </ElButton>
              <ElButton type="primary" @click="handleSave" size="small">
                保存
              </ElButton>
              <ElButton type="info" @click="showImportDialog = true" size="small">
                导入Excel
              </ElButton>
              <ElButton type="success" @click="handleExport" size="small">
                导出Excel
              </ElButton>
            </div>
            <div class="save-status">
              <span class="status-dot"></span>
              <span>自动保存已开启</span>
              <span v-if="lastSaveTime" class="save-time">| 上次保存: {{ lastSaveTime }}</span>
            </div>
          </div>
        </div>
        
        <div class="legend-section">
          <span class="legend-label">状态图例：</span>
          <div class="legend-items">
            <span
              v-for="item in attendanceLegend"
              :key="item.type"
              class="legend-item"
              :class="item.class"
            >
              {{ item.label }}
            </span>
          </div>
        </div>
        
        <div class="table-container">
          <ElTable 
            :data="filteredEmployees" 
            :border="true" 
            size="small" 
            :max-height="tableMaxHeight" 
            class="attendance-table"
            :row-class-name="getRowClassName"
          >
            <ElTableColumn type="index" label="序号" width="55" align="center" fixed="left" />
            <ElTableColumn label="姓名" width="80" fixed="left">
              <template #default="{ row }">
                <ElTooltip v-if="row.status === '停薪留职'" content="停薪留职" placement="top">
                  <span class="cursor-help">{{ row.name }}</span>
                </ElTooltip>
                <span v-else>{{ row.name }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="department" label="隶属" width="80" fixed="left">
              <template #default="{ row }">
                <span
                  :class="row.department === '北分' ? 'badge-blue' : 'badge-green'"
                  class="department-badge"
                >
                  {{ row.department }}
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn
              v-for="day in daysInMonth"
              :key="day"
              :label="day.toString()"
              width="72"
              align="center"
            >
              <template #default="{ row }">
                <div
                  class="attendance-cell"
                  :class="getCellClass(row.id, day)"
                  @click.stop="handleCellClick($event, row.id, day)"
                >
                  {{ getCellText(row.id, day) }}
                </div>
              </template>
            </ElTableColumn>
            
            <ElDivider direction="vertical" />
            
            <ElTableColumn label="迟到" width="65" align="center">
              <template #default="{ row }">
                <span :class="{ 'text-red-600 font-bold': getStatistics(row.id).lateCount >= 3 }">
                  {{ getStatistics(row.id).lateCount }}次
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="年假" width="65" align="center">
              <template #default="{ row }">
                <span class="text-blue-600">
                  {{ getStatistics(row.id).annualLeaveDays }}天
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="事假" width="65" align="center">
              <template #default="{ row }">
                <span :class="{ 'text-yellow-600 font-bold': getStatistics(row.id).personalLeaveDays >= 3 }">
                  {{ getStatistics(row.id).personalLeaveDays }}天
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="病假" width="65" align="center">
              <template #default="{ row }">
                <span class="text-red-600">
                  {{ getStatistics(row.id).sickLeaveDays }}天
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="丧假" width="65" align="center">
              <template #default="{ row }">
                <span class="text-gray-600">
                  {{ getStatistics(row.id).bereavementLeaveDays }}天
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="旷工" width="65" align="center">
              <template #default="{ row }">
                <span :class="{ 'text-red-600 font-bold': getStatistics(row.id).absentDays >= 1 }">
                  {{ getStatistics(row.id).absentDays }}
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="加班" width="65" align="center">
              <template #default="{ row }">
                <span class="text-purple-600">
                  {{ getStatistics(row.id).overtimeDays }}天
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="计薪天数" width="85" align="center">
              <template #default="{ row }">
                <span v-if="row.status === '停薪留职'" class="text-gray-500 text-sm">
                  停薪留职
                </span>
                <span v-else :class="getStatusColor(getStatistics(row.id))" class="font-medium">
                  {{ getStatistics(row.id).payableDays.toFixed(1) }}
                </span>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="操作" width="90" align="center">
              <template #default="{ row }">
                <div class="action-icons">
                  <span
                    class="icon-btn edit-btn"
                    title="编辑员工"
                    @click.stop="openEmployeeDialog(row)"
                  >
                    <Edit :size="16" />
                  </span>
                  <span
                    class="icon-btn delete-btn"
                    title="删除员工"
                    @click.stop="confirmRemoveEmployee(row.id)"
                  >
                    <Trash2 :size="16" />
                  </span>
                </div>
              </template>
            </ElTableColumn>
          </ElTable>
        </div>
      </div>
    </main>
    
    <Teleport to="body">
      <div v-if="showEmployeeDialog" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">{{ editingEmployee ? '编辑员工' : '新增员工' }}</h3>
            <button class="modal-close" @click="showEmployeeDialog = false">×</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input v-model="employeeForm.name" type="text" placeholder="请输入姓名" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">隶属</label>
              <select v-model="employeeForm.department" class="form-input">
                <option value="北分">北分</option>
                <option value="火格">火格</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">入职日期</label>
              <input v-model="employeeForm.hireDate" type="text" placeholder="YYYY-MM-DD" class="form-input" />
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <select v-model="employeeForm.status" class="form-input">
                <option value="在职">在职</option>
                <option value="离职">离职</option>
                <option value="停薪留职">停薪留职</option>
              </select>
            </div>
            <div v-if="employeeForm.status === '离职'" class="form-group required">
              <label class="form-label">离职日期 <span class="text-red-500">*</span></label>
              <ElDatePicker
                v-model="employeeForm.leaveDate"
                type="date"
                value-format="YYYY-MM-DD"
                placeholder="选择离职日期"
                style="width: 100%"
              />
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="employeeForm.remark" rows="2" class="form-input"></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-default" @click="showEmployeeDialog = false">取消</button>
            <button class="btn btn-primary" @click="saveEmployee">确认</button>
          </div>
        </div>
      </div>
      
      <div
        v-if="showDropdown"
        id="attendance-dropdown"
        class="attendance-dropdown"
        :style="{ left: `${dropdownPosition.x}px`, top: `${dropdownPosition.y}px` }"
      >
        <div class="dropdown-header">选择考勤状态</div>
        <div class="dropdown-grid">
          <button
            v-for="opt in attendanceOptions"
            :key="opt.value"
            :class="[
              'dropdown-option',
              selectedType === opt.value 
                ? opt.class + ' option-selected' 
                : opt.class
            ]"
            @click.stop="selectedType = opt.value as AttendanceType"
          >
            {{ opt.label }}
          </button>
        </div>
        <div v-if="requiresHours.includes(selectedType)" class="dropdown-hours">
          <div class="hours-label">时长（小时）</div>
          <input
            v-model.number="hours"
            type="number"
            min="0.5"
            max="12"
            step="0.5"
            class="hours-input"
          />
        </div>
        <div class="dropdown-footer">
          <button class="btn btn-default btn-sm" @click.stop="showDropdown = false">取消</button>
          <button class="btn btn-primary btn-sm" @click.stop="updateAttendance">确认</button>
        </div>
      </div>
      
      <div v-if="showImportDialog" class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">导入Excel</h3>
            <button class="modal-close" @click="showImportDialog = false">×</button>
          </div>
          <div class="modal-body">
            <div class="import-area" @click="triggerFileSelect">
              <div class="import-icon">
                <svg class="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </div>
              <p class="import-text">点击选择文件或拖拽文件到此处</p>
              <p class="import-hint">支持 .xlsx 和 .xls 格式</p>
            </div>
            <input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              class="hidden"
              @change="handleImport"
            />
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" @click="showImportDialog = false">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
    
    <Teleport to="body">
      <div v-if="confirmDeleteDialog" class="modal-overlay">
        <div class="modal-container small">
          <div class="modal-header">
            <div class="warning-icon">
              <AlertTriangle :size="20" class="text-red-600" />
            </div>
            <h3 class="modal-title">确认删除</h3>
          </div>
          <div class="modal-body">
            <p>确定要删除该员工吗？此操作不可撤销。</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-default" @click="confirmDeleteDialog = false">取消</button>
            <button class="btn btn-danger" @click="removeEmployee">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.app-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56px;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.header-left {
  flex-shrink: 0;
}

.logo-section {
  display: flex;
  align-items: center;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.breadcrumb {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-box {
  position: relative;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

.content-container {
  max-width: 100%;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
}

.page-title-section {
  flex: 1;
}

.title-icon {
  width: 48px;
  height: 48px;
  background-color: #eff6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.page-subtitle {
  font-size: 12px;
  color: #9ca3af;
  margin: 2px 0 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-btn {
  border-radius: 8px;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.department-filter {
  display: flex;
  align-items: center;
}

.search-input-wrapper {
  display: flex;
  align-items: center;
}

.search-input {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px 0 0 8px;
  font-size: 14px;
  border-right: none;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #3b82f6;
}

.search-btn {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-btn:hover {
  background-color: #2563eb;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
}

.save-time {
  color: #9ca3af;
}

.legend-section {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background-color: #f9fafb;
  border-radius: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
}

.legend-label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  flex-shrink: 0;
}

.legend-items {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend-item {
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
  flex-shrink: 0;
  min-width: 52px;
}

.table-container {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
}

.attendance-table {
  width: 100%;
}

.attendance-cell {
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
  text-align: center;
  padding: 4px 2px;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attendance-cell:hover {
  transform: scale(1.05);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.department-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.badge-blue {
  background-color: #dbeafe;
  color: #1d4ed8;
}

.badge-green {
  background-color: #dcfce7;
  color: #16a34a;
}

.action-icons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn {
  color: #3b82f6;
  background-color: #eff6ff;
}

.edit-btn:hover {
  background-color: #dbeafe;
}

.delete-btn {
  color: #ef4444;
  background-color: #fef2f2;
}

.delete-btn:hover {
  background-color: #fee2e2;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-container {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 400px;
  overflow: hidden;
}

.modal-container.small {
  width: 360px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}

.warning-icon {
  width: 40px;
  height: 40px;
  background-color: #fee2e2;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-close {
  font-size: 24px;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.modal-close:hover {
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group.required .form-label {
  color: #dc2626;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 6px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f3f4f6;
  background-color: #f9fafb;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-default {
  background-color: #f3f4f6;
  color: #374151;
}

.btn-default:hover {
  background-color: #e5e7eb;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.attendance-dropdown {
  position: fixed;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  padding: 12px;
  min-width: 200px;
  z-index: 50;
}

.dropdown-header {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}

.dropdown-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.dropdown-option {
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 11px;
  text-align: center;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.dropdown-option:hover {
  transform: scale(1.05);
}

.option-selected {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}

.dropdown-hours {
  margin-top: 12px;
}

.hours-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.hours-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}

.hours-input:focus {
  border-color: #3b82f6;
}

.dropdown-footer {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.suspended-employee {
  background-color: #f9fafb !important;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.import-area {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.import-area:hover {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.import-icon {
  margin-bottom: 16px;
}

.import-text {
  font-size: 14px;
  color: #374151;
  margin-bottom: 8px;
}

.import-hint {
  font-size: 12px;
  color: #9ca3af;
}

::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>