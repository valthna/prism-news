import React, { useState, useEffect, useRef, FormEvent, useMemo, useCallback } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { NewsArticle, ChatMessage } from '../types';
import { SendIcon } from './icons/SendIcon';
import { CloseIcon } from './icons/CloseIcon';
import { PRISM_PROMPTS } from '../services/prompts';

// Icons
const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
);

const RefreshCwIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
);

// Typing Effect Hook
const useTypingEffect = (text: string, speed: number = 15, enabled: boolean = true) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (!enabled) {
            setDisplayedText(text);
            setIsComplete(true);
            return;
        }

        setDisplayedText('');
        setIsComplete(false);
        let index = 0;

        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayedText(text.slice(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed, enabled]);

    return { displayedText, isComplete };
};

// Message Component with typing effect and actions
interface MessageBubbleProps {
    message: ChatMessage;
    isLatest: boolean;
    onCopy: (text: string) => void;
    onRegenerate?: () => void;
    showTyping?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
    message, 
    isLatest, 
    onCopy, 
    onRegenerate,
    showTyping = false 
}) => {
    const isUser = message.role === 'user';
    const text = message.parts[0].text;
    const [copied, setCopied] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const { displayedText, isComplete } = useTypingEffect(
        text, 
        12, 
        !isUser && isLatest && showTyping
    );

    const handleCopy = () => {
        onCopy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const displayText = !isUser && isLatest && showTyping ? displayedText : text;

    return (
        <div 
            className={`group flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up-message`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            <div className={`relative max-w-[85%] ${isUser ? '' : 'flex flex-col'}`}>
                {/* Message bubble */}
                <div 
                    className={`p-4 rounded-2xl text-[14px] leading-relaxed shadow-lg break-words overflow-hidden transition-all duration-300 ${
                        isUser
                            ? 'bg-gradient-to-br from-neon-accent to-cyan-400 text-black font-medium rounded-br-md'
                            : 'bg-white/[0.08] text-gray-100 border border-white/10 rounded-bl-md backdrop-blur-sm'
                    }`}
                >
                    {/* Content */}
                    <div className="whitespace-pre-wrap">
                        {displayText}
                        {!isUser && isLatest && showTyping && !isComplete && (
                            <span className="inline-block w-0.5 h-4 bg-neon-accent ml-0.5 animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Actions for AI messages */}
                {!isUser && (
                    <div className={`flex items-center gap-1 mt-2 transition-all duration-200 ${showActions || !isComplete ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-[10px] font-medium"
                        >
                            {copied ? (
                                <>
                                    <CheckIcon className="w-3 h-3 text-green-400" />
                                    <span className="text-green-400">Copié</span>
                                </>
                            ) : (
                                <>
                                    <CopyIcon className="w-3 h-3" />
                                    <span>Copier</span>
                                </>
                            )}
                        </button>
                        {onRegenerate && isLatest && (
                            <button
                                onClick={onRegenerate}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-[10px] font-medium"
                            >
                                <RefreshCwIcon className="w-3 h-3" />
                                <span>Régénérer</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// Loading indicator with modern skeleton
const ThinkingIndicator: React.FC = () => (
    <div className="flex justify-start animate-fade-in">
        <div className="bg-white/[0.08] border border-white/10 rounded-2xl rounded-bl-md p-4 backdrop-blur-sm">
            <div className="flex items-center gap-3">
                <div className="flex gap-1">
                    <span className="w-2 h-2 bg-neon-accent/80 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-neon-accent/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-neon-accent/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[11px] text-gray-500 font-medium">PRISM analyse...</span>
            </div>
        </div>
    </div>
);

// Suggestion Chip Component
interface SuggestionChipProps {
    text: string;
    onClick: () => void;
    delay?: number;
}

const SuggestionChip: React.FC<SuggestionChipProps> = ({ text, onClick, delay = 0 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay]);

    return (
        <button
            onClick={onClick}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 rounded-2xl text-[12px] font-medium border border-white/15 text-gray-300 
                hover:bg-white hover:text-black hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]
                active:scale-95 transition-all duration-300 ease-out
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
            `}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {text}
        </button>
    );
};

// Context Card Component
interface ContextCardProps {
    article: NewsArticle;
    isExpanded: boolean;
    onToggle: () => void;
}

const ContextCard: React.FC<ContextCardProps> = ({ article, isExpanded, onToggle }) => (
    <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/10 rounded-2xl overflow-hidden transition-all duration-500">
        <button 
            onClick={onToggle}
            className="w-full p-4 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors"
        >
            <div className="flex-1 text-left">
                <div className="text-[9px] font-bold uppercase tracking-[0.25em] text-neon-accent/80 mb-1.5">
                    Contexte de l'article
                </div>
                <p className={`text-[13px] text-gray-200 leading-relaxed font-medium ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {article.summary || "Synthèse en cours de génération."}
                </p>
            </div>
            <div className={`shrink-0 p-1.5 rounded-full bg-white/5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
            </div>
        </button>
        
        {isExpanded && article.detailedSummary && (
            <div className="px-4 pb-4 pt-0 border-t border-white/5 animate-accordion-down">
                <p className="text-[12px] text-gray-400 leading-relaxed mt-3">
                    {article.detailedSummary}
                </p>
                {article.importance && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80 mb-1">Pourquoi c'est important</div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">{article.importance}</p>
                    </div>
                )}
            </div>
        )}
    </div>
);

// Dynamic suggestions based on conversation state
const getDynamicSuggestions = (headline: string, messageCount: number, lastMessage?: string): string[] => {
    // Initial state - use headline-specific suggestions
    if (messageCount <= 1) {
        return PRISM_PROMPTS.CHATBOT.dynamicSuggestions(headline);
    }
    
    // After first exchange
    if (messageCount <= 3) {
        return PRISM_PROMPTS.CHATBOT.FOLLOW_UP_SUGGESTIONS.ROUND_1;
    }
    
    // Middle of conversation
    if (messageCount <= 5) {
        return PRISM_PROMPTS.CHATBOT.FOLLOW_UP_SUGGESTIONS.ROUND_2;
    }
    
    // Deep into conversation
    return PRISM_PROMPTS.CHATBOT.FOLLOW_UP_SUGGESTIONS.ROUND_3;
};

// Conversation Cache - persists during session
const conversationCache = new Map<string, {
    messages: ChatMessage[];
    lastMessageIndex: number;
}>();

// Storage key for sessionStorage
const STORAGE_KEY = 'prism_chat_cache';

// Load cache from sessionStorage on init
const loadCacheFromStorage = (): void => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored) as Record<string, { messages: ChatMessage[]; lastMessageIndex: number }>;
            Object.entries(parsed).forEach(([key, value]) => {
                conversationCache.set(key, value);
            });
        }
    } catch (e) {
        console.warn('Failed to load chat cache from storage:', e);
    }
};

// Save cache to sessionStorage
const saveCacheToStorage = (): void => {
    try {
        const cacheObj: Record<string, { messages: ChatMessage[]; lastMessageIndex: number }> = {};
        conversationCache.forEach((value, key) => {
            cacheObj[key] = value;
        });
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cacheObj));
    } catch (e) {
        console.warn('Failed to save chat cache to storage:', e);
    }
};

