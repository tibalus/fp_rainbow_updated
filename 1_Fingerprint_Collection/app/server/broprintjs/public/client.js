// Broprint.js - Minimalist fingerprinting focusing on Canvas and Audio
// Based on the Broprint.js methodology

const socket = io();

async function collectFingerprint() {
  const link = window.location.href;
  const id = link.slice(link.indexOf('#') + 1, link.length);
  console.log("Broprint.js - UUID:", id);

  try {
    const result = {
      canvas: await getCanvasFingerprint(),
      audio: await getAudioFingerprint(),
      webglCanvas: await getWebGLCanvasFingerprint(),
      timestamp: new Date().toISOString(),
      library: "Broprint.js",
      version: "custom"
    };

    // Combined fingerprint hash
    const combined = JSON.stringify({
      canvas: result.canvas.hash,
      audio: result.audio.hash,
      webgl: result.webglCanvas.hash
    });
    result.combinedHash = await hashString(combined);

    socket.emit("ecrireDansFichier", { id: id, result: result });
    console.log("Broprint.js fingerprint sent:", result.combinedHash);
  } catch (error) {
    console.error("Broprint.js error:", error);
    socket.emit("ecrireDansFichier", {
      id: id,
      result: { error: error.message, library: "Broprint.js" }
    });
  }
}

async function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext('2d');

    // Draw complex shapes for fingerprinting
    ctx.fillStyle = 'rgb(255, 102, 0)';
    ctx.fillRect(100, 1, 62, 20);

    ctx.fillStyle = 'rgb(0, 102, 153)';
    ctx.font = '14px Arial';
    ctx.fillText('Broprint.js Canvas FP', 2, 15);

    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.font = '18px Times New Roman';
    ctx.fillText('Canvas Test', 4, 45);

    // Add a bezier curve
    ctx.beginPath();
    ctx.moveTo(170, 30);
    ctx.bezierCurveTo(180, 10, 220, 50, 240, 30);
    ctx.strokeStyle = 'rgb(153, 51, 255)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add an arc
    ctx.beginPath();
    ctx.arc(250, 30, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 0, 128, 0.5)';
    ctx.fill();

    // Add gradient
    const gradient = ctx.createLinearGradient(0, 50, 100, 60);
    gradient.addColorStop(0, 'red');
    gradient.addColorStop(0.5, 'green');
    gradient.addColorStop(1, 'blue');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 50, 100, 10);

    const dataURL = canvas.toDataURL();
    const hash = await hashString(dataURL);

    return {
      dataURL: dataURL,
      hash: hash,
      width: canvas.width,
      height: canvas.height
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function getAudioFingerprint() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return { error: 'AudioContext not supported' };
    }

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gainNode = context.createGain();
    const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

    // Setup oscillator
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(10000, context.currentTime);

    // Setup gain
    gainNode.gain.setValueAtTime(0, context.currentTime);

    // Connect nodes
    oscillator.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(gainNode);
    gainNode.connect(context.destination);

    // Collect audio data
    const audioData = [];
    let collected = false;

    return new Promise((resolve) => {
      scriptProcessor.onaudioprocess = function(event) {
        if (!collected) {
          const inputData = event.inputBuffer.getChannelData(0);
          const sum = inputData.reduce((acc, val) => acc + Math.abs(val), 0);
          audioData.push(sum);

          if (audioData.length >= 5) {
            collected = true;
            oscillator.stop();
            context.close();

            const audioString = audioData.map(v => v.toFixed(10)).join(',');
            hashString(audioString).then(hash => {
              resolve({
                sampleRate: context.sampleRate,
                channelCount: context.destination.channelCount,
                maxChannelCount: context.destination.maxChannelCount,
                audioDataSamples: audioData.slice(0, 5),
                hash: hash
              });
            });
          }
        }
      };

      oscillator.start();

      // Timeout fallback
      setTimeout(() => {
        if (!collected) {
          collected = true;
          try {
            oscillator.stop();
            context.close();
          } catch (e) {}
          resolve({
            sampleRate: context.sampleRate,
            channelCount: context.destination.channelCount,
            maxChannelCount: context.destination.maxChannelCount,
            audioDataSamples: audioData,
            hash: 'timeout',
            error: 'Collection timeout'
          });
        }
      }, 1000);
    });
  } catch (e) {
    return { error: e.message };
  }
}

async function getWebGLCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
      return { error: 'WebGL not supported' };
    }

    // Get WebGL parameters
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    const params = {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      unmaskedVendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
      unmaskedRenderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxViewportDims: Array.from(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
      maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      redBits: gl.getParameter(gl.RED_BITS),
      greenBits: gl.getParameter(gl.GREEN_BITS),
      blueBits: gl.getParameter(gl.BLUE_BITS),
      alphaBits: gl.getParameter(gl.ALPHA_BITS),
      depthBits: gl.getParameter(gl.DEPTH_BITS),
      stencilBits: gl.getParameter(gl.STENCIL_BITS),
      aliasedLineWidthRange: Array.from(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)),
      aliasedPointSizeRange: Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
      extensions: gl.getSupportedExtensions()
    };

    // Draw something to create a WebGL canvas fingerprint
    gl.clearColor(0.2, 0.4, 0.6, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Create a simple triangle
    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0, 1);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      void main() {
        gl_FragColor = vec4(1, 0.5, 0.2, 1);
      }
    `;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 0.5,
      -0.5, -0.5,
      0.5, -0.5
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    const dataURL = canvas.toDataURL();
    const hash = await hashString(dataURL + JSON.stringify(params));

    return {
      parameters: params,
      canvasDataURL: dataURL,
      hash: hash
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Wait a bit for audio context
setTimeout(collectFingerprint, 300);
