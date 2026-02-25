<template>
  <div class="nav-wrap">
    <div class="actions">
      <el-button :disabled="!canGoBack" @click="$emit('back')">后退</el-button>
      <el-button :disabled="!canGoForward" @click="$emit('forward')">前进</el-button>
      <el-button :disabled="!canGoUp" @click="$emit('up')">返回上级</el-button>
      <el-button :loading="loading" @click="$emit('refresh')">刷新</el-button>
    </div>
    <el-breadcrumb separator="/">
      <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.prefix">
        <el-button link type="primary" @click="$emit('navigate', item.prefix)">
          {{ item.label }}
        </el-button>
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string;
  prefix: string;
}

defineProps<{
  breadcrumbs: BreadcrumbItem[];
  canGoUp: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  loading?: boolean;
}>();

defineEmits<{
  (e: 'up'): void;
  (e: 'refresh'): void;
  (e: 'navigate', prefix: string): void;
  (e: 'back'): void;
  (e: 'forward'): void;
}>();
</script>

<style scoped>
.nav-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
