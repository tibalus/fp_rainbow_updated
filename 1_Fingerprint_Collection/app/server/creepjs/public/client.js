const socket = io();

async function collectFingerprint() {
  const link = window.location.href;
  const id = link.slice(link.indexOf('#') + 1, link.length);
  console.log("CreepJS - UUID:", id);

  try {
    // Wait for CreepJS to be ready and collect all data
    const creepData = await collectCreepData();

    const result = {
      ...creepData,
      timestamp: new Date().toISOString(),
      library: "CreepJS"
    };

    socket.emit("ecrireDansFichier", { id: id, result: result });
    console.log("CreepJS fingerprint sent");
  } catch (error) {
    console.error("CreepJS error:", error);
    socket.emit("ecrireDansFichier", {
      id: id,
      result: { error: error.message, library: "CreepJS" }
    });
  }
}

async function collectCreepData() {
  const data = {};

  // Navigator fingerprint
  data.navigator = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages ? [...navigator.languages] : [],
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory,
    maxTouchPoints: navigator.maxTouchPoints,
    cookieEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack,
    vendor: navigator.vendor,
    vendorSub: navigator.vendorSub,
    productSub: navigator.productSub,
    pdfViewerEnabled: navigator.pdfViewerEnabled,
    webdriver: navigator.webdriver
  };

  // Screen fingerprint
  data.screen = {
    width: screen.width,
    height: screen.height,
    availWidth: screen.availWidth,
    availHeight: screen.availHeight,
    colorDepth: screen.colorDepth,
    pixelDepth: screen.pixelDepth,
    devicePixelRatio: window.devicePixelRatio,
    orientation: screen.orientation ? {
      type: screen.orientation.type,
      angle: screen.orientation.angle
    } : null
  };

  // Canvas fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('CreepJS Canvas', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Fingerprint', 4, 17);
    data.canvas = {
      dataURL: canvas.toDataURL(),
      hash: await hashString(canvas.toDataURL())
    };
  } catch (e) {
    data.canvas = { error: e.message };
  }

  // WebGL fingerprint
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      data.webgl = {
        vendor: gl.getParameter(gl.VENDOR),
        renderer: gl.getParameter(gl.RENDERER),
        version: gl.getParameter(gl.VERSION),
        shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        unmaskedVendor: getUnmaskedInfo(gl, 'VENDOR'),
        unmaskedRenderer: getUnmaskedInfo(gl, 'RENDERER'),
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
        maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
        maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
        extensions: gl.getSupportedExtensions()
      };
    }
  } catch (e) {
    data.webgl = { error: e.message };
  }

  // Audio fingerprint
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const analyser = audioContext.createAnalyser();
    const gainNode = audioContext.createGain();
    const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(0);

    data.audio = {
      sampleRate: audioContext.sampleRate,
      state: audioContext.state,
      baseLatency: audioContext.baseLatency,
      outputLatency: audioContext.outputLatency,
      channelCount: audioContext.destination.channelCount,
      maxChannelCount: audioContext.destination.maxChannelCount
    };

    oscillator.stop();
    audioContext.close();
  } catch (e) {
    data.audio = { error: e.message };
  }

  // Fonts detection
  try {
    const testFonts = [
      'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Georgia',
      'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype',
      'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings',
      'Wingdings', 'MS Sans Serif', 'MS Serif', 'Segoe UI', 'Calibri',
      'Cambria', 'Consolas', 'Helvetica', 'Monaco', 'Roboto', 'Ubuntu'
    ];
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const getWidth = (fontFamily) => {
      ctx.font = `${testSize} ${fontFamily}`;
      return ctx.measureText(testString).width;
    };

    const baseWidths = {};
    baseFonts.forEach(font => {
      baseWidths[font] = getWidth(font);
    });

    const detectedFonts = testFonts.filter(font => {
      return baseFonts.some(baseFont => {
        return getWidth(`'${font}', ${baseFont}`) !== baseWidths[baseFont];
      });
    });

    data.fonts = {
      detected: detectedFonts,
      count: detectedFonts.length
    };
  } catch (e) {
    data.fonts = { error: e.message };
  }

  // Timezone
  data.timezone = {
    offset: new Date().getTimezoneOffset(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  // Storage
  data.storage = {
    localStorage: !!window.localStorage,
    sessionStorage: !!window.sessionStorage,
    indexedDB: !!window.indexedDB,
    cookiesEnabled: navigator.cookieEnabled
  };

  // Permissions
  try {
    if (navigator.permissions) {
      const permissions = ['geolocation', 'notifications', 'push', 'midi', 'camera', 'microphone'];
      const permissionStates = {};
      for (const perm of permissions) {
        try {
          const result = await navigator.permissions.query({ name: perm });
          permissionStates[perm] = result.state;
        } catch (e) {
          permissionStates[perm] = 'error';
        }
      }
      data.permissions = permissionStates;
    }
  } catch (e) {
    data.permissions = { error: e.message };
  }

  // Battery
  try {
    if (navigator.getBattery) {
      const battery = await navigator.getBattery();
      data.battery = {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    }
  } catch (e) {
    data.battery = { error: e.message };
  }

  // Connection
  if (navigator.connection) {
    data.connection = {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt,
      saveData: navigator.connection.saveData
    };
  }

  // Media devices
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const devices = await navigator.mediaDevices.enumerateDevices();
      data.mediaDevices = devices.map(d => ({
        kind: d.kind,
        deviceId: d.deviceId ? 'present' : 'absent',
        groupId: d.groupId ? 'present' : 'absent',
        label: d.label ? 'present' : 'absent'
      }));
    }
  } catch (e) {
    data.mediaDevices = { error: e.message };
  }

  // Speech synthesis voices
  try {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    data.speechVoices = voices.map(v => ({
      name: v.name,
      lang: v.lang,
      localService: v.localService,
      default: v.default
    }));
  } catch (e) {
    data.speechVoices = { error: e.message };
  }

  // Math constants fingerprint
  data.mathConstants = {
    e: Math.E,
    ln2: Math.LN2,
    ln10: Math.LN10,
    log2e: Math.LOG2E,
    log10e: Math.LOG10E,
    pi: Math.PI,
    sqrt1_2: Math.SQRT1_2,
    sqrt2: Math.SQRT2,
    // Test trigonometric precision
    sinTest: Math.sin(0.5),
    cosTest: Math.cos(0.5),
    tanTest: Math.tan(0.5),
    acosTest: Math.acos(0.5),
    asinTest: Math.asin(0.5),
    atanTest: Math.atan(0.5),
    expTest: Math.exp(1),
    logTest: Math.log(10),
    powTest: Math.pow(Math.PI, -100)
  };

  // Generate overall hash
  const dataString = JSON.stringify(data);
  data.hash = await hashString(dataString);

  return data;
}

function getUnmaskedInfo(gl, type) {
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    if (type === 'VENDOR') {
      return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    } else if (type === 'RENDERER') {
      return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    }
  }
  return null;
}

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Wait a bit for all APIs to be ready
setTimeout(collectFingerprint, 500);
