<template>
  <el-card>
    <template #header>
      <div class="header-row">
        <span>创建任务</span>
        <el-button @click="goBack">返回任务列表</el-button>
      </div>
    </template>

    <el-form :model="form" label-width="110px" class="create-form">
      <div class="account-bucket-row">
        <el-form-item label="Account" required class="account-item">
          <el-select
            v-model="form.accountId"
            placeholder="请选择账号"
            filterable
            style="width: 100%"
            @change="onAccountChange"
          >
            <el-option v-for="item in accounts" :key="item.id" :label="`${item.name} (#${item.id})`" :value="item.id" />
          </el-select>
        </el-form-item>
        <BucketSelector
          v-model="form.bucket"
          :buckets="buckets"
          :loading="bucketsLoading"
          :disabled="form.accountId === undefined || form.accountId === null"
        />
      </div>
    </el-form>

    <div class="browser-toolbar">
      <el-input
        v-model="filterKeyword"
        placeholder="在当前目录过滤目录名/文件 key"
        clearable
        style="max-width: 320px"
        :disabled="!form.accountId"
      />
    </div>

    <BreadcrumbNav
      :breadcrumbs="breadcrumbs"
      :can-go-up="canGoUp"
      :can-go-back="canGoBack"
      :can-go-forward="canGoForward"
      :loading="browserLoading"
      @up="goToParent"
      @refresh="refreshCurrent"
      @navigate="navigateToPrefix"
      @back="goBackPrefix"
      @forward="goForwardPrefix"
    />

    <el-alert v-if="browserError" type="error" :closable="false" show-icon class="browser-error">
      <template #title>
        {{ browserError }}
      </template>
      <template #default>
        <el-button size="small" type="danger" plain @click="refreshCurrent">重试</el-button>
      </template>
    </el-alert>

    <el-skeleton v-if="browserLoading && !hasBrowserRows" :rows="5" animated style="margin-top: 12px" />

    <template v-else>
      <div class="table-actions">
        <el-button
          type="success"
          plain
          :loading="batchAddLoading"
          :disabled="selectedBrowserObjects.length + selectedBrowserDirectories.length === 0"
          @click="addSelectedObjectsToDownloadList"
        >
          批量添加选中项（文件 {{ selectionStatsLoading ? '计算中...' : selectedResolvedFileCount }} / 目录 {{ selectedBrowserDirectories.length }}）
        </el-button>
      </div>

      <ObjectBrowserTable
        :directories="filteredDirectories"
        :objects="filteredObjects"
        :loading="browserLoading"
        :current-prefix="currentPrefix"
        @enter-directory="navigateToPrefix"
        @file-click="openObjectDetail"
        @add-object="addObjectToDownloadList"
        @selection-change="onBrowserSelectionChange"
      />
    </template>

    <div v-if="isTruncated" class="load-more-row">
      <el-button :loading="loadMoreLoading" @click="loadMore">加载更多</el-button>
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

    <ObjectDetailModal v-model="detailVisible" :object-item="activeObject" />
  </el-card>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import BucketSelector from '@/components/BucketSelector.vue';
import BreadcrumbNav from '@/components/BreadcrumbNav.vue';
import type { BreadcrumbItem } from '@/components/BreadcrumbNav.vue';
import ObjectBrowserTable from '@/components/ObjectBrowserTable.vue';
import ObjectDetailModal from '@/components/ObjectDetailModal.vue';
import type { BrowserSelectionPayload } from '@/components/ObjectBrowserTable.vue';
import { fetchAccounts } from '@/api/accounts';
import { fetchObsBuckets, fetchObsObjects, normalizeObsPrefix } from '@/api/obs';
import { createTask } from '@/api/tasks';
import type { Account, MockObject } from '@/types/models';
import type { ObsDirectory, ObsObject } from '@/api/obs';

const router = useRouter();
const accounts = ref<Account[]>([]);
const buckets = ref<string[]>([]);
const bucketsLoading = ref(false);
const browserLoading = ref(false);
const loadMoreLoading = ref(false);
const submitLoading = ref(false);
const batchAddLoading = ref(false);
const filterKeyword = ref('');
const browserError = ref('');

const directories = ref<ObsDirectory[]>([]);
const objects = ref<ObsObject[]>([]);
const downloadList = ref<MockObject[]>([]);
const selectedBrowserObjects = ref<ObsObject[]>([]);
const selectedBrowserDirectories = ref<ObsDirectory[]>([]);
const selectedResolvedFileCount = ref(0);
const selectionStatsLoading = ref(false);

