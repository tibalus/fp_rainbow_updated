const express = require("express");
const socket = require("socket.io");
const fs = require('fs');

const PORT = 5001;
const app = express();

const server = app.listen(PORT, function () {
  console.log(`ThumbmarkJS server listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

app.use(express.static("public"));

const io = socket(server);

io.on("connection", function (socket) {
  socket.on("ecrireDansFichier", function(data) {
    console.log("ThumbmarkJS fingerprint received:", data.id);
    fs.writeFileSync("./data/" + data.id + '.json', JSON.stringify(data.result, null, 2), 'utf-8');
  });
});
