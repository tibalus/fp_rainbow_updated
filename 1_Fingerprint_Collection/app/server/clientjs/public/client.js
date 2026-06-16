const socket = io();

function collectFingerprint() {
  const link = window.location.href;
  const id = link.slice(link.indexOf('#') + 1, link.length);
  console.log("ClientJS - UUID:", id);

  try {
    const client = new ClientJS();

    const result = {
      // Main fingerprint
      fingerprint: client.getFingerprint(),

      // Browser info
      browser: {
        name: client.getBrowser(),
        version: client.getBrowserVersion(),
        majorVersion: client.getBrowserMajorVersion(),
        engine: client.getEngine(),
        engineVersion: client.getEngineVersion()
      },

      // OS info
      os: {
        name: client.getOS(),
        version: client.getOSVersion()
      },

      // Device info
      device: {
        type: client.getDevice(),
        vendor: client.getDeviceVendor(),
        cpu: client.getCPU()
      },

      // Screen info
      screen: {
        resolution: client.getScreenPrint(),
        colorDepth: client.getColorDepth(),
        currentResolution: client.getCurrentResolution(),
        availableResolution: client.getAvailableResolution()
      },

      // Plugins
      plugins: client.getPlugins(),

      // Feature detection
      features: {
        isJava: client.isJava(),
        isFlash: client.isFlash(),
        isSilverlight: client.isSilverlight(),
        isMimeTypes: client.isMimeTypes(),
        mimeTypes: client.getMimeTypes(),
        isFont: client.isFont(),
        fonts: client.getFonts(),
        isLocalStorage: client.isLocalStorage(),
        isSessionStorage: client.isSessionStorage(),
        isCookie: client.isCookie()
      },

      // User agent info
      userAgent: {
        full: client.getUserAgent(),
        lowerCase: client.getUserAgentLowerCase()
      },

      // Canvas fingerprint
      canvas: client.getCanvasPrint(),

      // Timezone
      timezone: client.getTimeZone(),

      // Language
      language: client.getLanguage(),
      systemLanguage: client.getSystemLanguage(),

      // Mobile detection
      mobile: {
        isMobile: client.isMobile(),
        isMobileMajor: client.isMobileMajor(),
        isMobileAndroid: client.isMobileAndroid(),
        isMobileOpera: client.isMobileOpera(),
        isMobileWindows: client.isMobileWindows(),
        isMobileBlackBerry: client.isMobileBlackBerry(),
        isMobileIOS: client.isMobileIOS(),
        isIphone: client.isIphone(),
        isIpad: client.isIpad(),
        isIpod: client.isIpod()
      },

      // Metadata
      timestamp: new Date().toISOString(),
      library: "ClientJS",
      version: "0.2.1"
    };

    socket.emit("ecrireDansFichier", { id: id, result: result });
    console.log("ClientJS fingerprint sent:", result.fingerprint);
  } catch (error) {
    console.error("ClientJS error:", error);
    socket.emit("ecrireDansFichier", {
      id: id,
      result: { error: error.message, library: "ClientJS" }
    });
  }
}

collectFingerprint();
