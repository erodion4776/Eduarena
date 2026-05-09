import { ALOCQuestion } from '../types';

/**
 * ALOC API Connector for Live Neural Hub
 */
export const alocService = {
  async fetchLiveQuestions(subject: string = 'english', type: string = 'utme', year?: string, count: number = 1) {
    const ACCESS_TOKEN = 'ALOC-84eb83db941bfc4c524c';
    let url = `https://questions.aloc.com.ng/api/v2/q/${count}?subject=${subject}&type=${type}`;
    
    if (year && year !== 'all' && year !== '') {
      url += `&year=${year}`;
    }

    // Cache buster
    url += `&cb=${Date.now()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'AccessToken': ACCESS_TOKEN,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`ALOC_API_REJECT: ${response.status}`);
      }

      const data = await response.json();
      
      const normalizeQuestion = (q: any): ALOCQuestion => {
        let imgUrl = q.image;
        if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim() !== '') {
           if (!imgUrl.startsWith('http')) {
             imgUrl = `https://questions.aloc.com.ng/storage/questions/${imgUrl.trim()}`;
           }
        } else {
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
        ? data.data.map(normalizeQuestion) 
        : [normalizeQuestion(data.data)];

      return normalized;
    } catch (error) {
      console.error("ALOC Service Error:", error);
      throw error;
    }
  }
};
