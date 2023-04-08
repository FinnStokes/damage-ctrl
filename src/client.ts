import * as _O from "fp-ts/lib/Option.js";
import * as _E from "fp-ts/lib/Either.js";
import { pipe, identity } from "fp-ts/lib/function.js";
import { WebSocket } from "ws";
import { heartbeatInterval, maxLatency } from "./config.js";
import {
    Error,
    ErrorCodec,
    extractJson,
    JoinGame,
    JoinGameCodec,
    LeaveGame,
    LeaveGameCodec,
} from "./parsing.js";

const port = process.env.PORT;
const username = "Digitalis";
const socket = new WebSocket(`ws://localhost:${port}`);

socket.on("open", () => {
    socket.on("message", (data) => {
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

    socket.send(JSON.stringify(JoinGameCodec.encode( { message: "join_game", username: username } )));
    // socket.send(JSON.stringify(LeaveGameCodec.encode( { message: "leave_game" } )));
});


let pingTimeout: NodeJS.Timeout | undefined = undefined;

const heartbeat = () => {
    clearTimeout(pingTimeout);
  
    // Use `WebSocket#terminate()`, which immediately destroys the connection,
    // instead of `WebSocket#close()`, which waits for the close timer.
    // Delay should be equal to the interval at which your server
    // sends out pings plus a conservative assumption of the latency.
    pingTimeout = setTimeout(() => {
        socket.terminate();
    }, heartbeatInterval + maxLatency);
}
  
  socket.on('open', heartbeat);
  socket.on('ping', heartbeat);
  socket.on('close', function clear() {
    clearTimeout(pingTimeout);
  });
