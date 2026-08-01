import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";


const app = express();

const httpServer = createServer(app);
const rooms = {};
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    console.log("default response")
    next();
});

const startNextTurn = (room) => {
    room.guessedPlayers = [];

    room.turnEndsAt = Date.now() + 60000;

    const currentIndex = room.players.indexOf(room.currentDrawer);

    const nextIndex = (currentIndex + 1) % room.players.length;

    if (nextIndex === 0 && room.currentDrawer !== null) {
        room.round += 1;
    }

    if (room.round > room.maxRounds) {

        room.gameEnded = true;

        return;
    }

    room.currentDrawer = room.players[nextIndex];

    const words = [
        "apple",
        "banana",
        "captain america",
        "wonder woman",
        "leaf", "guitar"
    ]
    const randomWord = words[Math.floor(Math.random() * words.length)];

    room.currentWord = randomWord;

}
app.post("/create-room", (req, res) => {
    console.log(req.body.name)
    const newRoom = Math.random().toString(36).substring(2, 7);
    console.log(newRoom)

    rooms[newRoom] = {
        players: [req.body.name],
        messages: [],
        host: req.body.name,
        gameStarted: false,
        currentDrawer: null,
        currentWord: "",
        scores: {
            [req.body.name]: 0
        },
        guessedPlayers: [],
        turnEndsAt: null,
        round: 1,
        maxRounds: 3,
        gameEnded: false,
    }

    res.json({
        roomId: newRoom
    });
});

app.post("/join-room", (req, res) => {
    console.log(req.body.roomCode)
    const room = rooms[req.body.roomCode];

    if (!room) {
        return res.status(404).json({
            message: "Room not found",
            success: false
        });
    }
    if (room.players.includes(req.body.name)) {
        return res.status(404).json({
            success: false,
            message: "name already taken"
        });
    }

    room.players.push(req.body.name);
    room.scores[req.body.name] = 0;

    res.json({ success: true });
});

app.post("/start-game", (req, res) => {
    const { roomId } = req.body;
    const room = rooms[roomId];

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }
    
    room.gameStarted = true;

    startNextTurn(room);

    res.json({ success: true });
});


app.post("/send-message", (req, res) => {
    console.log(req.body.author)
    console.log(req.body.text)

    const { roomId, author, text } = req.body;
    const room = rooms[roomId];
    // if room not found say this msg for future proffing 
    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    //block the drawer from guessing
    if (author === room.currentDrawer) {
        return res.json({ success: false, message: "Drawer cannot guess" });
    }

    //block if already guessed correctly
    if (room.guessedPlayers.includes(author)) {
        return res.json({ success: false, message: "Already guessed" });
    }

    if (text.trim().toLowerCase() === room.currentWord.toLowerCase()) {
        //guesser gets 100 pts, drawer gets 20 pts
        room.scores[author] += 100;
        room.scores[room.currentDrawer] += 20;

        room.guessedPlayers.push(author);
        if (
            room.guessedPlayers.length ===
            room.players.length - 1
        ) {

            startNextTurn(room);

        }

        room.messages.push({
            author: "SYSTEM",
            text: `${author} guessed the word!`
        });
    } else {
        room.messages.push({
            author,
            text
        });
    }

    res.json({ success: true });
});

app.post("/next-turn", (req, res) => {

    const { roomId } = req.body;

    const room = rooms[roomId];

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    startNextTurn(room);

    res.json({
        success: true
    });

});



app.get("/room/:roomId", (req, res) => {
    const { roomId } = req.params;
    const room = rooms[roomId];

    if (!room) {
        return res.status(404).json({ message: "Room not found" });
    }

    res.json(room);
});

app.post("/restart-game", (req, res) => {

    const { roomId } = req.body;

    const room = rooms[roomId];

    if (!room) {
        return res.status(404).json({
            success: false,
            message: "Room not found"
        });
    }

    room.messages = [];

    room.gameEnded = false;

    room.round = 1;

    room.guessedPlayers = [];

    for (const player of room.players) {
        room.scores[player] = 0;
    }

    room.currentDrawer = null;

    startNextTurn(room);

    res.json({
        success: true
    });

});

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173"
    }
});

io.on("connection", (socket) => {

    console.log("user connected");

    socket.on("join-room", (roomId) => {

        socket.join(roomId);

    });

    socket.on("draw", (data) => {

        socket.to(data.roomId).emit("draw", data);

    });
    socket.on("clear-canvas", (roomId) => {

        socket.to(roomId).emit("clear-canvas");

    });
    socket.on("start-drawing", (data) => {

        socket.to(data.roomId)
            .emit("start-drawing", data);

    });

});

httpServer.listen(3000, () => {
    console.log(`server started on port ${PORT}`);
});
