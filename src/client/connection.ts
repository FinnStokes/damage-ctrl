import * as _O from "fp-ts/lib/Option.js";
import * as _E from "fp-ts/lib/Either.js";
import { pipe } from "fp-ts/lib/function.js";
// import { WebSocket } from "ws";
import { extractJson } from "../parsing.js";
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Type } from "io-ts";

export type Connection = {
    inGame: boolean,
    socket?: WebSocket,
}

export const disconnected: Connection = {
    inGame: false,
};

export const useWebsocket = <A>(
    url: string, codec: Type<A, unknown, unknown>, timeout: number, retry_time: number,
    onError: () => _O.Option<A>, onMessage: (message: A) => _O.Option<A>
): ((message: A) => void) => {
    const [socket, setSocket] = useState<_O.Option<WebSocket>>(_O.none);
    const [reconnect, setReconnect] = useState(false);

    useEffect(() => {
        if ( reconnect ) {
            let reconnectTimeout = setTimeout(() => {
                console.info("Reconnecting");
                setReconnect(false);
            }, retry_time);
            return () => {
                clearTimeout(reconnectTimeout);
            };
        } else {
            const newSocket = new WebSocket(url);

            let pingTimeout: _O.Option<NodeJS.Timeout> = _O.none;
            let active = true;

            const close = () => {
                if (active) {
                    setReconnect(true);
                }
            };

            const heartbeat = () => {
                if (active) {
                    pipe(
                        pingTimeout,
                        _O.map(clearTimeout),
                    );
    
                    pingTimeout = _O.some(setTimeout(() => {
                        console.error("Lost connection to server");
                        close();
                    }, timeout));
                }
            };

            const handleMessage = (data: MessageEvent) => {
                if (active) {
                    pipe(
                        data.data,
                        extractJson,
                        _O.map(codec.decode),
                        _O.chain(_O.fromEither),
                        _O.match(
                            onError,
                            onMessage,
                        ),
                        _O.map((reply) => newSocket.send(JSON.stringify(codec.encode(reply)))),
                    );
                    heartbeat();
                }
            };
   
            newSocket.addEventListener("open", heartbeat);
            newSocket.addEventListener("message", handleMessage);
            newSocket.addEventListener('close', close);

            setSocket(_O.some(newSocket));

            return () => {
                pipe(
                    pingTimeout,
                    _O.map(clearTimeout),
                );
                active = false;
                newSocket.close();
                setSocket(_O.none);
            };
        }
    }, [reconnect, setReconnect, setSocket, url, codec, timeout, onError, onMessage]);

    const sendMessage = useCallback((message: A) => {
        pipe(
            socket,
            _O.map((socket) => socket.send(JSON.stringify(codec.encode( message )))),
        );
    }, [socket, codec])

    return sendMessage;
}
