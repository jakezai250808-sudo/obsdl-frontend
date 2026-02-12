<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>创建任务</span>
        <el-button @click="goBack">返回任务列表</el-button>
      </div>
    </template>

    <el-form :model="form" label-width="110px" class="create-form">
      <el-form-item label="Account" required>
        <el-select v-model="form.accountId" placeholder="请选择账号" filterable style="width: 100%">
          <el-option v-for="item in accounts" :key="item.id" :label="`${item.name} (#${item.id})`" :value="item.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="Bucket" required>
        <el-input v-model="form.bucket" placeholder="请输入 bucket" />
      </el-form-item>
      <el-form-item>
        <el-input v-model="keyword" placeholder="搜索 object key（可选）" style="max-width: 320px" clearable @keyup.enter="loadObjects(1)" />
        <el-button class="ml-10" :loading="objectsLoading" @click="loadObjects(1)">拉取对象</el-button>
      </el-form-item>
    </el-form>

    <el-table
      ref="tableRef"
      :data="objects"
      v-loading="objectsLoading"
      @selection-change="onSelectionChange"
      style="width: 100%; margin-top: 12px"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="key" label="Object Key" min-width="260" />
      <el-table-column prop="size" label="Size(bytes)" width="140" />
      <el-table-column prop="lastModified" label="Last Modified" min-width="180" />
    </el-table>

    <div class="pagination-row">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        :total="total"
        @current-change="loadObjects"
        @size-change="loadObjects(1)"
      />
      <span>已选 {{ selectedKeys.length }} 个对象</span>
    </div>

    <el-form :model="form" label-width="110px" style="margin-top: 16px">
      <el-form-item label="targetPath" required>
        <el-input v-model="form.targetPath" placeholder="请输入主节点本地目录，如 /data/downloads" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitLoading" @click="submit">创建任务</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { fetchAccounts } from '@/api/accounts';
import { createTask, fetchMockObjects } from '@/api/tasks';
import type { Account, MockObject } from '@/types/models';

const router = useRouter();
const accounts = ref<Account[]>([]);
const objects = ref<MockObject[]>([]);
const selectedKeys = ref<string[]>([]);
const objectsLoading = ref(false);
const submitLoading = ref(false);
const keyword = ref('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const form = reactive({
  accountId: undefined as number | undefined,
  bucket: '',
  targetPath: '',
});

const loadAccounts = async () => {
  accounts.value = await fetchAccounts();
};

const loadObjects = async (nextPage?: number) => {
  if (!form.accountId || !form.bucket.trim()) {
    ElMessage.warning('请先选择 account 并输入 bucket');
    return;
  }

  if (typeof nextPage === 'number') {
    page.value = nextPage;
  }

  objectsLoading.value = true;
  try {
    const res = await fetchMockObjects({
      accountId: form.accountId,
      bucket: form.bucket.trim(),
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
    });
    objects.value = res.items;
    total.value = res.total;
  } finally {
    objectsLoading.value = false;
  }
};

const onSelectionChange = (rows: MockObject[]) => {
  selectedKeys.value = rows.map((item) => item.key);
};

const submit = async () => {
  if (!form.accountId || !form.bucket.trim() || !form.targetPath.trim() || selectedKeys.value.length === 0) {
    ElMessage.warning('请完整填写 account、bucket、targetPath 并选择对象');
    return;
  }

  submitLoading.value = true;
  try {
    const task = await createTask({
      accountId: form.accountId,
      bucket: form.bucket.trim(),
      objectKeys: selectedKeys.value,
      targetPath: form.targetPath.trim(),
    });
    ElMessage.success('任务已创建');
    router.push(`/tasks/${task.id}`);
  } finally {
    submitLoading.value = false;
  }
};

const goBack = () => {
  router.push('/tasks');
};

onMounted(loadAccounts);
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-form {
  max-width: 680px;
}

.pagination-row {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ml-10 {
  margin-left: 10px;
}
</style>
