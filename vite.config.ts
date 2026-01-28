import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ВАЖНО: Это название твоего репозитория на GitHub.
  // Если назовешь репозиторий по-другому, поменяй эту строчку.
  base: '/flick-messenger/', 
  server: {
    host: true, // Expose to network (for mobile testing)
    port: 3000
  }
});