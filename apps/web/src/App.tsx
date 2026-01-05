import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { NewChat } from "./components/NewChat";
import { ChatView } from "./components/ChatView";
import "./index.css";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/new" replace />} />
        <Route path="/new" element={<NewChat />} />
        <Route path="/chat/:chatId" element={<ChatView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
