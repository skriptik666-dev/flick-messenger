import { User, UserStatus } from './types';

export const APP_NAME = "Flick";
export const APP_VERSION = "1.0.1";

// Xano API Base URLs
export const AUTH_API_URL = "https://x8ki-letl-twmt.n7.xano.io/api:ehV-wnmI";
export const DATA_API_URL = "https://x8ki-letl-twmt.n7.xano.io/api:0D9n7dZ_";

// Supabase Storage Configuration
// Updated with user credentials
export const DEFAULT_SUPABASE_PROJECT_URL = "https://yypehvatwtmwtrzuqwpc.supabase.co";
export const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5cGVodmF0d3Rtd3RyenVxd3BjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MDQ4NjMsImV4cCI6MjA4NTE4MDg2M30.Q74-YquiLtGFR1qDkLO6tcoihSrXdhaQsMcQXjcDFyI"; 
export const SUPABASE_BUCKET = "flick-uploads"; 

// Helper to get configuration (Code > LocalStorage > Default)
export const getSupabaseConfig = () => {
  const storedUrl = localStorage.getItem('supabase_project_url');
  const storedKey = localStorage.getItem('supabase_anon_key');

  // If local storage has valid keys, use them, otherwise use the hardcoded defaults
  const url = storedUrl && storedUrl.length > 20 ? storedUrl : DEFAULT_SUPABASE_PROJECT_URL;
  const key = storedKey && storedKey.length > 20 ? storedKey : DEFAULT_SUPABASE_ANON_KEY;

  return { 
    url, 
    key,
    // It is configured if the key doesn't contain the placeholder text
    isConfigured: !url.includes("YOUR_SUPABASE") && !key.includes("YOUR_SUPABASE")
  };
};

// Deterministic Friend Code Generator: 5-Digit Numeric Code
export const generateFriendCode = (seed?: string): string => {
  if (!seed) return Math.floor(10000 + Math.random() * 90000).toString();
  
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  
  const positiveHash = Math.abs(hash);
  const code = (positiveHash % 90000) + 10000;
  
  return code.toString();
};

export const MOCK_USERS: User[] = [
  {
    id: 'u2',
    username: 'AnimeFan99',
    email: 'fan@example.com',
    avatarUrl: 'https://picsum.photos/200/200?random=2',
    friendCode: '12849',
    status: UserStatus.ONLINE,
  },
  {
    id: 'u3',
    username: 'DevMaster',
    email: 'dev@example.com',
    avatarUrl: 'https://picsum.photos/200/200?random=3',
    friendCode: '88392',
    status: UserStatus.OFFLINE,
    lastSeen: new Date(),
  },
  {
    id: 'u4',
    username: 'DesignQueen',
    email: 'design@example.com',
    avatarUrl: 'https://picsum.photos/200/200?random=4',
    friendCode: '33421',
    status: UserStatus.AWAY,
  }
];