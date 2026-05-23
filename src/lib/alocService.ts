import { ALOCQuestion } from '../types';

/**
 * ALOC API Connector for Live Neural Hub
 */
export const alocService = {
  async fetchLiveQuestions(subject: string = 'english', type: string = 'utme', year?: string, count: number = 1) {
    // Subject Mapping for ALOC API
    const mapping: Record<string, string> = {
      'civiledu': 'civil',
      'crk': 'religious',
      'crs': 'religious',
      'irs': 'religious',
      'literature': 'literature',
      'fineart': 'fineart'
    };

    const apiSubject = mapping[subject.toLowerCase()] || subject.toLowerCase();
    let url = `/api/external/aloc?subject=${apiSubject}&type=${type}&count=${count}`;
    
    if (year && year !== 'all' && year !== '') {
      url += `&year=${year}`;
    }

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`ALOC_PROXY_REJECT: ${response.status}`);
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
