export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 지원합니다.' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Vercel 환경 변수에 OPENAI_API_KEY가 설정되지 않았습니다.");

    // req.body는 Vercel 환경에서 자동으로 파싱되지 않을 수 있으므로 FormData를 그대로 전달
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: req.body, // 들어온 FormData를 그대로 패스스루
      duplex: 'half'  // Node 18 이상 fetch 호환성
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Whisper 변환 오류" });
    
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// Next.js/Vercel에서 기본 Body 파싱을 막고 FormData를 원본대로 받기 위함
export const config = {
  api: { bodyParser: false },
};
