export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 지원합니다.' });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Vercel 환경 변수에 OPENAI_API_KEY가 설정되지 않았습니다.");

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
    
    // OpenAI 측에서 에러를 뱉었을 경우
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "OpenAI API 연동 오류" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
