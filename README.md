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

## ROS 控制台页面

新增页面入口：左侧菜单 **ROS 控制台**（路由 `/ros-control`）。

### 配置与使用

1. 在页面填写：
   - `后端地址`：
     - 前后端同域部署时可留空（自动使用 `window.location.origin`）。
     - 前后端分离部署时请填写后端地址（示例：`http://192.168.1.20:8080` 或 `https://api.example.com`）。
     - 页面会将该地址存储到 `localStorage` 的 `rosctl_backend_base_url`，下次自动回填。
   - `Token`：请求头 `X-CTRL-TOKEN` 使用该值。页面会将 token 存储到 `localStorage` 的 `rosctl_token`，刷新后自动回填。
   - `ROS 版本`、`bagPath`、`loop`、`useSimTime`、`rate`、`port`。
2. 点击 `Start` 调用 `POST <backendBaseUrl>/api/v1/ros/start`。
3. 点击 `Stop` 调用 `POST <backendBaseUrl>/api/v1/ros/stop`。
4. 点击 `Refresh Status` 调用 `GET <backendBaseUrl>/api/v1/ros/status`。
5. 启动后默认每 2 秒自动轮询状态（可通过开关关闭）。

### 状态展示与错误说明

- 状态区会显示：`status`、`wsUrl`、`roscorePid`、`bridgePid`、`bagPid`、`message`。
- 当后端返回 `401` 时，页面提示：
  - `Token 无效或已被禁用（后端从数据库校验）。请联系管理员在数据库中更新/启用 token。`
- 网络错误会提示无法连接后端。
- 后端返回 `status=ERROR` 时会展示 `message`。

### wsUrl 用于可视化

`wsUrl` 可复制后用于可视化工具（例如 Foxglove）：

1. 打开 Foxglove。
2. 选择 Rosbridge 连接。
3. 粘贴页面展示的 `wsUrl` 并连接。

## ROS 感知查看：VNC / RViz 方案

左侧菜单 `ROSBag Play` 下提供两个页面：

- `Web 方案`（`/rosbag-play/web`）：基于 rosbridge 的网页可视化。
- `VNC / RViz`（`/rosbag-play/vnc`）：通过 noVNC 访问服务器原生 RViz 桌面（适合插件/完全一致视图）。

### noVNC 运维侧准备

服务端需要先启动 VNC 和 noVNC/websockify，示例：

```bash
websockify --web=/usr/share/novnc/ 6080 localhost:5901
```

浏览器访问示例：

```text
http://<ros-ip>:6080/vnc.html
```

若后端 `GET /api/v1/ros/status` 返回 `vncUrl`，前端会自动回填到 VNC 页面；未返回时可手动填写。

### 状态字段兼容

`/api/v1/ros/status` 前端兼容字段：

- `wsUrl: string`
- `vncUrl?: string`
- `message?: string`

### VNC 使用说明

- VNC 密码通常在 noVNC 页面内输入，本页面仅提供便捷入口与可选提示保存。
- noVNC 常见 Web 端口是 `6080`，VNC 端口常见是 `5901 (:1)`。
- 不要使用 `localhost`（除非浏览器与 noVNC 服务在同一台机器）。

### 常见问题

- 黑屏：确认 RViz 正在服务器图形会话中运行，且 DISPLAY 指向正确。
- 连接失败：检查 `6080/5901` 端口、防火墙、安全组与反向代理配置。
- 页面打不开：确认 noVNC 静态目录路径正确（`--web=/usr/share/novnc/`）。
- 使用 `localhost` 失败：浏览器会访问本机而非远端服务器，请改为服务器内网/公网 IP。

### 前后端不在同一服务器时的配置

如果前端和后端不在同一台服务器，按下面配置：

1. 打开 `/ros-control` 页面。
2. 在 `后端地址` 输入后端的可访问地址（必须带协议 `http://` 或 `https://`，不要带 `/api/v1/ros` 后缀）。
   - 例如输入 `http://10.0.0.8:8080`，页面会实际请求：
   - `http://10.0.0.8:8080/api/v1/ros/start|stop|status`。
3. 填写数据库中启用的 token 后再操作。
4. 若出现“无法连接后端”或浏览器跨域报错，请让后端放开该前端域名的 CORS（至少允许 `X-CTRL-TOKEN` 请求头）。

## RVizWeb 内网嵌入部署

已提供完整部署清单（docker-compose、nginx 反代、ROS launch、iframe 示例、排障说明），请参考：

- `docs/rvizweb.md`
