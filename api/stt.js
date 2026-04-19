// api/stt.js

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '10mb',
  },
};

// 요청 스트림을 Buffer로 모으는 헬퍼
async function bufferRequest(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 지원합니다.' });
  }

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY 환경 변수가 없습니다.');

    // 1. 원본 요청 바이트를 그대로 버퍼링
    const rawBody = await bufferRequest(req);

    // 2. Content-Type 헤더(boundary 포함)를 그대로 전달 ← 핵심 수정
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': req.headers['content-type'], // boundary 포함!
      },
      body: rawBody,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Whisper API 오류',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
