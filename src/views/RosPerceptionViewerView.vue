<template>
  <div class="ros-perception-page">
    <el-card class="panel-card">
      <template #header>
        <div class="card-header">ROSBag Play (L1)</div>
      </template>

      <el-row :gutter="16">
        <el-col :xs="24" :md="12">
          <el-form :model="controlForm" label-width="130px">
            <el-form-item label="后端地址">
              <el-input v-model="controlForm.backendBaseUrl" placeholder="默认同域" clearable />
            </el-form-item>
            <el-form-item label="Token" required>
              <el-input v-model="controlForm.token" placeholder="X-CTRL-TOKEN" show-password clearable />
            </el-form-item>
            <el-form-item label="bagPath" required>
              <el-input v-model="controlForm.bagPath" placeholder="例如 /data/demo.bag" />
            </el-form-item>
            <el-form-item label="loop">
              <el-switch v-model="controlForm.loop" />
            </el-form-item>
            <el-form-item label="useSimTime">
              <el-switch v-model="controlForm.useSimTime" />
            </el-form-item>
            <el-form-item label="rate">
              <el-input-number v-model="controlForm.rate" :min="0.1" :step="0.1" />
            </el-form-item>
            <el-form-item label="port">
              <el-input-number v-model="controlForm.port" :min="1" :max="65535" />
            </el-form-item>
            <el-form-item label="状态轮询(2s)">
              <el-switch v-model="statusPollingEnabled" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="startLoading" @click="handleStart">Start</el-button>
              <el-button type="danger" :loading="stopLoading" @click="handleStop">Stop</el-button>
              <el-button :loading="statusLoading" @click="refreshStatus">Refresh Status</el-button>
            </el-form-item>
          </el-form>
        </el-col>

        <el-col :xs="24" :md="12">
          <el-descriptions title="控制状态" :column="1" border>
            <el-descriptions-item label="status">{{ statusData.status || '-' }}</el-descriptions-item>
            <el-descriptions-item label="wsUrl">{{ statusData.wsUrl || '-' }}</el-descriptions-item>
            <el-descriptions-item label="roscorePid">{{ statusData.roscorePid ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="bridgePid">{{ statusData.bridgePid ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="bagPid">{{ statusData.bagPid ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="message">{{ statusData.message || '-' }}</el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <el-form :model="connectionForm" label-width="130px">
            <el-form-item label="rosbridge wsUrl">
              <el-input v-model="connectionForm.wsUrl" placeholder="ws://127.0.0.1:9090" />
            </el-form-item>
            <el-form-item label="状态自动连接">
              <el-switch v-model="connectionForm.autoConnectWhenRunning" />
            </el-form-item>
            <el-form-item label="连接状态">
              <el-tag :type="connectionTagType">{{ connectionState }}</el-tag>
            </el-form-item>
            <el-form-item label="最近错误">
              <span class="error-text">{{ connectionError || '-' }}</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="connectLoading" @click="handleConnect">Connect</el-button>
              <el-button @click="handleDisconnect">Disconnect</el-button>
              <el-button :disabled="connectionState !== 'CONNECTED'" @click="refreshTopics">Refresh Topics</el-button>
            </el-form-item>
          </el-form>
        </el-col>
      </el-row>
    </el-card>

    <div class="content-tabs">
      <template v-if="currentViewerPage === 'web'">
        <el-row :gutter="16" class="content-row">
          <el-col :xs="24" :lg="8">
            <el-card class="panel-card">
              <template #header>
                <div class="card-header">Topics & 订阅</div>
              </template>

              <el-input v-model="topicFilter" placeholder="搜索 topic 名称" clearable />

              <el-table
                :data="filteredTopics"
                height="320"
                size="small"
                @selection-change="handleTopicSelectionChange"
              >
                <el-table-column type="selection" width="44" />
                <el-table-column prop="name" label="Topic" min-width="200" show-overflow-tooltip />
                <el-table-column prop="type" label="Type" min-width="180" show-overflow-tooltip />
              </el-table>

              <div class="action-row">
                <el-button type="primary" size="small" @click="handleSubscribeSelected">Subscribe Selected</el-button>
                <el-button size="small" @click="subscribeCommonPerceptionTopics">订阅常见感知</el-button>
              </div>

              <el-form label-position="top">
                <el-form-item label="手动输入 topics（逗号/换行分隔）">
                  <el-input
                    v-model="manualTopicsInput"
                    type="textarea"
                    :rows="3"
                    placeholder="/points_raw, /tf\n/marker_array"
                  />
                </el-form-item>
                <el-form-item>
                  <el-button size="small" @click="handleSubscribeManual">Add/Subscribe</el-button>
                </el-form-item>
              </el-form>

              <div class="recent-wrapper">
                <div class="sub-title">最近订阅组</div>
                <div class="action-row">
                  <el-button size="small" @click="subscribeRecent" :disabled="!recentTopicGroup.length">Subscribe Recent</el-button>
                </div>
                <el-scrollbar max-height="90px">
                  <div class="recent-list">{{ recentTopicGroup.join(', ') || '-' }}</div>
                </el-scrollbar>
              </div>

              <div class="preset-wrapper">
                <div class="sub-title">订阅预设</div>
                <el-input v-model="presetNameInput" placeholder="预设名，如 perception-default" size="small" />
                <div class="action-row">
                  <el-button size="small" @click="saveCurrentAsPreset" :disabled="!subscribedRows.length || !presetNameInput.trim()">
                    保存当前订阅
                  </el-button>
                </div>
                <el-select v-model="selectedPresetName" placeholder="选择预设" class="full-width" clearable size="small">
                  <el-option v-for="item in presetNames" :key="item" :label="item" :value="item" />
                </el-select>
                <div class="action-row">
                  <el-button size="small" :disabled="!selectedPresetName" @click="applySelectedPreset">应用预设</el-button>
                  <el-button size="small" type="danger" :disabled="!selectedPresetName" @click="deleteSelectedPreset">删除预设</el-button>
                </div>
              </div>

              <el-divider />

              <div class="list-title-row">
                <div class="sub-title">已订阅</div>
                <el-button size="small" type="danger" @click="handleUnsubscribeAll" :disabled="!subscribedRows.length">
                  Unsubscribe All
                </el-button>
              </div>

              <el-table :data="subscribedRows" height="260" size="small">
                <el-table-column prop="name" label="Topic" min-width="180" show-overflow-tooltip />
                <el-table-column prop="type" label="Type" min-width="170" show-overflow-tooltip />
                <el-table-column prop="rate" label="Hz(5s)" width="78" />
                <el-table-column prop="lastUpdateText" label="Latest" width="130" />
                <el-table-column label="Action" width="110">
                  <template #default="scope">
                    <el-button link type="danger" @click="handleUnsubscribe(scope.row.name)">Unsubscribe</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-col>

          <el-col :xs="24" :lg="16">
            <el-card class="panel-card">
              <template #header>
                <div class="card-header">3D Viewer</div>
              </template>

              <div class="viewer-toolbar">
                <el-select v-model="fixedFrame" filterable allow-create default-first-option placeholder="Fixed Frame">
                  <el-option v-for="item in fixedFrameOptions" :key="item" :label="item" :value="item" />
                </el-select>
                <el-switch v-model="renderPaused" active-text="暂停渲染" inactive-text="渲染中" />
                <el-input-number v-model="pointCloudRenderHz" :min="1" :max="30" label="点云Hz" />
                <el-input-number v-model="markerRenderHz" :min="1" :max="30" label="MarkerHz" />
                <el-input-number v-model="pointSize" :min="0.02" :max="1" :step="0.02" label="点大小" />
                <el-input-number v-model="maxPointCloudPoints" :min="10000" :step="10000" label="点数上限" />
                <el-switch v-model="showGrid" active-text="Grid" inactive-text="No Grid" />
                <el-switch v-model="showAxes" active-text="Axes" inactive-text="No Axes" />
                <el-switch v-model="showPointCloud" active-text="点云开" inactive-text="点云关" />
                <el-switch v-model="showMarkers" active-text="Marker开" inactive-text="Marker关" />
                <el-button @click="resetCamera('default')">重置视角</el-button>
                <el-button @click="resetCamera('top')">俯视</el-button>
                <el-button @click="resetCamera('front')">前视</el-button>
              </div>

              <div ref="threeContainerRef" class="three-canvas" />
            </el-card>

            <el-row :gutter="16" class="sub-view-row">
              <el-col :xs="24" :md="12">
                <el-card class="panel-card small-card">
                  <template #header>
                    <div class="card-header">Image Viewer</div>
                  </template>

                  <div class="image-grid">
                    <div v-for="slot in imageSlots" :key="slot.id" class="image-slot">
                      <el-select v-model="slot.topic" placeholder="选择图像 topic" class="full-width" clearable size="small">
                        <el-option v-for="item in imageTopicOptions" :key="`${slot.id}-${item.name}`" :label="item.name" :value="item.name" />
                      </el-select>

                      <div class="image-box">
                        <img v-if="slot.src" :src="slot.src" alt="ROS Image" class="ros-image" />
                        <div v-else class="placeholder">未收到图像消息</div>
                      </div>

                      <el-alert v-if="slot.error" :title="slot.error" type="warning" :closable="false" show-icon />
                    </div>
                  </div>
                </el-card>
              </el-col>

              <el-col :xs="24" :md="12">
                <el-card class="panel-card small-card">
                  <template #header>
                    <div class="card-header">TF Tree</div>
                  </template>

                  <div class="tf-frame-count">frames: {{ tfFrames.length }}</div>
                  <el-scrollbar max-height="250px">
                    <div v-if="tfRelations.length">
                      <div v-for="item in tfRelations" :key="`${item.parent}-${item.child}`" class="tf-line">
                        {{ item.parent }} -> {{ item.child }}
                      </div>
                    </div>
                    <div v-else class="placeholder">暂无 TF 数据</div>
                  </el-scrollbar>
                </el-card>
              </el-col>
            </el-row>

            <el-card class="panel-card raw-card">
              <template #header>
                <div class="card-header">Raw / JSON</div>
              </template>

              <el-select v-model="selectedRawTopic" placeholder="选择 topic" class="full-width" clearable>
                <el-option v-for="item in subscribedRows" :key="item.name" :label="item.name" :value="item.name" />
              </el-select>

              <div class="friendly-value" v-if="rawFriendlyValue">{{ rawFriendlyValue }}</div>
              <pre class="json-box">{{ rawMessageText || '暂无消息' }}</pre>
            </el-card>
          </el-col>
        </el-row>
      </template>

      <template v-else>
        <el-card v-if="vncTabInitialized" class="panel-card">
          <template #header>
            <div class="card-header">VNC / RViz Viewer</div>
          </template>

          <el-form :model="vncForm" label-width="140px" class="vnc-form">
            <el-form-item label="noVNC Web URL">
              <el-input
                v-model="vncForm.url"
                placeholder="http://<ros-ip>:6080/vnc.html?host=<ros-ip>&port=6080"
                clearable
              />
            </el-form-item>
            <el-form-item label="VNC 密码(可选)">
              <el-input v-model="vncForm.passwordHint" show-password placeholder="通常在 noVNC 页面内输入" clearable />
            </el-form-item>
            <el-form-item label="打开方式">
              <el-switch v-model="vncForm.openInIframe" active-text="iframe 内嵌" inactive-text="新窗口" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleOpenVnc">Open</el-button>
              <el-button @click="handleReloadVnc">Reload</el-button>
              <el-button @click="handleVncFullscreen" :disabled="!vncForm.openInIframe || !vncIframeSrc">Fullscreen</el-button>
            </el-form-item>
          </el-form>

          <el-alert
            v-if="vncStatusHint"
            :title="vncStatusHint"
            :type="vncStatusType"
            :closable="false"
            show-icon
            class="vnc-alert"
          />

          <el-descriptions :column="1" border>
            <el-descriptions-item label="当前地址">{{ vncIframeSrc || '-' }}</el-descriptions-item>
            <el-descriptions-item label="加载状态">{{ vncLoadState }}</el-descriptions-item>
            <el-descriptions-item label="错误信息">{{ vncLoadError || '-' }}</el-descriptions-item>
          </el-descriptions>

          <div ref="vncContainerRef" class="vnc-container">
            <div v-if="!vncForm.openInIframe || !vncIframeSrc" class="placeholder vnc-placeholder">
              请选择 iframe 模式并点击 Open 载入 noVNC 页面
            </div>
            <!-- 保留 iframe 实例，切换 Tab 不销毁，避免重复握手导致体验抖动 -->
            <iframe
              v-show="vncForm.openInIframe && !!vncIframeSrc"
              ref="vncIframeRef"
              class="vnc-iframe"
              :src="vncIframeSrc"
              allowfullscreen
              @load="handleVncIframeLoad"
              @error="handleVncIframeError"
            />
          </div>

          <div class="vnc-tips">
            <div>提示：noVNC 常见 Web 端口为 <code>6080</code>，VNC 服务端口常见为 <code>5901 (:1)</code>。</div>
            <div>提示：浏览器访问时不要用 <code>localhost</code>（除非浏览器也在服务器上）。</div>
          </div>
        </el-card>
        <el-card v-else class="panel-card">
          <div class="placeholder">切换到该页签后初始化 VNC Viewer。</div>
        </el-card>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { rosStart, rosStatus, rosStop, type RosStatusResponse } from '@/api/ros';
import { decodeCompressedImage, decodeRawImage } from '@/lib/image';
import { parsePointCloud2 } from '@/lib/pointcloud';
import { RosbridgeClient, type RosConnectionState, type RosTopicInfo } from '@/lib/rosbridge';
import { TfCache } from '@/lib/tf';

const TOKEN_KEY = 'rosctl_token';
const BACKEND_URL_KEY = 'rosctl_backend_base_url';
const RECENT_TOPICS_KEY = 'ros_perception_recent_topics';
const TOPIC_PRESETS_KEY = 'ros_perception_topic_presets';
const IMAGE_SLOT_COUNT = 5;
const VNC_PASSWORD_KEY = 'ros_vnc_password_hint';

const controlForm = reactive({
  backendBaseUrl: localStorage.getItem(BACKEND_URL_KEY) || '',
  token: localStorage.getItem(TOKEN_KEY) || '',
  bagPath: '',
  loop: true,
  useSimTime: true,
  rate: 1,
  port: 9090,
});

const connectionForm = reactive({
  wsUrl: '',
  autoConnectWhenRunning: true,
});

const route = useRoute();
const currentViewerPage = computed<'web' | 'vnc'>(() => (route.path.endsWith('/vnc') ? 'vnc' : 'web'));
const vncTabInitialized = ref(false);
const vncForm = reactive({
  url: '',
  passwordHint: localStorage.getItem(VNC_PASSWORD_KEY) || '',
  openInIframe: true,
});
const vncIframeSrc = ref('');
const vncLoadState = ref<'IDLE' | 'LOADING' | 'LOADED' | 'ERROR'>('IDLE');
const vncLoadError = ref('');
const vncStatusHint = ref('');
const vncStatusType = ref<'info' | 'warning' | 'success'>('info');
const vncContainerRef = ref<HTMLDivElement | null>(null);
const vncIframeRef = ref<HTMLIFrameElement | null>(null);

const statusData = reactive<RosStatusResponse>({
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
const connectLoading = ref(false);

const statusPollingEnabled = ref(true);
let statusTimer: number | null = null;

const connectionState = ref<RosConnectionState>('DISCONNECTED');
const connectionError = ref('');

const topicFilter = ref('');
const selectedTopicRows = ref<RosTopicInfo[]>([]);
const manualTopicsInput = ref('');
const allTopics = ref<RosTopicInfo[]>([]);

const recentTopicGroup = ref<string[]>([]);
const topicPresets = ref<Record<string, string[]>>({});
const presetNameInput = ref('');
const selectedPresetName = ref('');

const subscribedRows = ref<Array<{ name: string; type: string; rate: string; lastUpdateText: string }>>([]);
const imageSlots = reactive(
  Array.from({ length: IMAGE_SLOT_COUNT }, (_, index) => ({
    id: index + 1,
    topic: '',
    src: '',
    error: '',
  })),
);
const selectedRawTopic = ref('');
const rawMessageText = ref('');
const rawFriendlyValue = ref('');

const fixedFrame = ref('');
const renderPaused = ref(false);
const pointCloudRenderHz = ref(5);
const markerRenderHz = ref(5);
const pointSize = ref(0.08);
const maxPointCloudPoints = ref(200000);
const showGrid = ref(true);
const showAxes = ref(true);
const showPointCloud = ref(true);
const showMarkers = ref(true);

const threeContainerRef = ref<HTMLDivElement | null>(null);

const rosClient = new RosbridgeClient({
  onStateChange: (state, errorMessage) => {
    connectionState.value = state;
    if (errorMessage) {
      connectionError.value = errorMessage;
    }
  },
});

const tfCache = new TfCache();
const tfVersion = ref(0);
let pendingTfChanged = false;

const filteredTopics = computed(() => {
  const keyword = topicFilter.value.trim().toLowerCase();
  if (!keyword) return allTopics.value;
  return allTopics.value.filter((item) => item.name.toLowerCase().includes(keyword));
});

const imageTopicOptions = computed(() => {
  return subscribedRows.value.filter(
    (item) => item.type === 'sensor_msgs/CompressedImage' || item.type === 'sensor_msgs/Image',
  );
});

const tfFrames = computed(() => {
  tfVersion.value;
  return tfCache.getFrames();
});

const tfRelations = computed(() => {
  tfVersion.value;
  return tfCache.getRelations();
});

const fixedFrameOptions = computed(() => {
  const preferred = ['map', 'odom', 'base_link'];
  const options = new Set<string>(preferred);
  tfFrames.value.forEach((item) => options.add(item));
  if (fixedFrame.value) options.add(fixedFrame.value);
  return Array.from(options);
});

const connectionTagType = computed(() => {
  if (connectionState.value === 'CONNECTED') return 'success';
  if (connectionState.value === 'CONNECTING') return 'warning';
  if (connectionState.value === 'ERROR') return 'danger';
  return 'info';
});

const subscriptionMeta = new Map<string, { type: string; timestamps: number[]; lastTs: number }>();
const latestMessageCache = new Map<string, unknown>();
const renderQueue = new Map<string, unknown>();
const topicTypeCache = new Map<string, string>();

const lastPointCloudRenderTs = new Map<string, number>();
const lastMarkerRenderTs = new Map<string, number>();
const lastImageRenderTs = new Map<string, number>();

let flushTimer: number | null = null;

let renderer: any = null;
let scene: any = null;
let camera: any = null;
let controls: any = null;
let animationFrameId: number | null = null;
let resizeHandler: (() => void) | null = null;

const pointCloudObjects = new Map<string, any>();
const markerGroups = new Map<string, any>();
const markerObjectMap = new Map<string, any>();
const markerExpireAtMap = new Map<string, number>();

let gridHelper: any = null;
let axesHelper: any = null;

const loadRecentTopicGroup = () => {
  try {
    const raw = localStorage.getItem(RECENT_TOPICS_KEY);
    if (!raw) return [] as string[];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    return [] as string[];
  }
};

recentTopicGroup.value = loadRecentTopicGroup();

const loadTopicPresets = () => {
  try {
    const raw = localStorage.getItem(TOPIC_PRESETS_KEY);
    if (!raw) return {} as Record<string, string[]>;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const normalized: Record<string, string[]> = {};
    Object.keys(parsed || {}).forEach((key) => {
      const value = parsed[key];
      if (Array.isArray(value)) {
        const topics = value.map((item) => String(item).trim()).filter(Boolean);
        if (topics.length) {
          normalized[key] = Array.from(new Set(topics));
        }
      }
    });
    return normalized;
  } catch {
    return {} as Record<string, string[]>;
  }
};

const persistTopicPresets = () => {
  localStorage.setItem(TOPIC_PRESETS_KEY, JSON.stringify(topicPresets.value));
};

topicPresets.value = loadTopicPresets();

const presetNames = computed(() => Object.keys(topicPresets.value).sort((a, b) => a.localeCompare(b)));

watch(
  () => controlForm.token,
  (value) => {
    localStorage.setItem(TOKEN_KEY, value.trim());
  },
);

watch(
  () => controlForm.backendBaseUrl,
  (value) => {
    localStorage.setItem(BACKEND_URL_KEY, value.trim());
  },
);

watch(
  () => vncForm.passwordHint,
  (value) => {
    localStorage.setItem(VNC_PASSWORD_KEY, value.trim());
  },
);

watch(
  () => currentViewerPage.value,
  (page) => {
    if (page === 'vnc') {
      vncTabInitialized.value = true;
    }
  },
  { immediate: true },
);

watch(
  () => statusPollingEnabled.value,
  () => {
    restartStatusPolling();
  },
);

watch(
  () => imageTopicOptions.value,
  (value) => {
    const names = new Set(value.map((item) => item.name));
    imageSlots.forEach((slot) => {
      if (slot.topic && !names.has(slot.topic)) {
        slot.topic = '';
        slot.src = '';
        slot.error = '';
      }
    });
  },
);

watch(
  () => fixedFrameOptions.value,
  () => {
    if (fixedFrame.value) return;
    fixedFrame.value = tfCache.inferDefaultFixedFrame();
  },
  { deep: true },
);

watch(
  () => showGrid.value,
  (value) => {
    if (gridHelper) {
      gridHelper.visible = value;
    }
  },
);

watch(
  () => showAxes.value,
  (value) => {
    if (axesHelper) {
      axesHelper.visible = value;
    }
  },
);

watch(
  () => pointSize.value,
  (value) => {
    pointCloudObjects.forEach((cloud) => {
      if (cloud?.material) {
        cloud.material.size = value;
      }
    });
  },
);

watch(
  () => imageSlots.map((slot) => slot.topic),
  (nextTopics, prevTopics) => {
    nextTopics.forEach((topic, index) => {
      if (topic !== prevTopics?.[index]) {
        imageSlots[index].src = '';
        imageSlots[index].error = '';
      }
    });
  },
);

const ensureToken = () => {
  if (controlForm.token.trim()) return true;
  ElMessage.warning('token 不能为空');
  return false;
};

const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      ElMessage.error('token 无效或已禁用');
      return;
    }
    if (!error.response) {
      ElMessage.error('无法连接后端');
      return;
    }
  }
  ElMessage.error('请求失败，请稍后重试');
};

const applyStatus = (payload: RosStatusResponse) => {
  statusData.status = payload.status || '';
  statusData.wsUrl = payload.wsUrl || '';
  statusData.roscorePid = payload.roscorePid ?? null;
  statusData.bridgePid = payload.bridgePid ?? null;
  statusData.bagPid = payload.bagPid ?? null;
  statusData.message = payload.message || '';

  if (payload.wsUrl) {
    connectionForm.wsUrl = payload.wsUrl;
  }

  if (payload.vncUrl) {
    vncForm.url = payload.vncUrl;
    vncStatusHint.value = '已从后端 status 自动填充 vncUrl';
    vncStatusType.value = 'success';
  } else {
    vncStatusHint.value = '后端未提供 vncUrl，可手动填入 noVNC 地址（内网）';
    vncStatusType.value = 'warning';
  }

  if (payload.status === 'ERROR' && payload.message) {
    ElMessage.error(payload.message);
  }

  if (payload.status === 'RUNNING' && payload.wsUrl && connectionForm.autoConnectWhenRunning) {
    if (connectionState.value === 'DISCONNECTED' || connectionState.value === 'ERROR') {
      handleConnect();
    }
  }

  if (payload.status === 'RUNNING' && !payload.wsUrl) {
    ElMessage.warning('后端未返回 wsUrl，检查 rosbridge 是否启动/配置 hostForWsUrl');
  }
};

const refreshStatus = async () => {
  if (!ensureToken()) return;
  statusLoading.value = true;
  try {
    const payload = await rosStatus(controlForm.backendBaseUrl, controlForm.token.trim());
    applyStatus(payload);
  } catch (error) {
    handleApiError(error);
  } finally {
    statusLoading.value = false;
  }
};

const handleStart = async () => {
  if (!ensureToken()) return;
  if (!controlForm.bagPath.trim()) {
    ElMessage.warning('bagPath 为必填项');
    return;
  }

  startLoading.value = true;
  try {
    const payload = await rosStart(controlForm.backendBaseUrl, controlForm.token.trim(), {
      rosVersion: 'ROS1',
      bagPath: controlForm.bagPath.trim(),
      loop: controlForm.loop,
      useSimTime: controlForm.useSimTime,
      rate: Number(controlForm.rate),
      port: Number(controlForm.port),
    });
    applyStatus(payload);
    ElMessage.success('Start 请求已发送');
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
    const payload = await rosStop(controlForm.backendBaseUrl, controlForm.token.trim());
    applyStatus(payload);
    ElMessage.success('Stop 请求已发送');
  } catch (error) {
    handleApiError(error);
  } finally {
    stopLoading.value = false;
  }
};

const restartStatusPolling = () => {
  if (statusTimer !== null) {
    window.clearInterval(statusTimer);
    statusTimer = null;
  }

  if (!statusPollingEnabled.value) return;

  statusTimer = window.setInterval(() => {
    if (!controlForm.token.trim()) return;
    refreshStatus();
  }, 2000);
};

const handleConnect = async () => {
  const wsUrl = connectionForm.wsUrl.trim();
  if (!wsUrl) {
    ElMessage.warning('请先填写 wsUrl');
    return;
  }

  connectLoading.value = true;
  connectionError.value = '';
  try {
    await rosClient.connect(wsUrl);
    ElMessage.success('rosbridge 已连接');
    await refreshTopics();
    await ensureTfSubscription();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'rosbridge 连接失败';
    connectionError.value = message;
    ElMessage.error(message);
  } finally {
    connectLoading.value = false;
  }
};

const handleDisconnect = () => {
  rosClient.disconnect();
  clearAllSubscriptions(true);
};

const normalizeVncUrl = (input: string) => input.trim();

const handleOpenVnc = () => {
  const url = normalizeVncUrl(vncForm.url);
  if (!url) {
    ElMessage.warning('请先填写 noVNC URL');
    return;
  }

  vncLoadError.value = '';
  if (vncForm.openInIframe) {
    vncLoadState.value = 'LOADING';
    vncIframeSrc.value = url;
    return;
  }

  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) {
    vncLoadState.value = 'ERROR';
    vncLoadError.value = '浏览器拦截了弹窗，请允许新窗口打开';
    ElMessage.error(vncLoadError.value);
    return;
  }
  vncLoadState.value = 'LOADED';
};

const handleReloadVnc = () => {
  if (!vncForm.openInIframe) {
    handleOpenVnc();
    return;
  }

  const url = normalizeVncUrl(vncForm.url);
  if (!url) {
    ElMessage.warning('请先填写 noVNC URL');
    return;
  }

  vncLoadState.value = 'LOADING';
  vncLoadError.value = '';
  vncIframeSrc.value = '';
  window.setTimeout(() => {
    vncIframeSrc.value = url;
  }, 0);
};

const handleVncIframeLoad = () => {
  vncLoadState.value = 'LOADED';
  vncLoadError.value = '';
};

const handleVncIframeError = () => {
  vncLoadState.value = 'ERROR';
  vncLoadError.value = 'iframe 加载失败，请检查 noVNC 地址和网络连通性';
};

const handleVncFullscreen = async () => {
  if (!vncContainerRef.value) return;
  try {
    await vncContainerRef.value.requestFullscreen();
  } catch {
    ElMessage.error('全屏失败，请检查浏览器权限');
  }
};

const refreshTopics = async () => {
  if (connectionState.value !== 'CONNECTED') return;
  try {
    const rows = await rosClient.getTopics();
    allTopics.value = rows.sort((a, b) => a.name.localeCompare(b.name));
    rows.forEach((row) => {
      topicTypeCache.set(row.name, row.type);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '获取 topics 失败';
    connectionError.value = message;
    ElMessage.error(message);
  }
};

const handleTopicSelectionChange = (rows: RosTopicInfo[]) => {
  selectedTopicRows.value = rows;
};

const parseManualTopics = () => {
  return manualTopicsInput.value
    .split(/[\n,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatClock = (timestamp: number) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date
    .getSeconds()
    .toString()
    .padStart(2, '0')}`;
};

const resolveTopicType = async (topicName: string) => {
  const cached = topicTypeCache.get(topicName);
  if (cached) return cached;

  const found = allTopics.value.find((item) => item.name === topicName)?.type;
  if (found) {
    topicTypeCache.set(topicName, found);
    return found;
  }

  const type = await rosClient.getTopicType(topicName);
  topicTypeCache.set(topicName, type);
  return type;
};

const ingestMessage = (topicName: string, topicType: string, message: unknown) => {
  const now = Date.now();
  const meta = subscriptionMeta.get(topicName);
  if (!meta) return;

  meta.timestamps.push(now);
  meta.lastTs = now;
  while (meta.timestamps.length && now - meta.timestamps[0] > 5000) {
    meta.timestamps.shift();
  }

  latestMessageCache.set(topicName, message);
  renderQueue.set(topicName, message);

  if (topicName === '/tf' || topicName === '/tf_static' || topicType === 'tf2_msgs/TFMessage') {
    tfCache.updateFromTfMessage(message);
    pendingTfChanged = true;
  }
};

const saveRecentGroup = (topics: string[]) => {
  const unique = Array.from(new Set(topics));
  recentTopicGroup.value = unique;
  localStorage.setItem(RECENT_TOPICS_KEY, JSON.stringify(unique));
};

const addSubscription = (topicName: string, topicType: string) => {
  if (subscriptionMeta.has(topicName)) return;

  subscriptionMeta.set(topicName, {
    type: topicType,
    timestamps: [],
    lastTs: 0,
  });

  rosClient.subscribe(topicName, topicType, (message) => {
    ingestMessage(topicName, topicType, message);
  });
};

const subscribeTopics = async (topicNames: string[]) => {
  if (connectionState.value !== 'CONNECTED') {
    ElMessage.warning('请先连接 rosbridge');
    return;
  }

  const normalized = Array.from(new Set(topicNames.map((item) => item.trim()).filter(Boolean)));
  if (!normalized.length) return;

  const subscribedNow: string[] = [];

  for (const topicName of normalized) {
    if (subscriptionMeta.has(topicName)) continue;

    try {
      const topicType = await resolveTopicType(topicName);
      if (!topicType || topicType === 'unknown') {
        ElMessage.warning(`${topicName} 的消息类型未知，已跳过`);
        continue;
      }

      addSubscription(topicName, topicType);
      subscribedNow.push(topicName);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${topicName} 订阅失败`;
      ElMessage.error(message);
    }
  }

  if (subscribedNow.length) {
    saveRecentGroup(subscribedNow);
    if (!selectedRawTopic.value) selectedRawTopic.value = subscribedNow[0];
    ElMessage.success(`已订阅 ${subscribedNow.length} 个 topic`);
  }
};

const ensureTfSubscription = async () => {
  const tfTopics: string[] = [];
  if (allTopics.value.some((item) => item.name === '/tf')) tfTopics.push('/tf');
  if (allTopics.value.some((item) => item.name === '/tf_static')) tfTopics.push('/tf_static');
  if (tfTopics.length) {
    await subscribeTopics(tfTopics);
  }
};

const handleSubscribeSelected = async () => {
  const selectedNames = selectedTopicRows.value.map((item) => item.name);
  await subscribeTopics(selectedNames);
};

const handleSubscribeManual = async () => {
  const topics = parseManualTopics();
  await subscribeTopics(topics);
};

const subscribeRecent = async () => {
  if (!recentTopicGroup.value.length) return;
  await subscribeTopics(recentTopicGroup.value);
};

const saveCurrentAsPreset = () => {
  const name = presetNameInput.value.trim();
  if (!name) return;
  const topics = subscribedRows.value.map((item) => item.name);
  if (!topics.length) {
    ElMessage.warning('当前没有已订阅 topic');
    return;
  }
  topicPresets.value = {
    ...topicPresets.value,
    [name]: topics,
  };
  persistTopicPresets();
  selectedPresetName.value = name;
  ElMessage.success(`已保存预设: ${name}`);
};

const applySelectedPreset = async () => {
  const name = selectedPresetName.value.trim();
  if (!name) return;
  const topics = topicPresets.value[name] || [];
  if (!topics.length) {
    ElMessage.warning('预设为空');
    return;
  }
  await subscribeTopics(topics);
};

const deleteSelectedPreset = () => {
  const name = selectedPresetName.value.trim();
  if (!name) return;
  const next = { ...topicPresets.value };
  delete next[name];
  topicPresets.value = next;
  persistTopicPresets();
  selectedPresetName.value = '';
  ElMessage.success(`已删除预设: ${name}`);
};

const subscribeCommonPerceptionTopics = async () => {
  const commonTypes = new Set(['sensor_msgs/PointCloud2', 'sensor_msgs/Image', 'sensor_msgs/CompressedImage', 'visualization_msgs/MarkerArray']);
  const candidate = allTopics.value.filter((item) => commonTypes.has(item.type)).map((item) => item.name);
  if (!candidate.length) {
    ElMessage.warning('当前没有发现常见感知类型 topic');
    return;
  }
  await subscribeTopics(candidate);
};

const disposeMaterial = (material: any) => {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }

  const candidate = material as { map?: unknown };
  if (candidate.map && typeof (candidate.map as { dispose?: () => void }).dispose === 'function') {
    (candidate.map as { dispose: () => void }).dispose();
  }
  material.dispose();
};

const disposeObject = (object: any) => {
  object.traverse((child: any) => {
    const mesh = child as any;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = (mesh as any).material as any;
    if (material) {
      disposeMaterial(material);
    }
  });
};

const removeTopicVisuals = (topicName: string) => {
  const cloud = pointCloudObjects.get(topicName);
  if (cloud && scene) {
    scene.remove(cloud);
    disposeObject(cloud);
    pointCloudObjects.delete(topicName);
  }

  const markerGroup = markerGroups.get(topicName);
  if (markerGroup && scene) {
    scene.remove(markerGroup);
    disposeObject(markerGroup);
    markerGroups.delete(topicName);
  }

  Array.from(markerObjectMap.keys())
    .filter((key) => key.startsWith(`${topicName}:`))
    .forEach((key) => {
      markerObjectMap.delete(key);
      markerExpireAtMap.delete(key);
    });
};

const handleUnsubscribe = (topicName: string) => {
  rosClient.unsubscribe(topicName);
  subscriptionMeta.delete(topicName);
  latestMessageCache.delete(topicName);
  renderQueue.delete(topicName);
  lastPointCloudRenderTs.delete(topicName);
  lastMarkerRenderTs.delete(topicName);
  lastImageRenderTs.delete(topicName);
  removeTopicVisuals(topicName);

  imageSlots.forEach((slot) => {
    if (slot.topic === topicName) {
      slot.topic = '';
      slot.src = '';
      slot.error = '';
    }
  });

  if (selectedRawTopic.value === topicName) {
    selectedRawTopic.value = '';
    rawMessageText.value = '';
    rawFriendlyValue.value = '';
  }
};

const clearAllSubscriptions = (skipRosbridge = false) => {
  if (!skipRosbridge) {
    rosClient.unsubscribeAll();
  }

  Array.from(subscriptionMeta.keys()).forEach((topicName) => {
    removeTopicVisuals(topicName);
  });

  subscriptionMeta.clear();
  latestMessageCache.clear();
  renderQueue.clear();
  lastPointCloudRenderTs.clear();
  lastMarkerRenderTs.clear();
  lastImageRenderTs.clear();
  imageSlots.forEach((slot) => {
    slot.src = '';
    slot.error = '';
  });
  rawMessageText.value = '';
  rawFriendlyValue.value = '';
};

const handleUnsubscribeAll = () => {
  clearAllSubscriptions();
};

const applyPose = (target: any, pose: Record<string, unknown> | undefined) => {
  if (!pose) return;

  const position = (pose.position || {}) as Record<string, number>;
  const orientation = (pose.orientation || {}) as Record<string, number>;

  target.position.set(Number(position.x || 0), Number(position.y || 0), Number(position.z || 0));
  target.quaternion.set(
    Number(orientation.x || 0),
    Number(orientation.y || 0),
    Number(orientation.z || 0),
    Number(orientation.w || 1),
  );
};

const normalizeFrame = (value: unknown) => String(value || '').replace(/^\//, '').trim();

const getMessageFrameId = (message: unknown) => {
  if (!message || typeof message !== 'object') return '';
  const header = (message as { header?: { frame_id?: string } }).header;
  return normalizeFrame(header?.frame_id);
};

const isFrameVisible = (messageFrameId: string) => {
  const fixed = normalizeFrame(fixedFrame.value);
  if (!fixed) return true;
  if (!messageFrameId) return true;
  return normalizeFrame(messageFrameId) === fixed;
};

const colorFromMarker = (marker: Record<string, unknown>) => {
  const color = (marker.color || {}) as Record<string, number>;
  return new THREE.Color(Number(color.r ?? 0.2), Number(color.g ?? 0.8), Number(color.b ?? 0.2));
};

const opacityFromMarker = (marker: Record<string, unknown>) => {
  const color = (marker.color || {}) as Record<string, number>;
  const opacity = Number(color.a ?? 1);
  return Math.max(0.05, Math.min(1, opacity));
};

const createTextSprite = (text: string, colorHex: string, size: number) => {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return null;

  const fontSize = Math.max(18, Math.floor(size * 48));
  context.font = `${fontSize}px sans-serif`;
  const textWidth = Math.ceil(context.measureText(text).width);
  canvas.width = Math.max(64, textWidth + 20);
  canvas.height = fontSize + 20;

  const context2 = canvas.getContext('2d');
  if (!context2) return null;
  context2.font = `${fontSize}px sans-serif`;
  context2.fillStyle = colorHex;
  context2.fillText(text, 10, fontSize);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((canvas.width / canvas.height) * size * 1.8, size * 1.8, 1);
  return sprite;
};

const renderPointCloud = (topicName: string, message: unknown) => {
  if (!scene) return;
  if (!showPointCloud.value) return;
  if (!isFrameVisible(getMessageFrameId(message))) return;

  const parsed = parsePointCloud2(message as never, maxPointCloudPoints.value);
  if (!parsed.count) return;

  let cloud = pointCloudObjects.get(topicName);
  if (!cloud) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 0.08, vertexColors: true, sizeAttenuation: true });
    cloud = new THREE.Points(geometry, material);
    pointCloudObjects.set(topicName, cloud);
    scene.add(cloud);
  }

  const geometry = cloud.geometry;
  geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(parsed.colors, 3));
  cloud.material.size = pointSize.value;
  geometry.computeBoundingSphere();
};

const markerKey = (topicName: string, marker: Record<string, unknown>) => {
  const ns = String(marker.ns || '');
  const id = Number(marker.id || 0);
  return `${topicName}:${ns}:${id}`;
};

const removeMarkerObjectByKey = (key: string) => {
  const object = markerObjectMap.get(key);
  if (!object) return;
  if (object.parent) {
    object.parent.remove(object);
  }
  disposeObject(object);
  markerObjectMap.delete(key);
  markerExpireAtMap.delete(key);
};

const addOrReplaceMarkerObject = (topicName: string, marker: Record<string, unknown>, object: any) => {
  const key = markerKey(topicName, marker);
  removeMarkerObjectByKey(key);

  const group = markerGroups.get(topicName);
  if (!group) return;
  group.add(object);
  markerObjectMap.set(key, object);

  const lifetime = marker.lifetime as { sec?: number; nanosec?: number; nsec?: number } | undefined;
  const seconds = Number(lifetime?.sec || 0) + Number(lifetime?.nsec || lifetime?.nanosec || 0) / 1e9;
  if (seconds > 0) {
    markerExpireAtMap.set(key, Date.now() + seconds * 1000);
  } else {
    markerExpireAtMap.delete(key);
  }
};

const cleanupExpiredMarkers = () => {
  const now = Date.now();
  markerExpireAtMap.forEach((expireAt, key) => {
    if (expireAt <= now) {
      removeMarkerObjectByKey(key);
    }
  });
};

const renderMarkerArray = (topicName: string, message: unknown) => {
  if (!scene || !message || typeof message !== 'object') return;
  if (!showMarkers.value) return;

  const markers = (message as { markers?: Array<Record<string, unknown>> }).markers;
  if (!Array.isArray(markers)) return;

  let group = markerGroups.get(topicName);
  if (!group) {
    group = new THREE.Group();
    markerGroups.set(topicName, group);
    scene.add(group);
  }

  markers.forEach((marker) => {
    const action = Number(marker.action || 0);
    const key = markerKey(topicName, marker);
    const frameId = normalizeFrame((marker.header as { frame_id?: string } | undefined)?.frame_id);

    if (action === 2) {
      removeMarkerObjectByKey(key);
      return;
    }

    if (action === 3) {
      Array.from(markerObjectMap.keys())
        .filter((item) => item.startsWith(`${topicName}:`))
        .forEach((item) => removeMarkerObjectByKey(item));
      return;
    }

    if (!isFrameVisible(frameId)) {
      return;
    }

    const type = Number(marker.type || 0);
    const scale = (marker.scale || {}) as Record<string, number>;
    const color = colorFromMarker(marker);
    const opacity = opacityFromMarker(marker);

    if (type === 1) {
      const geometry = new THREE.BoxGeometry(
        Math.max(0.01, Number(scale.x || 1)),
        Math.max(0.01, Number(scale.y || 1)),
        Math.max(0.01, Number(scale.z || 1)),
      );
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, wireframe: true });
      const mesh = new THREE.Mesh(geometry, material);
      applyPose(mesh, marker.pose as Record<string, unknown>);
      addOrReplaceMarkerObject(topicName, marker, mesh);
    }

    if (type === 4 || type === 5) {
      const points = Array.isArray(marker.points) ? marker.points : [];
      if (!points.length) return;

      const vertices: number[] = [];
      points.forEach((point: Record<string, number>) => {
        vertices.push(Number(point.x || 0), Number(point.y || 0), Number(point.z || 0));
      });

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });

      if (type === 4) {
        const line = new THREE.Line(geometry, material);
        applyPose(line, marker.pose as Record<string, unknown>);
        addOrReplaceMarkerObject(topicName, marker, line);
      } else {
        const lineSegments = new THREE.LineSegments(geometry, material);
        applyPose(lineSegments, marker.pose as Record<string, unknown>);
        addOrReplaceMarkerObject(topicName, marker, lineSegments);
      }
    }

    if (type === 9) {
      const text = String(marker.text || '').trim();
      if (!text) return;

      const sprite = createTextSprite(text, `#${color.getHexString()}`, Math.max(0.3, Number(scale.z || 0.6)));
      if (!sprite) return;

      applyPose(sprite, marker.pose as Record<string, unknown>);
      addOrReplaceMarkerObject(topicName, marker, sprite);
    }
  });
};

