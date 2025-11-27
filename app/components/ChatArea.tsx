"use client";

import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { useRef, useEffect } from "react";

interface Message {
  id: string;
  type: "user" | "system";
  content: string;
  timestamp: Date;
  status?: "safe" | "warning" | "blocked";
}

interface ChatAreaProps {
  messages: Message[];
}

export default function ChatArea({ messages }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.type === "user" ? "justify-end" : "justify-start"
          } animate-in fade-in slide-in-from-bottom-2 duration-300`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
              message.type === "user"
                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-br-none"
                : "bg-muted text-foreground rounded-bl-none"
            }`}
          >
            {message.status && (
              <div className="flex items-center gap-2 mb-2">
                {message.status === "safe" && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {message.status === "warning" && (
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                )}
                {message.status === "blocked" && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            )}

            <p className="text-sm font-medium">{message.content}</p>

            <p
              className={`text-xs mt-2 ${
                message.type === "user"
                  ? "text-white/70"
                  : "text-muted-foreground"
              }`}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}

      <div ref={messagesEndRef} />
    </main>
  );
}
