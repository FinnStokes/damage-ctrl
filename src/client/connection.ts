import * as _O from "fp-ts/lib/Option.js";
import * as _E from "fp-ts/lib/Either.js";
import { pipe, identity } from "fp-ts/lib/function.js";
// import { WebSocket } from "ws";
import { heartbeatInterval, maxLatency, port } from "../networking.js";
import {
    Error,
    ErrorCodec,
    extractJson,
    JoinGame,
    JoinGameCodec,
    LeaveGame,
    LeaveGameCodec,
} from "../parsing.js";

export type Connection = {
    inGame: boolean,
    socket?: WebSocket,
    pingTimeout?: NodeJS.Timeout,
}

export const disconnected: Connection = {
    inGame: false,
};

export const connect = (update: (updater: (old: Connection) => Connection) => void): Connection => {
    const socket = new WebSocket(`ws://localhost:${port}`);

    socket.addEventListener("open", () => {
        socket.addEventListener("message", (data) => {
            const handled = pipe(
                data.toString(),
                extractJson,
                _O.map(ErrorCodec.decode),
                _O.chain(_O.fromEither),
                _O.map((error) => { console.error(`Error: ${error.error}`); }),
                _O.isSome,
            );
            if (!handled) {
                console.error("Unhandled message");
                console.info(data.toString());
                socket.send(JSON.stringify(ErrorCodec.encode({message: 'error', error: 'unhandled_message'})));
            }
        });
    });


    const heartbeat = (connection: Connection): Connection => {
        clearTimeout(connection.pingTimeout);
    
        // Delay should be equal to the interval at which your server
        // sends out pings plus a conservative assumption of the latency.
        const pingTimeout = setTimeout(() => {
            update(disconnect);
        }, heartbeatInterval + maxLatency);

        return {
            ...connection,
            pingTimeout,
        }
    }

    socket.addEventListener('open', () => update(heartbeat));
    socket.addEventListener('ping', () => update(heartbeat));
    socket.addEventListener('close', () => update((connection) => {
      clearTimeout(connection.pingTimeout);
      return {
        ...connection,
        pingTimeout: undefined,
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
