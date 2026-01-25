import axios from 'axios';

const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;

export const getVideoDuration = async (videoUrl) => {
  try {
    // Extrai o ID do vídeo da URL (funciona com embed e watch)
    const videoId = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/\s]{11})/)[1];
    
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=contentDetails&key=${API_KEY}`
    );

    const durationISO = response.data.items[0].contentDetails.duration; // Ex: PT5M30S
    return parseISO8601Duration(durationISO);
  } catch (error) {
    console.error("Erro ao buscar duração:", error);
    return 0;
  }
};

// Converte o formato do YouTube (PT#M#S) para minutos decimais
function parseISO8601Duration(duration) {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return hours * 60 + minutes + seconds / 60;
}