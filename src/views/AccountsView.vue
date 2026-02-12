<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>Accounts</span>
        <el-button type="primary" @click="openCreate">新增账号</el-button>
      </div>
    </template>

    <el-table :data="accounts" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="220">
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

  <el-dialog v-model="dialogVisible" :title="form.id ? '编辑账号' : '新增账号'" width="520px">
    <el-form :model="form" label-width="100px">
      <el-form-item label="名称" required>
        <el-input v-model="form.name" />
      </el-form-item>
      <el-form-item label="邮箱" required>
        <el-input v-model="form.email" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" />
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

const loading = ref(false);
const accounts = ref<Account[]>([]);
const dialogVisible = ref(false);
const form = reactive<{ id?: number; name: string; email: string; remark: string }>({
  name: '',
  email: '',
  remark: '',
});

const resetForm = () => {
  form.id = undefined;
  form.name = '';
  form.email = '';
  form.remark = '';
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
  form.email = account.email;
  form.remark = account.remark ?? '';
  dialogVisible.value = true;
};

const submit = async () => {
  if (!form.name || !form.email) {
    ElMessage.warning('请填写名称和邮箱');
    return;
  }

  if (form.id) {
    await updateAccount(form.id, { name: form.name, email: form.email, remark: form.remark });
    ElMessage.success('账号已更新');
  } else {
    await createAccount({ name: form.name, email: form.email, remark: form.remark });
    ElMessage.success('账号已创建');
  }

  dialogVisible.value = false;
  await loadData();
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
</style>
