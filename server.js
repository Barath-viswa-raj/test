
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

const rooms = new Map();

io.on('connection', socket => {
  console.log('Connected:', socket.id);

  socket.on('join-room', roomId => {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);
    socket.join(roomId);
    socket.emit('room-joined', { peers: [...rooms.get(roomId)] });
    socket.to(roomId).emit('user-joined', socket.id);
  });

  socket.on('offer', ({ offer, targetId }) => {
    io.to(targetId).emit('offer', { offer, fromId: socket.id });
  });

  socket.on('answer', ({ answer, targetId }) => {
    io.to(targetId).emit('answer', { answer, fromId: socket.id });
  });

  socket.on('ice-candidate', ({ candidate, targetId }) => {
    io.to(targetId).emit('ice-candidate', { candidate, fromId: socket.id });
  });

  socket.on('disconnect', () => {
    for (let [roomId, peers] of rooms) {
      if (peers.delete(socket.id)) {
        socket.to(roomId).emit('peer-disconnected', socket.id);
        if (peers.size === 0) rooms.delete(roomId);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Signaling server running on port ${PORT}`));
