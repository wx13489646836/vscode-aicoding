'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

// ========== Knowledge Base ==========
interface QAItem {
  keywords: string[];
  answer: string;
}

const knowledgeBase: QAItem[] = [
  // Product features
  { keywords: ['pure titanium', 'material', 'titanium'], answer: 'Our cups are made with premium pure titanium. Titanium is about half the weight of stainless steel and roughly twice as strong as aluminum. It resists acid and alkali corrosion, leaves no metallic taste, and keeps every sip clean. All products are SGS certified.' },
  { keywords: ['antibacterial', 'fresh', 'bacteria'], answer: 'Pure titanium is naturally antibacterial without extra coating. The inner wall does not retain odors, helping drinks stay fresh and true to their original flavor.' },
  { keywords: ['gem texture', 'texture', 'surface', 'appearance'], answer: 'The gem-like texture is created through precision surface treatment, giving each cup a unique metallic sheen, refined hand feel, and collectible appearance.' },
  { keywords: ['natural color', 'color process', 'anodized'], answer: 'The natural color process uses the thickness of the titanium oxide layer to create rich colors without paint or electroplating. The finish is safe, durable, and resistant to fading.' },
  { keywords: ['sgs', 'certification', 'certified'], answer: 'All products are SGS certified, covering food safety, material purity, and harmful-substance testing for safer everyday use.' },
  // Product consultation
  { keywords: ['coffee cup', '480ml'], answer: 'Pure Titanium Coffee Cup, 480ml. Available colors: Monet Ocean Blue, Monet Maple Red, and Monet Flowing Gold. Key features: pure titanium, antibacterial freshness, gem-like texture, natural color process, gift orders, and SGS certification.' },
  { keywords: ['tea steeper', '420ml', 'tea'], answer: 'Pure Titanium Tea Steeper Cup, 420ml. Available colors: Ocean Blue, Maple Red, Flowing Gold, Moonlight Silver, and Dream Purple. Designed for steeping tea and wellness drinks.' },
  { keywords: ['filter cup', 'strainer', 'filter'], answer: 'Pure Titanium Filter Cup, available in 480ml, 400ml, 260ml, and 220ml. It includes a pure titanium filter so tea leaves can be separated directly while pouring.' },
  { keywords: ['tea separation', 'glass cup', 'borosilicate'], answer: 'Tea Separation Glass Cup, 360ml. Made with high-borosilicate glass and pure titanium components for safer tea separation and better freshness.' },
  { keywords: ['chopsticks', 'titanium chopsticks'], answer: 'TAIC pure titanium chopsticks are lightweight, portable, refined, and suitable for home or outdoor use. Available in Monet Ocean Blue, Moonlight Silver, and Flowing Gold.' },
  { keywords: ['planet cup', '550ml'], answer: 'Planet Cup, 550ml. Features inner and outer pure titanium construction, antibacterial freshness, gem-like texture, and a distinctive spherical lid design.' },
  { keywords: ['round cup', '200ml'], answer: 'Pure Titanium Round Cup, 200ml. Features pure titanium, antibacterial freshness, natural uncoated color, gift-order support, and SGS certification.' },
  { keywords: ['thermos', 'insulated', 'keep warm'], answer: 'Pure Titanium T-Type Thermos, available in 420ml, 330ml, and 280ml. It supports both heat retention and cold insulation with a pure titanium liner.' },
  // Colors
  { keywords: ['color', 'colors', 'palette', 'ocean blue', 'maple red', 'flowing gold', 'moonlight silver', 'dream purple', 'monet'], answer: 'The Monet color series includes Ocean Blue, Maple Red, Flowing Gold, Moonlight Silver, and Dream Purple. All colors use a natural titanium coloring process and are designed not to peel or fade.' },
  // Shipping and service
  { keywords: ['shipping', 'delivery', 'freight', 'dispatch'], answer: 'Orders are usually dispatched within 48 hours. Delivery typically takes 2-5 days depending on the destination, and international shipping is available to 50+ countries and regions.' },
  { keywords: ['return', 'exchange', 'refund', 'after-sales'], answer: 'We support 7-day returns and exchanges. If there is a quality issue, the product is eligible for lifetime repair or replacement service.' },
  { keywords: ['warranty', 'repair'], answer: 'All pure titanium products include lifetime warranty support for material issues, craftsmanship defects, and non-human damage under normal use.' },
  // Gifts and bulk orders
  { keywords: ['gift', 'bulk', 'custom', 'engraving', 'gift box'], answer: 'We support corporate customization and gift bulk orders, including engraving, custom packaging, and holiday gift boxes. Bulk discounts are available from 10 pieces.' },
  // Care
  { keywords: ['care', 'maintenance', 'clean', 'cleaning'], answer: 'Daily care is simple: rinse with clean water or wipe gently with a soft cloth. Avoid steel wool or hard abrasives. When storing for a long time, wash and dry the cup first.' },
  // Usage
  { keywords: ['use', 'how to use', 'brew', 'usage'], answer: 'Before first use, rinse with warm water. The cup can hold hot water, tea, coffee, and daily drinks. For tea steeping, warm the cup first, add tea leaves, pour hot water, and steep for 5-10 minutes.' },
  // Price
  { keywords: ['price', 'cost', 'discount', 'promotion'], answer: 'Please refer to the product page for current pricing. Limited-time offers may be available, and corporate bulk orders can receive dedicated pricing.' },
];

