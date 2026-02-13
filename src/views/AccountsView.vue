<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>Accounts</span>
        <el-button type="primary" @click="openCreate">新增账号</el-button>
      </div>
    </template>

    <el-table :data="accounts" v-loading="loading" style="width: 100%" table-layout="auto">
      <el-table-column prop="id" label="ID" width="80" fixed="left" />
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column prop="email" label="邮箱" min-width="180" />
      <el-table-column prop="obsEndpoint" label="OBS Endpoint" min-width="220" />
      <el-table-column prop="obsBucket" label="默认 Bucket" min-width="140" />
      <el-table-column prop="obsRegion" label="Region" min-width="120" />
      <el-table-column prop="obsProjectId" label="Project ID" min-width="180" show-overflow-tooltip />
      <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该账号？" @confirm="onDelete(row.id)">
            <template #reference>
              <el-button link type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑账号' : '新增账号'" width="760px">
    <el-form :model="form" label-width="120px" class="account-form">
      <div class="form-grid">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="请输入账号名称" />
        </el-form-item>
        <el-form-item label="OBS 凭证" required class="aksk-item">
          <div class="aksk-row">
            <el-input v-model="form.obsAccessKey" placeholder="请输入华为云 OBS AK">
              <template #prepend>AK</template>
            </el-input>
            <el-input
              v-model="form.obsSecretKey"
              type="password"
              show-password
              placeholder="请输入华为云 OBS SK"
            >
              <template #prepend>SK</template>
            </el-input>
          </div>
        </el-form-item>
        <el-form-item label="OBS Endpoint" required>
          <el-input
            v-model="form.obsEndpoint"
            placeholder="如 https://obs.cn-north-4.myhuaweicloud.com（Tab 可填默认值）"
            @keydown.tab="applyDefaultOnTab('obsEndpoint')"
          />
        </el-form-item>
        <el-form-item label="OBS Region">
          <el-input
            v-model="form.obsRegion"
            placeholder="如 cn-north-4（Tab 可填默认值）"
            @keydown.tab="applyDefaultOnTab('obsRegion')"
          />
        </el-form-item>
        <el-form-item label="默认 Bucket">
          <el-input v-model="form.obsBucket" placeholder="可选，创建任务时可复用" />
        </el-form-item>
        <el-form-item label="Project ID">
          <el-input v-model="form.obsProjectId" placeholder="华为云项目 ID（可选）" />
        </el-form-item>
      </div>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="dialogVisible = false">取消</el-button>
      <el-button type="primary" @click="submit">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { createAccount, deleteAccount, fetchAccounts, updateAccount } from '@/api/accounts';
import type { Account } from '@/types/models';

type AccountForm = {
  id?: number;
  name: string;
  remark: string;
  obsAccessKey: string;
  obsSecretKey: string;
  obsEndpoint: string;
  obsBucket: string;
  obsRegion: string;
  obsProjectId: string;
};

const DEFAULT_OBS_ENDPOINT = 'https://obs.cn-north-4.myhuaweicloud.com';
const DEFAULT_OBS_REGION = 'cn-north-4';

const loading = ref(false);
const accounts = ref<Account[]>([]);
const dialogVisible = ref(false);
const form = reactive<AccountForm>({
  name: '',
  remark: '',
  obsAccessKey: '',
  obsSecretKey: '',
  obsEndpoint: '',
  obsBucket: '',
  obsRegion: '',
  obsProjectId: '',
});

const resetForm = () => {
  form.id = undefined;
  form.name = '';
  form.remark = '';
  form.obsAccessKey = '';
  form.obsSecretKey = '';
  form.obsEndpoint = '';
  form.obsBucket = '';
  form.obsRegion = '';
  form.obsProjectId = '';
};

const loadData = async () => {
  loading.value = true;
  try {
    accounts.value = await fetchAccounts();
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  resetForm();
  dialogVisible.value = true;
};

const openEdit = (account: Account) => {
  form.id = account.id;
  form.name = account.name;
  form.remark = account.remark ?? '';
  form.obsAccessKey = account.obsAccessKey ?? '';
  form.obsSecretKey = account.obsSecretKey ?? '';
  form.obsEndpoint = account.obsEndpoint ?? '';
  form.obsBucket = account.obsBucket ?? '';
  form.obsRegion = account.obsRegion ?? '';
  form.obsProjectId = account.obsProjectId ?? '';
  dialogVisible.value = true;
};

const submit = async () => {
  if (!form.name || !form.obsAccessKey || !form.obsSecretKey || !form.obsEndpoint) {
    ElMessage.warning('请填写名称以及 OBS 必填字段（AK/SK/Endpoint）');
    return;
  }

  const payload = {
    name: form.name,
    remark: form.remark,
    obsAccessKey: form.obsAccessKey,
    obsSecretKey: form.obsSecretKey,
    obsEndpoint: form.obsEndpoint,
    obsBucket: form.obsBucket || undefined,
    obsRegion: form.obsRegion || undefined,
    obsProjectId: form.obsProjectId || undefined,
  };

  if (form.id) {
    await updateAccount(form.id, payload);
    ElMessage.success('账号已更新');
  } else {
    await createAccount(payload);
    ElMessage.success('账号已创建');
  }

  dialogVisible.value = false;
  await loadData();
};

const applyDefaultOnTab = (field: 'obsEndpoint' | 'obsRegion') => {
  if (field === 'obsEndpoint' && !form.obsEndpoint.trim()) {
    form.obsEndpoint = DEFAULT_OBS_ENDPOINT;
  }
  if (field === 'obsRegion' && !form.obsRegion.trim()) {
    form.obsRegion = DEFAULT_OBS_REGION;
  }
};

const onDelete = async (id: number) => {
  await deleteAccount(id);
  ElMessage.success('账号已删除');
  await loadData();
};

onMounted(loadData);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.account-form {
  margin-top: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

:deep(.form-grid .el-form-item) {
  margin-bottom: 18px;
}

.aksk-item {
  grid-column: 1 / -1;
}

.aksk-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .aksk-row {
    grid-template-columns: 1fr;
  }
}
</style>
