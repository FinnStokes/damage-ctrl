import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { disconnected, connect, disconnect, joinGame, leaveGame } from './connection.js'

const App = () => {
  const [username, setUsername] = useState("");

  const [connection, setConnection] = useState(disconnected);

  useEffect(() => {
    setConnection(connect(setConnection));
    return () => setConnection(disconnect)
  }, []);

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
    } else if ( !connection.inGame ) {
      return (
        <button onClick={() => setConnection(joinGame(connection, username))}>
          Join Game
        </button>
      )
    } else {
      return (
        <button onClick={() => setConnection(leaveGame(connection))}>
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
