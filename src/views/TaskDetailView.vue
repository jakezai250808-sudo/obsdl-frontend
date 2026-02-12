<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>Task #{{ taskId }} Objects</span>
        <el-select v-model="status" placeholder="筛选状态" clearable style="width: 180px" @change="loadData">
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
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { fetchTaskObjects } from '@/api/tasks';
import type { TaskObject } from '@/types/models';

const route = useRoute();
const loading = ref(false);
const objects = ref<TaskObject[]>([]);
const status = ref<string | undefined>();
const taskId = computed(() => Number(route.params.id));

const loadData = async () => {
  if (!taskId.value) return;
  loading.value = true;
  try {
    objects.value = await fetchTaskObjects(taskId.value, status.value);
  } finally {
    loading.value = false;
  }
};

onMounted(loadData);
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
