export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  VOICE = 'VOICE',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM'
}

export enum UserStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  AWAY = 'AWAY',
  BUSY = 'BUSY'
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  friendCode: string; // Unique generated code
  status: UserStatus;
  bio?: string; // Profile description
  lastSeen?: Date;
}

export interface Attachment {
  id: string;
  type: 'image' | 'video' | 'file' | 'audio';
  url: string; // Cloudflare R2 / Backblaze URL
  name: string;
  size: number;
  mimeType: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  attachments?: Attachment[];
  createdAt: Date;
  readBy: string[]; // Array of user IDs
  replyToId?: string;
}

export interface Chat {
  id: string;
  name?: string; // For groups
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  typingUsers: string[]; // IDs of users currently typing
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}