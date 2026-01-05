import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function NewChat() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        throw new Error("Failed to save chat");
      }

      const { id } = await res.json();
      navigate(`/chat/${id}`);
    } catch (e) {
      setError("Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="new-chat">
      <div className="new-chat-header">
        <h1>Share a Claude Code Session</h1>
        <p>Paste your Claude Code export below</p>
      </div>

      <textarea
        className="chat-input"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Paste your Claude Code session export here..."
        disabled={loading}
      />

      {error && <div className="error">{error}</div>}

      <button
        className="submit-btn"
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
      >
        {loading ? "Saving..." : "Share"}
      </button>
    </div>
  );
}
