import express from "express";
import * as _O from "fp-ts/lib/Option.js";
import * as _E from "fp-ts/lib/Either.js";
import { pipe, identity } from "fp-ts/lib/function.js";
import { createServer } from "http";
import { heartbeatInterval } from "./networking.js";
import {
    Error,
    ErrorCodec,
    extractJson,
    JoinGame,
    JoinGameCodec,
    LeaveGame,
    LeaveGameCodec,
} from "./parsing.js";
import { RawData, WebSocketServer, WebSocket } from "ws";
  
const app = express();

const port = process.env.PORT;

const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

const websocketServer = new WebSocketServer({ server });

type Connection = {
    socket: WebSocket,
    isAlive: boolean,
    messageListener?: (data: RawData) => boolean,
    terminate?: () => void,
}

type Player = {
    activeConnection?: Connection,
}

const players: Record<string, Player> = {};

const newPlayer = (connection: Connection): Player => { return { activeConnection: connection } };

const joinGame = (connection: Connection) => (event: JoinGame) => {
    const username = event.username;
    if ( !username ) {
        connection.socket.send(JSON.stringify(ErrorCodec.encode( { message: "error", error: "blank_username" } )));
        return;
    }
    pipe(
        players[username],
        _O.fromNullable,
        _O.match(
            () => {
                const player = newPlayer(connection);
                players[username] = player;
                console.log(`Player ${username} joined game`);
                return _O.some(player);
            },
            (player) => {
                return pipe(
                    player.activeConnection,
                    _O.fromNullable,
                    _O.match(
                        () => {
                            player.activeConnection = connection;
                            console.log(`Player ${username} rejoined game`);
                            return _O.some(player);
                        },
                        (_) => {
                            connection.socket.send(JSON.stringify(ErrorCodec.encode( { message: "error", error: "username_in_use" } )));
                            return _O.none;
                        },
                    )
                );
            },
        ),
        _O.map((player) => {
            connection.messageListener = (data: RawData): boolean => {
                return (
                    pipe(
                        data.toString(),
                        extractJson,
                        _O.map(LeaveGameCodec.decode),
                        _O.chain(_O.fromEither),
                        _O.map(leaveGame(player, connection, username)),
                        _O.isSome,
                    )
                    || pipe(
                        data.toString(),
                        extractJson,
                        _O.map(ErrorCodec.decode),
                        _O.chain(_O.fromEither),
                        _O.map(logError(username)),
                        _O.isSome,
                    )
                );
            };
            connection.terminate = () => {
                leaveGame(player, connection, username)({ message: "leave_game" })
            };
        }),
    )
}

const leaveGame = (player: Player, connection: Connection, username: string) => (event: LeaveGame) => {
    console.log(`Player ${username} left game`);
    connection.messageListener = undefined;
    connection.terminate = undefined;
    player.activeConnection = undefined;
}

const logError = (username: string) => (event: Error) => {
    console.error(`User ${username} returned error: ${event.error}`)
}

const heartbeat = (connection: Connection) => () => {
    connection.isAlive = true;
}

websocketServer.on("connection", (socket) => {
    const connection: Connection = { socket: socket, isAlive: true };

    socket.on('error', console.error);

    socket.on('pong', heartbeat(connection))

    socket.on('message', (data) => {
        const handled = pipe(
            data.toString(),
            extractJson,
            _O.map(JoinGameCodec.decode),
            _O.chain(_O.fromEither),
            _O.map(joinGame(connection)),
            _O.isSome,
        )
        || pipe(
            connection.messageListener,
            _O.fromNullable,
            _O.map((listener) => listener(data)),
            _O.getOrElse(() => false),
        );
        if (!handled) {
            console.error("Unhandled message");
            console.info(data.toString());
            socket.send(JSON.stringify(ErrorCodec.encode({message: 'error', error: 'unhandled_message'})));
        }
    });

    const interval = setInterval(() => {
        if (connection.isAlive === false) return socket.terminate();

        connection.isAlive = false;
        socket.ping();
    }, heartbeatInterval);
    
    socket.on('close', () => {
        clearInterval(interval);
        pipe(
            connection.terminate,
            _O.fromNullable,
            _O.map((terminate) => terminate()),
        );
    });
});
