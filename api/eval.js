// 용량 제한을 10MB로 늘리는 Vercel 전용 설정
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 지원합니다.' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Vercel 환경 변수에 OPENAI_API_KEY가 없습니다.");

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: req.body.messages,
        response_format: { type: "json_object" },
        max_tokens: 500
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "OpenAI API 오류" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
