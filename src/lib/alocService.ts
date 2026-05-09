
/**
 * ALOC API Connector for Live Neural Hub
 */
export const alocService = {
  async fetchLiveQuestion(subject: string = 'english', type: string = 'jamb') {
    const ACCESS_TOKEN = 'ALOC-84eb83db941bfc4c524c';
    const url = `https://questions.aloc.com.ng/api/v2/q?subject=${subject}&type=${type}`;

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
      return data.data; // Returns the question object
    } catch (error) {
      console.error("ALOC Service Error:", error);
      throw error;
    }
  }
};
