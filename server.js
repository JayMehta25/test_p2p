const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  socket.on('join', room => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
    socket.to(room).emit('peer-joined');
    // Emit user count to all in the room
    const userCount = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('user-count', userCount);
  });

  socket.on('signal', ({ room, data }) => {
    console.log(`Signal from ${socket.id} to room ${room}:`, data.sdp ? 'SDP' : 'ICE Candidate');
    socket.to(room).emit('signal', data);
  });

  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        setTimeout(() => {
          const userCount = io.sockets.adapter.rooms.get(room)?.size || 0;
          io.to(room).emit('user-count', userCount);
        }, 100); // Wait a bit for the room to update
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => console.log('Signaling server running on port 5000')); 