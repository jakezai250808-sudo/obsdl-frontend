import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_PROXY_API_TARGET || 'http://localhost:8080';
  const rosTarget = env.VITE_PROXY_ROS_TARGET || apiTarget;

  return {
    plugins: [vue()],
    server: {
      proxy: {
        '/api/v1/ros': {
          target: rosTarget,
          changeOrigin: true,
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  };
});
