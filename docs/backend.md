# ROS1 后端部署与启动要求（供 `web/rviz` 前端使用）

> 本文档只说明后端准备要求，前端页面本身不包含任何 ROS 服务部署逻辑。

## 1. 基础要求

- ROS1 环境（建议 Noetic）。
- 已安装并可运行 `rosbridge_server`。
- WebSocket 端口默认 `9090`（可改，但前端需匹配）。

## 2. 最小启动流程

```bash
# 1) 启动 ROS Master
roscore

# 2) 启动 rosbridge websocket（默认监听 9090）
roslaunch rosbridge_server rosbridge_websocket.launch
```

若前端与 ROS 不在同一台机器，请确认：

- 防火墙/安全组已放通 `9090`。
- 浏览器可访问 `ws://<ROS_HOST>:9090`。
- 若前端是 HTTPS 页面，建议配置 WSS（反向代理或网关层处理）。

## 3. TF 方案说明（重点）

前端默认使用 `tf2_web_republisher` 服务按需请求 TF：

- `serverName`: `/tf2_web_republisher`
- `repubServiceName`: `/republish_tfs`

### 3.1 推荐方案：启用 `tf2_web_republisher`

推荐理由：

- 按前端实际需要请求 TF，带宽与 CPU 更可控。
- 大规模 TF 树下更稳定。

典型安装（包名按发行版可能略有差异）：

```bash
sudo apt-get install ros-noetic-tf2-web-republisher
```

启动示例：

```bash
rosrun tf2_web_republisher tf2_web_republisher
```

### 3.2 可选方案：不使用 tf2_web_republisher

可改为前端直接订阅 `/tf` 与 `/tf_static` 并自行维护 TF tree，但实现复杂度与维护成本更高，不推荐作为默认生产方案。

## 4. Topic 准备建议

前端默认配置：

- Marker topic: `/visualization_marker`
- PointCloud topic: `/points_raw`（默认前端开关关闭，用户手动开启）
- Fixed frame: `map`

建议保证至少有一个 Marker 来源（例如 RViz marker 发布器），并确认点云 topic 为 `sensor_msgs/PointCloud2`。

## 5. 性能建议（后端侧）

前端已经做了默认限频策略，但后端仍建议做源头优化：

1. **点云限频**（示例）

```bash
rosrun topic_tools throttle messages /points_raw 10.0 /points_raw_throttled
```

2. **点云下采样**

- 使用 PCL voxel grid 或驱动侧降采样。
- 降低每帧点数可明显提升浏览器渲染稳定性。

3. **Marker 控制**

- 避免一次性发布过多高复杂度 marker（mesh/text/大量 line list）。

## 6. 常见排错

## 6.1 WebSocket 连接失败

- 检查 `rosbridge_websocket` 是否在运行：
  ```bash
  rosnode list | grep rosbridge
  ```
- 检查端口监听：
  ```bash
  ss -lntp | grep 9090
  ```
- 浏览器控制台若出现 mixed-content（HTTPS 页面连 ws://）错误，请改用 WSS。

## 6.2 已连接但没有画面

- 确认 fixed frame（例如 `map`）在 TF 树中存在。
- 用以下命令检查 TF：
  ```bash
  rosrun tf tf_echo map base_link
  ```
- 检查 marker/pointcloud topic 是否存在且消息类型正确：
  ```bash
  rostopic list
  rostopic type /visualization_marker
  rostopic type /points_raw
  ```

## 6.3 点云卡顿严重

- 先在前端关闭 PointCloud（默认即关闭）。
- 后端做限频和下采样。
- 降低传感器发布频率，或切换到更轻量点云 topic。

## 6.4 TF 抖动或延迟

- 优先启用 `tf2_web_republisher`。
- 检查发布时钟同步与 TF 发布频率。
- 确保关键坐标系链路完整（如 `map -> odom -> base_link`）。
