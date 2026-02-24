# OBS DL Frontend

Vue 3 + Vite + TypeScript + Element Plus 前端项目。

## 开发

```bash
npm install
npm run dev
```

默认监听 `0.0.0.0`，启动后可通过 `http://<你的机器IP>:5173` 访问开发服务。

## API 基地址配置

通过 `.env` 中的 `VITE_API_BASE_URL` 配置 axios 的 baseURL。

```env
VITE_API_BASE_URL=http://localhost:8080/api
```
