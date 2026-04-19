import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = "https://api.anthropic.com/v1/messages";

async function callClaude(userPrompt, systemPrompt) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  return data.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

const DIAL_CHARS = ["???", "◆◆◆", "▲▲▲", "●●●", "■■■", "★★★", "◇◇◇"];

const TEXT = {
  ko: {
    title: "스무고개",
    subtitle: "AI와 함께하는 단어 맞추기",
    chooseMode: "언어를 선택하세요",
    korean: "한국어",
    english: "영어",
    thinking: "생각중",
    wordReady: "단어 생각 완료!",
    wordReadySub: "이제 질문을 시작하세요!",
    startQ: "질문하기",
    listening: "듣는 중...",
    endGame: "게임 종료",
    showAnswer: "정답 보기",
    remaining: "남은 질문",
    qLabel: "질문",
    aLabel: "답변",
    answerIs: "정답은:",
    winTitle: "정답입니다! 🎉",
    winSub: "축하합니다! 단어를 맞추셨어요!",
    loseTitle: "아쉽네요! 😢",
    loseSub: "20개의 질문을 모두 사용했습니다.",
    playAgain: "다시 하기",
    inputPlaceholder: "질문을 입력하세요...",
    send: "전송",
    stop: "STOP",
    or: "또는",
    typeQ: "직접 입력",
    questions: "번째 질문",
    hint: "예: Is it an animal? / 동물인가요?",
    analyzing: "AI 답변 중...",
  },
  en: {
    title: "20 Questions",
    subtitle: "Guess the word with AI",
    chooseMode: "Choose your language",
    korean: "한국어",
    english: "English",
    thinking: "Thinking",
    wordReady: "Word Ready!",
    wordReadySub: "Start asking questions!",
    startQ: "Ask a Question",
    listening: "Listening...",
    endGame: "End Game",
    showAnswer: "Show Answer",
    remaining: "Questions Left",
    qLabel: "Q",
    aLabel: "A",
    answerIs: "Answer:",
    winTitle: "Correct! 🎉",
    winSub: "Congratulations! You guessed it!",
    loseTitle: "Game Over! 😢",
    loseSub: "You've used all 20 questions.",
    playAgain: "Play Again",
    inputPlaceholder: "Type your question...",
    send: "Send",
    stop: "STOP",
    or: "or",
    typeQ: "Type it",
    questions: " question",
    hint: "e.g. Is it an animal? / Can you eat it?",
    analyzing: "AI thinking...",
  },
};

