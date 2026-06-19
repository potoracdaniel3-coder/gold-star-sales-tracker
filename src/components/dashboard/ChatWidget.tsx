import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Bot, Send, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";

import { chatWithAssistant } from "@/lib/chat.functions";
import { qk } from "@/lib/db";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi — I can answer questions about your sales data or log new jobs/activity. Try: \"Who's leading this week?\" or \"Log a $450 deck job for Bob, 3 hours.\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chat = useServerFn(chatWithAssistant);
  const qc = useQueryClient();

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.text || "(no response)" }]);
      // Data may have changed via tools
      qc.invalidateQueries({ queryKey: qk.jobs });
      qc.invalidateQueries({ queryKey: qk.activity });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Chat failed";
      toast.error(msg);
      setMessages([...next, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  return (
    <>
      {!open && (
        <button
          aria-label="Open AI assistant"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold text-black shadow-card transition hover:scale-105"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[600px] max-h-[85vh] w-[400px] max-w-[95vw] flex-col rounded-2xl border border-border/60 bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">Sales AI</div>
                <div className="text-xs text-muted-foreground">Ask about your data</div>
              </div>
            </div>
            <button
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl bg-gold px-3 py-2 text-sm text-black">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-full text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="text-sm text-muted-foreground animate-pulse">Thinking…</div>
            )}
          </div>

          <div className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder="Ask about revenue, log a job…"
                className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold"
                disabled={loading}
              />
              <Button
                size="icon"
                variant="gold"
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
