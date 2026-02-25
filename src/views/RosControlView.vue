<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>ROS 控制台</span>
      </div>
    </template>

    <el-form :model="form" label-width="140px" class="ros-form">
      <el-form-item label="后端地址">
        <el-input v-model="form.backendBaseUrl" placeholder="留空则使用当前域名" clearable />
      </el-form-item>
      <el-form-item label="Token" required>
        <el-input v-model="form.token" placeholder="请输入控制 token" show-password clearable />
      </el-form-item>
      <el-form-item label="ROS 版本" required>
        <el-radio-group v-model="form.rosVersion">
          <el-radio value="ROS1">ROS1</el-radio>
          <el-radio value="ROS2">ROS2</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="bagPath" required>
        <el-input v-model="form.bagPath" placeholder="例如 /data/demo.bag" />
      </el-form-item>
      <el-form-item label="loop">
        <el-checkbox v-model="form.loop">启用</el-checkbox>
      </el-form-item>
      <el-form-item label="useSimTime">
        <el-checkbox v-model="form.useSimTime">启用</el-checkbox>
      </el-form-item>
      <el-form-item label="rate">
        <el-input-number v-model="form.rate" :min="0.1" :step="0.1" />
      </el-form-item>
      <el-form-item label="port">
        <el-input-number v-model="form.port" :min="1" :max="65535" />
      </el-form-item>
      <el-form-item label="自动轮询状态">
        <el-switch v-model="autoRefresh" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="startLoading" @click="handleStart">Start</el-button>
        <el-button type="danger" :loading="stopLoading" @click="handleStop">Stop</el-button>
        <el-button :loading="statusLoading" @click="refreshStatus">Refresh Status</el-button>
      </el-form-item>
    </el-form>

    <el-descriptions title="当前状态" :column="1" border>
      <el-descriptions-item label="status">{{ rosStatusData.status || '-' }}</el-descriptions-item>
      <el-descriptions-item label="wsUrl">
        <div class="ws-row">
          <span>{{ rosStatusData.wsUrl || '-' }}</span>
          <el-button v-if="rosStatusData.wsUrl" link type="primary" @click="copyWsUrl">复制</el-button>
        </div>
      </el-descriptions-item>
      <el-descriptions-item label="roscorePid">{{ rosStatusData.roscorePid ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="bridgePid">{{ rosStatusData.bridgePid ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="bagPid">{{ rosStatusData.bagPid ?? '-' }}</el-descriptions-item>
      <el-descriptions-item label="message">{{ rosStatusData.message || '-' }}</el-descriptions-item>
    </el-descriptions>
  </el-card>
</template>

<script setup lang="ts">
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { onBeforeUnmount, reactive, ref, watch } from 'vue';

import { rosStart, rosStatus, rosStop, type RosStatusResponse, type RosVersion } from '@/api/ros';

const TOKEN_KEY = 'rosctl_token';

const form = reactive({
  backendBaseUrl: '',
  token: localStorage.getItem(TOKEN_KEY) || '',
  rosVersion: 'ROS1' as RosVersion,
  bagPath: '',
  loop: true,
  useSimTime: true,
  rate: 1,
  port: 9090,
});

const rosStatusData = reactive<RosStatusResponse>({
  status: '',
  wsUrl: '',
  roscorePid: null,
  bridgePid: null,
  bagPid: null,
  message: '',
});

const startLoading = ref(false);
const stopLoading = ref(false);
const statusLoading = ref(false);
const autoRefresh = ref(true);
let timer: number | null = null;

watch(
  () => form.token,
  (value) => {
    localStorage.setItem(TOKEN_KEY, value.trim());
  },
);

watch(
  () => autoRefresh.value,
  () => {
    restartPolling();
  },
);

const applyStatus = (payload: RosStatusResponse) => {
  rosStatusData.status = payload.status || '';
  rosStatusData.wsUrl = payload.wsUrl || '';
  rosStatusData.roscorePid = payload.roscorePid ?? null;
  rosStatusData.bridgePid = payload.bridgePid ?? null;
  rosStatusData.bagPid = payload.bagPid ?? null;
  rosStatusData.message = payload.message || '';

  if (payload.status === 'ERROR' && payload.message) {
    ElMessage.error(payload.message);
  }
};

const ensureToken = () => {
  if (form.token.trim()) return true;
  ElMessage.warning('请先填写 token');
  return false;
};

const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      const message = 'Token 无效或已被禁用（后端从数据库校验）。请联系管理员在数据库中更新/启用 token。';
      rosStatusData.message = message;
      ElMessage.error(message);
      return;
    }
    if (!error.response) {
      const message = '无法连接后端';
      rosStatusData.message = message;
      ElMessage.error(message);
      return;
    }
  }

  rosStatusData.message = '请求失败，请稍后重试';
  ElMessage.error('请求失败，请稍后重试');
};

const refreshStatus = async () => {
  if (!ensureToken()) return;
  statusLoading.value = true;
  try {
    const payload = await rosStatus(form.backendBaseUrl, form.token.trim());
    applyStatus(payload);
  } catch (error) {
    handleApiError(error);
  } finally {
    statusLoading.value = false;
  }
};

const handleStart = async () => {
  if (!ensureToken()) return;
  if (!form.bagPath.trim()) {
    ElMessage.warning('bagPath 为必填项');
    return;
  }

  startLoading.value = true;
  try {
    const payload = await rosStart(form.backendBaseUrl, form.token.trim(), {
      rosVersion: form.rosVersion,
      bagPath: form.bagPath.trim(),
      loop: form.loop,
      useSimTime: form.useSimTime,
      rate: Number(form.rate),
      port: Number(form.port),
    });
    applyStatus(payload);
    ElMessage.success('启动请求已发送');
    restartPolling();
  } catch (error) {
    handleApiError(error);
  } finally {
    startLoading.value = false;
  }
};

const handleStop = async () => {
  if (!ensureToken()) return;
  stopLoading.value = true;
  try {
    const payload = await rosStop(form.backendBaseUrl, form.token.trim());
    applyStatus(payload);
    ElMessage.success('停止请求已发送');
  } catch (error) {
    handleApiError(error);
  } finally {
    stopLoading.value = false;
  }
};

const restartPolling = () => {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }

  if (!autoRefresh.value) return;

  timer = window.setInterval(() => {
    if (!form.token.trim()) return;
    refreshStatus();
  }, 2000);
};

const copyWsUrl = async () => {
  if (!rosStatusData.wsUrl) return;
  try {
    await navigator.clipboard.writeText(rosStatusData.wsUrl);
    ElMessage.success('wsUrl 已复制');
  } catch {
    ElMessage.error('复制失败，请手动复制');
  }
};

restartPolling();

onBeforeUnmount(() => {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
});
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ros-form {
  max-width: 700px;
}

.ws-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
