# RVizWeb（ROS1）内网部署说明

## 1. 一键启动

```bash
cd deploy
ROS_MASTER_URI=http://<ros-master-ip>:11311 docker compose up -d
```

默认访问：`http://<host>/rviz/`。

> 说明：`nginx` 统一暴露 `/rviz/`（前端）与 `/rosbridge/`（WebSocket）。


## 1.1 无后端 nginx 时（临时调试）

如果后端还没部署 nginx，前端仍可通过自身静态资源加载 RVizWeb 页面：

- 菜单进入：`ROSBag Play -> 内嵌 RVizWeb`
- 填写 `rosbridge wsUrl`（例如 `ws://<ros-host>:9090`）
- 点击“载入”后会打开：`/rviz/index.html?ws=...`

> 该路径来自前端 `public/rviz/`，不依赖后端 `/rviz/` 反向代理。


## 2. iframe 集成示例

```html
<iframe
  src="/rviz/"
  style="width:100%;height:720px;border:0"
  allow="fullscreen"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
></iframe>
```

建议：
- 业务页面保持 `overflow: hidden` 或限制外层滚动区域。
- 使用 `allow="fullscreen"` 以启用内置全屏按钮。

## 3. 配置项

### 3.1 docker-compose 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ROS_MASTER_URI` | `http://host.docker.internal:11311` | ROS Master 地址 |
| `ROS_IP` / `ROS_HOSTNAME` | 空 | 容器 ROS 网络标识 |
| `ROS_NAMESPACE` | 空 | 机器人命名空间 |
| `NGINX_PORT` | `80` | 外部访问端口 |
| `ROSBRIDGE_PORT` | `9090` | rosbridge 容器端口 |
| `BASE_FRAME` | `base_link` | 机器人基坐标 |
| `FIXED_FRAME` | `map` | 视图固定坐标 |
| `TF_RATE` | `20` | TF 发布频率 |
| `TF_FRAMES` | `[map,odom,base_link,lidar_link,camera_link]` | 仅转发这些 frame |
| `CLOUD_TOPIC` | `/points_raw` | 原始点云 topic |
| `CLOUD_RATE` | `8` | 点云限频 Hz |
| `MARKER_TOPIC` | `/visualization_marker` | 原始 marker topic |
| `MARKER_RATE` | `10` | marker 限频 Hz |

### 3.2 ROS launch 参数

文件：`ros/launch/visualization_web.launch`

- `base_frame` / `fixed_frame`
- `tf_rate` / `tf_frames`
- `cloud_topic` / `cloud_rate` / `cloud_output_topic`
- `marker_topic` / `marker_rate` / `marker_output_topic`

## 4. 前端交互与性能策略

- rosbridge 默认使用相对路径 `/rosbridge/`，自动适配同域反代。
- 点云默认关闭（UI 开关开启后订阅）。
- Marker 默认开启，但消费的是限频后的 `/web/visualization_marker_throttled`。
- TF 通过 `tf2_web_republisher` + frame 白名单，避免全量 TF。
- 页面内对 `wheel` 事件执行 `preventDefault()`，避免 iframe 滚动穿透。
- 点击视图区域后才抢占键盘焦点，减少与外层页面快捷键冲突。

## 5. 常见故障排查

### 5.1 WebSocket 连接失败（101/400/502）

1. 检查 nginx 反代是否携带 Upgrade 头：
   - `Upgrade`
   - `Connection: upgrade`
2. 检查 rosbridge 是否启动：
   ```bash
   docker compose ps
   docker compose logs rosbridge --tail=200
   ```
3. 内网策略/ACL 若限制了 `/rosbridge/`，先放通本机网段。

### 5.2 TF 不动或坐标跳变

1. 确认 `fixed_frame` 在 `TF_FRAMES` 列表中。
2. 检查 `/tf`、`/tf_static` 是否持续发布。
3. 若跨机通信，确认 ROS 网络变量（`ROS_IP` / `ROS_HOSTNAME`）可达。

### 5.3 点云卡顿

1. 先保持“点云开关关闭”，只看 marker。
2. 降低 `CLOUD_RATE`（如 5Hz）。
3. 降低前端点数上限（代码中 `max_pts`）。
4. 源端做体素下采样（PCL voxel grid）后再发布。

### 5.4 浏览器性能建议

- 优先使用 Chromium 新版。
- 同时打开多个 RViz iframe 时，建议每个实例只打开必要图层。
- 降低屏幕刷新压力：避免 4K 下全屏多实例并发。

## 6. 安全说明

- 当前默认采用内网网段白名单（nginx `allow/deny`）。
- 若需要账号认证，可改为 `auth_basic` + `htpasswd`。
- 若需要跨域嵌入，修改 `Content-Security-Policy: frame-ancestors ...`。