const detailVisible = ref(false);
const activeObject = ref<ObsObject | null>(null);

const currentPrefix = ref('');
const prefixBackStack = ref<string[]>([]);
const prefixForwardStack = ref<string[]>([]);

const isTruncated = ref(false);
const nextMarker = ref<string | undefined>();
const nextContinuationToken = ref<string | undefined>();

const form = reactive({
  accountId: undefined as number | undefined,
  bucket: '',
});

let latestRequestId = 0;
let currentController: AbortController | null = null;
let selectionStatsRequestId = 0;

const sortedDirectories = computed(() => {
  return [...directories.value].sort((a, b) => a.name.localeCompare(b.name));
});

const sortedObjects = computed(() => {
  return [...objects.value].sort((a, b) => a.key.localeCompare(b.key));
});

const normalizedFilter = computed(() => filterKeyword.value.trim().toLowerCase());

const filteredDirectories = computed(() => {
  if (!normalizedFilter.value) return sortedDirectories.value;
  return sortedDirectories.value.filter((item) => item.name.toLowerCase().includes(normalizedFilter.value));
});

const filteredObjects = computed(() => {
  if (!normalizedFilter.value) return sortedObjects.value;
  return sortedObjects.value.filter((item) => item.key.toLowerCase().includes(normalizedFilter.value));
});

const hasBrowserRows = computed(() => directories.value.length > 0 || objects.value.length > 0);
const canGoUp = computed(() => currentPrefix.value !== '');
const canGoBack = computed(() => prefixBackStack.value.length > 0);
const canGoForward = computed(() => prefixForwardStack.value.length > 0);

const breadcrumbs = computed<BreadcrumbItem[]>(() => {
  const items: BreadcrumbItem[] = [{ label: 'root', prefix: '' }];
  if (!currentPrefix.value) return items;

  const segments = currentPrefix.value
    .slice(0, -1)
    .split('/')
    .filter((item) => item);
  let acc = '';
  for (const segment of segments) {
    acc = `${acc}${segment}/`;
    items.push({ label: segment, prefix: acc });
  }
  return items;
});

const getParentPrefix = (prefix: string) => {
  if (!prefix) return '';
  const segments = prefix
    .slice(0, -1)
    .split('/')
    .filter((item) => item);
  segments.pop();
  return segments.length > 0 ? `${segments.join('/')}/` : '';
};

const cancelOngoingRequest = () => {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
};

const resetSelectionStats = () => {
  selectionStatsRequestId += 1;
  selectionStatsLoading.value = false;
  selectedResolvedFileCount.value = 0;
};

const clearBrowserSelection = () => {
  selectedBrowserObjects.value = [];
  selectedBrowserDirectories.value = [];
  resetSelectionStats();
};

const loadObjects = async (options?: {
  append?: boolean;
  marker?: string;
  continuationToken?: string;
}) => {
  if (!form.bucket.trim()) {
    directories.value = [];
    objects.value = [];
    clearBrowserSelection();
    isTruncated.value = false;
    nextMarker.value = undefined;
    nextContinuationToken.value = undefined;
    return;
  }

  const append = options?.append === true;
  if (append) {
    loadMoreLoading.value = true;
  } else {
    browserLoading.value = true;
  }
  browserError.value = '';

  cancelOngoingRequest();
  const controller = new AbortController();
  currentController = controller;
  latestRequestId += 1;
  const requestId = latestRequestId;

  try {
    const res = await fetchObsObjects({
      bucket: form.bucket.trim(),
      prefix: currentPrefix.value,
      delimiter: '/',
      marker: options?.marker,
      continuationToken: options?.continuationToken,
      signal: controller.signal,
    });

    if (requestId !== latestRequestId) return;

    if (append) {
      const keySet = new Set(objects.value.map((item) => item.key));
      const merged = [...objects.value];
      for (const item of res.objects) {
        if (!keySet.has(item.key)) {
          keySet.add(item.key);
          merged.push(item);
        }
      }
      objects.value = merged;
    } else {
      directories.value = res.directories;
      objects.value = res.objects;
      clearBrowserSelection();
    }

    isTruncated.value = Boolean(res.isTruncated);
    nextMarker.value = res.nextMarker;
    nextContinuationToken.value = res.nextContinuationToken;
  } catch (error) {
    if (controller.signal.aborted) return;
    if (requestId !== latestRequestId) return;

    browserError.value = '对象列表加载失败，请重试';
    ElMessage.error(browserError.value);
  } finally {
    if (requestId === latestRequestId) {
      browserLoading.value = false;
      loadMoreLoading.value = false;
    }
  }
};