const renderImage = (topicName: string, topicType: string, message: unknown) => {
  const matchedSlots = imageSlots.filter((slot) => slot.topic === topicName);
  if (!matchedSlots.length) return;

  try {
    if (topicType === 'sensor_msgs/CompressedImage') {
      const src = decodeCompressedImage(message as never);
      matchedSlots.forEach((slot) => {
        slot.src = src;
        slot.error = '';
      });
      return;
    }

    if (topicType === 'sensor_msgs/Image') {
      const src = decodeRawImage(message as never);
      matchedSlots.forEach((slot) => {
        slot.src = src;
        slot.error = '';
      });
      return;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : '图像解码失败';
    const encoding = (message as { encoding?: string })?.encoding || '-';
    matchedSlots.forEach((slot) => {
      slot.error = `图像解码失败: ${msg}; encoding=${encoding}`;
    });
  }
};

const refreshSubscribedRows = () => {
  const now = Date.now();
  const rows = Array.from(subscriptionMeta.entries()).map(([name, meta]) => {
    while (meta.timestamps.length && now - meta.timestamps[0] > 5000) {
      meta.timestamps.shift();
    }

    return {
      name,
      type: meta.type,
      rate: (meta.timestamps.length / 5).toFixed(1),
      lastUpdateText: formatClock(meta.lastTs),
    };
  });

  rows.sort((a, b) => a.name.localeCompare(b.name));
  subscribedRows.value = rows;
};

const updateRawPanel = () => {
  if (!selectedRawTopic.value) {
    rawMessageText.value = '';
    rawFriendlyValue.value = '';
    return;
  }

  const message = latestMessageCache.get(selectedRawTopic.value);
  if (message === undefined) {
    rawMessageText.value = '';
    rawFriendlyValue.value = '';
    return;
  }

  try {
    const pretty = JSON.stringify(message, null, 2);
    rawMessageText.value = pretty.length > 20000 ? `${pretty.slice(0, 20000)}\n... (truncated)` : pretty;
  } catch {
    rawMessageText.value = String(message);
  }

  if (
    message &&
    typeof message === 'object' &&
    'data' in (message as Record<string, unknown>) &&
    (typeof (message as Record<string, unknown>).data === 'string' ||
      typeof (message as Record<string, unknown>).data === 'number')
  ) {
    rawFriendlyValue.value = `data: ${(message as Record<string, unknown>).data}`;
  } else {
    rawFriendlyValue.value = '';
  }
};

const flushRenderQueue = () => {
  refreshSubscribedRows();
  updateRawPanel();
  cleanupExpiredMarkers();

  if (pendingTfChanged) {
    tfVersion.value += 1;
    pendingTfChanged = false;
  }

  if (renderPaused.value) {
    renderQueue.clear();
    return;
  }

  const now = Date.now();
  const pointCloudInterval = 1000 / Math.max(1, pointCloudRenderHz.value);
  const markerInterval = 1000 / Math.max(1, markerRenderHz.value);

  renderQueue.forEach((message, topicName) => {
    const type = subscriptionMeta.get(topicName)?.type;
    if (!type) return;

    if (type === 'sensor_msgs/PointCloud2') {
      const last = lastPointCloudRenderTs.get(topicName) || 0;
      if (now - last >= pointCloudInterval) {
        renderPointCloud(topicName, message);
        lastPointCloudRenderTs.set(topicName, now);
      }
      return;
    }

    if (type === 'visualization_msgs/MarkerArray') {
      const last = lastMarkerRenderTs.get(topicName) || 0;
      if (now - last >= markerInterval) {
        renderMarkerArray(topicName, message);
        lastMarkerRenderTs.set(topicName, now);
      }
      return;
    }

    if (type === 'sensor_msgs/CompressedImage' || type === 'sensor_msgs/Image') {
      const last = lastImageRenderTs.get(topicName) || 0;
      if (now - last >= 120) {
        renderImage(topicName, type, message);
        lastImageRenderTs.set(topicName, now);
      }
    }
  });

  pointCloudObjects.forEach((object) => {
    object.visible = showPointCloud.value;
  });
  markerGroups.forEach((group) => {
    group.visible = showMarkers.value;
  });

  renderQueue.clear();
};

const resetCamera = (mode: 'default' | 'top' | 'front') => {
  if (!camera || !controls) return;

  if (mode === 'top') {
    camera.position.set(0, 35, 0.01);
  } else if (mode === 'front') {
    camera.position.set(0, 2, 25);
  } else {
    camera.position.set(8, 6, 8);
  }

  controls.target.set(0, 0, 0);
  controls.update();
};

const initThree = () => {
  if (!threeContainerRef.value) return;

  const { clientWidth, clientHeight } = threeContainerRef.value;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f172a);

  camera = new THREE.PerspectiveCamera(60, clientWidth / Math.max(clientHeight, 1), 0.1, 5000);
  camera.position.set(8, 6, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  renderer.setSize(clientWidth, Math.max(clientHeight, 1));
  threeContainerRef.value.innerHTML = '';
  threeContainerRef.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  gridHelper = new THREE.GridHelper(80, 80, 0x334155, 0x1f2937);
  axesHelper = new THREE.AxesHelper(2);
  gridHelper.visible = showGrid.value;
  axesHelper.visible = showAxes.value;
  scene.add(gridHelper);
  scene.add(axesHelper);

  const animate = () => {
    animationFrameId = window.requestAnimationFrame(animate);
    if (!renderer || !scene || !camera) return;
    controls?.update();
    renderer.render(scene, camera);
  };

  animate();

  resizeHandler = () => {
    if (!renderer || !camera || !threeContainerRef.value) return;
    const width = threeContainerRef.value.clientWidth;
    const height = Math.max(threeContainerRef.value.clientHeight, 1);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  };

  window.addEventListener('resize', resizeHandler);
};

onMounted(async () => {
  initThree();
  restartStatusPolling();
  await refreshStatus();

  flushTimer = window.setInterval(() => {
    flushRenderQueue();
  }, 200);
});

onBeforeUnmount(() => {
  if (statusTimer !== null) {
    window.clearInterval(statusTimer);
    statusTimer = null;
  }

  if (flushTimer !== null) {
    window.clearInterval(flushTimer);
    flushTimer = null;
  }

  handleDisconnect();

  if (animationFrameId !== null) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }

  if (scene) {
    disposeObject(scene);
    scene.clear();
  }

  renderer?.dispose();
  controls?.dispose();
  gridHelper = null;
  axesHelper = null;
});
</script>

