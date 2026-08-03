import { useParams, useLocation } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import styles from "./Game.module.css";
import { io } from "socket.io-client";

const COLORS = [
  "#000000", "#ffffff", "#e84040", "#ff8c42",
  "#ffd447", "#3dd68c", "#4f93ff", "#a855f7",
  "#ec4899", "#8b5e3c",
];

export default function Game() {
  const { roomId } = useParams();
  const location = useLocation();
  const name = location.state?.name || "Guest";
  const [roomData, setRoomData] = useState(null);
  const socketRef = useRef(null);
  const lastPointRef = useRef(null);
  const previousDrawerRef = useRef(null);

  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(4);
  const [guess, setGuess] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;
  // Keep canvas intrinsic size exactly in sync with its rendered size
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const ctx = canvas.getContext("2d");
        const imageData =
          canvas.width > 0 && canvas.height > 0
            ? ctx.getImageData(0, 0, canvas.width, canvas.height)
            : null;
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
        if (imageData) ctx.putImageData(imageData, 0, 0);
      }
    });

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // connects with socket server when game state loads
  useEffect(() => {

    socketRef.current = io(API_URL);

    socketRef.current.emit("join-room", roomId);

    return () => {
      socketRef.current.disconnect();
    };

  }, []);

  const fetchRoomData = async () => {
    const response = await fetch(`${API_URL}/room/${roomId}`, { method: "GET" });
    const data = await response.json();
    if (
      previousDrawerRef.current &&
      previousDrawerRef.current !== data.currentDrawer
    ) {

      const canvas = canvasRef.current;

      
      if (!canvas) return;

      getCtx().clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

    }

    previousDrawerRef.current = data.currentDrawer;
    setRoomData(data);
  };

  useEffect(() => {
    fetchRoomData();
    const interval = setInterval(fetchRoomData, 1000);
    return () => clearInterval(interval);
  }, []);

  const getCtx = () => canvasRef.current?.getContext("2d");

  const startDrawing = (e) => {
    const ctx = getCtx();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    setDrawing(true);
    lastPointRef.current = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };
    socketRef.current.emit("start-drawing", {
      roomId,
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY,
      color,
      lineWidth
    });
  };

  const draw = (e) => {

    if (!drawing) return;

    const ctx = getCtx();

    const currentPoint = {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    };


    if (!lastPointRef.current) return;
    ctx.beginPath();



    ctx.moveTo(
      lastPointRef.current.x,
      lastPointRef.current.y
    );

    ctx.lineTo(
      currentPoint.x,
      currentPoint.y
    );

    ctx.stroke();

    socketRef.current.emit("draw", {
      roomId,

      prevX: lastPointRef.current.x,
      prevY: lastPointRef.current.y,

      currentX: currentPoint.x,
      currentY: currentPoint.y,

      color,
      lineWidth
    });

    lastPointRef.current = currentPoint;

  };

  useEffect(() => {

    if (!socketRef.current) return;

    const handleDraw = (data) => {

      const ctx = getCtx();

      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();

      ctx.moveTo(
        data.prevX,
        data.prevY
      );

      ctx.lineTo(
        data.currentX,
        data.currentY
      );

      ctx.stroke();

    };

    socketRef.current.on(
      "draw",
      handleDraw
    );

    return () => {

      socketRef.current.off(
        "draw",
        handleDraw
      );

    };

  }, []);
  // listening to the draw events
  useEffect(() => {

    if (!socketRef.current) return;

    const handleStartDrawing = (data) => {

      const ctx = getCtx();

      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.lineWidth;

      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      ctx.beginPath();

      ctx.moveTo(data.x, data.y);
      ctx.lineTo(data.x + 0.1, data.y + 0.1);
      ctx.stroke();

    };

    socketRef.current.on(
      "start-drawing",
      handleStartDrawing
    );

    return () => {

      socketRef.current.off(
        "start-drawing",
        handleStartDrawing
      );

    };

  }, []);

  const stopDrawing = () => {
    setDrawing(false);
    lastPointRef.current = null;
  }
  // listens for canvas clear from other  players
  useEffect(() => {

    if (!socketRef.current) return;

    const handleClear = () => {

      const canvas = canvasRef.current;

      getCtx().clearRect(
        0,
        0,
        canvas.width,
        canvas.height
      );

    };

    socketRef.current.on(
      "clear-canvas",
      handleClear
    );

    return () => {
      socketRef.current.off(
        "clear-canvas",
        handleClear
      );
    };

  }, []);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    getCtx().clearRect(0, 0, canvas.width, canvas.height);

    socketRef.current.emit(
      "clear-canvas",
      roomId
    );
  };

  const sendGuess = async () => {
    if (!guess.trim()) return;
    const response = await fetch(`${API_URL}/send-message`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, author: name, text: guess })
      });
    const data = await response.json();
    setGuess("");
  };
  // showing the remaining time
  const timeLeft = roomData?.turnEndsAt
    ? Math.max(
      0,
      Math.floor(
        (roomData.turnEndsAt - Date.now()) / 1000
      )
    )
    : 0;

  useEffect(() => {

    if (
      timeLeft !== 0 ||
      roomData?.host !== name || roomData?.gameEnded
    ) return;

    fetch(`${API_URL}/next-turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomId
      })
    });

  }, [timeLeft]);



  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.roomLabel}>Room: {roomId}</h2>
          <span className={styles.playerBadge}>{name}</span>
        </div>
        <div className={styles.roundInfo}>
          <span className={styles.roundNumber}>Round {roomData?.round ?? 1}</span>
          <span className={styles.roundLabel}>of {roomData?.maxRounds ?? 3}</span>
        </div>
        <div className={styles.timer}>
          <span className={`${styles.timerNumber} ${timeLeft <= 10 ? styles.timerLow : ""}`}>
            {timeLeft}
          </span>
          <span className={styles.timerLabel}>sec</span>
        </div>

        <div className={styles.wordArea}>
          {
            roomData?.currentDrawer === name
              ? roomData?.currentWord
              : roomData?.currentWord
                ?.split("")
                .map((char) => {
                  if (char === " ") return "   ";
                  return "_";
                })
                .join("")
          }
        </div>
      </div>

      {/* Game area — all three columns must be children of this div */}
      <div className={styles.gameArea}>

        {/* Left: Player list */}
        <div className={styles.playerList}>
          <p className={styles.playerListTitle}>Players</p>
          {roomData?.players.map((player) => (
            <div
              className={styles.playerItem}
              style={roomData?.currentDrawer === player ? { borderColor: '#4f46e5', background: '#eeecfd' } : {}}
              key={player}
            >
              <div className={styles.playerAvatar}>
                {player.charAt(0).toUpperCase()}
              </div>
              <div className={styles.playerInfo}>
                <span className={styles.playerName}>
                  {player}
                  {roomData?.currentDrawer === player && " ✏️"}
                </span>
                <span className={styles.playerScore}>{roomData?.scores?.[player] ?? 0} pts</span>
              </div>
            </div>
          ))}
          {(!roomData || roomData.players.length < 2) && (
            <p className={styles.waitingText}>Waiting for others...</p>
          )}
        </div>

        {/* Middle: Canvas + toolbar */}
        <div className={styles.canvasColumn}>
          <div className={styles.canvasWrapper} ref={wrapperRef}>
            <canvas
              ref={canvasRef}
              className={styles.canvas}

              onMouseDown={
                roomData?.currentDrawer === name
                  ? startDrawing
                  : undefined
              }

              onMouseMove={
                roomData?.currentDrawer === name
                  ? draw
                  : undefined
              }

              onMouseUp={
                roomData?.currentDrawer === name
                  ? stopDrawing
                  : undefined
              }

              onMouseLeave={
                roomData?.currentDrawer === name
                  ? stopDrawing
                  : undefined
              }
            />
          </div>

          <div className={styles.toolbar}>
            <span className={styles.toolbarLabel}>Color</span>
            <div className={styles.colorSwatches}>
              {COLORS.map((c) => (
                <div
                  key={c}
                  className={`${styles.swatch} ${color === c ? styles.swatchActive : ""}`}
                  style={{ background: c, border: c === "#ffffff" ? "2px solid #555" : undefined }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <span className={styles.toolbarLabel}>Size</span>
            <input
              type="range"
              min={2}
              max={24}
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className={styles.sizeSlider}
            />
            <button className={styles.clearBtn} onClick={clearCanvas}>
              Clear
            </button>
          </div>
        </div>

        {/* Right: Chat */}
        <div className={styles.chat}>
          <p className={styles.chatTitle}>Guesses</p>
          <div className={styles.messages}>
            {roomData?.messages?.length === 0 ? (
              <span className={styles.messagePlaceholder}>No guesses yet...</span>
            ) : (
              roomData?.messages?.map((m, i) => (
                <p
                  key={i}
                  className={m.author === "SYSTEM" ? styles.systemMessage : styles.message}
                >
                  <strong>{m.author}</strong>: {m.text}
                </p>
              ))
            )}
          </div>
          <div className={styles.inputRow}>
            <input
              className={styles.input}
              type="text"
              placeholder="Your guess..."
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendGuess()}
            />
            <button className={styles.sendBtn} onClick={sendGuess}>→</button>
          </div>
        </div>

      </div>
      {
        roomData?.gameEnded && (

          <div className={styles.overlay}>

            <div className={styles.leaderboardModal}>

              <h1>🏆 Game Over</h1>

              {
                Object.entries(roomData.scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([player, score], index) => (

                    <div
                      key={player}
                      className={styles.leaderboardItem}
                    >

                      <span>
                        #{index + 1} {player}
                      </span>

                      <span>
                        {score} pts
                      </span>

                    </div>

                  ))
              }
              <button
                className={styles.restartBtn}
                onClick={async () => {

                  await fetch(
                    `${API_URL}/restart-game`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        roomId
                      })
                    }
                  );

                }}
              >
                Play Again
              </button>

            </div>

          </div>

        )
      }

    </div>
  );
}