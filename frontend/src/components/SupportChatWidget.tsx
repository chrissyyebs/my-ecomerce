import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';
import type { ClientUser } from './ClientAuthModal';
import { apiUrl } from '../config/api';

interface Message {
  id: string;
  sender: 'customer' | 'bot' | 'admin';
  text: string;
  timestamp: string;
}

interface SupportChatWidgetProps {
  currentUser: ClientUser | null;
}

// Bot automated FAQ responses for local testing
const BOT_KNOWLEDGE_BASE: { keywords: string[]; response: string }[] = [
  {
    keywords: ['shipping', 'delivery', 'arrive', 'track', 'time'],
    response: '📦 Standard door delivery takes 3–5 business days. You can also track your orders live in your Client Account profile! Store pickup is free and available same-day.',
  },
  {
    keywords: ['return', 'refund', 'policy', 'exchange'],
    response: '🔄 We offer a 30-day effortless return & exchange policy on all unused items in original packaging. Contact us here or email support@thetotelife.com.',
  },
  {
    keywords: ['material', 'leather', 'canvas', 'quality', 'craft'],
    response: '🌿 Our tote bags feature 18oz organic duck canvas trimmed with vegetable-tanned Tuscan bridle leather. Furniture pieces are crafted from solid European white oak & ash wood.',
  },
  {
    keywords: ['order', 'status', 'pay', 'payment'],
    response: '🛍 You can check your order status directly in your Client Account under "My Orders". For custom orders or changes, leave a message here!',
  },
  {
    keywords: ['hi', 'hello', 'hey', 'start', 'help'],
    response: '👋 Hello! Welcome to The Tote Life Concierge. How can I assist you today? Ask me about shipping, returns, product details, or custom orders!',
  },
];