// Initialize cache from storage
if (typeof window !== 'undefined') {
    loadCacheFromStorage();
}

// Hook to handle mobile keyboard
const useKeyboardHeight = () => {
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

    useEffect(() => {
        // Use visualViewport API for accurate keyboard detection
        const viewport = window.visualViewport;
        
        if (!viewport) return;

        const handleResize = () => {
            // Calculate keyboard height by comparing viewport to window height
            const currentHeight = viewport.height;
            const windowHeight = window.innerHeight;
            const heightDiff = windowHeight - currentHeight;
            
            // Consider keyboard open if difference is significant (> 100px)
            const isOpen = heightDiff > 100;
            setIsKeyboardOpen(isOpen);
            setKeyboardHeight(isOpen ? heightDiff : 0);
        };

        viewport.addEventListener('resize', handleResize);
        viewport.addEventListener('scroll', handleResize);
        
        // Initial check
        handleResize();

        return () => {
            viewport.removeEventListener('resize', handleResize);
            viewport.removeEventListener('scroll', handleResize);
        };
    }, []);

    return { keyboardHeight, isKeyboardOpen };
};

// Main Chatbot Component
const Chatbot: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    article: NewsArticle | null;
}> = ({ isOpen, onClose, article }) => {
    const apiKey = process.env.API_KEY;
    const hasApiKey = Boolean(apiKey);
    const isDemoMode = !hasApiKey;
    
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isContextExpanded, setIsContextExpanded] = useState(false);
    const [showTypingEffect, setShowTypingEffect] = useState(false);
    const [lastMessageIndex, setLastMessageIndex] = useState(-1);
    const [isInputFocused, setIsInputFocused] = useState(false);
    
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const currentArticleId = useRef<string | null>(null);
    
    // Keyboard handling
    const { keyboardHeight, isKeyboardOpen } = useKeyboardHeight();
    
    // Save messages to cache whenever they change
    useEffect(() => {
        if (article && messages.length > 0) {
            conversationCache.set(article.id, {
                messages,
                lastMessageIndex
            });
            saveCacheToStorage();
        }
    }, [messages, lastMessageIndex, article]);

    // Dynamic suggestions
    const suggestionPrompts = useMemo(() => {
        if (!article) return PRISM_PROMPTS.CHATBOT.DEFAULT_SUGGESTIONS;
        const lastMsg = messages.length > 0 ? messages[messages.length - 1]?.parts[0]?.text : undefined;
        return getDynamicSuggestions(article.headline, messages.length, lastMsg);
    }, [article, messages]);

    // Handle suggestion click - directly sends the message
    const handleSuggestionClick = useCallback((prompt: string) => {
        if (isLoading) return;
        setUserInput(prompt);
        // Auto-submit after a brief moment for visual feedback
        setTimeout(() => {
            const fakeEvent = { preventDefault: () => {} } as FormEvent;
            handleSendMessageWithInput(prompt, fakeEvent);
        }, 100);
    }, [isLoading]);

    // Escape to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Initialize chat session
    useEffect(() => {
        if (isOpen && article) {
            // Check if we're switching to a different article
            const isNewArticle = currentArticleId.current !== article.id;
            currentArticleId.current = article.id;
            
            // Check cache for existing conversation
            const cachedConversation = conversationCache.get(article.id);
            
            if (cachedConversation && cachedConversation.messages.length > 0) {
                // Restore from cache
                setMessages(cachedConversation.messages);
                setLastMessageIndex(cachedConversation.lastMessageIndex);
                setShowTypingEffect(false); // Don't animate restored messages
                
                // Recreate chat session with history for API mode
                if (hasApiKey) {
                    const ai = new GoogleGenAI({ apiKey: apiKey as string });
                    // Create new session - we'll need to replay the history
                    chatSession.current = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: { systemInstruction: PRISM_PROMPTS.CHATBOT.SYSTEM_INSTRUCTION(article.headline) },
                        history: cachedConversation.messages.map(msg => ({
                            role: msg.role,
                            parts: msg.parts
                        }))
                    });
                }
                
                setTimeout(() => inputRef.current?.focus(), 200);
            } else {
                // Start new conversation
                setShowTypingEffect(true);
                setLastMessageIndex(0);
                
            if (!hasApiKey) {
                setMessages([{
                    role: 'model',
                    parts: [{ text: PRISM_PROMPTS.CHATBOT.DEMO_WELCOME(article.headline) }]
                }]);
                setTimeout(() => inputRef.current?.focus(), 400);
                return;
            }
                
            const ai = new GoogleGenAI({ apiKey: apiKey as string });
            chatSession.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                    config: { systemInstruction: PRISM_PROMPTS.CHATBOT.SYSTEM_INSTRUCTION(article.headline) },
            });
                
            setMessages([{
                role: 'model',
                parts: [{ text: PRISM_PROMPTS.CHATBOT.WELCOME_MESSAGE(article.headline) }]
            }]);
            setTimeout(() => inputRef.current?.focus(), 400);
            }
        } else if (!isOpen) {
            // Don't clear messages when closing - they're already in cache
            setUserInput('');
            setShowTypingEffect(false);
        }
    }, [isOpen, article, apiKey, hasApiKey]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Scroll to bottom when keyboard opens (with slight delay for iOS)
    useEffect(() => {
        if (isKeyboardOpen && isInputFocused) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    }, [isKeyboardOpen, isInputFocused]);

    // Handle input focus - scroll into view on mobile
    const handleInputFocus = useCallback(() => {
        setIsInputFocused(true);
        // Delay to allow keyboard to open
        setTimeout(() => {
            inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }, []);

    const handleInputBlur = useCallback(() => {
        setIsInputFocused(false);
    }, []);

    // Clear conversation and start fresh
    const handleClearConversation = useCallback(() => {
        if (!article) return;
        
        // Clear from cache
        conversationCache.delete(article.id);
        saveCacheToStorage();
        
        // Reset states
        setShowTypingEffect(true);
        setLastMessageIndex(0);
        
        // Create new welcome message
        if (!hasApiKey) {
            setMessages([{
                role: 'model',
                parts: [{ text: PRISM_PROMPTS.CHATBOT.DEMO_WELCOME(article.headline) }]
            }]);
        } else {
            // Recreate chat session
            const ai = new GoogleGenAI({ apiKey: apiKey as string });
            chatSession.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction: PRISM_PROMPTS.CHATBOT.SYSTEM_INSTRUCTION(article.headline) },
            });
            
            setMessages([{
                role: 'model',
                parts: [{ text: PRISM_PROMPTS.CHATBOT.WELCOME_MESSAGE(article.headline) }]
            }]);
        }
        
        // Focus input
        setTimeout(() => inputRef.current?.focus(), 200);
    }, [article, hasApiKey, apiKey]);

    // Copy message to clipboard
    const handleCopyMessage = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
    }, []);

    // Send message handler
    const handleSendMessageWithInput = async (inputText: string, e: FormEvent) => {
        e.preventDefault();
        if (!inputText.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: inputText }] };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);
        setShowTypingEffect(false);

        if (!hasApiKey) {
            setTimeout(() => {
                const mockResponses = PRISM_PROMPTS.CHATBOT.MOCK_RESPONSES;
                const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
                setMessages(prev => {
                    setLastMessageIndex(prev.length);
                    setShowTypingEffect(true);
                    return [...prev, { role: 'model', parts: [{ text: `[DÉMO] ${randomResponse}` }] }];
                });
                setIsLoading(false);
            }, 1200);
            return;
        }

        if (!chatSession.current) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await chatSession.current.sendMessage({ message: inputText });
            setMessages(prev => {
                setLastMessageIndex(prev.length);
                setShowTypingEffect(true);
                return [...prev, { role: 'model', parts: [{ text: response.text }] }];
            });
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'model', 
                parts: [{ text: "⚠️ Connexion interrompue. Réessayez dans un instant." }] 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = (e: FormEvent) => {
        handleSendMessageWithInput(userInput, e);
    };

    // Regenerate last response
    const handleRegenerate = useCallback(async () => {
        if (messages.length < 2 || isLoading) return;
        
        // Find last user message
        let lastUserMsgIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                lastUserMsgIndex = i;
                break;
            }
        }
        
        if (lastUserMsgIndex === -1) return;
        
        const lastUserMsg = messages[lastUserMsgIndex].parts[0].text;
        
        // Remove last AI response
        setMessages(prev => prev.slice(0, -1));
        setIsLoading(true);
        setShowTypingEffect(false);

        if (!hasApiKey) {
            setTimeout(() => {
                const mockResponses = PRISM_PROMPTS.CHATBOT.MOCK_RESPONSES;
                const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
                setMessages(prev => {
                    setLastMessageIndex(prev.length);
                    setShowTypingEffect(true);
                    return [...prev, { role: 'model', parts: [{ text: `[DÉMO] ${randomResponse}` }] }];
                });
                setIsLoading(false);
            }, 1200);
            return;
        }

        try {
            const response = await chatSession.current?.sendMessage({ message: lastUserMsg });
            if (response) {
                setMessages(prev => {
                    setLastMessageIndex(prev.length);
                    setShowTypingEffect(true);
                    return [...prev, { role: 'model', parts: [{ text: response.text }] }];
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, { 
                role: 'model', 
                parts: [{ text: "⚠️ Impossible de régénérer. Réessayez." }] 
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, isLoading, hasApiKey]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-md pointer-events-auto animate-fade-in cursor-pointer"
                onClick={onClose}
            >
                {/* Swipe hint - hidden when keyboard is open */}
                <div 
                    className={`absolute top-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full shadow-2xl transition-all duration-200 ${
                        isKeyboardOpen ? 'opacity-0 -translate-y-4 pointer-events-none' : 'opacity-100'
                    }`}
                >
                    <span className="text-[11px] font-semibold text-white/90 uppercase tracking-[0.2em]">Tap pour fermer</span>
                </div>
            </div>

            {/* Chat Container */}
            <div
                ref={containerRef}
                className="pointer-events-auto w-full sm:max-w-lg bg-[#0a0a0a] sm:rounded-3xl rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col overflow-hidden animate-slide-up relative"
                style={{
                    // Use dynamic height that respects keyboard on mobile
                    height: isKeyboardOpen 
                        ? `calc(100dvh - ${keyboardHeight}px)` 
                        : 'min(90dvh, 700px)',
                    maxHeight: isKeyboardOpen ? 'none' : '700px',
                    // Ensure modal stays at bottom when keyboard opens
                    marginBottom: 0,
                    transition: isKeyboardOpen ? 'none' : 'height 0.3s ease-out'
                }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="chatbot-dialog-title"
            >
                {/* Header */}
                <header className="relative p-4 border-b border-white/10 bg-gradient-to-b from-[#141414] to-[#0a0a0a]">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                                <div className="relative">
                                    <div className="w-2 h-2 bg-neon-accent rounded-full" />
                                    <div className="absolute inset-0 w-2 h-2 bg-neon-accent rounded-full animate-ping opacity-75" />
                                </div>
                                <h2 id="chatbot-dialog-title" className="text-sm font-black tracking-[0.2em] uppercase text-white">
                                    PRISM AI
                                </h2>
                            {isDemoMode && (
                                    <span className="text-[8px] font-black uppercase tracking-[0.3em] px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                        Démo
                                </span>
                            )}
                        </div>
                        {article && (
                                <p className="text-[11px] text-gray-500 font-medium line-clamp-1 pr-12">
                                {article.headline}
                            </p>
                        )}
                    </div>
                        <div className="flex items-center gap-1">
                            {/* Clear conversation button - only show if there's a conversation */}
                            {messages.length > 1 && (
                                <button 
                                    onClick={handleClearConversation} 
                                    className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90 group"
                                    aria-label="Nouvelle conversation"
                                    title="Nouvelle conversation"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </button>
                            )}
                            <button 
                                onClick={onClose} 
                                className="p-2 hover:bg-white/10 rounded-full transition-all duration-200 active:scale-90"
                                aria-label="Fermer"
                            >
                                <CloseIcon className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                    </button>
                        </div>
                    </div>
                </header>

                {/* Messages Area */}
                <div 
                    ref={messagesContainerRef}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#0a0a0a] to-[#050505] scroll-smooth overscroll-contain"
                >
                    {/* Context Card */}
                    {article && (
                        <ContextCard 
                            article={article}
                            isExpanded={isContextExpanded}
                            onToggle={() => setIsContextExpanded(!isContextExpanded)}
                        />
                    )}

                    {/* Messages */}
                    {messages.map((msg, i) => (
                        <MessageBubble
                            key={i}
                            message={msg}
                            isLatest={i === lastMessageIndex}
                            onCopy={handleCopyMessage}
                            onRegenerate={msg.role === 'model' && i === messages.length - 1 ? handleRegenerate : undefined}
                            showTyping={showTypingEffect && i === lastMessageIndex}
                        />
                    ))}

                    {/* Loading indicator */}
                    {isLoading && <ThinkingIndicator />}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div 
                    className={`shrink-0 bg-gradient-to-t from-[#141414] to-[#0a0a0a] border-t border-white/10 transition-all duration-200 ${
                        isKeyboardOpen ? 'p-2 pb-2 space-y-2' : 'p-4 space-y-4'
                    }`}
                    style={{
                        // Add safe area padding on iOS
                        paddingBottom: isKeyboardOpen ? '8px' : 'max(16px, env(safe-area-inset-bottom))'
                    }}
                >
                    {/* Dynamic Suggestions - horizontal scroll for space efficiency */}
                    <div 
                        className={`flex gap-2 transition-all duration-200 overflow-x-auto overflow-y-hidden scrollbar-hide pb-1 -mb-1 ${
                            isKeyboardOpen && userInput.length > 0 
                                ? 'max-h-0 opacity-0 !m-0 !p-0' 
                                : 'max-h-16 opacity-100'
                        }`}
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        {suggestionPrompts.map((prompt, idx) => (
                            <SuggestionChip
                                key={`${prompt}-${messages.length}`}
                                text={prompt}
                                onClick={() => handleSuggestionClick(prompt)}
                                delay={idx * 80}
                            />
                        ))}
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSendMessage} className="relative group">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-neon-accent/20 via-cyan-400/20 to-neon-accent/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="text"
                            enterKeyHint="send"
                            autoComplete="off"
                            autoCorrect="on"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onFocus={handleInputFocus}
                            onBlur={handleInputBlur}
                            placeholder="Posez votre question..."
                            disabled={isLoading}
                            className={`relative w-full bg-white/[0.06] border border-white/15 rounded-full text-[16px] text-white placeholder-gray-500 
                                focus:outline-none focus:border-neon-accent/50 focus:bg-white/[0.08]
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-all duration-300
                                ${isKeyboardOpen ? 'py-3 pl-5 pr-12' : 'py-4 pl-6 pr-14'}
                            `}
                            style={{
                                // Prevent iOS zoom on focus (requires 16px min font size)
                                fontSize: '16px'
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!userInput.trim() || isLoading}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full
                                bg-gradient-to-br from-neon-accent to-cyan-400 
                                text-black font-bold
                                hover:shadow-[0_0_20px_rgba(0,255,255,0.4)] 
                                active:scale-90
                                disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none
                                transition-all duration-300
                                ${isKeyboardOpen ? 'p-2.5' : 'p-3'}
                            `}
                            aria-label="Envoyer"
                        >
                            <SendIcon className={isKeyboardOpen ? 'w-4 h-4' : 'w-4 h-4'} />
                        </button>
                    </form>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes slide-up-message {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up-message {
                    animation: slide-up-message 0.3s ease-out forwards;
                }
                @keyframes accordion-down {
                    from { opacity: 0; max-height: 0; }
                    to { opacity: 1; max-height: 500px; }
                }
                .animate-accordion-down {
                    animation: accordion-down 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default Chatbot;
