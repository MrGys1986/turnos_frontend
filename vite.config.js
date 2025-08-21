import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: "window", // 👈 evita "global is not defined"
  },
  optimizeDeps: {
    include: ["sockjs-client", "@stomp/stompjs"],
  },
});
