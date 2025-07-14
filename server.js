const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const userRooms = {};

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  socket.on('join', room => {
    socket.join(room);
    userRooms[socket.id] = room;
    // Send all other users in the room to the new user
    const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room) || []).filter(id => id !== socket.id);
    console.log(`[JOIN] User ${socket.id} joined room: ${room}`);
    console.log(`[JOIN] Users in room now:`, Array.from(io.sockets.adapter.rooms.get(room) || []));
    console.log(`[JOIN] Emitting all-users to ${socket.id}:`, usersInRoom);
    socket.emit('all-users', usersInRoom);
    // Notify others in the room
    socket.to(room).emit('user-joined', socket.id);
    console.log(`[JOIN] Emitting user-joined to room ${room} (except ${socket.id})`);
    // Emit user count to all in the room
    const userCount = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('user-count', userCount);
  });

  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnecting', () => {
    const room = userRooms[socket.id];
    if (room) {
      socket.to(room).emit('user-left', socket.id);
      setTimeout(() => {
        const userCount = io.sockets.adapter.rooms.get(room)?.size || 0;
        io.to(room).emit('user-count', userCount);
      }, 100);
      delete userRooms[socket.id];
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5000, () => console.log('Signaling server running on port 5000')); 