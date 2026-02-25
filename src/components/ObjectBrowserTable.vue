<template>
  <el-table :data="rows" v-loading="loading" style="width: 100%" @row-click="onRowClick" @selection-change="onSelectionChange">
    <el-table-column type="selection" width="48" :selectable="selectableRow" />
    <el-table-column label="名称" min-width="320">
      <template #default="{ row }">
        <div class="name-cell">
          <el-icon v-if="row.type === 'directory'" class="row-icon"><Folder /></el-icon>
          <el-icon v-else class="row-icon"><Document /></el-icon>
          <div>
            <div class="primary">
              {{ row.type === 'directory' ? row.name : row.key }}
            </div>
            <div v-if="row.type === 'object' && relativeKey(row.key) !== row.key" class="secondary">
              相对路径: {{ relativeKey(row.key) }}
            </div>
          </div>
        </div>
      </template>
    </el-table-column>
    <el-table-column label="大小(bytes)" width="140">
      <template #default="{ row }">
        <span>{{ row.type === 'object' ? row.size : '-' }}</span>
      </template>
    </el-table-column>
    <el-table-column label="Last Modified" min-width="180">
      <template #default="{ row }">
        <span>{{ row.type === 'object' ? row.lastModified || '-' : '-' }}</span>
      </template>
    </el-table-column>
    <el-table-column label="操作" width="140">
      <template #default="{ row }">
        <el-button
          v-if="row.type === 'object'"
          link
          type="success"
          @click.stop="$emit('add-object', row)"
        >
          添加
        </el-button>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Document, Folder } from '@element-plus/icons-vue';
import type { ObsDirectory, ObsObject } from '@/api/obs';
import type { TableColumnCtx } from 'element-plus';

type DirectoryRow = ObsDirectory & { type: 'directory' };
type ObjectRow = ObsObject & { type: 'object' };
type BrowserRow = DirectoryRow | ObjectRow;

export interface BrowserSelectionPayload {
  directories: ObsDirectory[];
  objects: ObsObject[];
}

const props = defineProps<{
  directories: ObsDirectory[];
  objects: ObsObject[];
  loading?: boolean;
  currentPrefix: string;
}>();

const emit = defineEmits<{
  (e: 'enter-directory', prefix: string): void;
  (e: 'file-click', item: ObsObject): void;
  (e: 'add-object', item: ObsObject): void;
  (e: 'selection-change', payload: BrowserSelectionPayload): void;
}>();

const rows = computed<BrowserRow[]>(() => {
  const dirs: DirectoryRow[] = props.directories.map((item) => ({
    ...item,
    type: 'directory',
  }));
  const files: ObjectRow[] = props.objects.map((item) => ({
    ...item,
    type: 'object',
  }));
  return [...dirs, ...files];
});

const relativeKey = (key: string) => {
  if (!props.currentPrefix) return key;
  return key.startsWith(props.currentPrefix) ? key.slice(props.currentPrefix.length) : key;
};

const onRowClick = (row: BrowserRow, column: TableColumnCtx<BrowserRow>) => {
  if (column.type === 'selection') return;
  if (row.type === 'directory') {
    emit('enter-directory', row.prefix);
    return;
  }
  emit('file-click', row);
};

const selectableRow = () => true;

const onSelectionChange = (rows: BrowserRow[]) => {
  emit('selection-change', {
    directories: rows.filter((item): item is DirectoryRow => item.type === 'directory'),
    objects: rows.filter((item): item is ObjectRow => item.type === 'object'),
  });
};
</script>

<style scoped>
.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.row-icon {
  font-size: 16px;
}

.primary {
  color: var(--el-text-color-primary);
}

.secondary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
