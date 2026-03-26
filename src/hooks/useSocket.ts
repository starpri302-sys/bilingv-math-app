import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = (grade?: string, topic?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io(window.location.origin);
    setSocket(newSocket);

    if (grade || topic) {
      newSocket.emit('subscribe', { grade, topic });
    }

    return () => {
      newSocket.close();
    };
  }, [grade, topic]);

  return socket;
};
