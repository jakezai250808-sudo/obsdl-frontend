<template>
  <el-dialog :model-value="modelValue" title="对象详情" width="560px" @close="$emit('update:modelValue', false)">
    <el-descriptions :column="1" border v-if="objectItem">
      <el-descriptions-item label="Key">{{ objectItem.key }}</el-descriptions-item>
      <el-descriptions-item label="Size">{{ objectItem.size }}</el-descriptions-item>
      <el-descriptions-item label="Last Modified">{{ objectItem.lastModified || '-' }}</el-descriptions-item>
      <el-descriptions-item label="ETag">{{ objectItem.etag || '-' }}</el-descriptions-item>
      <el-descriptions-item label="Storage Class">{{ objectItem.storageClass || '-' }}</el-descriptions-item>
    </el-descriptions>
    <template #footer>
      <el-button @click="copyKey">复制 key</el-button>
      <el-button type="primary" @click="$emit('update:modelValue', false)">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { ObsObject } from '@/api/obs';

const props = defineProps<{
  modelValue: boolean;
  objectItem?: ObsObject | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const copyKey = async () => {
  if (!props.objectItem?.key) return;
  try {
    await navigator.clipboard.writeText(props.objectItem.key);
    ElMessage.success('已复制 key');
  } catch (error) {
    ElMessage.error('复制失败');
  }
};
</script>
