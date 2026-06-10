import { useLocation, useParams, useNavigate } from "react-router-dom";
import styles from "./Room.module.css";
import { useState, useEffect } from "react";

export default function Room() {
  const [roomData, setRoomData] = useState(null);
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name || "Guest";

  const startGame = async () => {

    await fetch("http://localhost:3000/start-game", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId
      })
    });

  };
  const fetchRoomData = async () => {

    const response = await fetch(
      `http://localhost:3000/room/${roomId}`, { method: "GET" }
    );

    const data = await response.json();

    setRoomData(data);

    if (data.gameStarted) {
      navigate(`/game/${roomId}`, {
        state: { name }
      });
    }
  };
  useEffect(() => {

    fetchRoomData();

    const interval = setInterval(() => {
      fetchRoomData();
    }, 2000);

    return () => clearInterval(interval);

  }, []);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Lobby</h2>
      <p className={styles.roomCode}>Room: {roomId}</p>
      <p className={styles.playerName}>Playing as: {name}</p>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Players</p>
        <div className={styles.playerList}>

          {roomData?.players.map((player) => (

            <div className={styles.playerSlot} key={player}>
              <div className={styles.playerAvatar}>
                {player.charAt(0).toUpperCase()}
              </div>
              <span className={styles.playerSlotName}>
                {player}
              </span>
            </div>
          ))}
          <p className={styles.waitingText}>
            Waiting for others to join...
          </p>
        </div>
      </div>
    
      {
        roomData?.host === name && (
          <button className={styles.button} onClick={startGame}>
            Start Game
          </button>
        )
      }
    </div>
  );
}