const resetPrefixState = () => {
  currentPrefix.value = '';
  prefixBackStack.value = [];
  prefixForwardStack.value = [];
};

const navigateToPrefix = (nextPrefix: string) => {
  const normalized = normalizeObsPrefix(nextPrefix);
  if (normalized === currentPrefix.value) {
    loadObjects();
    return;
  }

  prefixBackStack.value.push(currentPrefix.value);
  prefixForwardStack.value = [];
  currentPrefix.value = normalized;
  loadObjects();
};

const refreshCurrent = () => {
  loadObjects();
};

const goToParent = () => {
  if (!canGoUp.value) return;
  navigateToPrefix(getParentPrefix(currentPrefix.value));
};

const goBackPrefix = () => {
  if (!canGoBack.value) return;
  const previous = prefixBackStack.value.pop() as string;
  prefixForwardStack.value.push(currentPrefix.value);
  currentPrefix.value = previous;
  loadObjects();
};

const goForwardPrefix = () => {
  if (!canGoForward.value) return;
  const next = prefixForwardStack.value.pop() as string;
  prefixBackStack.value.push(currentPrefix.value);
  currentPrefix.value = next;
  loadObjects();
};

const loadBuckets = async () => {
  const accountId = form.accountId;
  if (accountId === undefined || accountId === null) {
    buckets.value = [];
    return;
  }
  bucketsLoading.value = true;
  try {
    buckets.value = await fetchObsBuckets(accountId);
  } finally {
    bucketsLoading.value = false;
  }
};

const loadAccounts = async () => {
  accounts.value = await fetchAccounts();
};

const onAccountChange = (accountId: number | undefined) => {
  form.bucket = '';
  buckets.value = [];
  directories.value = [];
  objects.value = [];
  clearBrowserSelection();
  resetPrefixState();

  if (accountId === undefined || accountId === null) {
    return;
  }

  const matched = accounts.value.find((item) => item.id === accountId);
  const expectedAccountId = accountId;
  loadBuckets()
    .then(() => {
      if (form.accountId !== expectedAccountId) return;
      if (matched?.obsBucket && buckets.value.includes(matched.obsBucket)) {
        form.bucket = matched.obsBucket;
        return;
      }
      form.bucket = buckets.value[0] ?? '';
    })
    .catch(() => undefined);
};

watch(
  () => form.bucket,
  (bucket) => {
    resetPrefixState();
    clearBrowserSelection();
    if (!bucket.trim()) {
      directories.value = [];
      objects.value = [];
      return;
    }
    loadObjects();
  },
);

const loadMore = () => {
  if (!isTruncated.value) return;
  loadObjects({
    append: true,
    marker: nextMarker.value,
    continuationToken: nextContinuationToken.value,
  });
};

const openObjectDetail = (item: ObsObject) => {
  activeObject.value = item;
  detailVisible.value = true;
};

const isDownloadableFileKey = (key: string) => {
  const normalized = key.trim();
  return normalized !== '' && !normalized.endsWith('/');
};

const addObjectToDownloadList = (item: ObsObject) => {
  if (!isDownloadableFileKey(item.key)) {
    ElMessage.warning('目录不能直接加入下载任务，请选择目录下文件');
    return;
  }
  const exists = downloadList.value.some((row) => row.key === item.key);
  if (exists) {
    ElMessage.warning('该对象已在下载任务列表中');
    return;
  }
  downloadList.value = [
    ...downloadList.value,
    {
      key: item.key,
      size: item.size,
      lastModified: item.lastModified,
    },
  ];
  ElMessage.success('已添加到下载任务列表');
};

const onBrowserSelectionChange = (payload: BrowserSelectionPayload) => {
  selectedBrowserObjects.value = payload.objects;
  selectedBrowserDirectories.value = payload.directories;
  void recalculateSelectedFileCount();
};

