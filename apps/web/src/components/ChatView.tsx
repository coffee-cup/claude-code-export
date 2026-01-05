import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { parseExport, type ChatExport } from "../parser";
import { Message } from "./Message";

export function ChatView() {
  const { chatId } = useParams<{ chatId: string }>();
  const [chat, setChat] = useState<ChatExport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!chatId) return;

    fetch(`/api/chats/${chatId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        const parsed = parseExport(data.content);
        setChat(parsed);
      })
      .catch(() => {
        setError("Chat not found");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [chatId]);

  if (loading) {
    return (
      <div className="chat-view loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !chat) {
    return (
      <div className="chat-view error-view">
        <h2>Chat not found</h2>
        <p>This chat may have been deleted or the link is invalid.</p>
        <a href="/new" className="back-link">Create a new share</a>
      </div>
    );
  }

  return (
    <div className="chat-view">
      <header className="chat-header">
        <div className="header-info">
          <span className="model">{chat.header.model || "Claude"}</span>
          {chat.header.version && (
            <span className="version">{chat.header.version}</span>
          )}
        </div>
        {chat.header.workingDir && (
          <div className="working-dir">{chat.header.workingDir}</div>
        )}
      </header>

      <div className="messages">
        {chat.turns.map((turn, i) => (
          <Message key={i} turn={turn} />
        ))}
      </div>
    </div>
  );
}