export default function TwentyQuestions() {
  const [phase, setPhase] = useState("start"); // start | dial | thinking | playing | win | lose
  const [lang, setLang] = useState("en");
  const [secretWord, setSecretWord] = useState("");
  const [secretCategory, setSecretCategory] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [qaHistory, setQaHistory] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [dialIdx, setDialIdx] = useState(0);
  const [dialY, setDialY] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [thinkingDots, setThinkingDots] = useState(".");
  const [wordReadyVisible, setWordReadyVisible] = useState(false);
  const [showQAPanel, setShowQAPanel] = useState(false);

  const recognitionRef = useRef(null);
  const dialRef = useRef(null);
  const qaBottomRef = useRef(null);
  const T = TEXT[lang];

  // Dial spin animation
  useEffect(() => {
    if (phase === "dial") {
      let y = 0;
      let charI = 0;
      dialRef.current = setInterval(() => {
        y = (y + 3) % 100;
        charI = Math.floor(Math.random() * DIAL_CHARS.length);
        setDialY(y);
        setDialIdx(charI);
      }, 60);
      return () => clearInterval(dialRef.current);
    }
  }, [phase]);

  // Thinking dots animation
  useEffect(() => {
    if (phase === "thinking") {
      let d = 0;
      const iv = setInterval(() => {
        d = (d + 1) % 4;
        setThinkingDots(".".repeat(d + 1));
      }, 400);
      return () => clearInterval(iv);
    }
  }, [phase]);

  // Auto-scroll QA
  useEffect(() => {
    if (qaBottomRef.current) qaBottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [qaHistory]);

  const pickWord = useCallback(async (l) => {
    const isKo = l === "ko";
    const sys = isKo
      ? "당신은 스무고개 게임 진행자입니다. JSON만 반환하세요. 설명 없이 JSON만."
      : "You host a 20 Questions game. Return raw JSON only, no explanation, no markdown.";
    const prompt = isKo
      ? `스무고개를 위해 재미있는 단어 하나를 골라주세요. 동물, 음식, 사물, 유명인, 장소 등 다양하게. 형식: {"word": "고양이", "category": "동물"}`
      : `Pick a fun secret word for 20 Questions. Can be animal, food, object, famous person, place, etc. Format: {"word": "elephant", "category": "animal"}`;
    try {
      const raw = await callClaude(prompt, sys);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return { word: parsed.word, category: parsed.category };
    } catch {
      return { word: isKo ? "고양이" : "elephant", category: isKo ? "동물" : "animal" };
    }
  }, []);

  const startGame = async (l) => {
    setLang(l);
    setPhase("dial");
    setTimeout(async () => {
      clearInterval(dialRef.current);
      setPhase("thinking");
      const { word, category } = await pickWord(l);
      setSecretWord(word);
      setSecretCategory(category);
      setWordReadyVisible(true);
      setTimeout(() => {
        setWordReadyVisible(false);
        setPhase("playing");
      }, 2200);
    }, 3000);
  };

  const handleQuestion = async (question) => {
    if (!question.trim() || isAnswering || questionCount >= 20) return;
    setInputValue("");
    setLiveTranscript("");
    const newCount = questionCount + 1;
    setQuestionCount(newCount);
    setIsAnswering(true);
    setQaHistory((h) => [...h, { question, answer: null }]);

    const isKo = lang === "ko";
    const sys = isKo
      ? "당신은 스무고개 게임 진행자입니다. JSON만 반환하세요."
      : "You are a 20 Questions game host. Return raw JSON only, no markdown.";

    const prompt = isKo
      ? `비밀 단어: "${secretWord}" (카테고리: ${secretCategory})
플레이어 질문: "${question}"

이 질문이 정답을 직접 맞추는 시도인지 아니면 예/아니오 질문인지 판단하세요.

정답 시도이면:
{"type": "guess", "correct": true, "answer": "정답입니다! 🎉 ${secretWord}이(가) 맞습니다!"}
또는
{"type": "guess", "correct": false, "answer": "아쉽네요, 틀렸습니다."}

예/아니오 질문이면 친절하고 간결하게:
{"type": "question", "answer": "네, 동물입니다." 또는 "아니요, 식물이 아닙니다."}`
      : `Secret word: "${secretWord}" (category: ${secretCategory})
Player question: "${question}"

Decide if this is a direct guess or a yes/no question.

If direct guess:
{"type": "guess", "correct": true, "answer": "Correct! 🎉 It is ${secretWord}!"}
or
{"type": "guess", "correct": false, "answer": "Wrong guess! Keep trying."}

If yes/no question, answer concisely:
{"type": "question", "answer": "Yes, it is an animal." or "No, it is not edible."}`;

    try {
      const raw = await callClaude(prompt, sys);
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setQaHistory((h) => h.map((item, i) => (i === h.length - 1 ? { ...item, answer: parsed.answer } : item)));
      if (parsed.type === "guess" && parsed.correct) {
        setTimeout(() => setPhase("win"), 600);
      } else if (newCount >= 20) {
        setTimeout(() => setPhase("lose"), 1200);
      }
    } catch {
      setQaHistory((h) =>
        h.map((item, i) => (i === h.length - 1 ? { ...item, answer: isKo ? "답변 오류" : "Error" } : item))
      );
    }
    setIsAnswering(false);
  };

  const startListening = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("음성인식이 지원되지 않는 브라우저입니다. 텍스트로 입력해 주세요."); return; }
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang === "ko" ? "ko-KR" : "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (e) => {
      const t = Array.from(e.results).map((r) => r[0].transcript).join("");
      setLiveTranscript(t);
    };
    rec.onend = () => {
      setIsListening(false);
      setLiveTranscript((t) => { if (t) { handleQuestion(t); } return ""; });
    };
    rec.onerror = () => setIsListening(false);
    rec.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsListening(false);
  };

  const resetGame = () => {
    setPhase("start"); setSecretWord(""); setSecretCategory("");
    setQuestionCount(0); setQaHistory([]); setIsAnswering(false);
    setShowAnswer(false); setInputValue(""); setLiveTranscript("");
    setShowQAPanel(false);
  };

  const countColor = () => {
    const pct = questionCount / 20;
    if (pct < 0.5) return "#34C759";
    if (pct < 0.75) return "#FF9500";
    return "#FF3B30";
  };

  /* ── PHASES ── */

  if (phase === "start") {
    return (
      <div style={s.root}>
        <div style={s.startWrap}>
          <div style={s.glow} />
          <div style={s.titleBlock}>
            <div style={s.icon}>🔮</div>
            <h1 style={s.mainTitle}>{lang === "ko" ? "스무고개" : "20 Questions"}</h1>
            <p style={s.mainSub}>{TEXT[lang].subtitle}</p>
          </div>
          <div style={s.langCard}>
            <p style={s.chooseLabel}>{TEXT[lang].chooseMode}</p>
            <div style={s.langBtns}>
              <button style={{ ...s.langBtn, ...(lang === "ko" ? s.langBtnActive : {}) }} onClick={() => setLang("ko")}>🇰🇷 한국어</button>
              <button style={{ ...s.langBtn, ...(lang === "en" ? s.langBtnActive : {}) }} onClick={() => setLang("en")}>🇺🇸 English</button>
            </div>
            <button style={s.startBtn} onClick={() => startGame(lang)}>
              <span style={{ fontSize: 22 }}>▶</span>
              <span>{lang === "ko" ? "게임 시작" : "Start Game"}</span>
            </button>
          </div>
          <p style={s.ruleText}>{lang === "ko" ? "AI가 단어를 생각합니다. 20번의 질문 안에 맞춰보세요!" : "AI picks a word. Guess it within 20 questions!"}</p>
        </div>
      </div>
    );
  }

  if (phase === "dial") {
    return (
      <div style={s.root}>
        <div style={{ ...s.centeredBox, gap: 32 }}>
          <p style={{ color: "#8E8E93", fontWeight: 700, fontSize: 15 }}>{lang === "ko" ? "AI가 단어를 고르는 중..." : "AI is choosing a word..."}</p>
          <div style={s.dialOuter}>
            <div style={s.dialMask}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ ...s.dialRow, opacity: i === 2 ? 1 : 0.3 + i * 0.1, fontSize: i === 2 ? 32 : 20, transform: `translateY(${(i - 2) * 54 + (dialY % 54) - 27}px)`, color: i === 2 ? "#007AFF" : "#002D5E", fontWeight: 900, letterSpacing: 4 }}>
                  {DIAL_CHARS[(dialIdx + i) % DIAL_CHARS.length]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "thinking") {
    return (
      <div style={s.root}>
        <div style={s.centeredBox}>
          {!wordReadyVisible ? (
            <>
              <div style={s.thinkEmoji}>🤔</div>
              <h2 style={s.thinkText}>{T.thinking}<span style={{ letterSpacing: 2 }}>{thinkingDots}</span></h2>
              <p style={{ color: "#8E8E93", fontWeight: 600, fontSize: 14, marginTop: 8 }}>{lang === "ko" ? "AI가 단어를 정하고 있어요" : "AI is locking in the word"}</p>
            </>
          ) : (
            <div style={s.wordReadyBox}>
              <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
              <h2 style={{ fontSize: 26, fontWeight: 900, color: "#002D5E", margin: 0 }}>{T.wordReady}</h2>
              <p style={{ color: "#34C759", fontWeight: 700, fontSize: 16, marginTop: 8 }}>{T.wordReadySub}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "playing") {
    return (
      <div style={s.root}>
        {/* Top bar */}
        <div style={s.topBar}>
          <button style={s.topBtnRed} onClick={resetGame}>{T.endGame}</button>
          <div style={s.counterWrap}>
            <div style={{ ...s.counter, color: countColor() }}>
              {questionCount}<span style={{ fontSize: 13, color: "#8E8E93" }}>/20</span>
            </div>
            <div style={{ fontSize: 9, color: "#8E8E93", fontWeight: 700, letterSpacing: 0.5 }}>{lang === "ko" ? "질문 횟수" : "QUESTIONS"}</div>
          </div>
          <button style={s.topBtnBlue} onClick={() => setShowAnswer(!showAnswer)}>{T.showAnswer}</button>
        </div>

        {/* Answer reveal */}
        {showAnswer && (
          <div style={s.answerReveal}>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#8E8E93", letterSpacing: 1 }}>{T.answerIs}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#FF3B30" }}>{secretWord}</span>
          </div>
        )}

        {/* Mystery word display */}
        <div style={s.mysteryBox}>
          <div style={s.mysteryText}>???</div>
          <div style={{ fontSize: 12, color: "#8E8E93", fontWeight: 700, marginTop: 4 }}>
            {lang === "ko" ? "이 단어를 맞춰보세요!" : "Guess this word!"}
          </div>
        </div>

        {/* Q&A History */}
        {qaHistory.length > 0 && (
          <div style={s.qaPanel}>
            <button style={s.qaPanelToggle} onClick={() => setShowQAPanel(!showQAPanel)}>
              <span>{lang === "ko" ? `💬 질문 기록 (${qaHistory.length}개)` : `💬 Q&A History (${qaHistory.length})`}</span>
              <span>{showQAPanel ? "▲" : "▼"}</span>
            </button>
            {showQAPanel && (
              <div style={s.qaList}>
                {qaHistory.map((item, i) => (
                  <div key={i} style={s.qaPair}>
                    <div style={s.qBubble}>
                      <span style={s.qBadge}>{T.qLabel}{i + 1}</span>
                      <span>{item.question}</span>
                    </div>
                    {item.answer ? (
                      <div style={s.aBubble}>{item.answer}</div>
                    ) : (
                      <div style={s.aLoading}>{T.analyzing}</div>
                    )}
                  </div>
                ))}
                <div ref={qaBottomRef} />
              </div>
            )}
          </div>
        )}

        {/* Input area */}
        <div style={s.inputArea}>
          {isAnswering && (
            <div style={s.analyzingBanner}>{T.analyzing}</div>
          )}
          {liveTranscript && (
            <div style={s.liveTranscript}>{liveTranscript}</div>
          )}

          {/* Mic button */}
          <button
            style={{ ...s.micBtn, ...(isListening ? s.micBtnActive : {}) }}
            onClick={isListening ? stopListening : startListening}
            disabled={isAnswering}
          >
            <span style={{ fontSize: 28 }}>{isListening ? "⏹" : "🎙"}</span>
            <span style={{ fontSize: 14, fontWeight: 800 }}>
              {isListening ? T.stop : T.startQ}
            </span>
          </button>

          {/* Text input */}
          <div style={s.textRow}>
            <input
              style={s.textInput}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && inputValue.trim()) handleQuestion(inputValue.trim()); }}
              placeholder={T.inputPlaceholder}
              disabled={isAnswering}
            />
            <button style={s.sendBtn} onClick={() => { if (inputValue.trim()) handleQuestion(inputValue.trim()); }} disabled={isAnswering || !inputValue.trim()}>
              {T.send}
            </button>
          </div>
          <p style={{ fontSize: 11, color: "#C7C7CC", textAlign: "center", margin: "6px 0 0", fontWeight: 600 }}>{T.hint}</p>
        </div>
      </div>
    );
  }

  if (phase === "win") {
    return (
      <div style={s.root}>
        <div style={{ ...s.endScreen, background: "linear-gradient(160deg, #002D5E 0%, #007AFF 100%)" }}>
          <div style={{ fontSize: 80, marginBottom: 16, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))" }}>🎉</div>
          <h1 style={{ ...s.endTitle, color: "#fff" }}>{T.winTitle}</h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.winSub}</p>
          <div style={s.wordRevealBox}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>{T.answerIs}</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#FFD60A" }}>{secretWord}</span>
          </div>
          <div style={s.statRow}>
            <div style={s.statBox}><span style={s.statNum}>{questionCount}</span><span style={s.statLabel}>{lang === "ko" ? "사용한 질문" : "Questions Used"}</span></div>
            <div style={s.statBox}><span style={s.statNum}>{20 - questionCount}</span><span style={s.statLabel}>{lang === "ko" ? "남은 질문" : "Questions Saved"}</span></div>
          </div>
          <button style={s.replayBtn} onClick={resetGame}>{T.playAgain}</button>
        </div>
      </div>
    );
  }

  if (phase === "lose") {
    return (
      <div style={s.root}>
        <div style={{ ...s.endScreen, background: "linear-gradient(160deg, #1C1C1E 0%, #3A3A3C 100%)" }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>😢</div>
          <h1 style={{ ...s.endTitle, color: "#fff" }}>{T.loseTitle}</h1>
          <p style={{ color: "rgba(255,255,255,0.7)", fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{T.loseSub}</p>
          <div style={{ ...s.wordRevealBox, background: "rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{T.answerIs}</span>
            <span style={{ fontSize: 36, fontWeight: 900, color: "#FF3B30" }}>{secretWord}</span>
          </div>
          <button style={{ ...s.replayBtn, background: "#007AFF" }} onClick={resetGame}>{T.playAgain}</button>
        </div>
      </div>
    );
  }

  return null;
}

/* ── STYLES ── */
const s = {
  root: { fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif', background: "#F2F2F7", minHeight: "100vh", display: "flex", flexDirection: "column", WebkitFontSmoothing: "antialiased", overflowX: "hidden", position: "relative" },
  glow: { position: "absolute", top: -100, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,122,255,0.15) 0%, transparent 70%)", pointerEvents: "none" },
  startWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "40px 24px", gap: 24, position: "relative" },
  titleBlock: { textAlign: "center" },
  icon: { fontSize: 64, marginBottom: 8, filter: "drop-shadow(0 4px 16px rgba(0,122,255,0.4))" },
  mainTitle: { fontSize: 42, fontWeight: 900, color: "#002D5E", margin: "0 0 6px", letterSpacing: -1 },
  mainSub: { fontSize: 15, color: "#8E8E93", fontWeight: 600, margin: 0 },
  langCard: { background: "#fff", borderRadius: 28, padding: "28px 24px", width: "100%", maxWidth: 360, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", border: "1px solid #E5E5EA" },
  chooseLabel: { fontSize: 13, fontWeight: 800, color: "#8E8E93", textAlign: "center", margin: "0 0 14px", letterSpacing: 0.5 },
  langBtns: { display: "flex", gap: 10, marginBottom: 18 },
  langBtn: { flex: 1, padding: "14px 0", borderRadius: 14, border: "1.5px solid #E5E5EA", background: "#F8F8FA", fontSize: 15, fontWeight: 800, cursor: "pointer", color: "#8E8E93", transition: "all 0.15s" },
  langBtnActive: { background: "#007AFF", color: "#fff", borderColor: "#007AFF", boxShadow: "0 4px 16px rgba(0,122,255,0.3)" },
  startBtn: { width: "100%", height: 60, borderRadius: 18, background: "#002D5E", color: "#fff", border: "none", fontSize: 18, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 8px 24px rgba(0,45,94,0.3)", transition: "transform 0.1s" },
  ruleText: { fontSize: 13, color: "#8E8E93", fontWeight: 600, textAlign: "center", lineHeight: 1.6, maxWidth: 280 },
  centeredBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, gap: 20 },
  dialOuter: { width: 220, background: "#fff", borderRadius: 24, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.1)", border: "1px solid #E5E5EA" },
  dialMask: { height: 270, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" },
  dialRow: { position: "absolute", width: "100%", textAlign: "center", transition: "none", userSelect: "none" },
  thinkEmoji: { fontSize: 72, animation: "pulse 1s infinite", marginBottom: 8 },
  thinkText: { fontSize: 28, fontWeight: 900, color: "#002D5E", margin: 0 },
  wordReadyBox: { textAlign: "center", animation: "fadeIn 0.4s ease" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(20px)", borderBottom: "0.5px solid #E5E5EA", position: "sticky", top: 0, zIndex: 100 },
  topBtnRed: { padding: "8px 12px", borderRadius: 10, border: "none", background: "#FF3B30", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  topBtnBlue: { padding: "8px 12px", borderRadius: 10, border: "none", background: "#007AFF", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" },
  counterWrap: { textAlign: "center" },
  counter: { fontSize: 28, fontWeight: 900, lineHeight: 1.1, transition: "color 0.3s" },
  answerReveal: { background: "#FFF9E6", border: "1px solid #FFD60A", borderRadius: 14, margin: "10px 16px 0", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 12px rgba(255,214,10,0.2)" },
  mysteryBox: { margin: "20px 16px", background: "#fff", borderRadius: 28, padding: "28px 20px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.06)", border: "1px solid #E5E5EA" },
  mysteryText: { fontSize: 56, fontWeight: 900, color: "#002D5E", letterSpacing: 12, textShadow: "0 4px 16px rgba(0,45,94,0.15)" },
  qaPanel: { margin: "0 16px", background: "#fff", borderRadius: 22, border: "1px solid #E5E5EA", overflow: "hidden", marginBottom: 12 },
  qaPanelToggle: { width: "100%", padding: "14px 18px", background: "none", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 14, color: "#002D5E", display: "flex", justifyContent: "space-between", alignItems: "center" },
  qaList: { maxHeight: 280, overflowY: "auto", padding: "4px 16px 16px" },
  qaPair: { marginBottom: 14 },
  qBubble: { background: "#F2F2F7", borderRadius: "18px 18px 18px 4px", padding: "10px 14px", fontSize: 14, fontWeight: 600, color: "#002D5E", marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" },
  qBadge: { background: "#007AFF", color: "#fff", borderRadius: 8, padding: "2px 7px", fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 },
  aBubble: { background: "#E8F5E9", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "#2E7D32", marginLeft: 16 },
  aLoading: { background: "#F2F2F7", borderRadius: "4px 18px 18px 18px", padding: "10px 14px", fontSize: 13, color: "#8E8E93", fontWeight: 600, marginLeft: 16 },
  inputArea: { position: "sticky", bottom: 0, background: "rgba(242,242,247,0.95)", backdropFilter: "blur(20px)", borderTop: "0.5px solid #E5E5EA", padding: "14px 16px 24px" },
  analyzingBanner: { background: "#E3F0FF", color: "#007AFF", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 800, textAlign: "center", marginBottom: 10 },
  liveTranscript: { background: "#fff", border: "1px dashed #007AFF", borderRadius: 12, padding: "8px 14px", fontSize: 13, color: "#002D5E", fontWeight: 600, marginBottom: 10, minHeight: 36 },
  micBtn: { width: "100%", height: 64, borderRadius: 20, background: "#002D5E", color: "#fff", border: "none", fontSize: 16, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 6px 20px rgba(0,45,94,0.25)", marginBottom: 10, transition: "all 0.15s" },
  micBtnActive: { background: "#FF3B30", boxShadow: "0 6px 20px rgba(255,59,48,0.4)", animation: "pulse 1s infinite" },
  textRow: { display: "flex", gap: 8 },
  textInput: { flex: 1, height: 46, borderRadius: 14, border: "1.5px solid #E5E5EA", padding: "0 14px", fontSize: 15, fontWeight: 600, outline: "none", background: "#fff", color: "#002D5E" },
  sendBtn: { height: 46, padding: "0 18px", borderRadius: 14, background: "#007AFF", color: "#fff", border: "none", fontSize: 14, fontWeight: 800, cursor: "pointer" },
  endScreen: { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px", gap: 16 },
  endTitle: { fontSize: 36, fontWeight: 900, margin: 0, textAlign: "center" },
  wordRevealBox: { background: "rgba(255,255,255,0.15)", borderRadius: 20, padding: "20px 32px", textAlign: "center", display: "flex", flexDirection: "column", gap: 4, width: "100%", maxWidth: 280 },
  statRow: { display: "flex", gap: 12, width: "100%", maxWidth: 280 },
  statBox: { flex: 1, background: "rgba(255,255,255,0.12)", borderRadius: 16, padding: "14px 10px", textAlign: "center", display: "flex", flexDirection: "column", gap: 4 },
  statNum: { fontSize: 28, fontWeight: 900, color: "#fff" },
  statLabel: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700 },
  replayBtn: { width: "100%", maxWidth: 280, height: 60, borderRadius: 18, background: "#34C759", color: "#fff", border: "none", fontSize: 18, fontWeight: 900, cursor: "pointer", marginTop: 8, boxShadow: "0 8px 24px rgba(52,199,89,0.35)" },
};
