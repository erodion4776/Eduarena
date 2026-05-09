import { ALOCQuestion } from '../types';

const VAULT_KEY = 'EDU_ARENA_LOCAL_VAULT';

export const cacheService = {
  saveToLocalVault(question: ALOCQuestion) {
    try {
      const vaultStr = localStorage.getItem(VAULT_KEY);
      const vault: ALOCQuestion[] = vaultStr ? JSON.parse(vaultStr) : [];
      
      // Check for duplicates
      if (!vault.some(q => q.id === question.id)) {
        vault.push(question);
        localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
      }
    } catch (e) {
      console.error('Vault Save Error:', e);
    }
  },

  fetchFromLocalVault(subject: string, examType?: string, year?: string): ALOCQuestion | null {
    try {
      const vaultStr = localStorage.getItem(VAULT_KEY);
      if (!vaultStr) return null;
      
      let vault: ALOCQuestion[] = JSON.parse(vaultStr);
      
      // Filter based on available criteria
      let filtered = vault.filter(q => q.subject?.toLowerCase() === subject.toLowerCase());
      
      if (examType) {
        filtered = filtered.filter(q => q.examType?.toLowerCase() === examType.toLowerCase());
      }
      
      if (year) {
        filtered = filtered.filter(q => q.examyear === year);
      }

      if (filtered.length === 0) return null;
      
      // Return a random one from the filtered set
      const randomIndex = Math.floor(Math.random() * filtered.length);
      return filtered[randomIndex];
    } catch (e) {
      console.error('Vault Fetch Error:', e);
      return null;
    }
  },

  getVaultStats() {
    try {
      const vaultStr = localStorage.getItem(VAULT_KEY);
      const vault: ALOCQuestion[] = vaultStr ? JSON.parse(vaultStr) : [];
      
      const countsBySubject: Record<string, number> = {};
      vault.forEach(q => {
        const sub = q.subject || 'unknown';
        countsBySubject[sub] = (countsBySubject[sub] || 0) + 1;
      });

      return {
        total: vault.length,
        bySubject: countsBySubject
      };
    } catch (e) {
      return { total: 0, bySubject: {} };
    }
  }
};
