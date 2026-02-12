<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>Tasks</span>
        <el-button type="primary" @click="goCreate">创建任务</el-button>
      </div>
    </template>

    <el-table :data="tasks" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="accountId" label="账号ID" width="120" />
      <el-table-column prop="bucket" label="Bucket" min-width="180" />
      <el-table-column prop="targetPath" label="目标路径" min-width="220" />
      <el-table-column prop="createdAt" label="创建时间" min-width="180" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { fetchTasks } from '@/api/tasks';
import type { Task } from '@/types/models';

const router = useRouter();
const loading = ref(false);
const tasks = ref<Task[]>([]);

const loadData = async () => {
  loading.value = true;
  try {
    tasks.value = await fetchTasks();
  } finally {
    loading.value = false;
  }
};

const goCreate = () => {
  router.push('/tasks/create');
};

const goDetail = (id: number) => {
  router.push(`/tasks/${id}`);
};

onMounted(loadData);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