<style scoped>
.ros-perception-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-card {
  width: 100%;
}

.card-header {
  font-weight: 700;
}

.content-row {
  margin-bottom: 16px;
}

.content-tabs {
  margin-top: 4px;
}

.action-row {
  display: flex;
  gap: 8px;
  margin: 8px 0;
}

.list-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.sub-title {
  font-size: 13px;
  font-weight: 600;
}

.recent-wrapper {
  margin-top: 8px;
}

.preset-wrapper {
  margin-top: 10px;
}

.recent-list {
  font-size: 12px;
  line-height: 1.5;
  color: #4b5563;
  word-break: break-all;
}

.error-text {
  color: #b91c1c;
  font-size: 12px;
}

.viewer-toolbar {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 10px;
}

.three-canvas {
  width: 100%;
  height: 380px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
}

.sub-view-row {
  margin-top: 16px;
}

.small-card {
  min-height: 340px;
}

.full-width {
  width: 100%;
}

.image-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.image-slot {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
}

.image-box {
  margin-top: 10px;
  width: 100%;
  height: 140px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f9fafb;
}

.ros-image {
  max-width: 100%;
  max-height: 100%;
  display: block;
}

.placeholder {
  color: #6b7280;
  font-size: 13px;
}

.tf-frame-count {
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.tf-line {
  font-size: 12px;
  line-height: 1.7;
  color: #111827;
}

.raw-card {
  margin-top: 16px;
}

.vnc-form {
  max-width: 980px;
}

.vnc-alert {
  margin-bottom: 10px;
}

.vnc-container {
  margin-top: 14px;
  width: 100%;
  min-height: 70vh;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: #0b1220;
  overflow: hidden;
}

.vnc-iframe {
  width: 100%;
  height: 70vh;
  border: 0;
}

.vnc-placeholder {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vnc-tips {
  margin-top: 12px;
  font-size: 12px;
  line-height: 1.8;
  color: #4b5563;
}

.friendly-value {
  margin-top: 10px;
  font-size: 13px;
  color: #0f766e;
}

.json-box {
  margin-top: 10px;
  max-height: 240px;
  overflow: auto;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #f8fafc;
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 1200px) {
  .viewer-toolbar {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
