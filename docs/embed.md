# iframe 嵌入说明（`web/rviz/index.html`）

## 推荐嵌入示例

```html
<iframe
  src="https://your-host/web/rviz/index.html?ws=ws://10.0.0.2:9090&fixed=map&cloud=/velodyne_points"
  title="ROS 3D Viewer"
  style="width: 100%; height: 640px; border: 0;"
  loading="lazy"
  referrerpolicy="no-referrer"
  allow="fullscreen"
></iframe>
```

## 推荐属性

- `allow="fullscreen"`：启用页面内全屏按钮。
- `style="border:0"`：避免外边框影响显示。
- 高度建议 `>= 480px`（点云/Marker 交互更舒适）。

## URL 参数（可覆盖默认配置）

- `ws`：rosbridge 地址，例如 `ws://10.0.0.2:9090`
- `fixed`：fixed frame，例如 `map`
- `cloud`：PointCloud2 topic，例如 `/velodyne_points`
- `marker`：Marker topic，默认 `/visualization_marker`
- `reconnect`：`1`/`0` 自动重连开关
- `markerOn`：`1`/`0` Marker 显示开关
- `cloudOn`：`1`/`0` PointCloud 显示开关（默认 `0`）

## 交互说明（iframe 场景优化）

- 3D 区域会拦截滚轮，防止父页面滚动穿透。
- 点击 3D 区域后获取焦点，快捷键仅在聚焦时生效（`R` 重置视角）。
- 鼠标拖拽旋转/平移/缩放时会阻止事件冒泡，避免影响父页面。

## 控件含义速览

- **WS 地址**：rosbridge websocket 地址，默认 `ws://<当前页面主机>:9090`。
- **Fixed Frame**：全局参考坐标系（例如 `map/odom/base_link`），TF 无法解析时通常是此项与后端 TF 树不匹配。
- **Marker Topic**：Marker 数据 topic。
- **Marker 类型**：
  - `auto`：根据 topic 名自动猜测（包含 `array` 时按 `MarkerArray`）。
  - `Marker`：消息类型 `visualization_msgs/Marker`。
  - `MarkerArray`：消息类型 `visualization_msgs/MarkerArray`。
- **PointCloud Topic**：点云 topic，类型需为 `sensor_msgs/PointCloud2`。
- **显示 PointCloud**：默认关闭，打开后才订阅（避免无意义性能开销）。
