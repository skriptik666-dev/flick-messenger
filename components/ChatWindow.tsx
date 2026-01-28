import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Send, Paperclip, Mic, Image as ImageIcon, Smile, MoreVertical, Phone, Video, Trash2, Square, Play, Pause, Loader2 } from 'lucide-react';
import { MessageType, User, UserStatus } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api';

// --- Custom Audio Player Component ---
const AudioMessage: React.FC<{ src: string; isMe: boolean }> = ({ src, isMe }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
            setProgress((audio.currentTime / audio.duration) * 100);
        }
    };
    
    const onEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const onLoadedMetadata = () => {
        if (!isNaN(audio.duration) && audio.duration !== Infinity) {
            setDuration(audio.duration);
        }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
        audio.pause();
        audio.removeEventListener('timeupdate', onTimeUpdate);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [src]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
        audioRef.current.pause();
    } else {
        audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className={`flex items-center gap-3 min-w-[200px] ${isMe ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
        <audio ref={audioRef} src={src} preload="metadata" />
        <button 
            onClick={togglePlay}
            className={`p-2 rounded-full shrink-0 transition-colors ${
                isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-brand-100 hover:bg-brand-200 text-brand-600 dark:bg-gray-700 dark:text-brand-400 dark:hover:bg-gray-600'
            }`}
        >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
        <div className="flex-1 flex flex-col justify-center gap-1">
            <div className={`h-1 rounded-full overflow-hidden w-full ${isMe ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-600'}`}>
                <div 
                    className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-brand-500'}`} 
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className={`text-[10px] font-medium ${isMe ? 'text-white/80' : 'text-gray-400 dark:text-gray-400'}`}>
                {isPlaying ? formatTime(audioRef.current?.currentTime || 0) : formatTime(duration)}
            </div>
        </div>
    </div>
  );
};

// --- Main ChatWindow Component ---
export const ChatWindow: React.FC = () => {
  const { activeChatId, chats, messages, sendMessage, setMobileMenuOpen, currentUser } = useStore();
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const activeChat = chats.find(c => c.id === activeChatId);
  // Find other user: logic is find participant that is NOT me, or default to first if somehow fail
  const otherUser = activeChat?.participants.find(p => p.id !== currentUser?.id) || activeChat?.participants[0];
  const activeMessages = activeChatId ? messages[activeChatId] || [] : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeChatId]); // Only scroll on new messages or chat change

  // Clean up timer on unmount
  useEffect(() => {
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
          }
      };
  }, []);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim()) || !activeChatId) return;
    
    sendMessage(activeChatId, inputText, MessageType.TEXT);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && activeChatId) {
        const file = e.target.files[0];
        setIsUploading(true);
        try {
            const url = await api.storage.upload(file);
            const type = file.type.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE;
            
            const attachment = {
                id: Math.random().toString(),
                type: type === MessageType.IMAGE ? 'image' : 'file' as any,
                url: url,
                name: file.name,
                size: file.size,
                mimeType: file.type
            };
    
            sendMessage(activeChatId, '', type, [attachment]);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload file. Check console for details.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }
  };

  // --- Recording Logic ---

  const startRecording = async () => {
    // Check for HTTP/HTTPS restrictions
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Voice messages require a secure connection (HTTPS) or localhost. They are disabled on HTTP LAN (192.168.x.x).");
        return;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        timerRef.current = window.setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);

    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopAndSendRecording = () => {
    if (mediaRecorderRef.current && isRecording && activeChatId) {
         mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            setIsUploading(true);
            try {
                const audioUrl = await api.storage.upload(audioBlob);
                
                const attachment = {
                    id: Math.random().toString(),
                    type: 'audio' as any,
                    url: audioUrl,
                    name: 'Voice Message',
                    size: audioBlob.size,
                    mimeType: 'audio/webm'
                };
                
                sendMessage(activeChatId, '', MessageType.VOICE, [attachment]);
            } catch (error) {
                console.error("Audio upload failed", error);
                alert("Failed to send voice message.");
            } finally {
                setIsUploading(false);
            }
            
            // Cleanup
            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
         };
         
         mediaRecorderRef.current.stop();
         setIsRecording(false);
         if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.onstop = () => {
            // Just cleanup tracks, don't send
            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getLastSeenText = (user: User) => {
    if (user.status === UserStatus.ONLINE) return 'Active now';
    if (user.lastSeen) {
        const lastSeenDate = new Date(user.lastSeen);
        if (isNaN(lastSeenDate.getTime())) return 'Offline';

        const now = new Date();
        const diffMs = now.getTime() - lastSeenDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Last seen just now';

        const isToday = lastSeenDate.getDate() === now.getDate() && 
                        lastSeenDate.getMonth() === now.getMonth() && 
                        lastSeenDate.getFullYear() === now.getFullYear();
        
        const timeString = lastSeenDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (isToday) return `Last seen today at ${timeString}`;
        return `Last seen ${lastSeenDate.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${timeString}`;
    }
    return 'Offline';
  };

  if (!activeChat || !otherUser) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50/50 dark:bg-gray-950 p-8 text-center transition-colors">
        <div className="w-24 h-24 bg-brand-100 dark:bg-brand-900/20 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Send className="w-10 h-10 text-brand-400 dark:text-brand-500 ml-1 mt-1" />
        </div>
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">It's quiet here...</h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">Select a chat from the sidebar or add a new friend using their Friend Code to start messaging.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-gray-950 transition-colors">
      {/* Top Bar */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 z-10 sticky top-0 transition-colors">
        <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-500 dark:text-gray-400" onClick={() => setMobileMenuOpen(true)}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <img src={otherUser.avatarUrl} alt={otherUser.username} className="w-10 h-10 rounded-full object-cover shadow-sm" />
            <div>
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">{otherUser.username}</h3>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md opacity-70">
                        #{otherUser.friendCode}
                    </span>
                </div>
                <span className={`text-xs font-medium ${otherUser.status === UserStatus.ONLINE ? 'text-brand-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {getLastSeenText(otherUser)}
                </span>
            </div>
        </div>
        <div className="flex items-center gap-4 text-brand-500">
            <button className="p-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full transition-colors"><Phone className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full transition-colors"><Video className="w-5 h-5" /></button>
            <button className="p-2 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-full transition-colors text-gray-400 dark:text-gray-500"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeMessages.map((msg, idx) => {
            const isMe = msg.senderId === currentUser?.id || msg.senderId === 'me';
            const showAvatar = !isMe && (idx === 0 || activeMessages[idx - 1].senderId !== msg.senderId);

            return (
                <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}
                >
                    {!isMe && (
                        <div className="w-8 h-8 mr-2 flex-shrink-0">
                            {showAvatar ? <img src={otherUser.avatarUrl} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8" />}
                        </div>
                    )}
                    
                    <div className={`max-w-[85%] sm:max-w-[70%] relative`}>
                        {/* Attachments */}
                        {msg.type === MessageType.IMAGE && msg.attachments?.[0] && (
                            <div className={`rounded-2xl overflow-hidden mb-1 shadow-sm border-4 ${isMe ? 'border-brand-500' : 'border-white dark:border-gray-800'}`}>
                                <img src={msg.attachments[0].url} alt="attachment" className="w-full h-auto" />
                            </div>
                        )}
                        
                        {/* Message Bubble Content */}
                        <div className={`
                            px-4 py-2.5 rounded-2xl text-[15px] shadow-sm
                            ${isMe 
                                ? 'bg-brand-500 text-white rounded-br-none' 
                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-700'}
                        `}>
                            {msg.type === MessageType.VOICE && msg.attachments?.[0] ? (
                                <AudioMessage src={msg.attachments[0].url} isMe={isMe} />
                            ) : (
                                <span>{msg.content}</span>
                            )}
                        </div>
                        
                        <div className={`text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 ${isMe ? 'right-0' : 'left-0'} text-gray-400 dark:text-gray-500 whitespace-nowrap`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                        </div>
                    </div>
                </motion.div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-4xl mx-auto">
            {isUploading && (
                <div className="absolute bottom-full left-0 w-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs py-1 px-4 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading media...
                </div>
            )}
            
            {isRecording ? (
                /* Recording UI */
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-3xl px-4 py-2"
                >
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-500 font-mono font-medium min-w-[40px]">
                        {formatDuration(recordingDuration)}
                    </span>
                    
                    {/* Fake Waveform Visual */}
                    <div className="flex-1 flex items-center justify-center gap-1 h-8 overflow-hidden mx-2 opacity-50">
                        {[...Array(20)].map((_, i) => (
                             <div 
                                key={i} 
                                className="w-1 bg-red-400 rounded-full animate-bounce"
                                style={{ 
                                    height: `${Math.random() * 100}%`,
                                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                                    animationDelay: `${i * 0.05}s`
                                }}
                             />
                        ))}
                    </div>

                    <button 
                        onClick={cancelRecording}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title="Cancel"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <button 
                        onClick={stopAndSendRecording}
                        className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg shadow-brand-500/30 transition-all transform hover:scale-105 active:scale-95"
                        title="Send Voice Message"
                    >
                         <Send className="w-5 h-5 ml-0.5" />
                    </button>
                </motion.div>
            ) : (
                /* Default Input UI */
                <form onSubmit={handleSend} className="flex items-end gap-2">
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            onChange={handleFileUpload}
                            accept="image/*,application/pdf"
                        />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" disabled={isUploading}>
                            <Paperclip className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="hidden sm:block p-2 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors" disabled={isUploading}>
                            <ImageIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-3xl flex items-center px-4 py-2 border border-transparent focus-within:border-brand-300 focus-within:bg-white dark:focus-within:bg-gray-700 transition-all shadow-inner">
                        <input 
                            type="text" 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a message..."
                            className="flex-1 bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 min-h-[24px]"
                            disabled={isUploading}
                        />
                        <button type="button" className="text-gray-400 hover:text-brand-500 ml-2">
                            <Smile className="w-5 h-5" />
                        </button>
                    </div>

                    {inputText.trim() ? (
                        <button 
                            type="submit"
                            className="mb-0.5 p-3 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg shadow-brand-500/30 transition-all transform hover:scale-105 active:scale-95"
                            disabled={isUploading}
                        >
                            <Send className="w-5 h-5 ml-0.5" />
                        </button>
                    ) : (
                        <button 
                            type="button"
                            onClick={startRecording}
                            className="mb-0.5 p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-brand-500 rounded-full transition-colors"
                            disabled={isUploading}
                        >
                            <Mic className="w-5 h-5" />
                        </button>
                    )}
                </form>
            )}
        </div>
      </div>
    </div>
  );
};