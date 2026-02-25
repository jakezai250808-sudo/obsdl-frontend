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
   - `后端地址`：可留空，留空时使用 `window.location.origin`。
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
