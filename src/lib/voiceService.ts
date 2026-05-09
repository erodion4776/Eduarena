
import { logger } from './logger';

class VoiceService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private onStateChange: ((isPlaying: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis;
    }
  }

  setChangeListener(callback: (isPlaying: boolean) => void) {
    this.onStateChange = callback;
  }

  speak(text: string) {
    if (!this.synth) {
      logger.error("Speech Synthesis not supported in this browser.");
      return;
    }

    // Stop current speech
    this.stop();

    // Clean text (remove markdown-style symbols if any, though the specific tutor output is usually clean)
    const cleanText = text.replace(/[*_#]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Tutor Chuks Persona Calibration
    utterance.pitch = 0.9;
    utterance.rate = 0.95;
    utterance.volume = 1;

    // Try to find a good English voice (preferably British or Nigerian if available, default to any English)
    const voices = this.synth.getVoices();
    const englishVoice = voices.find(v => v.lang.includes('en-GB')) || 
                        voices.find(v => v.lang.includes('en-US')) || 
                        voices[0];
    
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      if (this.onStateChange) this.onStateChange(true);
    };

    utterance.onend = () => {
      if (this.onStateChange) this.onStateChange(false);
      this.currentUtterance = null;
    };

    utterance.onerror = (event) => {
      logger.error("Speech Synthesis Error", event);
      if (this.onStateChange) this.onStateChange(false);
      this.currentUtterance = null;
    };

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
      if (this.onStateChange) this.onStateChange(false);
      this.currentUtterance = null;
    }
  }

  isSpeaking() {
    return this.synth?.speaking || false;
  }
}

export const voiceService = new VoiceService();
