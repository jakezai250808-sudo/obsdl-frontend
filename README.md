# OBS DL Frontend

Vue 3 + Vite + TypeScript + Element Plus 前端项目。

## 开发

```bash
npm install
npm run dev
```

开发服务器启动后默认监听 `0.0.0.0`，可通过 `http://<你的机器IP>:5173` 从局域网设备访问。

## API 基地址配置

通过 `.env` 中的 `VITE_API_BASE_URL` 配置 axios 的 baseURL。

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

## 打包

```bash
npm run build
```

打包产物会输出到 `dist/` 目录。

## 本地预览打包产物

```bash
npm run preview
```

默认可通过 `http://<你的机器IP>:4173` 访问（当前配置为监听 `0.0.0.0`）。

## 部署（Nginx 示例）

1. 将 `dist/` 目录上传到服务器，例如 `/var/www/obsdl-frontend`。
2. 配置 Nginx 静态站点并开启 SPA 路由回退：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/obsdl-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

3. 重载 Nginx：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 部署前检查

- 确认后端 API 地址已通过 `.env` 中的 `VITE_API_BASE_URL` 配置正确。
- 若站点不是部署在域名根路径（如 `/app/`），需在 `vite.config.ts` 中补充 `base` 配置后再重新打包。

