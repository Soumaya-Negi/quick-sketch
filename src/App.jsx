import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Game from "./pages/Game";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;