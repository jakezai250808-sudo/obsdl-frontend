<template>
  <el-container class="layout-container">
    <el-aside width="220px">
      <el-menu :default-active="activePath" router>
        <el-menu-item index="/accounts">Accounts</el-menu-item>
        <el-menu-item index="/tasks">Tasks</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">OBS Downloader Console</el-header>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const activePath = computed(() => {
  if (route.path.startsWith('/tasks')) return '/tasks';
  return route.path;
});
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
}

.header {
  font-size: 18px;
  font-weight: 700;
  border-bottom: 1px solid #e5e7eb;
}
</style>
