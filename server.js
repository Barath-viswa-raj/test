const express = require('express');
const fs = require('fs');
const https = require('https');
const app = express();
const server = https.createServer({
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
}, app);
const io = require('socket.io')(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});



const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join-room', (roomId) => {
        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        const peers = rooms.get(roomId);
        peers.add(socket.id);
        console.log(`User ${socket.id} joined room ${roomId}, peers:`, [...peers]);
        socket.join(roomId);
        socket.emit('room-joined', { roomId, peers: [...peers] });
    });

    socket.on('offer', ({ offer, roomId, targetId }) => {
        console.log(`Offer from ${socket.id} to ${targetId} in room ${roomId}`);
        socket.to(targetId).emit('offer', { offer, fromId: socket.id });
    });

    socket.on('answer', ({ answer, roomId, targetId }) => {
        console.log(`Answer from ${socket.id} to ${targetId} in room ${roomId}`);
        socket.to(targetId).emit('answer', { answer, fromId: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, roomId, targetId }) => {
        console.log(`ICE candidate from ${socket.id} to ${targetId} in room ${roomId}`);
        socket.to(targetId).emit('ice-candidate', { candidate, fromId: socket.id });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        rooms.forEach((peers, roomId) => {
            if (peers.has(socket.id)) {
                peers.delete(socket.id);
                if (peers.size === 0) {
                    rooms.delete(roomId);
                } else {
                    io.to(roomId).emit('peer-disconnected', socket.id);
                }
            }
        });
    });
});

server.listen(3000, () => {
    console.log('Server running on https://0.0.0.0:3000');
});