import io from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

let socket = null;

export const connectSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL);
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export const getSocket = () => {
    return socket || connectSocket();
};

export const onBinsUpdated = (callback) => {
    const sock = getSocket();
    sock.on('binsUpdated', callback);
};

export const offBinsUpdated = (callback) => {
    const sock = getSocket();
    sock.off('binsUpdated', callback);
};
