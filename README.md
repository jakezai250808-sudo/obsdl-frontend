# OBS DL Frontend

Vue 3 + Vite + TypeScript + Element Plus 前端项目。

## 开发

```bash
npm install
npm run dev
```

## API 基地址配置

通过 `.env` 中的 `VITE_API_BASE_URL` 配置 axios 的 baseURL。

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

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

### 前后端不在同一服务器时的配置

如果前端和后端不在同一台服务器，按下面配置：

1. 打开 `/ros-control` 页面。
2. 在 `后端地址` 输入后端的可访问地址（必须带协议 `http://` 或 `https://`，不要带 `/api/v1/ros` 后缀）。
   - 例如输入 `http://10.0.0.8:8080`，页面会实际请求：
   - `http://10.0.0.8:8080/api/v1/ros/start|stop|status`。
3. 填写数据库中启用的 token 后再操作。
4. 若出现“无法连接后端”或浏览器跨域报错，请让后端放开该前端域名的 CORS（至少允许 `X-CTRL-TOKEN` 请求头）。
