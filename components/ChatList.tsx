import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Plus, Search, Settings, QrCode } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserStatus } from '../types';

const StatusBadge: React.FC<{ status: UserStatus }> = ({ status }) => {
  const colors = {
    [UserStatus.ONLINE]: 'bg-green-500',
    [UserStatus.OFFLINE]: 'bg-gray-400',
    [UserStatus.BUSY]: 'bg-red-500',
    [UserStatus.AWAY]: 'bg-yellow-500',
  };
  return <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${colors[status] || colors[UserStatus.OFFLINE]}`} />;
};

export const ChatList: React.FC = () => {
  const { chats, currentUser, activeChatId, setActiveChat, createChat, setSettingsOpen } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  const handleCreateChat = async () => {
    if (!friendCode) return;
    setLoadingChat(true);
    const success = await createChat(friendCode);
    setLoadingChat(false);
    
    if (success) {
      setIsAdding(false);
      setFriendCode('');
    } else {
      alert("User not found! Try these codes: 12849, 88392, 33421");
    }
  };

  // Sort chats by latest message, then filter by search
  const sortedAndFilteredChats = useMemo(() => {
    const sorted = [...chats].sort((a, b) => {
        const dateA = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const dateB = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    if (!searchTerm) return sorted;

    return sorted.filter(chat => {
        // Find other user to check name
        const other = chat.participants.find(p => p.id !== currentUser?.id) || chat.participants[0];
        return other?.username.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [chats, currentUser?.id, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-gray-100 dark:bg-gray-900 dark:border-gray-800 transition-colors duration-300">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={currentUser?.avatarUrl} alt="Me" className="w-10 h-10 rounded-full object-cover shadow-sm" />
              <StatusBadge status={currentUser?.status || UserStatus.ONLINE} />
            </div>
            <div>
                <h2 className="font-bold text-gray-800 dark:text-gray-100 leading-tight">@{currentUser?.username}</h2>
                <p className="text-[10px] text-gray-500 font-mono tracking-wider bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md inline-block mt-0.5">#{currentUser?.friendCode}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="p-2 bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
            >
              <Plus className={`w-5 h-5 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
            </button>
          </div>
        </div>

        {/* Search / Add Friend */}
        <div className="relative mb-2">
          {isAdding ? (
            <div className="animate-fade-in flex gap-2">
                 <div className="relative flex-1">
                    <input 
                        type="number"
                        placeholder="Friend Code (e.g. 12849)"
                        value={friendCode}
                        onChange={(e) => setFriendCode(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateChat()}
                        className="w-full bg-gray-100 dark:bg-gray-800 dark:text-gray-200 rounded-2xl py-2.5 px-4 text-sm outline-none border border-brand-200 focus:border-brand-500 focus:bg-white dark:focus:bg-gray-700 transition-all appearance-none"
                        autoFocus
                        disabled={loadingChat}
                    />
                 </div>
                 <button className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-500 hover:text-brand-500 transition-colors">
                    <QrCode className="w-5 h-5" />
                 </button>
            </div>
          ) : (
            <>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search chats..."
                    className="w-full bg-gray-100 dark:bg-gray-800 dark:text-gray-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none border border-transparent focus:border-brand-300 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder-gray-400 text-gray-700"
                />
            </>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-2">
        {sortedAndFilteredChats.map((chat) => {
          // Robust logic to find the 'other' user
          const otherUser = chat.participants.find(p => p.id !== currentUser?.id) || chat.participants[0];
          
          if (!otherUser) return null;

          const isActive = chat.id === activeChatId;
          const timeDisplay = chat.lastMessage?.createdAt 
            ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })
            : '';
          
          return (
            <motion.button
              key={chat.id}
              layout
              onClick={() => setActiveChat(chat.id)}
              className={`w-full p-3 rounded-2xl flex items-center gap-3 transition-all ${isActive ? 'bg-brand-50 shadow-sm dark:bg-brand-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <div className="relative shrink-0">
                <img src={otherUser.avatarUrl} alt={otherUser.username} className="w-12 h-12 rounded-full object-cover" />
                <StatusBadge status={otherUser.status} />
              </div>
              
              <div className="flex-1 text-left min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className={`font-semibold text-sm truncate ${isActive ? 'text-brand-900 dark:text-brand-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {otherUser.username}
                  </span>
                  {timeDisplay && (
                    <span className="text-[10px] text-gray-400 shrink-0 ml-2">
                        {timeDisplay}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-0.5">
                    <p className={`text-xs truncate max-w-[140px] ${isActive ? 'text-brand-700 dark:text-brand-400 font-medium' : 'text-gray-500'}`}>
                        {chat.typingUsers.length > 0 
                            ? <span className="text-brand-500 italic">Typing...</span> 
                            : chat.lastMessage?.content || "No messages yet"}
                    </p>
                    {chat.unreadCount > 0 && (
                        <span className="bg-brand-500 text-white text-[10px] font-bold px-1.5 h-4 min-w-[1rem] flex items-center justify-center rounded-full">
                            {chat.unreadCount}
                        </span>
                    )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};