import { useState } from 'react';
import { getAPOD, searchNASAImages } from '../services/nasaApi';

export const useGroqChat = (apiKey: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processNASACommands = async (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    try {
      if (lowerMessage.includes('today') && 
          (lowerMessage.includes('space pic') || lowerMessage.includes('apod'))) {
        const apod = await getAPOD();
        return `🌟 **${apod.title}**\n\n![${apod.title}](${apod.url})\n\n${apod.explanation}`;
      }
      
      if (lowerMessage.includes('show') || lowerMessage.includes('find') || 
          lowerMessage.includes('search')) {
        const searchTerms = message.replace(/show|find|search|me|some|pictures|photos|of/gi, '').trim();
        if (searchTerms) {
          const images = await searchNASAImages(searchTerms);
          if (images.length === 0) return "No space media found for that topic—want to try another term?";
          
          return images.map(img => 
            `🛸 **${img.title}**\n![${img.title}](${img.thumbnail})\n[View Full Image](${img.href})\n\n`
          ).join('');
        }
      }
      return null;
    } catch (err) {
      console.error('NASA API Error:', err);
      return null;
    }
  };

  const sendMessage = async (messages: Array<{ role: string; content: string }>) => {
    if (!apiKey) {
      setError("No API key provided");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check for NASA-specific commands first
      const nasaResponse = await processNASACommands(messages[messages.length - 1].content);
      if (nasaResponse) {
        setIsLoading(false);
        return nasaResponse;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content: 'You are a knowledgeable space weather assistant. Provide accurate, engaging information about solar phenomena, space weather events, and their impacts on Earth. Use clear, accessible language while maintaining scientific accuracy.'
            },
            ...messages
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from Groq');
      }

      const data = await response.json();
      return data.choices[0].message.content;

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { sendMessage, isLoading, error };
};