const listObjectsRecursively = async (bucket: string, startPrefix: string) => {
  const pendingPrefixes: string[] = [normalizeObsPrefix(startPrefix)];
  const visitedPrefixes = new Set<string>();
  const collected: ObsObject[] = [];

  while (pendingPrefixes.length > 0) {
    const prefix = pendingPrefixes.pop() as string;
    if (!prefix || visitedPrefixes.has(prefix)) continue;
    visitedPrefixes.add(prefix);

    let marker: string | undefined;
    let continuationToken: string | undefined;
    while (true) {
      const res = await fetchObsObjects({
        bucket,
        prefix,
        delimiter: '/',
        marker,
        continuationToken,
      });
      collected.push(...res.objects);
      for (const dir of res.directories) {
        const normalized = normalizeObsPrefix(dir.prefix);
        if (normalized && !visitedPrefixes.has(normalized)) {
          pendingPrefixes.push(normalized);
        }
      }
      if (!res.isTruncated) break;
      marker = res.nextMarker;
      continuationToken = res.nextContinuationToken;
      if (!marker && !continuationToken) break;
    }
  }

  return collected;
};

const recalculateSelectedFileCount = async () => {
  const requestId = ++selectionStatsRequestId;
  const bucket = form.bucket.trim();
  const uniqueKeys = new Set(
    selectedBrowserObjects.value.filter((item) => isDownloadableFileKey(item.key)).map((item) => item.key),
  );

  if (!bucket || selectedBrowserDirectories.value.length === 0) {
    selectedResolvedFileCount.value = uniqueKeys.size;
    selectionStatsLoading.value = false;
    return;
  }

  selectionStatsLoading.value = true;
  try {
    for (const dir of selectedBrowserDirectories.value) {
      const files = await listObjectsRecursively(bucket, dir.prefix);
      if (requestId !== selectionStatsRequestId) return;
      for (const file of files) {
        if (isDownloadableFileKey(file.key)) {
          uniqueKeys.add(file.key);
        }
      }
    }
    if (requestId !== selectionStatsRequestId) return;
    selectedResolvedFileCount.value = uniqueKeys.size;
  } finally {
    if (requestId === selectionStatsRequestId) {
      selectionStatsLoading.value = false;
    }
  }
};

const addSelectedObjectsToDownloadList = async () => {
  if (selectedBrowserObjects.value.length + selectedBrowserDirectories.value.length === 0) {
    ElMessage.warning('请先勾选文件或目录');
    return;
  }

  batchAddLoading.value = true;
  try {
    const existingKeys = new Set(downloadList.value.map((item) => item.key));
    const candidateObjects: ObsObject[] = selectedBrowserObjects.value.filter((item) =>
      isDownloadableFileKey(item.key),
    );
    for (const dir of selectedBrowserDirectories.value) {
      const files = await listObjectsRecursively(form.bucket.trim(), dir.prefix);
      candidateObjects.push(...files);
    }

    const uniqCandidates = new Map<string, ObsObject>();
    for (const item of candidateObjects) {
      if (!isDownloadableFileKey(item.key)) continue;
      if (!uniqCandidates.has(item.key)) {
        uniqCandidates.set(item.key, item);
      }
    }
    const toAdd = Array.from(uniqCandidates.values()).filter((item) => !existingKeys.has(item.key));

    if (toAdd.length === 0) {
      ElMessage.warning('选中文件都已在下载任务列表中');
      return;
    }

    downloadList.value = [
      ...downloadList.value,
      ...toAdd.map((item) => ({
        key: item.key,
        size: item.size,
        lastModified: item.lastModified,
      })),
    ];
    ElMessage.success(`已批量添加 ${toAdd.length} 个文件`);
  } finally {
    batchAddLoading.value = false;
  }
};

const submit = async () => {
  const objectKeys = downloadList.value.map((item) => item.key).filter(isDownloadableFileKey);
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
    router.push(`/tasks/${task.taskId}`);
  } finally {
    submitLoading.value = false;
  }
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

onMounted(async () => {
  // Prefix 规则：root 必须为 ""，非 root prefix 必须以 "/" 结尾。
  // 这里统一通过 normalizeObsPrefix 处理，便于后续替换为真实 OBS SDK 时保持一致行为。
  await loadAccounts();
});

onBeforeUnmount(() => {
  cancelOngoingRequest();
});
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-form {
  margin-bottom: 8px;
}

.account-bucket-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-item {
  flex: 1;
  min-width: 360px;
  margin-bottom: 0;
}

.browser-toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}

.browser-error {
  margin-top: 12px;
}

.table-actions {
  margin: 12px 0 8px;
  display: flex;
  justify-content: flex-end;
}

.load-more-row {
  margin-top: 12px;
  display: flex;
  justify-content: center;
}

.download-list-card {
  margin-top: 12px;
}

.download-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

@media (max-width: 900px) {
  .account-bucket-row {
    flex-direction: column;
    align-items: stretch;
  }

  .account-item {
    min-width: 0;
  }

  .browser-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
