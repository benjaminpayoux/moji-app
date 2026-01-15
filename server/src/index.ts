import { createServer } from "http";
import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from "./socket/types.js";
import { initializeSocketHandlers } from "./socket/index.js";

const port = parseInt(process.env.PORT || "3001", 10);
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [];

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

initializeSocketHandlers(io);

httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Socket.IO server running on port ${port}`);
});
