import { serve } from "bun";
import { nanoid } from "nanoid";
import index from "./index.html";
import { initDb, saveChat, getChat } from "./db";

await initDb();

const server = serve({
  port: process.env.PORT || 3000,
  routes: {
    "/api/chats": {
      async POST(req) {
        try {
          const { content } = await req.json();
          if (!content || typeof content !== "string") {
            return Response.json({ error: "content required" }, { status: 400 });
          }
          const id = nanoid(10);
          await saveChat(id, content);
          return Response.json({ id });
        } catch (e) {
          console.error("Failed to save chat:", e);
          return Response.json({ error: "failed to save" }, { status: 500 });
        }
      },
    },

    "/api/chats/:id": {
      async GET(req) {
        const { id } = req.params;
        const chat = await getChat(id);
        if (!chat) {
          return Response.json({ error: "not found" }, { status: 404 });
        }
        return Response.json({
          id: chat.id,
          content: chat.raw_content,
          createdAt: chat.created_at,
        });
      },
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
