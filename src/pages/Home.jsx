import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Home.module.css";

export default function Home() {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const navigate = useNavigate();

  const createRoom = async () => {
    const response = await fetch("http://localhost:3000/create-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await response.json();
    console.log(data);
    navigate(`/room/${data.roomId}`, { state: { name } });
  };

  const joinRoom = async () => {
    if (!name.trim() || !roomCode.trim()) return alert("Fill all fields");
    const response = await fetch("http://localhost:3000/join-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, name }),
    });
    const data = await response.json();
    console.log(data);
    if (data.success) {
      navigate(`/room/${roomCode}`, { state: { name } });
    } else {
      alert("Invalid room code");
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Skribbl Clone</h1>

      <input
        className={styles.input}
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button className={styles.button} onClick={createRoom}>
        Create Room
      </button>

      <span className={styles.divider}>— or join existing —</span>

      <div className={styles.joinBox}>
        <input
          className={styles.input}
          type="text"
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />
        <button className={styles.button} onClick={joinRoom}>
          Join
        </button>
      </div>
    </div>            
  );
}