import * as _O from "fp-ts/lib/Option.js";
import * as _E from "fp-ts/lib/Either.js";
import { pipe, identity } from "fp-ts/lib/function.js";
// import { WebSocket } from "ws";
import { heartbeatInterval, maxLatency, port } from "../networking.js";
import {
    ErrorCodec,
    PongCodec,
    JoinGameCodec,
    LeaveGameCodec,
    MessageCodec,
    extractJson,
} from "../parsing.js";

export type Connection = {
    inGame: boolean,
    socket?: WebSocket,
}

export const disconnected: Connection = {
    inGame: false,
};

let n = 0;

export const connect = (update: (updater: (old: Connection) => Connection) => void): Connection => {
    const socket = new WebSocket(`ws://localhost:${port}`);

    let pingTimeout: NodeJS.Timeout | undefined = undefined;

    const heartbeat = () => {
        clearTimeout(pingTimeout);
        n += 1;
        console.debug(`Heartbeat ${n}`);
        let beat = n;
    
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        pingTimeout = setTimeout(() => {
            console.error("Lost connection to server");
            console.debug(beat);
            update(disconnect);
        }, heartbeatInterval + maxLatency);

    }

    socket.addEventListener("open", () => {
        socket.addEventListener("message", (data) => {
            pipe(
                data.data,
                extractJson,
                _O.map(MessageCodec.decode),
                _O.chain(_O.fromEither),
                _O.match(
                    () => {
                        console.error("Malformed message");
                        console.info(data.data);
                        socket.send(JSON.stringify(ErrorCodec.encode({message: 'error', error: 'malformed_message'})));
                    },
                    (message) => {
                        switch (message.message) {
                            case "error": {
                                console.error(`Error: ${message.error}`)
                                break;
                            }
                            case "ping": {
                                console.info("Recieved ping");
                                heartbeat();
                                socket.send(JSON.stringify(PongCodec.encode({message: 'pong'})));
                                break;
                            }
                            default: {
                                console.error(`Unhandled message`);
                                console.info(data.data);
                                socket.send(JSON.stringify(ErrorCodec.encode({message: 'error', error: 'unhandled_message'})));
                                break;
                            }
                        }
                    
                    },
                ),
            );
        });

        heartbeat();
    });

    socket.addEventListener('close', () => update((connection) => {
      clearTimeout(pingTimeout);
      pingTimeout = undefined;
      return {
        ...connection,
        inGame: false,
      }
    }));

    return {
        inGame: false,
        socket,
    }
}

export const disconnect = (connection: Connection): Connection => {
    connection.socket?.close();
    return disconnected;
}

export const joinGame = (connection: Connection, username: string): Connection => {
    if ( connection.socket ) {
        connection.socket.send(JSON.stringify(JoinGameCodec.encode( { message: "join_game", username: username } )));
        return {
            ...connection,
            inGame: true,
        }
    } else {
        return connection;
    }
}

export const leaveGame = (connection: Connection): Connection => {
    connection.socket?.send(JSON.stringify(LeaveGameCodec.encode( { message: "leave_game" } )));
    return {
        ...connection,
        inGame: false,
    };
}
