"use client";

import { io } from "socket.io-client";

let socket;

export function getSocket() {
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("authToken");
  if (!token) return null;

  if (!socket) {
    socket = io("http://localhost:5050", {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
    });
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
