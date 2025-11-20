import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { NewsArticle, ChatMessage } from '../types';
import { SendIcon } from './icons/SendIcon';
import { CloseIcon } from './icons/CloseIcon';
import { StarIcon } from './icons/StarIcon';

const Chatbot: React.FC<{ isOpen: boolean, onClose: () => void, article: NewsArticle | null }> = ({ isOpen, onClose, article }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatSession = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && article) {
            if (!process.env.API_KEY) {
                console.warn("Chatbot: API Key missing, using mock mode.");
                setMessages([{
                    role: 'model',
                    parts: [{ text: `[MODE DÉMO] Je suis prêt à analyser "${article.headline}". Posez-moi une question sur cet article (Réponses simulées).` }]
                }]);
                setTimeout(() => inputRef.current?.focus(), 400);
                return;
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const systemInstruction = `Tu es PRISM AI, un analyste expert en géopolitique et média. Tu analyses l'article "${article.headline}". Réponds de manière concise, neutre et factuelle.`;

            chatSession.current = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: { systemInstruction },
            });
            setMessages([{
                role: 'model',
                parts: [{ text: `Je suis prêt à analyser "${article.headline}". Quel aspect souhaitez-vous approfondir ?` }]
            }]);
            setTimeout(() => inputRef.current?.focus(), 400);
        } else {
            setMessages([]);
            setUserInput('');
        }
    }, [isOpen, article]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', parts: [{ text: userInput }] };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        if (!process.env.API_KEY) {
            setTimeout(() => {
                const mockResponses = [
                    "Ceci est une réponse simulée. L'article soulève des points intéressants sur les conséquences économiques.",
                    "En l'absence de connexion neuronale (API Key manquante), je ne peux qu'acquiescer.",
                    "Tout à fait fascinant. Voudriez-vous explorer les implications à long terme ?",
                    "D'après mes données (simulées), c'est un sujet clivant."
                ];
                const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
                setMessages(prev => [...prev, { role: 'model', parts: [{ text: `[DÉMO] ${randomResponse}` }] }]);
                setIsLoading(false);
            }, 1000);
            return;
        }

        if (!chatSession.current) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await chatSession.current.sendMessage({ message: userInput });
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: response.text }] }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Erreur de connexion au serveur neuronal." }] }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-center pointer-events-none">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto animate-fade-in cursor-pointer"
                onClick={onClose}
            >
                <div className="absolute top-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full">
                    <span className="text-[11px] font-medium text-white/80 uppercase tracking-wider">Tap pour fermer</span>
                </div>
            </div>

            <div className="pointer-events-auto w-full sm:max-w-md h-[85vh] sm:h-[600px] bg-[#121212] sm:rounded-3xl rounded-t-3xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-slide-up relative">
                <header className="p-3 border-b border-white/10 bg-[#121212]/90 backdrop-blur flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-neon-accent rounded-full animate-pulse"></div>
                        <h2 className="text-xs font-bold tracking-widest uppercase text-gray-300">PRISM AI</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
                        <CloseIcon className="w-4 h-4 text-gray-400" />
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto pt-4 pb-4 px-4 space-y-4 bg-[#0a0a0a]">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-neon-accent text-black font-medium rounded-br-none'
                                    : 'bg-white/10 text-gray-100 border border-white/5 rounded-bl-none'
                                }`}>
                                {msg.parts[0].text}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/5 rounded-2xl rounded-bl-none p-4 flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-[#121212] border-t border-white/10">
                    <form onSubmit={handleSendMessage} className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            placeholder="Poser une question..."
                            className="w-full bg-white/5 border border-white/10 rounded-full py-3.5 pl-5 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-neon-accent/50 transition-colors"
                        />
                        <button
                            type="submit"
                            disabled={!userInput.trim() || isLoading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-neon-accent hover:bg-neon-accent/10 rounded-full transition-colors disabled:opacity-50"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Chatbot;
