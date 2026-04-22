import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
  }
  return socket;
};

export const connectSocket = (token: string): Socket => {
  const s = getSocket();

  // Update auth before connecting
  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }

  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const reconnectSocket = (token: string): void => {
  if (socket) {
    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }
  }
};

// ─── Event name constants ────────────────────────────────────────────────────

export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Passenger events
  REQUEST_RIDE: 'ride:request',
  CANCEL_RIDE: 'ride:cancel',
  ACCEPT_OFFER: 'offer:accept',
  REJECT_OFFER: 'offer:reject',
  COUNTER_OFFER: 'offer:counter',

  // Driver events
  DRIVER_ONLINE: 'driver:online',
  DRIVER_OFFLINE: 'driver:offline',
  DRIVER_LOCATION: 'driver:location',
  SUBMIT_OFFER: 'offer:submit',
  ACCEPT_TRIP: 'trip:accept',

  // Shared events
  OFFER_RECEIVED: 'offer:received',
  OFFER_UPDATED: 'offer:updated',
  OFFER_EXPIRED: 'offer:expired',
  TRIP_UPDATED: 'trip:updated',
  DRIVER_ARRIVED: 'driver:arrived',
  TRIP_STARTED: 'trip:started',
  TRIP_COMPLETED: 'trip:completed',
  TRIP_CANCELLED: 'trip:cancelled',

  // Location updates
  LOCATION_UPDATE: 'location:update',

  // Notifications
  NOTIFICATION: 'notification',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
