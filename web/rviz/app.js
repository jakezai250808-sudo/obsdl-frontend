(function () {
  const params = new URLSearchParams(window.location.search);
  const defaults = {
    ws: `ws://${window.location.hostname || 'localhost'}:9090`,
    fixed: 'map',
    cloud: '/points_raw',
    marker: '/visualization_marker',
    markerType: 'auto',
  };

  const state = {
    ws: params.get('ws') || defaults.ws,
    fixedFrame: params.get('fixed') || defaults.fixed,
    cloudTopic: params.get('cloud') || defaults.cloud,
    markerTopic: params.get('marker') || defaults.marker,
    markerType: params.get('markerType') || defaults.markerType,
    autoReconnect: params.get('reconnect') !== '0',
    showMarker: params.get('markerOn') !== '0',
    showPointCloud: params.get('cloudOn') === '1',
    reconnectDelayMs: 2000,
    isManualDisconnect: false,
    connected: false,
    cloudMessageRatio: 2,
    cloudThrottleRateMs: 100,
  };

  const ui = {
    viewer: document.getElementById('viewer'),
    status: document.getElementById('status'),
    error: document.getElementById('error'),
    wsInput: document.getElementById('wsInput'),
    fixedFrameSelect: document.getElementById('fixedFrameSelect'),
    cloudTopicInput: document.getElementById('cloudTopicInput'),
    markerTopicInput: document.getElementById('markerTopicInput'),
    markerTypeSelect: document.getElementById('markerTypeSelect'),
    autoReconnectInput: document.getElementById('autoReconnectInput'),
    markerToggle: document.getElementById('markerToggle'),
    cloudToggle: document.getElementById('cloudToggle'),
    connectBtn: document.getElementById('connectBtn'),
    disconnectBtn: document.getElementById('disconnectBtn'),
    resetViewBtn: document.getElementById('resetViewBtn'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    fpsLabel: document.getElementById('fpsLabel'),
  };

  let ros = null;
  let viewer = null;
  let tfClient = null;
  let markerClient = null;
  let cloudClient = null;
  let reconnectTimer = null;

  const defaultCamera = { x: 3, y: 3, z: 3 };

  function setStatus(label, cls, errorMessage = '') {
    ui.status.textContent = label;
    ui.status.className = `status ${cls}`;
    ui.error.textContent = errorMessage;
  }

  function setNonFatalError(message) {
    if (!message) return;
    ui.error.textContent = message;
  }

  function applyQueryToUi() {
    ui.wsInput.value = state.ws;
    ui.cloudTopicInput.value = state.cloudTopic;
    ui.markerTopicInput.value = state.markerTopic;
    ui.autoReconnectInput.checked = state.autoReconnect;
    ui.markerToggle.checked = state.showMarker;
    ui.cloudToggle.checked = state.showPointCloud;

    if (![...ui.fixedFrameSelect.options].some((opt) => opt.value === state.fixedFrame)) {
      ui.fixedFrameSelect.add(new Option(state.fixedFrame, state.fixedFrame));
    }
    ui.fixedFrameSelect.value = state.fixedFrame;

    if (![...ui.markerTypeSelect.options].some((opt) => opt.value === state.markerType)) {
      state.markerType = defaults.markerType;
    }
    ui.markerTypeSelect.value = state.markerType;
  }

  function updateUrlQuery() {
    const q = new URLSearchParams(window.location.search);
    q.set('ws', state.ws);
    q.set('fixed', state.fixedFrame);
    q.set('cloud', state.cloudTopic);
    q.set('marker', state.markerTopic);
    q.set('markerType', state.markerType);
    q.set('reconnect', state.autoReconnect ? '1' : '0');
    q.set('markerOn', state.showMarker ? '1' : '0');
    q.set('cloudOn', state.showPointCloud ? '1' : '0');
    window.history.replaceState({}, '', `${window.location.pathname}?${q.toString()}`);
  }

  function buildViewer() {
    if (viewer) return;

    viewer = new ROS3D.Viewer({
      divID: 'viewer',
      width: ui.viewer.clientWidth,
      height: ui.viewer.clientHeight,
      antialias: true,
      background: '#0f172a',
      intensity: 0.7,
      cameraPose: { ...defaultCamera },
    });

    const resizeObserver = new ResizeObserver(() => {
      if (!viewer) return;
      viewer.resize(ui.viewer.clientWidth, ui.viewer.clientHeight);
    });
    resizeObserver.observe(ui.viewer);

    viewer.addObject(new ROS3D.Grid({ color: '#334155', cellSize: 1.0, num_cells: 30 }));

    enableIframeSafeInteraction();
    startFpsCounter();
  }

  function resetView() {
    if (!viewer) return;
    viewer.camera.position.set(defaultCamera.x, defaultCamera.y, defaultCamera.z);
    viewer.camera.lookAt(new THREE.Vector3(0, 0, 0));
    viewer.cameraControls.center.set(0, 0, 0);
    viewer.cameraControls.update();
  }

  function setupTfClient() {
    if (!ros) return;
    if (tfClient) tfClient.dispose();

    tfClient = new ROSLIB.TFClient({
      ros,
      fixedFrame: state.fixedFrame,
      angularThres: 0.01,
      transThres: 0.01,
      rate: 10.0,
      serverName: '/tf2_web_republisher',
      repubServiceName: '/republish_tfs',
    });
  }

  function teardownMarkerClient() {
    if (markerClient) {
      markerClient.unsubscribe();
      markerClient = null;
    }
  }

  function inferMarkerTypeFromTopic(topic) {
    if (!topic) return 'marker';
    if (topic.toLowerCase().includes('array')) return 'markerArray';
    return 'marker';
  }

  function setupMarkerClient() {
    teardownMarkerClient();
    if (!ros || !tfClient || !state.showMarker || !state.markerTopic) return;

    const resolvedType = state.markerType === 'auto' ? inferMarkerTypeFromTopic(state.markerTopic) : state.markerType;
    const common = {
      ros,
      tfClient,
      topic: state.markerTopic,
      rootObject: viewer.scene,
    };

    markerClient =
      resolvedType === 'markerArray'
        ? new ROS3D.MarkerArrayClient(common)
        : new ROS3D.MarkerClient(common);

    setNonFatalError(
      state.markerType === 'auto'
        ? `Marker 类型自动识别为 ${resolvedType}。如展示异常可手动切换。`
        : ''
    );
  }

  function teardownCloudClient() {
    if (cloudClient) {
      cloudClient.unsubscribe();
      cloudClient = null;
    }
  }

  function setupCloudClient() {
    teardownCloudClient();
    if (!ros || !tfClient || !state.showPointCloud || !state.cloudTopic) return;

    cloudClient = new ROS3D.PointCloud2({
      ros,
      tfClient,
      rootObject: viewer.scene,
      topic: state.cloudTopic,
      material: { size: 0.04, color: 0x7dd3fc },
      max_pts: 150000,
      messageRatio: state.cloudMessageRatio,
      throttle_rate: state.cloudThrottleRateMs,
    });
  }

  function connectRos() {
    clearTimeout(reconnectTimer);
    if (ros) {
      try {
        ros.close();
      } catch (_) {}
    }

    setStatus('Connecting...', 'connecting');
    state.isManualDisconnect = false;
    ros = new ROSLIB.Ros({ url: state.ws });

    ros.on('connection', () => {
      state.connected = true;
      setStatus('Connected', 'connected');
      setupTfClient();
      setupMarkerClient();
      setupCloudClient();
    });

    ros.on('error', (err) => {
      const msg = `连接错误: ${err?.message || err || 'unknown'}`;
      if (state.connected) {
        setNonFatalError(msg);
      } else {
        setStatus('Error', 'error', msg);
      }
    });

    ros.on('close', () => {
      state.connected = false;
      teardownMarkerClient();
      teardownCloudClient();
      if (tfClient) {
        tfClient.dispose();
        tfClient = null;
      }
      setStatus('Disconnected', 'disconnected');

      if (!state.isManualDisconnect && state.autoReconnect) {
        setStatus('Reconnecting...', 'connecting', `连接已断开，${state.reconnectDelayMs}ms 后重试`);
        reconnectTimer = window.setTimeout(() => connectRos(), state.reconnectDelayMs);
      }
    });
  }

  function disconnectRos() {
    clearTimeout(reconnectTimer);
    state.isManualDisconnect = true;
    if (ros) ros.close();
  }

  function refreshSubscriptions() {
    if (!state.connected) return;
    setupTfClient();
    setupMarkerClient();
    setupCloudClient();
  }

  function enableIframeSafeInteraction() {
    const passthroughBlocker = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    ui.viewer.addEventListener('wheel', (event) => passthroughBlocker(event), { passive: false });

    ui.viewer.addEventListener('pointerdown', (event) => {
      ui.viewer.focus();
      ui.viewer.classList.add('dragging');
      passthroughBlocker(event);
    });
    ui.viewer.addEventListener('pointermove', (event) => {
      if (event.buttons) passthroughBlocker(event);
    });
    ui.viewer.addEventListener('pointerup', () => ui.viewer.classList.remove('dragging'));
    ui.viewer.addEventListener('pointerleave', () => ui.viewer.classList.remove('dragging'));

    ui.viewer.addEventListener('keydown', (event) => {
      if (event.key.toLowerCase() === 'r') {
        event.preventDefault();
        resetView();
      }
    });
  }

  function startFpsCounter() {
    let lastTs = performance.now();
    let frameCount = 0;

    const tick = (ts) => {
      frameCount += 1;
      const elapsed = ts - lastTs;
      if (elapsed >= 1000) {
        const fps = ((frameCount * 1000) / elapsed).toFixed(1);
        ui.fpsLabel.textContent = `${fps} FPS`;
        frameCount = 0;
        lastTs = ts;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function bindUiEvents() {
    ui.connectBtn.addEventListener('click', () => {
      state.ws = ui.wsInput.value.trim() || defaults.ws;
      updateUrlQuery();
      connectRos();
    });

    ui.disconnectBtn.addEventListener('click', disconnectRos);
    ui.resetViewBtn.addEventListener('click', resetView);

    ui.fullscreenBtn.addEventListener('click', async () => {
      if (!document.fullscreenElement) {
        await document.getElementById('app').requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    });

    ui.wsInput.addEventListener('change', () => {
      state.ws = ui.wsInput.value.trim() || defaults.ws;
      updateUrlQuery();
      connectRos();
    });

    ui.fixedFrameSelect.addEventListener('change', () => {
      state.fixedFrame = ui.fixedFrameSelect.value;
      updateUrlQuery();
      refreshSubscriptions();
    });

    ui.markerTopicInput.addEventListener('change', () => {
      state.markerTopic = ui.markerTopicInput.value.trim() || defaults.marker;
      updateUrlQuery();
      setupMarkerClient();
    });

    ui.markerTypeSelect.addEventListener('change', () => {
      state.markerType = ui.markerTypeSelect.value;
      updateUrlQuery();
      setupMarkerClient();
    });

    ui.cloudTopicInput.addEventListener('change', () => {
      state.cloudTopic = ui.cloudTopicInput.value.trim();
      updateUrlQuery();
      setupCloudClient();
    });

    ui.autoReconnectInput.addEventListener('change', () => {
      state.autoReconnect = ui.autoReconnectInput.checked;
      updateUrlQuery();
    });

    ui.markerToggle.addEventListener('change', () => {
      state.showMarker = ui.markerToggle.checked;
      updateUrlQuery();
      setupMarkerClient();
    });

    ui.cloudToggle.addEventListener('change', () => {
      state.showPointCloud = ui.cloudToggle.checked;
      updateUrlQuery();
      setupCloudClient();
    });
  }

  function init() {
    applyQueryToUi();
    buildViewer();
    bindUiEvents();
    connectRos();
  }

  init();
})();