export const SupportChatWidget: React.FC<SupportChatWidgetProps> = ({ currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome-1',
      sender: 'bot',
      text: `Hello ${currentUser ? currentUser.name.split(' ')[0] : 'there'}! 👋 Welcome to The Tote Life Live Assistant. How can we help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Init or join conversation
  useEffect(() => {
    if (isOpen && !conversationId) {
      setConversationId(`conv_${Date.now()}`);
    }
  }, [isOpen, conversationId]);

  // Poll for admin replies from Telegram / DB
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(apiUrl(`/support/public-messages/${conversationId}`));
        if (res.ok) {
          const data = await res.json();
          if (data.messages && Array.isArray(data.messages)) {
            setMessages((prev) => {
              const fetchedMsgs: Message[] = data.messages.map((m: any) => ({
                id: m.id,
                sender: m.sender === 'admin' ? 'admin' : 'customer',
                text: m.content,
                timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }));

              const existingIds = new Set(prev.map((pm) => pm.id));
              // Also match by text to prevent duplicate local customer messages
              const existingTexts = new Set(prev.map((pm) => pm.text));

              const newMsgs = fetchedMsgs.filter((fm) => !existingIds.has(fm.id) && (fm.sender === 'admin' || !existingTexts.has(fm.text)));

              if (newMsgs.length === 0) return prev;
              return [...prev, ...newMsgs];
            });
          }
        }
      } catch (err) {
        // Silent catch for dev offline
      }
    };

    fetchMessages();
    const pollInterval = setInterval(fetchMessages, 3000);
    return () => clearInterval(pollInterval);
  }, [isOpen, conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add customer message
    const userMsg: Message = {
      id: `msg_${Date.now()}`,
      sender: 'customer',
      text: cleanText,
      timestamp,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Try posting to backend API (relays to Telegram if bot token configured)
    try {
      if (conversationId) {
        const res = await fetch(apiUrl('/support/public-message'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: cleanText,
            customerName: currentUser?.name || 'Guest Visitor',
            customerEmail: currentUser?.email,
            conversationId,
          }),
        });
        // Server returns the real Supabase UUID — update local state so /reply works
        if (res.ok) {
          const data = await res.json();
          if (data.conversationId && data.conversationId !== conversationId) {
            setConversationId(data.conversationId);
          }
        }
      }
    } catch (err) {
      console.log('Local bot assistant active');
    }

    // Bot automated intelligent response simulation
    setTimeout(() => {
      setIsTyping(false);

      const lower = cleanText.toLowerCase();
      let matchedResponse = '';

      for (const item of BOT_KNOWLEDGE_BASE) {
        if (item.keywords.some((kw) => lower.includes(kw))) {
          matchedResponse = item.response;
          break;
        }
      }

      if (!matchedResponse) {
        matchedResponse = `✨ Thank you for reaching out! Your message has been relayed to our Concierge Team & Telegram Bot admin. We'll reply right here shortly.`;
      }

      const botMsg: Message = {
        id: `msg_bot_${Date.now()}`,
        sender: 'bot',
        text: matchedResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end pointer-events-auto">
      
      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[90vw] sm:w-[380px] h-[500px] max-h-[80vh] bg-surface border border-border rounded-2xl shadow-luxury flex flex-col overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
          
          {/* Header */}
          <div className="p-4 bg-primary text-on-primary flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-on-primary/10 flex items-center justify-center border border-on-primary/20">
                  <Bot className="w-5 h-5 text-on-primary" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-primary"></span>
              </div>
              <div>
                <h3 className="font-serif text-sm font-semibold text-on-primary flex items-center gap-1.5">
                  The Tote Life Assistant
                  <Sparkles className="w-3.5 h-3.5 opacity-80" />
                </h3>
                <p className="text-[10px] text-on-primary/80">Online • Automated Bot & Telegram Bridge</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full hover:bg-on-primary/10 transition-colors text-on-primary"
              aria-label="Close Chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-surface-subtle">
            <div className="text-center my-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-surface px-2.5 py-1 rounded-full border border-border text-on-surface-muted">
                Encrypted Concierge Support
              </span>
            </div>

            {messages.map((m) => {
              const isUser = m.sender === 'customer';
              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1 ${
                      isUser
                        ? 'bg-primary text-on-primary'
                        : m.sender === 'admin'
                        ? 'bg-amber-600 text-white'
                        : 'bg-surface border border-border text-primary'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[78%] p-3 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? 'bg-primary text-on-primary rounded-tr-none shadow-sm'
                        : 'bg-surface text-on-surface border border-border rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p>{m.text}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isUser ? 'text-on-primary/70' : 'text-on-surface-muted'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-surface border border-border flex items-center justify-center text-primary">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-surface border border-border px-3 py-2 rounded-2xl rounded-tl-none text-xs text-on-surface-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-surface border-t border-border flex gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => {
                setInputText('What is the shipping time?');
              }}
              className="px-2.5 py-1 text-[10px] font-semibold bg-surface-subtle hover:bg-primary/10 hover:text-primary border border-border rounded-full text-on-surface-muted whitespace-nowrap transition-colors"
            >
              🚚 Shipping time?
            </button>
            <button
              onClick={() => {
                setInputText('What is your return policy?');
              }}
              className="px-2.5 py-1 text-[10px] font-semibold bg-surface-subtle hover:bg-primary/10 hover:text-primary border border-border rounded-full text-on-surface-muted whitespace-nowrap transition-colors"
            >
              🔄 Return policy?
            </button>
            <button
              onClick={() => {
                setInputText('Tell me about your materials.');
              }}
              className="px-2.5 py-1 text-[10px] font-semibold bg-surface-subtle hover:bg-primary/10 hover:text-primary border border-border rounded-full text-on-surface-muted whitespace-nowrap transition-colors"
            >
              🌿 Materials?
            </button>
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-border flex gap-2 items-center">
            <input
              type="text"
              placeholder="Ask a question..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-surface-subtle border border-border rounded-xl px-3.5 py-2 text-xs text-on-surface placeholder:text-on-surface-muted/60 focus:outline-none focus:border-primary transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-sm flex-shrink-0"
              aria-label="Send Message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group relative flex items-center gap-2.5 px-4 py-3 bg-primary text-on-primary rounded-full shadow-luxury hover:scale-105 transition-all duration-300 active:scale-95"
        aria-label="Open Customer Support Chat"
      >
        <MessageSquare className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="font-semibold text-xs uppercase tracking-wider hidden sm:inline">
          {isOpen ? 'Close Chat' : 'Live Support'}
        </span>
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-surface animate-pulse"></span>
      </button>

    </div>
  );
};
