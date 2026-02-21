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
        <el-select v-model="form.accountId" placeholder="请选择账号" filterable style="width: 100%" @change="onAccountChange">
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
      <div class="selection-actions">
        <span>已选 {{ selectedKeys.length }} 个对象</span>
        <el-button
          type="success"
          plain
          :loading="addLoading"
          :disabled="selectedKeys.length === 0"
          @click="addSelectedToDownloadList"
        >
          添加到下载任务列表
        </el-button>
      </div>
    </div>

    <el-card v-if="downloadList.length > 0" class="download-list-card">
      <template #header>
        <div class="download-list-header">
          <span>下载任务列表（{{ downloadList.length }}）</span>
          <el-button link type="danger" @click="clearDownloadList">清空列表</el-button>
        </div>
      </template>
      <el-table :data="downloadList" style="width: 100%">
        <el-table-column prop="key" label="Object Key" min-width="260" />
        <el-table-column prop="size" label="Size(bytes)" width="140" />
        <el-table-column prop="lastModified" label="Last Modified" min-width="180" />
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button link type="danger" @click="removeFromDownloadList(row.key)">移除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-form :model="form" label-width="110px" style="margin-top: 16px">
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
const selectedObjects = ref<MockObject[]>([]);
const downloadList = ref<MockObject[]>([]);
const objectsLoading = ref(false);
const submitLoading = ref(false);
const addLoading = ref(false);
const keyword = ref('');
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);

const form = reactive({
  accountId: undefined as number | undefined,
  bucket: '',
});

const loadAccounts = async () => {
  accounts.value = await fetchAccounts();
};

const onAccountChange = (accountId: number | undefined) => {
  const matched = accounts.value.find((item) => item.id === accountId);
  form.bucket = matched?.obsBucket ?? '';
};

const loadObjects = async (nextPage?: number) => {
  if (form.accountId === undefined || form.accountId === null || !form.bucket.trim()) {
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
  selectedObjects.value = rows;
  selectedKeys.value = rows.map((item) => item.key);
};

const submit = async () => {
  const objectKeys = downloadList.value.map((item) => item.key);
  const missingFields: string[] = [];
  if (form.accountId === undefined || form.accountId === null) missingFields.push('account');
  if (!form.bucket.trim()) missingFields.push('bucket');
  if (missingFields.length > 0) {
    ElMessage.warning(`请填写：${missingFields.join('、')}`);
    return;
  }
  if (objectKeys.length === 0) {
    ElMessage.warning('请先将对象添加到下载任务列表');
    return;
  }
  const accountId = form.accountId as number;

  submitLoading.value = true;
  try {
    const task = await createTask({
      accountId,
      bucket: form.bucket.trim(),
      selection: {
        objects: objectKeys,
      },
    });
    ElMessage.success('任务已创建');
    router.push(`/tasks/${task.id}`);
  } finally {
    submitLoading.value = false;
  }
};

const addSelectedToDownloadList = () => {
  if (selectedObjects.value.length === 0) {
    ElMessage.warning('请先勾选对象');
    return;
  }

  addLoading.value = true;
  const existingKeys = new Set(downloadList.value.map((item) => item.key));
  const toAdd = selectedObjects.value.filter((item) => !existingKeys.has(item.key));
  if (toAdd.length > 0) {
    downloadList.value = [...downloadList.value, ...toAdd];
  }
  addLoading.value = false;
  ElMessage.success(`已添加 ${toAdd.length} 条到下载任务列表`);
};

const removeFromDownloadList = (key: string) => {
  downloadList.value = downloadList.value.filter((item) => item.key !== key);
};

const clearDownloadList = () => {
  downloadList.value = [];
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

.selection-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.download-list-card {
  margin-top: 12px;
}

.download-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ml-10 {
  margin-left: 10px;
}
</style>
