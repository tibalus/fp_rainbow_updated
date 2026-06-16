const socket = io();

async function collectFingerprint() {
  const link = window.location.href;
  const id = link.slice(link.indexOf('#') + 1, link.length);
  console.log("ThumbmarkJS - UUID:", id);

  try {
    // Get the fingerprint hash
    const fingerprint = await ThumbmarkJS.getFingerprint();

    // Get detailed components
    const components = await ThumbmarkJS.getComponents();

    const result = {
      fingerprint: fingerprint,
      components: components,
      timestamp: new Date().toISOString(),
      library: "ThumbmarkJS",
      version: "0.14.7"
    };

    socket.emit("ecrireDansFichier", { id: id, result: result });
    console.log("ThumbmarkJS fingerprint sent:", fingerprint);
  } catch (error) {
    console.error("ThumbmarkJS error:", error);
    socket.emit("ecrireDansFichier", {
      id: id,
      result: { error: error.message, library: "ThumbmarkJS" }
    });
  }
}

collectFingerprint();
