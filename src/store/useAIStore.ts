import { create } from 'zustand';

export interface Message {
  id: string;
  sender: 'tutor' | 'student';
  text: string;
  source?: string;
  timestamp: number;
}

interface AIState {
  isChatOpen: boolean;
  toggleChat: () => void;
  messages: Message[];
  addMessage: (msg: Message) => void;
}

export const useAIStore = create<AIState>((set) => ({
  isChatOpen: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  messages: [
    {
      id: 'welcome',
      sender: 'tutor',
      text: "Ah, welcome! I'm Tutor Chuks. Which universities are you targeting? Let's do a quick diagnostic.",
      timestamp: Date.now()
    }
  ],
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] }))
}));
