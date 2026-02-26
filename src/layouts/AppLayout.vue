<template>
  <el-container class="layout-container">
    <el-aside width="220px">
      <el-menu :default-active="activePath" :default-openeds="['/rosbag-play']" router>
        <el-menu-item index="/accounts">Accounts</el-menu-item>
        <el-menu-item index="/tasks">Tasks</el-menu-item>
        <el-menu-item index="/ros-control">ROS 控制台</el-menu-item>
        <el-sub-menu index="/rosbag-play">
          <template #title>ROSBag Play</template>
          <el-menu-item index="/rosbag-play/web">Web 方案</el-menu-item>
          <el-menu-item index="/rosbag-play/rvizweb">内嵌 RVizWeb</el-menu-item>
          <el-menu-item index="/rosbag-play/vnc">VNC / RViz</el-menu-item>
        </el-sub-menu>
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
  if (route.path.startsWith('/ros-control')) return '/ros-control';
  if (route.path.startsWith('/rosbag-play')) return route.path;
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
