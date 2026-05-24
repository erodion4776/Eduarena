import { ALOCQuestion } from '../types';

/**
 * ALOC API Connector for Live Neural Hub
 */
export const alocService = {
  async fetchLiveQuestions(subject: string = 'english', type: string = 'utme', year?: string, count: number = 1) {
    let url = `/api/aloc/q/${count}?subject=${subject}&type=${type}`;
    
    if (year && year !== 'all' && year !== '') {
      url += `&year=${year}`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ALOC_API_REJECT: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !data.data) {
        return [];
      }
      
      const normalizeQuestion = (q: any): ALOCQuestion => {
        if (!q) return {} as ALOCQuestion;
        let imgUrl = q.image;
        if (!imgUrl || (typeof imgUrl === 'string' && imgUrl.trim() === '')) {
          imgUrl = undefined;
        }

        return {
          ...q,
          image: imgUrl,
          subject: subject,
          source: 'live' as const
        };
      };

      const normalized = Array.isArray(data.data) 
        ? data.data.map(normalizeQuestion).filter((q: any) => q && q.id) 
        : (data.data ? [normalizeQuestion(data.data)].filter(q => q && q.id) : []);

      return normalized;
    } catch (error) {
      console.error("ALOC Service Error:", error);
      throw error;
    }
  }
};
