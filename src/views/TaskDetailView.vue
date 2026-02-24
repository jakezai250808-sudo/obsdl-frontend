<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <div class="header-left">
          <span>Task #{{ taskIdLabel }} Objects</span>
          <el-tag type="info">进度：{{ progress.done }}/{{ progress.total }}</el-tag>
        </div>
        <div class="header-actions">
          <el-button type="warning" :loading="retryLoading" :disabled="!taskId" @click="onRetryFailed">
            重试失败项
          </el-button>
          <el-select v-model="status" placeholder="筛选状态" clearable style="width: 180px" @change="loadObjects">
            <el-option label="pending" value="pending" />
            <el-option label="running" value="running" />
            <el-option label="success" value="success" />
            <el-option label="failed" value="failed" />
          </el-select>
        </div>
      </div>
    </template>

    <el-table :data="objects" v-loading="loading">
      <el-table-column prop="objectKey" label="对象Key" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="size" label="大小(bytes)" width="140" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchTaskObjects, fetchTaskProgress, retryTask } from '@/api/tasks';
import type { TaskObject } from '@/types/models';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const retryLoading = ref(false);
const objects = ref<TaskObject[]>([]);
const status = ref<string | undefined>();
const taskId = computed(() => {
  const raw = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
});
const taskIdLabel = computed(() => (taskId.value ? String(taskId.value) : '-'));
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

const onRetryFailed = async () => {
  if (!taskId.value || retryLoading.value) return;
  try {
    await ElMessageBox.confirm('将基于该任务的失败对象创建一个新任务，原任务不变。', '重试失败项', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }

  retryLoading.value = true;
  try {
    const { taskId: newTaskId } = await retryTask(taskId.value);
    ElMessage.success(`已创建重试任务 #${newTaskId}`);
    router.push(`/tasks/${newTaskId}`);
  } finally {
    retryLoading.value = false;
  }
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
