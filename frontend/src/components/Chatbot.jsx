import { useState } from "react";

import {
  MessageCircle,
  X,
  Send,
} from "lucide-react";

import "../styles/chatbot.css";

export default function Chatbot() {
  const [open, setOpen] =
    useState(false);

  const [messages, setMessages] =
    useState([
      {
        role: "ai",
        text: "Hi! I’m your SISF assistant 👋",
      },
    ]);

  const [input, setInput] =
    useState("");

  const sendMessage = () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,

      {
        role: "user",
        text: input,
      },

      {
        role: "ai",
        text:
          "Hello, nice to meet you! How can I help you today?",
      },
    ];

    setMessages(newMessages);

    setInput("");
  };

  return (
    <>
      {/* TOGGLE BUTTON */}
      <button
        onClick={() => setOpen(!open)}
        className="chatbot-toggle"
      >
        {open ? (
          <X size={24} />
        ) : (
          <MessageCircle size={24} />
        )}
      </button>

      {/* CHATBOX */}
      {open && (
        <div className="chatbot-container">

          {/* HEADER */}
          <div className="chatbot-header">

            <div>
              <p className="chatbot-title">
                SISF Assistant
              </p>

              <p className="chatbot-subtitle">
                AI-powered helper
              </p>
            </div>

          </div>

          {/* BODY */}
          <div className="chatbot-body">

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chatbot-message-row ${msg.role}`}
              >

                <div
                  className={`chatbot-message ${msg.role}`}
                >
                  {msg.text}
                </div>

              </div>
            ))}

          </div>

          {/* INPUT */}
          <div className="chatbot-input-container">

            <input
              type="text"
              placeholder="Ask something..."
              value={input}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={(e) =>
                e.key === "Enter" &&
                sendMessage()
              }
              className="chatbot-input"
            />

            <button
              onClick={sendMessage}
              className="chatbot-send"
            >
              <Send size={16} />
            </button>

          </div>

        </div>
      )}
    </>
  );
}