// Default reply
const defaultReply = 'Thanks for your question. I do not have a precise answer for that yet. You can ask about product materials, colors and capacity, shipping, after-sales service, care instructions, or gift customization. You can also contact support at +886-1-800-TITANIUM.';

// Welcome message
const welcomeMessage = 'Hello! I am Titanium AI Support. How can I help you today?\n\nI can answer questions about:\n• Product features and materials\n• Colors and capacity options\n• Shipping and after-sales service\n• Gift orders and customization\n• Care and usage instructions\n\nType your question below.';

// ========== Matching Logic ==========
function findAnswer(input: string): string {
  const lowerInput = input.toLowerCase();

  // Prefer exact keyword matches
  let bestMatch: QAItem | null = null;
  let bestScore = 0;

  for (const item of knowledgeBase) {
    let score = 0;
    for (const kw of item.keywords) {
      if (lowerInput.includes(kw.toLowerCase())) {
        score += kw.length; // Longer keywords have higher weight
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }

  if (bestMatch && bestScore > 0) {
    return bestMatch.answer;
  }

  return defaultReply;
}

// ========== Message Types ==========
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ========== Component ==========
export default function SmartCS() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: welcomeMessage,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    const messageList = messagesEndRef.current?.parentElement;
    if (messageList) {
      messageList.scrollTop = messageList.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      const answer = findAnswer(trimmed);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 600 + Math.random() * 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick questions
  const quickQuestions = [
    'Why choose pure titanium?',
    'What colors are available?',
    'Do you accept returns?',
    'How do I care for the cup?',
  ];

  return (
    <>
      {/* Floating Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[100] group"
        aria-label="Titanium AI Support"
      >
        <div className="relative">
          {/* Pulse ring */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full animate-ping bg-blue-400/30"></span>
          )}
          {/* Avatar */}
          <div className="relative w-16 h-20 rounded-2xl overflow-hidden border-2 border-blue-400/50 shadow-lg shadow-blue-500/25 group-hover:border-blue-400 group-hover:shadow-blue-500/40 transition-all bg-white">
            <Image
              src="/cs-avatar-new.png"
              alt="Titanium AI Support"
              fill
              className="object-contain"
              priority
            />
          </div>
          {/* Label */}
          {!isOpen && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gray-900/90 text-white text-xs px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              AI Support
            </span>
          )}
        </div>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[100] w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gray-950/95 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-blue-700">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/30 flex-shrink-0 bg-white">
              <Image
                src="/cs-avatar-new.png"
                alt="Titanium AI Support"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-sm">Titanium AI Support</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-blue-100 text-xs">Online</span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-end gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar for bot */}
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-white">
                      <Image
                        src="/cs-avatar-new.png"
                        alt="Support avatar"
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white/10 text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-end gap-2">
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-white">
                    <Image
                      src="/cs-avatar-new.png"
                      alt="Support avatar"
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  </div>
                  <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-gray-500 text-xs mb-2">Common questions:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputValue(q);
                      setTimeout(() => {
                        const userMsg: Message = {
                          id: Date.now().toString(),
                          role: 'user',
                          content: q,
                          timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, userMsg]);
                        setInputValue('');
                        setIsTyping(true);
                        setTimeout(() => {
                          const answer = findAnswer(q);
                          const botMsg: Message = {
                            id: (Date.now() + 1).toString(),
                            role: 'assistant',
                            content: answer,
                            timestamp: new Date(),
                          };
                          setMessages((prev) => [...prev, botMsg]);
                          setIsTyping(false);
                        }, 600 + Math.random() * 800);
                      }, 100);
                    }}
                    className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-4 py-3 border-t border-white/10 bg-gray-950/50">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
