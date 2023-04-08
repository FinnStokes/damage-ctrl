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
    PongCodec,
    Message,
    MessageCodec,
    PingCodec,
} from "./parsing.js";
import { WebSocketServer, WebSocket } from "ws";
  
const app = express();

const port = process.env.PORT;

const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

const websocketServer = new WebSocketServer({ server });

type Connection = {
    socket: WebSocket,
    isAlive: boolean,
    messageListener?: (message: Message) => boolean,
    terminate?: () => void,
}

type Player = {
    activeConnection?: Connection,
}

const players: Record<string, Player> = {};

const newPlayer = (connection: Connection): Player => { return { activeConnection: connection } };

const joinGame = (connection: Connection, event: JoinGame) => {
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
            connection.messageListener = (message: Message): boolean => {
                switch (message.message) {
                    case "leave_game": {
                        leaveGame(player, connection, username);
                        return true;
                    }
                    case "error": {
                        logError(username, message);
                        return true;
                    }
                    default: {
                        return false;
                    }
                }
            };
            connection.terminate = () => {
                leaveGame(player, connection, username);
            };
        }),
    )
}

const leaveGame = (player: Player, connection: Connection, username: string) => {
    console.log(`Player ${username} left game`);
    connection.messageListener = undefined;
    connection.terminate = undefined;
    player.activeConnection = undefined;
}

const logError = (username: string, event: Error) => {
    console.error(
        username ? `User ${username} returned error: ${event.error}` : `Unnamed user returned error: ${event.error}`
    )
}

const heartbeat = (connection: Connection) => {
    console.info("Heartbeat");
    connection.isAlive = true;
}

websocketServer.on("connection", (socket) => {
    const connection: Connection = { socket: socket, isAlive: true };

    socket.on('error', console.error);

    socket.on('message', (data) => {
        pipe(
            data.toString(),
            extractJson,
            _O.map(MessageCodec.decode),
            _O.chain(_O.fromEither),
            _O.match(
                () => {
                    console.error("Malformed message");
                    console.info(data.toString());
                    socket.send(JSON.stringify(ErrorCodec.encode({message: 'error', error: 'malformed_message'})));
                },
                (message) => {
                    if ( pipe(
                        connection.messageListener,
                        _O.fromNullable,
                        _O.map((listener) => listener(message)),
                        _O.getOrElse(() => false),
                    ) ) {
                        return;
                    }
                    switch ( message.message ) {
                        case "join_game": {
                            joinGame(connection, message);
                            break;
                        }
                        case "ping": {
                            connection.socket.send(JSON.stringify(PongCodec.encode({message: 'pong'})));
                            break;
                        }
                        case "pong": {
                            heartbeat(connection);
                            break;
                        }
                        case "error": {
                            logError("", message);
                            break;
                        }
                        default: {
                            console.error("Unhandled message");
                            console.info(data.toString());
                            socket.send(JSON.stringify(ErrorCodec.encode({message: 'error', error: 'unhandled_message'})));
                            break;
                        }
                    }
                },
            )
        );
    });

    const interval = setInterval(() => {
        if (connection.isAlive === false) {
            console.error("Lost connection to client")
            return socket.terminate();
        }

        connection.isAlive = false;
        console.info("Pinging client");
        socket.send(JSON.stringify(PingCodec.encode({message: 'ping'})));
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
