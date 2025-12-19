"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Send, Upload, Shield, Lock } from "lucide-react"
import ChatArea from "../components/ChatArea"
import { Button } from "../components/Button"
import { computePHashClient } from "@/lib/utils/pHashClient";
import { blindHash, unblindToken } from "@/lib/utils/psiClient"
import { localMatch } from "@/lib/scanner/imageHashScanner"
import { blindPHash, unblindEvaluatedPoint } from "@/lib/client/oprfClient"
import { verifyDatabaseOnClient } from "@/lib/utils/databaseIntegrity"
import { verifyMACClient, MACResponse } from "@/lib/security/messageAuth"
import { encryptResult, decryptResult } from "@/lib/crypto/resultEncryption"

interface Message {
  id: string
  type: "user" | "system"
  content: string
  status?: "safe" | "warning" | "blocked"
  timestamp: Date
}

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "system",
      content: "🔐 Welcome to NudgeScan. Enhanced with cryptographic security.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [dbVerified, setDbVerified] = useState(false)
  const [securityStatus, setSecurityStatus] = useState<string>("Initializing...")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Verify database integrity on mount
  useEffect(() => {
    const verifyDatabase = async () => {
      try {
        const result = await verifyDatabaseOnClient();
        if (result.valid) {
          setDbVerified(true);
          setSecurityStatus("✅ Database verified");
          console.log("✅ Database integrity verified");
        } else {
          setSecurityStatus("⚠️ Database verification failed");
          console.error("Database verification failed:", result.reason);
        }
      } catch (error) {
        setSecurityStatus("⚠️ Verification error");
        console.error("Database verification error:", error);
      }
    };
    verifyDatabase();
  }, [])

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setScanning(true);

    // Add "Scanning…" temporary message
    const scanningMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "system",
      content: "Scanning…",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, scanningMessage]);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });

      if (!res.ok) throw new Error("Scan API failed");

      const macResponse: MACResponse = await res.json();
      console.log("📦 Received response:", macResponse);
      
      // Verify MAC
      const macVerification = await verifyMACClient(macResponse);
      console.log("🔐 MAC verification result:", macVerification);
      if (!macVerification.valid) {
        throw new Error("Response integrity check failed: " + macVerification.reason);
      }
      console.log("✅ Response MAC verified");
      
      const data = macVerification.data;
      const status = data.detail.severity as "safe" | "warning" | "blocked";
      
      // Encrypt and store result
      await encryptResult({ type: 'text', input, result: data, timestamp: Date.now() });
      console.log("✅ Result encrypted and stored");

      const resultMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: "system",
        content:
          status === "safe"
            ? "Scan Result: Safe ✓"
            : status === "warning"
            ? "Scan Result: Suspicious ⚠"
            : "Scan Result: Blocked ✗",
        status,
        timestamp: new Date(),
      };

      // Replace scanning message with result
      setMessages((prev) => prev.slice(0, -1).concat(resultMessage));
    } catch (error) {
      console.error("Scan failed:", error);

      const errorMessage: Message = {
        id: (Date.now() + 3).toString(),
        type: "system",
        content: "Scan failed. Please try again.",
        status: "warning",
        timestamp: new Date(),
      };

      setMessages((prev) => prev.slice(0, -1).concat(errorMessage));
    } finally {
      setScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];

      const userMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: `📎 ${file.name}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      setScanning(true);

      const scanningMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: "system",
        content: "Scanning…",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, scanningMessage]);

      try {
        // Check database verification first
        if (!dbVerified) {
          throw new Error("Database not verified. Cannot proceed with scan.");
        }
        
        const imgHash = await computePHashClient(file);
        const { blindedHex, r } = blindPHash(imgHash);
        
        const formData = new FormData();
        formData.append("blindedPoint", blindedHex);

        const response = await fetch("/api/scan/image", {
          method: "POST",
          body: formData,
        });

        const macResponse: MACResponse = await response.json();
        
        // Verify MAC
        const macVerification = await verifyMACClient(macResponse);
        if (!macVerification.valid) {
          throw new Error("Response integrity check failed: " + macVerification.reason);
        }
        console.log("✅ Image response MAC verified");
        
        const data = macVerification.data;
        
        // Fetch public key commitment
        const keyCommitResponse = await fetch('/server_key_commitment.json');
        const keyCommitment = await keyCommitResponse.json();
        
        // Unblind with proof verification
        const unblindedToken = unblindEvaluatedPoint(
          data.evaluatedPoint, 
          r, 
          blindedHex, 
          data.proof, 
          keyCommitment.publicKey
        );

        const result = localMatch(unblindedToken);
        console.log("Local match result:", result);
        
        // Encrypt and store result
        await encryptResult({ 
          type: 'image', 
          filename: file.name, 
          result, 
          timestamp: Date.now() 
        });
        console.log("✅ Image result encrypted and stored");

        const status: "safe" | "blocked" = result.matched ? "blocked" : "safe";

        const resultMessage: Message = {
          id: (Date.now() + 2).toString(),
          type: "system",
          content:
            status === "safe"
              ? "Scan Result: Safe ✓"
              : "Scan Result: Blocked ✗",
          status,
          timestamp: new Date(),
        };

        setMessages((prev) => prev.slice(0, -1).concat(resultMessage));
      } catch (error) {
        console.error("Scan failed:", error);

        const errorMessage: Message = {
          id: (Date.now() + 3).toString(),
          type: "system",
          content: "Scan failed. Please try again.",
          status: "warning",
          timestamp: new Date(),
        };

        setMessages((prev) => prev.slice(0, -1).concat(errorMessage));
      } finally {
        setScanning(false);
      }
    }
  };

  return (
    <>
      {/* Chat Area */}
      <ChatArea messages={messages} />

      {/* Input Area */}
      <footer className="border-t border-border/40 bg-background px-6 py-4">
        {/* Security Status Indicator */}
        <div className="mb-2 px-4 py-2 bg-muted/20 rounded-lg flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4" />
          <span className="text-muted-foreground">Security:</span>
          <span className={dbVerified ? "text-green-500" : "text-yellow-500"}>
            {securityStatus}
          </span>
          <Lock className="w-4 h-4 ml-auto text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            OPRF + MAC + AES-256
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <input type="file" id="file-input" onChange={handleFileUpload} className="hidden" disabled={scanning} />
          <Button
            size="icon"
            variant="outline"
            onClick={() => document.getElementById("file-input")?.click()}
            disabled={scanning}
            className="rounded-full"
          >
            <Upload className="w-5 h-5" />
          </Button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type text to scan..."
            disabled={scanning}
            className="flex-1 px-4 py-2 rounded-full border border-border/40 bg-muted/30 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />

          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={scanning || !input.trim()}
            className="rounded-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </footer>
    </>
  )
}
