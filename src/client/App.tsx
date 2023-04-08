import * as _O from "fp-ts/lib/Option.js";
import { useCallback, useState } from 'react'
import './App.css'
import { useWebsocket } from './websocket.js'
import { Message, MessageCodec } from '../parsing.js'
import { heartbeatInterval, maxLatency, port } from "../config.js";

const wsUrl = `ws://localhost:${port}`;
const wsTimeout = heartbeatInterval + maxLatency;

const App = () => {
  const [username, setUsername] = useState("");
  const [inGame, setInGame] = useState(false);

  const onError = useCallback(() => {
    console.error("Malformed message");
    return _O.some({message: 'error', error: 'malformed_message'} as const);
  }, [])
  const onMessage = useCallback((message: Message) => {
    switch (message.message) {
        case "error": {
            console.error(`Error: ${message.error}`)
            return _O.none;
        }
        case "ping": {
            console.info("Recieved ping");
            return _O.some({message: 'pong'} as const);
        }
        default: {
            console.error(`Unhandled message`);
            return _O.some({message: 'error', error: 'unhandled_message'} as const);
        }
    }
  }, [])
  
  const sendMessage = useWebsocket(
    wsUrl,
    MessageCodec,
    wsTimeout,
    heartbeatInterval,
    onError,
    onMessage,
  );

  const joinGame = useCallback((username: string) => {
    sendMessage({message: "join_game", username})
    setInGame(true);
  }, [sendMessage, setInGame]);

  const leaveGame = useCallback(() => {
    sendMessage({message: "leave_game"})
    setInGame(false);
  }, [sendMessage, setInGame]);

  const message = () => {
    if (!username) {
      return (
        <p>Enter your username</p>
      );
    } else {
      return (
        <p>Welcome, {username}!</p>
      );
    }
  }

  const button = () => {
    if ( !username ) {
      return (
        <button disabled>
          Join Game
        </button>
      )
    } else if ( !inGame ) {
      return (
        <button onClick={() => joinGame(username)}>
          Join Game
        </button>
      )
    } else {
      return (
        <button onClick={() => leaveGame()}>
          Leave Game
        </button>
      )
    }
  };

  return (
    <div className="App">
      <div className="card">
        <input type="text" onChange={(event) => setUsername(event.target.value)} />
        {message()}
        {button()}
      </div>
    </div>
  )
}

export default App
