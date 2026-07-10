import { computed } from 'vue';
import type { Employee } from '@/types';
import { useStorage } from './useStorage';

export function useEmployee() {
  const { employees, saveEmployees, deletedEmployees, saveDeletedEmployees } = useStorage();

  const activeEmployees = computed(() => 
    employees.value.filter(e => e.status !== '停薪留职')
  );

  const beifenEmployees = computed(() => 
    employees.value.filter(e => e.department === '北分')
  );

  const huogeEmployees = computed(() => 
    employees.value.filter(e => e.department === '火格')
  );

  function addEmployee(employee: Omit<Employee, 'id'>) {
    const newId = `emp_${String(employees.value.length + 1).padStart(3, '0')}`;
    employees.value.push({ ...employee, id: newId });
  }

  function updateEmployee(id: string, updates: Partial<Employee>) {
    const index = employees.value.findIndex(e => e.id === id);
    if (index !== -1) {
      employees.value[index] = { ...employees.value[index], ...updates };
    }
  }

  function deleteEmployee(id: string) {
    const employee = employees.value.find(e => e.id === id);
    if (employee) {
      deletedEmployees.value.push({
        ...employee,
        deletedAt: new Date().toISOString()
      });
      saveDeletedEmployees(deletedEmployees.value);
    }
    employees.value = employees.value.filter(e => e.id !== id);
  }

  function restoreEmployee(id: string) {
    const deletedIndex = deletedEmployees.value.findIndex(e => e.id === id);
    if (deletedIndex !== -1) {
      const employee = deletedEmployees.value[deletedIndex];
      const { deletedAt, ...empWithoutDeletedAt } = employee;
      employees.value.push(empWithoutDeletedAt as Employee);
      deletedEmployees.value.splice(deletedIndex, 1);
      saveDeletedEmployees(deletedEmployees.value);
    }
  }

  function permanentlyDeleteEmployee(id: string) {
    deletedEmployees.value = deletedEmployees.value.filter(e => e.id !== id);
    saveDeletedEmployees(deletedEmployees.value);
  }

  function getEmployeeById(id: string): Employee | undefined {
    return employees.value.find(e => e.id === id);
  }

  return {
    employees,
    deletedEmployees,
    activeEmployees,
    beifenEmployees,
    huogeEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    restoreEmployee,
    permanentlyDeleteEmployee,
    getEmployeeById,
    saveEmployees
  };
}
