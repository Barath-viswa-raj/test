const express = require('express');
const http = require('http'); // use http instead of https
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // create http server
const io = new Server(server, {
  cors: {
    origin: '*', // allow all origins for testing, tighten later in production
    methods: ['GET', 'POST']
  }
});

app.get('/', (req, res) => {
  res.send('WebRTC signaling server is running');
});

// Store room info
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const peers = rooms.get(roomId);
    peers.add(socket.id);
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    // Send other users in the room
    socket.emit('room-joined', { roomId, peers: [...peers] });

    // Notify others
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
    console.log('User disconnected:', socket.id);
    rooms.forEach((peers, roomId) => {
      if (peers.delete(socket.id)) {
        socket.to(roomId).emit('peer-disconnected', socket.id);
        if (peers.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

// Use dynamic port for Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
