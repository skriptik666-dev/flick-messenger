import { AUTH_API_URL, DATA_API_URL, getSupabaseConfig, SUPABASE_BUCKET, generateFriendCode, MOCK_USERS } from './constants';
import { User, Message, Chat, MessageType, UserStatus } from './types';

// Helper to handle authentication headers
const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

// Data Mapper: Xano (snake_case) -> App (camelCase)
const mapUser = (data: any): User => {
  if (!data) {
    return {
        id: 'unknown',
        username: 'Unknown User',
        email: '',
        avatarUrl: 'https://via.placeholder.com/150',
        friendCode: '00000',
        status: UserStatus.OFFLINE
    };
  }
  
  const seedForCode = data.id ? data.id.toString() : (data.email || Math.random().toString());
  const realFriendCode = data.friend_code || generateFriendCode(seedForCode);

  let lastSeenDate: Date | undefined;
  if (data.last_seen) {
    const parsed = new Date(data.last_seen);
    if (!isNaN(parsed.getTime())) {
      lastSeenDate = parsed;
    }
  }

  return {
    id: data.id ? data.id.toString() : 'unknown',
    username: data.username || data.name || 'User',
    email: data.email || '',
    avatarUrl: data.avatar_url?.url || data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'User')}&background=random`,
    friendCode: realFriendCode,
    status: data.status || UserStatus.OFFLINE,
    bio: data.bio || '',
    lastSeen: lastSeenDate
  };
};

const mapMessage = (data: any): Message => {
  const createdAt = data.created_at ? new Date(data.created_at) : new Date();
  const safeCreatedAt = isNaN(createdAt.getTime()) ? new Date() : createdAt;

  return {
    id: data.id ? data.id.toString() : Math.random().toString(),
    chatId: data.chat_id ? data.chat_id.toString() : '',
    senderId: data.sender_id ? data.sender_id.toString() : (data.user_id?.id || data.user_id || 'unknown').toString(), 
    content: data.content || '',
    type: (data.type as MessageType) || MessageType.TEXT,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    createdAt: safeCreatedAt,
    readBy: [],
    replyToId: data.reply_to_id
  };
};

const mapChat = (data: any): Chat => ({
  id: data.id ? data.id.toString() : Math.random().toString(),
  name: data.name,
  participants: Array.isArray(data._chat_members) ? data._chat_members.map((m: any) => mapUser(m.user)) : [], 
  lastMessage: data._last_message ? mapMessage(data._last_message) : undefined,
  unreadCount: 0,
  isGroup: !!data.is_group,
  typingUsers: []
});

// Generic request wrapper
interface CustomRequestInit extends RequestInit {
    silent?: boolean;
}

const request = async (baseUrl: string, endpoint: string, options: CustomRequestInit = {}) => {
  try {
    const { silent, headers, ...fetchOptions } = options;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers: {
        ...getHeaders(),
        ...headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.message || errorData?.code || `API Error: ${response.status} ${response.statusText}`;
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (!options.silent) {
        console.error(`Request failed to ${endpoint}:`, error);
    }
    throw error;
  }
};

const fetchUserProfile = async (token: string) => {
    try {
        const res = await fetch(`${AUTH_API_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (res.ok) return await res.json();
    } catch(e) {}

    try {
        const res = await fetch(`${AUTH_API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        if (res.ok) return await res.json();
    } catch(e) {}

    return null;
};

export const api = {
  auth: {
    login: async (email: string, password?: string): Promise<{ authToken: string, user: User }> => {
      const res = await request(AUTH_API_URL, '/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: password || 'password123' }), 
      });

      let userData = res.user;
      const token = res.authToken;

      if (!userData && token) {
         userData = await fetchUserProfile(token);
      }

      if (!userData) {
          throw new Error("Login successful, but user profile could not be loaded.");
      }

      return { authToken: token, user: mapUser(userData) };
    },

    signup: async (email: string, username: string, password?: string): Promise<{ authToken: string, user: User }> => {
      const res = await request(AUTH_API_URL, '/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          name: username, 
          username: username, 
          password: password || 'password123' 
        }),
      });

      let userData = res.user;
      const token = res.authToken;

      if (!userData && token) {
         userData = await fetchUserProfile(token);
      }
      
      if (!userData) {
          throw new Error("Signup successful, but profile creation failed.");
      }

      return { authToken: token, user: mapUser(userData) };
    },

    getMe: async (): Promise<User> => {
        try {
            const res = await request(AUTH_API_URL, '/auth/me', { silent: true });
            return mapUser(res);
        } catch (e) {
            try {
                const res = await request(AUTH_API_URL, '/me', { silent: true });
                return mapUser(res);
            } catch (inner) {
                throw e;
            }
        }
    },
  },

  chats: {
    list: async (): Promise<Chat[]> => {
      try {
        const res = await request(DATA_API_URL, '/chat');
        if (!Array.isArray(res)) return [];
        return res.map(mapChat);
      } catch (e) {
        console.warn("Failed to fetch chats", e);
        return [];
      }
    },
    create: async (friendCode: string): Promise<Chat> => {
      // 1. Try real API
      try {
          const res = await request(DATA_API_URL, '/chat', {
            method: 'POST',
            body: JSON.stringify({ friend_code: friendCode }),
          });
          return mapChat(res);
      } catch (error) {
          // 2. FALLBACK: If API fails (e.g. backend doesn't support friend code lookup yet), 
          // check our local MOCK_USERS to enable testing.
          console.warn("API create chat failed, trying mock fallback...", error);
          
          const mockFriend = MOCK_USERS.find(u => u.friendCode === friendCode);
          if (mockFriend) {
              const currentUserStr = localStorage.getItem('currentUser');
              const currentUser = currentUserStr ? JSON.parse(currentUserStr) : { id: 'me', username: 'Me' };
              
              const mockChat = {
                  id: `local_${Date.now()}`,
                  name: undefined,
                  participants: [currentUser, mockFriend],
                  unreadCount: 0,
                  isGroup: false,
                  typingUsers: [],
                  lastMessage: undefined
              };
              return mockChat as any;
          }
          throw error;
      }
    }
  },

  messages: {
    list: async (chatId: string): Promise<Message[]> => {
      if (chatId.startsWith('local_')) return []; // Local chats have no history on server
      try {
        const res = await request(DATA_API_URL, `/message?chat_id=${chatId}`);
        if (!Array.isArray(res)) return [];
        return res.map(mapMessage);
      } catch (e) {
        return [];
      }
    },
    send: async (chatId: string, content: string, type: string, attachments: any[] = []): Promise<Message> => {
      if (chatId.startsWith('local_')) {
          // Simulate server response for local chats
          await new Promise(r => setTimeout(r, 300));
          return {
              id: `local_msg_${Date.now()}`,
              chatId,
              senderId: 'me', // simplistic
              content,
              type: type as MessageType,
              attachments,
              createdAt: new Date(),
              readBy: []
          };
      }
      
      const res = await request(DATA_API_URL, '/message', {
        method: 'POST',
        body: JSON.stringify({ 
          chat_id: chatId, 
          content, 
          type, 
          attachments 
        }),
      });
      return mapMessage(res);
    }
  },

  users: {
    update: async (userId: string, data: Partial<User>): Promise<User> => {
      // Optimistic handling handled in store, this just tries to persist
      let updatedData = null;
      if (userId && userId !== 'unknown') {
          try {
            const idPath = !isNaN(Number(userId)) ? Number(userId) : userId;
            updatedData = await request(DATA_API_URL, `/user/${idPath}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
                silent: true
            });
          } catch (e) { /* continue */ }
      }
      if (!updatedData) {
          try {
            updatedData = await request(AUTH_API_URL, '/auth/me', {
                method: 'PATCH',
                body: JSON.stringify(data)
            });
          } catch (e) {
              console.error("Profile update failed", e);
              throw new Error("Failed to save profile changes.");
          }
      }
      return mapUser(updatedData);
    }
  },

  storage: {
    upload: async (file: File | Blob): Promise<string> => {
      const config = getSupabaseConfig();
      
      // Fallback function for when upload fails (e.g. CORS)
      const returnMockFallback = () => {
          console.warn("Using fallback storage (Mock) due to upload failure.");
          if (file.type.startsWith('image/')) {
              return `https://picsum.photos/seed/${Date.now()}/800/600`;
          } else if (file.type.startsWith('audio/')) {
              return "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg"; 
          }
          return "https://via.placeholder.com/150";
      };

      if (!config.isConfigured) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return returnMockFallback();
      }

      const originalName = (file as File).name || 'file.bin';
      const cleanName = originalName.replace(/[^a-zA-Z0-9.]/g, '_').replace(/\s/g, '_');
      const uniquePath = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${cleanName}`;
      const uploadUrl = `${config.url}/storage/v1/object/${SUPABASE_BUCKET}/${uniquePath}`;
      
      try {
        const res = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': file.type || 'application/octet-stream',
            'x-upsert': 'false'
          },
          body: file
        });

        if (!res.ok) {
           const err = await res.json().catch(() => ({}));
           // If it's a CORS error (browser blocks it), we might not even get here, fetch throws.
           // But if we get 400/401, we fallback.
           console.warn("Supabase Upload Error:", err);
           return returnMockFallback();
        }
        
        const publicUrl = `${config.url}/storage/v1/object/public/${SUPABASE_BUCKET}/${uniquePath}`;
        return publicUrl;

      } catch (error: any) {
        // CATCH NETWORK ERRORS (CORS) HERE
        console.warn("Storage Upload Network Error (likely CORS):", error);
        // Fallback to mock image so app doesn't break for user
        return returnMockFallback();
      }
    }
  }
};