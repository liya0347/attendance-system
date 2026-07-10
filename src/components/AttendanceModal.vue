<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ElModal, ElForm, ElFormItem, ElSelect, ElOption, ElInputNumber, ElButton } from 'element-plus';
import type { AttendanceType } from '@/types';

const props = defineProps<{
  visible: boolean;
  currentType?: AttendanceType;
  currentHours?: number;
  employeeName?: string;
  date?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'confirm', data: { type: AttendanceType; hours: number }): void;
}>();

const attendanceOptions: { value: AttendanceType; label: string }[] = [
  { value: 'present', label: '出勤' },
  { value: 'late', label: '迟到' },
  { value: 'absent', label: '旷工' },
  { value: 'rest', label: '休息' },
  { value: 'overtime', label: '加班' },
  { value: 'annual_leave', label: '年假' },
  { value: 'personal_leave', label: '事假' },
  { value: 'sick_leave', label: '病假' },
  { value: 'bereavement_leave', label: '丧假' },
  { value: 'comp_time', label: '调休' },
];

const requiresHours = ['overtime', 'annual_leave', 'personal_leave', 'sick_leave', 'bereavement_leave', 'comp_time'];

const selectedType = ref<AttendanceType>(props.currentType || 'present');
const hours = ref(props.currentHours || 7.5);

watch(() => props.visible, (val) => {
  if (val) {
    selectedType.value = props.currentType || 'present';
    hours.value = props.currentHours || 7.5;
  }
});

const showHours = computed(() => requiresHours.includes(selectedType.value));

function handleConfirm() {
  emit('confirm', {
    type: selectedType.value,
    hours: hours.value
  });
}

function handleCancel() {
  emit('update:visible', false);
}
</script>

<template>
  <ElModal
    v-model="visible"
    title="修改考勤状态"
    :closable="true"
    @close="handleCancel"
  >
    <div class="text-sm text-gray-600 mb-4">
      <span v-if="employeeName">{{ employeeName }} · </span>
      <span v-if="date">{{ date }}</span>
    </div>
    
    <ElForm label-width="80px">
      <ElFormItem label="考勤状态">
        <ElSelect v-model="selectedType" style="width: 100%">
          <ElOption
            v-for="option in attendanceOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </ElFormItem>
      
      <ElFormItem v-if="showHours" label="时长(小时)">
        <ElInputNumber
          v-model="hours"
          :min="0.5"
          :max="12"
          :step="0.5"
          style="width: 100%"
        />
      </ElFormItem>
    </ElForm>
    
    <template #footer>
      <ElButton @click="handleCancel">取消</ElButton>
      <ElButton type="primary" @click="handleConfirm">确认</ElButton>
    </template>
  </ElModal>
</template>
