<template>
  <div class="bucket-selector">
    <span class="label">Bucket</span>
    <el-select
      :model-value="modelValue"
      placeholder="请选择 bucket"
      filterable
      clearable
      :loading="loading"
      :disabled="disabled"
      style="width: 320px"
      @update:model-value="onChange"
    >
      <el-option v-for="item in buckets" :key="item" :label="item" :value="item" />
    </el-select>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string;
  buckets: string[];
  loading?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const onChange = (value: string | undefined) => {
  emit('update:modelValue', value ?? '');
};
</script>

<style scoped>
.bucket-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

.label {
  color: var(--el-text-color-regular);
}
</style>
