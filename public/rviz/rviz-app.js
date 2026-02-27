(() => {
  const viewerEl = document.getElementById('viewer');
  const connEl = document.getElementById('conn');
  const fpsEl = document.getElementById('fps');
  const rateEl = document.getElementById('rate');
  const wsInput = document.getElementById('ws');
  const fixedFrameInput = document.getElementById('fixedFrame');
  const cloudToggle = document.getElementById('toggleCloud');
  const markerToggle = document.getElementById('toggleMarker');

  const wsUrlFromQuery = new URLSearchParams(window.location.search).get('ws');
  if (wsUrlFromQuery) wsInput.value = wsUrlFromQuery;

  const resolveWsUrl = () => {
    const raw = wsInput.value.trim();
    if (raw.startsWith('ws://') || raw.startsWith('wss://')) return raw;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${raw.startsWith('/') ? raw : `/${raw}`}`;
  };

  // iframe 场景下阻止滚动穿透。
  viewerEl.addEventListener('wheel', (event) => {
    event.preventDefault();
  }, { passive: false });

  // 点击后才激活键盘焦点，避免抢占外层页面快捷键。
  viewerEl.addEventListener('pointerdown', () => viewerEl.focus());

  let ros;
  let tfClient;
  let markerClient;
  let cloudClient;
  let sceneViewer;
  let markerCount = 0;
  let cloudCount = 0;
  let lastTick = performance.now();
  let frameCount = 0;

  const startFpsTicker = () => {
    const tick = (now) => {
      frameCount += 1;
      if (now - lastTick >= 1000) {
        fpsEl.textContent = `FPS: ${frameCount}`;
        rateEl.textContent = `CloudHz: ${cloudCount} / MarkerHz: ${markerCount}`;
        frameCount = 0;
        cloudCount = 0;
        markerCount = 0;
        lastTick = now;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const clearClients = () => {
    markerClient?.unsubscribe();
    cloudClient?.unsubscribe();
    tfClient?.dispose();
    ros?.close();
  };

  const buildViewer = () => {
    sceneViewer?.renderer?.dispose();
    viewerEl.innerHTML = '';
    sceneViewer = new ROS3D.Viewer({
      divID: 'viewer',
      width: viewerEl.clientWidth,
      height: viewerEl.clientHeight,
      antialias: true,
      background: '#0f172a',
    });
    sceneViewer.addObject(new ROS3D.Grid({ color: '#334155' }));
    window.addEventListener('resize', () => {
      sceneViewer.resize(viewerEl.clientWidth, viewerEl.clientHeight);
    });
  };

  const bindClients = () => {
    tfClient = new ROSLIB.TFClient({
      ros,
      fixedFrame: fixedFrameInput.value.trim() || 'map',
      angularThres: 0.01,
      transThres: 0.01,
      rate: 20,
      serverName: '/tf2_web_republisher',
    });

    markerClient = new ROS3D.MarkerClient({
      ros,
      tfClient,
      rootObject: sceneViewer.scene,
      topic: '/web/visualization_marker_throttled',
    });

    // 统计 marker 频率
    const markerCounter = new ROSLIB.Topic({
      ros,
      name: '/web/visualization_marker_throttled',
      messageType: 'visualization_msgs/Marker',
      throttle_rate: 100,
      queue_length: 1,
    });
    markerCounter.subscribe(() => { markerCount += 1; });

    cloudClient = new ROS3D.PointCloud2({
      ros,
      tfClient,
      rootObject: sceneViewer.scene,
      topic: '/web/points_throttled',
      material: { size: 0.07, color: 0xffffff },
      max_pts: 120000,
    });

    const cloudCounter = new ROSLIB.Topic({
      ros,
      name: '/web/points_throttled',
      messageType: 'sensor_msgs/PointCloud2',
      throttle_rate: 100,
      queue_length: 1,
    });
    cloudCounter.subscribe(() => { cloudCount += 1; });

    cloudClient.unsubscribe();
    if (!markerToggle.checked) markerClient.unsubscribe();

    markerToggle.addEventListener('change', () => {
      if (markerToggle.checked) markerClient.subscribe();
      else markerClient.unsubscribe();
    });

    cloudToggle.addEventListener('change', () => {
      if (cloudToggle.checked) cloudClient.subscribe();
      else cloudClient.unsubscribe();
    });
  };

  const connect = () => {
    clearClients();
    buildViewer();
    const url = resolveWsUrl();
    ros = new ROSLIB.Ros({ url });

    ros.on('connection', () => {
      connEl.textContent = `Connected: ${url}`;
      connEl.style.color = '#22c55e';
      bindClients();
    });

    ros.on('error', (error) => {
      connEl.textContent = `Error: ${String(error)}`;
      connEl.style.color = '#ef4444';
    });

    ros.on('close', () => {
      connEl.textContent = 'Disconnected';
      connEl.style.color = '#f59e0b';
    });
  };

  document.getElementById('reconnect').addEventListener('click', connect);
  document.getElementById('resetView').addEventListener('click', () => {
    sceneViewer?.cameraControls?.reset();
  });

  document.getElementById('fullscreen').addEventListener('click', async () => {
    const root = document.documentElement;
    if (!document.fullscreenElement) await root.requestFullscreen();
    else await document.exitFullscreen();
  });

  document.getElementById('popout').addEventListener('click', () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  });

  connect();
  startFpsTicker();
})();
