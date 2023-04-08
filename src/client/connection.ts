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
    url: string, codec: Type<A, unknown, unknown>, timeout: number,
    onError: () => _O.Option<A>, onMessage: (message: A) => _O.Option<A>
): ((message: A) => void) => {
    const [socket, setSocket] = useState<_O.Option<WebSocket>>(_O.none);

    const [pingTimeout, setPingTimeout] = useState<_O.Option<NodeJS.Timeout>>(_O.none);

    // const socket = useMemo(() => new WebSocket(url), [url]);

    const close = useCallback(() => {
        console.log("close")
        pipe(
            pingTimeout,
            _O.map(clearTimeout),
        );
        setSocket(_O.none);
    }, [pingTimeout, setSocket]);

    const heartbeat = useCallback(() => {
        pipe(
            pingTimeout,
            _O.map(clearTimeout),
        );
    
        setPingTimeout(_O.some(setTimeout(() => {
            console.error("Lost connection to server");
            disconnect();
        }, timeout)));
    }, [pingTimeout, timeout]);

    const handleMessage = useCallback((data: MessageEvent) => {
        pipe(
            data.data,
            extractJson,
            _O.map(codec.decode),
            _O.chain(_O.fromEither),
            _O.match(
                onError,
                onMessage,
            ),
            _O.map((reply) => pipe(
                socket,
                _O.map((socket) => socket.send(JSON.stringify(codec.encode(reply)))),
            )),
        );
        heartbeat();
    }, [socket, onError, onMessage, heartbeat]);

    const connect = useCallback(() => {
        console.log("connect");
        const newSocket = new WebSocket(url);
   
        newSocket.addEventListener("open", heartbeat);
        newSocket.addEventListener("message", handleMessage);
        newSocket.addEventListener('close', close);

        return newSocket;
    }, [url, heartbeat, handleMessage, close]);

    const disconnect = useCallback(() => {
        console.log("disconnect");
        pipe(
            socket,
            _O.map((socket) => {socket.close()}),
        )
    }, [socket]);

    useEffect(() => {
        const socket = connect();
        setSocket(_O.some(socket));
        return () => {
            console.log("disconnect");
            socket.close();
            setSocket(_O.none);
        };
    }, [connect, setSocket]);

    const sendMessage = useCallback((message: A) => {
        console.debug(message);
        console.debug(socket);
        pipe(
            socket,
            _O.map((socket) => socket.send(JSON.stringify(codec.encode( message )))),
        );
    }, [socket, codec])

    return sendMessage;
}
