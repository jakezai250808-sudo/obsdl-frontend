<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>Tasks</span>
        <el-button type="primary" @click="dialogVisible = true">创建任务</el-button>
      </div>
    </template>

    <el-table :data="tasks" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="任务名" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="accountId" label="账号ID" width="120" />
      <el-table-column prop="createdAt" label="创建时间" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDetail(row.id)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" title="创建任务" width="500px">
    <el-form :model="createForm" label-width="100px">
      <el-form-item label="任务名" required>
        <el-input v-model="createForm.name" />
      </el-form-item>
      <el-form-item label="账号ID" required>
        <el-input-number v-model="createForm.accountId" :min="1" :controls="false" style="width: 100%" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submit">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { createTask, fetchTasks } from '@/api/tasks';
import type { Task } from '@/types/models';

const router = useRouter();
const loading = ref(false);
const dialogVisible = ref(false);
const tasks = ref<Task[]>([]);
const createForm = reactive({ name: '', accountId: 1 });

const loadData = async () => {
  loading.value = true;
  try {
    tasks.value = await fetchTasks();
  } finally {
    loading.value = false;
  }
};

const submit = async () => {
  if (!createForm.name || !createForm.accountId) {
    ElMessage.warning('请填写完整任务信息');
    return;
  }

  await createTask({ name: createForm.name, accountId: createForm.accountId });
  ElMessage.success('任务已创建');
  createForm.name = '';
  createForm.accountId = 1;
  dialogVisible.value = false;
  await loadData();
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
