const express = require('express');
const fs = require('fs');
const https = require('https'); // use https instead of http
const { Server } = require('socket.io');

const app = express();

// Replace with your actual certificate and key paths
const sslOptions = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(sslOptions, app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => {
  res.send('WebRTC signaling server running on HTTPS');
});

// Room handling (same as before)
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());

    const peers = rooms.get(roomId);
    peers.add(socket.id);
    socket.join(roomId);

    socket.emit('room-joined', { roomId, peers: [...peers] });
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('offer', ({ offer, targetId }) => {
    socket.to(targetId).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', ({ answer, targetId }) => {
    socket.to(targetId).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, targetId }) => {
    socket.to(targetId).emit('ice-candidate', { candidate, from: socket.id });
  });

  socket.on('disconnect', () => {
    rooms.forEach((peers, roomId) => {
      if (peers.delete(socket.id)) {
        socket.to(roomId).emit('peer-disconnected', socket.id);
        if (peers.size === 0) rooms.delete(roomId);
      }
    });
  });
});

const PORT = process.env.PORT || 443;
server.listen(PORT, () => {
  console.log(`Server running on https://0.0.0.0:${PORT}`);
});
