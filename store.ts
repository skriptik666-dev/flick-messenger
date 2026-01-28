import { create } from 'zustand';
import { User, Chat, Message, UserStatus, MessageType } from './types';
import { api } from './api';

interface AppState {
  // UI State
  introPlayed: boolean;
  setIntroPlayed: (played: boolean) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  
  // Settings UI State
  isSettingsOpen: boolean;
  setSettingsOpen: (isOpen: boolean) => void;
  notificationsEnabled: boolean;
  toggleNotifications: () => void;

  // Auth State
  currentUser: User | null;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, username: string, password?: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;

  // Data State
  chats: Chat[];
  activeChatId: string | null;
  messages: Record<string, Message[]>; // Keyed by ChatID
  
  // Actions
  setActiveChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string, type: MessageType, attachments?: any[]) => void;
  createChat: (friendCode: string) => Promise<boolean>;
}

export const useStore = create<AppState>((set, get) => ({
  introPlayed: false,
  setIntroPlayed: (played) => set({ introPlayed: played }),
  
  // Initialize from LocalStorage
  isDarkMode: localStorage.getItem('theme') === 'dark',
  
  toggleTheme: () => set((state) => {
    const newMode = !state.isDarkMode;
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    return { isDarkMode: newMode };
  }),
  
  isMobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ isMobileMenuOpen: open }),

  isSettingsOpen: false,
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  
  notificationsEnabled: true,
  toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),

  currentUser: null,
  
  login: async (email, password) => {
    try {
      const { authToken, user } = await api.auth.login(email, password);
      localStorage.setItem('authToken', authToken);
      set({ currentUser: user });
      
      // Fetch Chats after login
      try {
        const chats = await api.chats.list();
        set({ chats });
      } catch (e) { console.warn("Could not fetch chats", e); }

    } catch (error) {
      console.error("Login Failed:", error);
      throw error;
    }
  },

  signup: async (email, username, password) => {
    try {
      const { authToken, user } = await api.auth.signup(email, username, password);
      localStorage.setItem('authToken', authToken);
      set({ currentUser: user });
    } catch (error) {
      console.error("Signup Failed:", error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    set({ currentUser: null, activeChatId: null, chats: [], isSettingsOpen: false });
  },

  updateUserProfile: async (updates) => {
    const currentUser = get().currentUser;
    if (!currentUser) return;

    const previousUser = { ...currentUser };

    // Optimistically update UI
    set((state) => ({
      currentUser: state.currentUser ? { ...state.currentUser, ...updates } : null
    }));

    try {
      // Actually save to server
      const updatedUser = await api.users.update(currentUser.id, updates);
      set({ currentUser: updatedUser });
    } catch (e) {
      console.error("Profile update failed", e);
      // Revert if failed
      set({ currentUser: previousUser });
      throw e;
    }
  },

  chats: [],
  activeChatId: null,
  messages: {},

  setActiveChat: async (chatId) => {
    set({ activeChatId: chatId, isMobileMenuOpen: false });
    
    // Check if we already have messages or if we need to fetch
    // (Always fetch to get latest, but UI is instant)
    try {
      const messages = await api.messages.list(chatId);
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: messages
        }
      }));
    } catch (e) {
       console.warn("Failed to fetch messages for chat", chatId);
    }
  },

  sendMessage: async (chatId, content, type, attachments = []) => {
    const { currentUser } = get();
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create optimistic message
    const newMessage: Message = {
      id: tempId,
      chatId,
      senderId: currentUser?.id || 'me',
      content,
      type,
      attachments,
      createdAt: new Date(),
      readBy: []
    };

    // 1. Optimistic Update
    set((state) => {
      const chatMessages = state.messages[chatId] || [];
      return {
        messages: {
          ...state.messages,
          [chatId]: [...chatMessages, newMessage]
        },
        chats: state.chats.map(c => 
          c.id === chatId ? { ...c, lastMessage: newMessage } : c
        )
      };
    });

    // 2. Send to API
    try {
      const savedMessage = await api.messages.send(chatId, content, type, attachments);
      
      // Replace temp message with real one
      set((state) => {
          const chatMessages = state.messages[chatId] || [];
          return {
              messages: {
                  ...state.messages,
                  [chatId]: chatMessages.map(m => m.id === tempId ? savedMessage : m)
              },
              chats: state.chats.map(c => 
                c.id === chatId ? { ...c, lastMessage: savedMessage } : c
              )
          };
      });
    } catch (e) {
      console.error("Failed to send message", e);
      // Remove the failed message
      set((state) => {
        const chatMessages = state.messages[chatId] || [];
        return {
            messages: {
                ...state.messages,
                [chatId]: chatMessages.filter(m => m.id !== tempId)
            }
        };
      });
      // Optionally notify user via a toast
    }
  },

  createChat: async (friendCode) => {
    try {
      const newChat = await api.chats.create(friendCode);
      set((state) => ({
        chats: [newChat, ...state.chats],
        activeChatId: newChat.id
      }));
      return true;
    } catch (e) {
      console.error("API Create Chat failed", e);
      return false;
    }
  }
}));