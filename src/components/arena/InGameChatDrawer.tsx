'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/room-manager';
import { PlayerColor } from '@/lib/games/types';
import { X, Send, Smile, MessageSquare } from 'lucide-react';

interface InGameChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  myRole: PlayerColor | 'spectator' | null;
  onSendMessage: (text?: string, emoji?: string) => Promise<boolean>;
}

const QUICK_EMOJIS = ['👋', '👏', '🤔', '😅', '🤝', '🔥', '🏆', '😼'];

const QUICK_PRESETS = [
  'Good luck, have fun!',
  'Well played!',
  'Thinking...',
  'Good game!',
  'Thanks for playing!',
];

export const InGameChatDrawer: React.FC<InGameChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  myRole,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    await onSendMessage(text);
    setIsSending(false);
  };

  const handleSendEmoji = async (emoji: string) => {
    if (isSending) return;
    setIsSending(true);
    await onSendMessage(undefined, emoji);
    setIsSending(false);
  };

  const handleSendPreset = async (preset: string) => {
    if (isSending) return;
    setIsSending(true);
    await onSendMessage(preset);
    setIsSending(false);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 bg-[#171719] border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#222226]">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FF6A00]" />
          <h3 className="font-bold text-sm text-[#F8F1E5] font-['Sora']">In-Game Chat</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Close chat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Emoji Reaction Bar */}
      <div className="px-3 py-2 bg-[#1c1d21] border-b border-white/5 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleSendEmoji(emoji)}
            disabled={isSending}
            className="w-8 h-8 rounded-lg hover:bg-white/10 active:scale-95 flex items-center justify-center text-lg transition-transform shrink-0"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 text-xs px-4">
            <Smile className="w-8 h-8 mb-2 opacity-40 text-[#FF6A00]" />
            <p className="font-medium text-zinc-400">No messages yet</p>
            <p className="text-[11px] mt-1 text-zinc-500">
              Send a quick reaction or greeting below to break the ice!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.role === myRole;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className="font-mono text-[10px] text-zinc-400">
                    {msg.senderHandle}
                  </span>
                  <span className="text-[9px] text-zinc-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {msg.emoji ? (
                  <div className="text-3xl p-1 animate-in zoom-in-75 duration-150">
                    {msg.emoji}
                  </div>
                ) : (
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed break-words ${
                      isMe
                        ? 'bg-gradient-to-r from-[#FF6A00] to-[#FF173D] text-white rounded-br-sm'
                        : 'bg-[#222226] text-zinc-200 border border-white/5 rounded-bl-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Preset Buttons */}
      <div className="px-3 py-2 border-t border-white/5 bg-[#1c1d21] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handleSendPreset(preset)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 whitespace-nowrap transition-colors"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Text Input Form */}
      <form onSubmit={handleSendText} className="p-3 border-t border-white/10 bg-[#222226] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={150}
          className="flex-1 bg-[#171719] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF6A00] transition-colors"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isSending}
          className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF173D] disabled:opacity-40 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-500/20 active:scale-95 transition-transform"
          title="Send"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
