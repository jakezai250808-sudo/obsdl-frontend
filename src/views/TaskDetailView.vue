<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <div class="header-left">
          <span>Task #{{ taskId }} Objects</span>
          <el-tag type="info">进度：{{ progress.done }}/{{ progress.total }}</el-tag>
        </div>
        <el-select v-model="status" placeholder="筛选状态" clearable style="width: 180px" @change="loadObjects">
          <el-option label="pending" value="pending" />
          <el-option label="running" value="running" />
          <el-option label="success" value="success" />
          <el-option label="failed" value="failed" />
        </el-select>
      </div>
    </template>

    <el-table :data="objects" v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="objectKey" label="对象Key" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="size" label="大小(bytes)" width="140" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchTaskObjects, fetchTaskProgress } from '@/api/tasks';
import type { TaskObject } from '@/types/models';

const route = useRoute();
const loading = ref(false);
const objects = ref<TaskObject[]>([]);
const status = ref<string | undefined>();
const taskId = computed(() => Number(route.params.id));
const progress = ref({ done: 0, total: 0 });
let pollTimer: number | undefined;

const loadObjects = async () => {
  if (!taskId.value) return;
  loading.value = true;
  try {
    objects.value = await fetchTaskObjects(taskId.value, status.value);
  } finally {
    loading.value = false;
  }
};

const loadProgress = async () => {
  if (!taskId.value) return;
  progress.value = await fetchTaskProgress(taskId.value);
};

const startPolling = () => {
  pollTimer = window.setInterval(() => {
    loadProgress();
    loadObjects();
  }, 3000);
};

onMounted(async () => {
  await Promise.all([loadProgress(), loadObjects()]);
  startPolling();
});

onUnmounted(() => {
  if (pollTimer) {
    window.clearInterval(pollTimer);
  }
});
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
