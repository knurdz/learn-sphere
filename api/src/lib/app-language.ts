export const APP_LANGUAGE_HEADER = "x-learnsphere-locale";

export const appLanguageCodes = [
  "en",
  "ta",
  "si",
  "hi",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "ja",
  "ko",
  "zh",
  "ar",
  "ru",
  "bn",
  "te",
  "mr",
  "nl",
  "pl",
  "tr",
  "vi",
  "th",
  "id",
  "ur",
] as const;

export type AppLanguageCode = (typeof appLanguageCodes)[number];

export type AppLanguageDefinition = {
  code: AppLanguageCode;
  nativeLabel: string;
  englishLabel: string;
  liveVoiceSupported: boolean;
  sttLanguage: string;
  ttsModel: string;
  ttsVoice: string;
  ttsLanguage?: string;
};

const INWORLD = "inworld/inworld-tts-2";
const CARTESIA = "cartesia/sonic-3";

const definitions: Record<AppLanguageCode, AppLanguageDefinition> = {
  en: {
    code: "en",
    nativeLabel: "English",
    englishLabel: "English",
    liveVoiceSupported: true,
    sttLanguage: "en",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "en-US",
  },
  ta: {
    code: "ta",
    nativeLabel: "தமிழ்",
    englishLabel: "Tamil",
    liveVoiceSupported: true,
    sttLanguage: "ta",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "ta",
  },
  si: {
    code: "si",
    nativeLabel: "සිංහල",
    englishLabel: "Sinhala",
    liveVoiceSupported: false,
    sttLanguage: "multi",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "en",
  },
  hi: {
    code: "hi",
    nativeLabel: "हिन्दी",
    englishLabel: "Hindi",
    liveVoiceSupported: true,
    sttLanguage: "hi",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "hi",
  },
  es: {
    code: "es",
    nativeLabel: "Español",
    englishLabel: "Spanish",
    liveVoiceSupported: true,
    sttLanguage: "es",
    ttsModel: INWORLD,
    ttsVoice: "Diego",
    ttsLanguage: "es-MX",
  },
  fr: {
    code: "fr",
    nativeLabel: "Français",
    englishLabel: "French",
    liveVoiceSupported: true,
    sttLanguage: "fr",
    ttsModel: INWORLD,
    ttsVoice: "Olivia",
    ttsLanguage: "fr",
  },
  de: {
    code: "de",
    nativeLabel: "Deutsch",
    englishLabel: "German",
    liveVoiceSupported: true,
    sttLanguage: "de",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "de",
  },
  pt: {
    code: "pt",
    nativeLabel: "Português",
    englishLabel: "Portuguese",
    liveVoiceSupported: true,
    sttLanguage: "pt",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "pt",
  },
  it: {
    code: "it",
    nativeLabel: "Italiano",
    englishLabel: "Italian",
    liveVoiceSupported: true,
    sttLanguage: "it",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "it",
  },
  ja: {
    code: "ja",
    nativeLabel: "日本語",
    englishLabel: "Japanese",
    liveVoiceSupported: true,
    sttLanguage: "ja",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "ja",
  },
  ko: {
    code: "ko",
    nativeLabel: "한국어",
    englishLabel: "Korean",
    liveVoiceSupported: true,
    sttLanguage: "ko",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "ko",
  },
  zh: {
    code: "zh",
    nativeLabel: "中文",
    englishLabel: "Chinese",
    liveVoiceSupported: true,
    sttLanguage: "zh",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "zh",
  },
  ar: {
    code: "ar",
    nativeLabel: "العربية",
    englishLabel: "Arabic",
    liveVoiceSupported: true,
    sttLanguage: "ar",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "ar",
  },
  ru: {
    code: "ru",
    nativeLabel: "Русский",
    englishLabel: "Russian",
    liveVoiceSupported: true,
    sttLanguage: "ru",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "ru",
  },
  bn: {
    code: "bn",
    nativeLabel: "বাংলা",
    englishLabel: "Bengali",
    liveVoiceSupported: true,
    sttLanguage: "bn",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "bn",
  },
  te: {
    code: "te",
    nativeLabel: "తెలుగు",
    englishLabel: "Telugu",
    liveVoiceSupported: true,
    sttLanguage: "te",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "te",
  },
  mr: {
    code: "mr",
    nativeLabel: "मराठी",
    englishLabel: "Marathi",
    liveVoiceSupported: true,
    sttLanguage: "mr",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "mr",
  },
  nl: {
    code: "nl",
    nativeLabel: "Nederlands",
    englishLabel: "Dutch",
    liveVoiceSupported: true,
    sttLanguage: "nl",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "nl",
  },
  pl: {
    code: "pl",
    nativeLabel: "Polski",
    englishLabel: "Polish",
    liveVoiceSupported: true,
    sttLanguage: "pl",
    ttsModel: INWORLD,
    ttsVoice: "Ashley",
    ttsLanguage: "pl",
  },
  tr: {
    code: "tr",
    nativeLabel: "Türkçe",
    englishLabel: "Turkish",
    liveVoiceSupported: true,
    sttLanguage: "tr",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "tr",
  },
  vi: {
    code: "vi",
    nativeLabel: "Tiếng Việt",
    englishLabel: "Vietnamese",
    liveVoiceSupported: true,
    sttLanguage: "vi",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "vi",
  },
  th: {
    code: "th",
    nativeLabel: "ไทย",
    englishLabel: "Thai",
    liveVoiceSupported: true,
    sttLanguage: "th",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "th",
  },
  id: {
    code: "id",
    nativeLabel: "Bahasa Indonesia",
    englishLabel: "Indonesian",
    liveVoiceSupported: true,
    sttLanguage: "id",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "id",
  },
  ur: {
    code: "ur",
    nativeLabel: "اردو",
    englishLabel: "Urdu",
    liveVoiceSupported: true,
    sttLanguage: "ur",
    ttsModel: CARTESIA,
    ttsVoice: "9626c31c-bec5-4cca-baa8-f8ba9e84c8bc",
    ttsLanguage: "ur",
  },
};

export function isAppLanguageCode(value: string): value is AppLanguageCode {
  return (appLanguageCodes as readonly string[]).includes(value);
}

export function normalizeAppLanguageCode(value: string | null | undefined): AppLanguageCode {
  const trimmed = (value || "").trim().toLowerCase().split("-")[0];
  if (isAppLanguageCode(trimmed)) return trimmed;
  return "en";
}

export function getAppLanguageDefinition(code: AppLanguageCode): AppLanguageDefinition {
  return definitions[code];
}

export function listAppLanguages(): AppLanguageDefinition[] {
  return appLanguageCodes.map((code) => definitions[code]);
}

export function resolveAppLanguage(request?: Request): AppLanguageCode {
  if (!request) return "en";

  const header = request.headers.get(APP_LANGUAGE_HEADER);
  if (header) return normalizeAppLanguageCode(header);

  const accept = request.headers.get("accept-language");
  if (accept) {
    const first = accept.split(",")[0]?.split(";")[0]?.trim();
    if (first) return normalizeAppLanguageCode(first);
  }

  return "en";
}

export function languageGenerationDirective(code: AppLanguageCode): string {
  const def = getAppLanguageDefinition(code);
  if (code === "en") {
    return "Write all user-visible text in clear English. Keep JSON object keys in English.";
  }
  return (
    `Write all user-visible text in ${def.englishLabel} (${code}), using natural phrasing for native speakers. ` +
    "Keep JSON object keys in English; only translate string values meant for the learner."
  );
}

export function languageTutorDirective(code: AppLanguageCode): string {
  const def = getAppLanguageDefinition(code);
  if (code === "en") {
    return "Answer in English unless the learner uses another language.";
  }
  return (
    `Always explain and converse in ${def.englishLabel} (${code}). ` +
    "If the learner mixes languages, prefer their study language but acknowledge their question clearly."
  );
}

export function languageSpokenTutorDirective(code: AppLanguageCode): string {
  const def = getAppLanguageDefinition(code);
  return (
    `Speak every reply aloud in ${def.englishLabel} (${code}). ` +
    "Keep sentences concise and natural for text-to-speech."
  );
}

type LiveTutorMode = "tutor" | "video_create" | "video_engage" | "youtube_tutor";

const greetings: Record<AppLanguageCode, Record<LiveTutorMode, string>> = {
  en: {
    tutor: "Hello! I am ready to make this lesson clear and engaging. What would you like to explore first?",
    video_create: "Hello! Tell me when you're ready, and I will teach this topic step by step.",
    video_engage: "Hello! Let's make this lesson engaging together. What should we focus on first?",
    youtube_tutor:
      "Hello! I have loaded the YouTube video's transcript. I will start by explaining the main idea, then guide you through the video step by step as you watch.",
  },
  ta: {
    tutor: "வணக்கம்! இந்த பாடத்தை தெளிவாகவும் சுவாரஸ்யமாகவும் கற்பிக்க தயாராக இருக்கிறேன். முதலில் எதை பார்க்க விரும்புகிறீர்கள்?",
    video_create: "வணக்கம்! நீங்கள் தயாராக இருக்கும்போது சொல்லுங்கள்; இந்த தலைப்பை படிப்படியாக கற்பிக்கிறேன்.",
    video_engage: "வணக்கம்! இந்த பாடத்தை சுவாரஸ்யமாக்குவோம். முதலில் எதில் கவனம் செலுத்தலாம்?",
    youtube_tutor:
      "வணக்கம்! YouTube வீடியோவின் transcript ஏற்றப்பட்டது. முதலில் முக்கிய கருத்தை விளக்கி, பின்னர் வீடியோவுடன் படிப்படியாக வழிநடத்துவேன்.",
  },
  si: {
    tutor: "ආයුබෝවන්! මෙම පාඩම පැහැදිලිව හා රසවත් ලෙස ඉගැන්වීමට සූදානම්. පළමුව ඔබ කැමති දේ කුමක්ද?",
    video_create: "ආයුබෝවන්! ඔබ සූදානම් වූ විට කියන්න; මම මෙම විෂය පියවරෙන් පියවර ඉගැන්වීම.",
    video_engage: "ආයුබෝවන්! මෙම පාඩම වඩාත් රසවත් කරමු. පළමුව කුමක් කෙරෙහි අවධානය යොමු කරමුද?",
    youtube_tutor:
      "ආයුබෝවන්! YouTube වීඩියෝ transcript එක පූරණය කර ඇත. මුලින්ම ප්‍රධාන අදහස පැහැදිලි කර, පසුව වීඩියෝව සමඟ පියවරෙන් පියවර ඔබව මඟ පෙන්වමි.",
  },
  hi: {
    tutor: "नमस्ते! मैं इस पाठ को स्पष्ट और रोचक बनाने के लिए तैयार हूँ। आप पहले क्या समझना चाहेंगे?",
    video_create: "नमस्ते! जब आप तैयार हों, बताइए—मैं इस विषय को कदम दर कदम पढ़ाऊँगा।",
    video_engage: "नमस्ते! इस पाठ को और रोचक बनाते हैं। पहले हम किस पर ध्यान दें?",
    youtube_tutor:
      "नमस्ते! YouTube वीडियो का transcript लोड हो गया है। पहले मुख्य विचार समझाऊँगा, फिर वीडियो के साथ कदम दर कदम मार्गदर्शन करूँगा।",
  },
  es: {
    tutor: "¡Hola! Estoy listo para hacer esta lección clara y atractiva. ¿Qué te gustaría explorar primero?",
    video_create: "¡Hola! Dime cuando estés listo y enseñaré este tema paso a paso.",
    video_engage: "¡Hola! Hagamos esta lección más atractiva. ¿En qué nos enfocamos primero?",
    youtube_tutor:
      "¡Hola! He cargado la transcripción del video de YouTube. Explicaré la idea principal y te guiaré paso a paso mientras ves el video.",
  },
  fr: {
    tutor: "Bonjour ! Je suis prêt à rendre cette leçon claire et engageante. Que souhaitez-vous explorer en premier ?",
    video_create: "Bonjour ! Dites-moi quand vous êtes prêt, et j'enseignerai ce sujet étape par étape.",
    video_engage: "Bonjour ! Rendons cette leçon plus engageante. Sur quoi nous concentrons-nous d'abord ?",
    youtube_tutor:
      "Bonjour ! J'ai chargé la transcription de la vidéo YouTube. J'expliquerai l'idée principale, puis je vous guiderai pas à pas pendant le visionnage.",
  },
  de: {
    tutor: "Hallo! Ich bin bereit, diese Lektion klar und ansprechend zu gestalten. Womit möchtest du beginnen?",
    video_create: "Hallo! Sag Bescheid, wenn du bereit bist, dann unterrichte ich das Thema Schritt für Schritt.",
    video_engage: "Hallo! Machen wir diese Lektion spannender. Worauf sollen wir uns zuerst konzentrieren?",
    youtube_tutor:
      "Hallo! Ich habe das YouTube-Transkript geladen. Ich erkläre zuerst die Hauptidee und führe dich dann Schritt für Schritt durch das Video.",
  },
  pt: {
    tutor: "Olá! Estou pronto para tornar esta lição clara e envolvente. O que você gostaria de explorar primeiro?",
    video_create: "Olá! Avise quando estiver pronto e ensinarei este tópico passo a passo.",
    video_engage: "Olá! Vamos tornar esta lição mais envolvente. Em que devemos focar primeiro?",
    youtube_tutor:
      "Olá! Carreguei a transcrição do vídeo do YouTube. Explicarei a ideia principal e guiarei você passo a passo enquanto assiste.",
  },
  it: {
    tutor: "Ciao! Sono pronto a rendere questa lezione chiara e coinvolgente. Cosa vorresti esplorare per primo?",
    video_create: "Ciao! Dimmi quando sei pronto e insegnerò questo argomento passo dopo passo.",
    video_engage: "Ciao! Rendiamo questa lezione più coinvolgente. Su cosa ci concentriamo prima?",
    youtube_tutor:
      "Ciao! Ho caricato la trascrizione del video YouTube. Spiegherò l'idea principale e ti guiderò passo dopo passo mentre guardi.",
  },
  ja: {
    tutor: "こんにちは！このレッスンを分かりやすく、楽しく進める準備ができています。最初に何から始めますか？",
    video_create: "こんにちは！準備ができたら教えてください。このトピックを順番に説明します。",
    video_engage: "こんにちは！このレッスンをもっと楽しくしましょう。最初に何に集中しますか？",
    youtube_tutor:
      "こんにちは！YouTube動画の字幕を読み込みました。まず要点を説明し、その後動画を見ながら順番に案内します。",
  },
  ko: {
    tutor: "안녕하세요! 이 수업을 명확하고 흥미롭게 진행할 준비가 됐어요. 무엇부터 살펴볼까요?",
    video_create: "안녕하세요! 준비되면 알려주세요. 이 주제를 단계별로 가르쳐 드릴게요.",
    video_engage: "안녕하세요! 이 수업을 더 흥미롭게 만들어 봐요. 먼저 무엇에 집중할까요?",
    youtube_tutor:
      "안녕하세요! YouTube 동영상 자막을 불러왔어요. 먼저 핵심을 설명하고, 시청하면서 단계별로 안내할게요.",
  },
  zh: {
    tutor: "你好！我已经准备好把这节课讲得清楚又有趣。你想先从哪里开始？",
    video_create: "你好！你准备好后告诉我，我会一步一步讲解这个主题。",
    video_engage: "你好！让我们把这节课变得更有互动性。我们先关注什么？",
    youtube_tutor: "你好！我已加载 YouTube 视频字幕。我会先解释主要观点，然后在你观看时逐步引导。",
  },
  ar: {
    tutor: "مرحبًا! أنا مستعد لجعل هذا الدرس واضحًا وجذابًا. ماذا تود أن تستكشف أولًا؟",
    video_create: "مرحبًا! أخبرني عندما تكون مستعدًا وسأشرح هذا الموضوع خطوة بخطوة.",
    video_engage: "مرحبًا! لنجعل هذا الدرس أكثر تفاعلًا. على ماذا نركز أولًا؟",
    youtube_tutor:
      "مرحبًا! لقد حمّلت نص فيديو YouTube. سأشرح الفكرة الرئيسية ثم أرشدك خطوة بخطوة أثناء المشاهدة.",
  },
  ru: {
    tutor: "Здравствуйте! Я готов сделать этот урок понятным и увлекательным. С чего начнём?",
    video_create: "Здравствуйте! Скажите, когда будете готовы, и я объясню тему шаг за шагом.",
    video_engage: "Здравствуйте! Сделаем урок интереснее. На чём сосредоточимся сначала?",
    youtube_tutor:
      "Здравствуйте! Я загрузил транскрипт видео YouTube. Сначала объясню главную идею, затем проведу вас шаг за шагом.",
  },
  bn: {
    tutor: "নমস্কার! আমি এই পাঠটি স্পষ্ট ও আকর্ষণীয় করতে প্রস্তুত। প্রথমে কী দেখতে চান?",
    video_create: "নমস্কার! প্রস্তুত হলে জানান, আমি ধাপে ধাপে এই বিষয়টি শেখাব।",
    video_engage: "নমস্কার! এই পাঠকে আরও আকর্ষণীয় করি। প্রথমে কোথায় মনোযোগ দেব?",
    youtube_tutor:
      "নমস্কার! YouTube ভিডিওর transcript লোড হয়েছে। প্রথমে মূল ধারণা ব্যাখ্যা করব, তারপর ভিডিও দেখতে দেখতে ধাপে ধাপে সাহায্য করব।",
  },
  te: {
    tutor: "నమస్కారం! ఈ పాఠాన్ని స్పష్టంగా మరియు ఆసక్తికరంగా చెప్పడానికి సిద్ధంగా ఉన్నాను. ముందుగా ఏమి చూడాలి?",
    video_create: "నమస్కారం! మీరు సిద్ధంగా ఉన్నప్పుడు చెప్పండి, ఈ అంశాన్ని దశలవారీగా బోధిస్తాను.",
    video_engage: "నమస్కారం! ఈ పాఠాన్ని మరింత ఆకర్షణీయంగా చేద్దాం. ముందుగా దేనిపై దృష్టి పెడదాం?",
    youtube_tutor:
      "నమస్కారం! YouTube వీడియో transcript లోడ్ అయింది. ముందుగా ప్రధాన అంశాన్ని వివరిస్తాను, తర్వాత వీడియోతో దశలవారీగా మార్గనిర్దేశం చేస్తాను.",
  },
  mr: {
    tutor: "नमस्कार! मी हा धडा स्पष्ट आणि रसिक बनवण्यासाठी तयार आहे. प्रथम काय पाहू इच्छिता?",
    video_create: "नमस्कार! तुम्ही तयार असाल तेव्हा सांगा, मी हा विषय पायरीपायरीने शिकवीन.",
    video_engage: "नमस्कार! हा धडा अधिक रसिक बनवूया. प्रथम कशावर लक्ष केंद्रित करू?",
    youtube_tutor:
      "नमस्कार! YouTube व्हिडिओ transcript लोड झाला आहे. प्रथम मुख्य कल्पना स्पष्ट करीन, नंतर व्हिडिओसह पायरीपायरीने मार्गदर्शन करीन.",
  },
  nl: {
    tutor: "Hallo! Ik ben klaar om deze les helder en boeiend te maken. Waarmee wil je beginnen?",
    video_create: "Hallo! Laat het weten wanneer je klaar bent, dan leg ik dit onderwerp stap voor stap uit.",
    video_engage: "Hallo! Laten we deze les boeiender maken. Waar richten we ons eerst op?",
    youtube_tutor:
      "Hallo! Ik heb het YouTube-transcript geladen. Ik leg eerst het hoofdidee uit en begeleid je daarna stap voor stap tijdens het kijken.",
  },
  pl: {
    tutor: "Cześć! Jestem gotowy, aby ta lekcja była jasna i angażująca. Od czego chcesz zacząć?",
    video_create: "Cześć! Daj znać, gdy będziesz gotowy, a nauczę tego tematu krok po kroku.",
    video_engage: "Cześć! Uczyńmy tę lekcję bardziej angażującą. Na czym skupimy się najpierw?",
    youtube_tutor:
      "Cześć! Wczytałem transkrypcję wideo z YouTube. Najpierw wyjaśnię główną ideę, a potem poprowadzę cię krok po kroku podczas oglądania.",
  },
  tr: {
    tutor: "Merhaba! Bu dersi net ve ilgi çekici hale getirmeye hazırım. Önce neyi keşfetmek istersin?",
    video_create: "Merhaba! Hazır olduğunda söyle, bu konuyu adım adım anlatacağım.",
    video_engage: "Merhaba! Bu dersi daha ilgi çekici yapalım. Önce neye odaklanalım?",
    youtube_tutor:
      "Merhaba! YouTube videosunun transkriptini yükledim. Önce ana fikri açıklayacağım, sonra izlerken adım adım yönlendireceğim.",
  },
  vi: {
    tutor: "Xin chào! Tôi sẵn sàng giúp bài học này rõ ràng và hấp dẫn. Bạn muốn bắt đầu từ đâu?",
    video_create: "Xin chào! Hãy báo khi bạn sẵn sàng, tôi sẽ dạy chủ đề này từng bước.",
    video_engage: "Xin chào! Hãy làm bài học này hấp dẫn hơn. Trước tiên ta tập trung vào điều gì?",
    youtube_tutor:
      "Xin chào! Tôi đã tải phụ đề video YouTube. Tôi sẽ giải thích ý chính trước, rồi hướng dẫn bạn từng bước khi xem.",
  },
  th: {
    tutor: "สวัสดี! ฉันพร้อมทำให้บทเรียนนี้ชัดเจนและน่าสนใจ คุณอยากเริ่มจากอะไรก่อน?",
    video_create: "สวัสดี! บอกเมื่อคุณพร้อม ฉันจะสอนหัวข้อนี้ทีละขั้นตอน",
    video_engage: "สวัสดี! มาทำให้บทเรียนนี้น่าสนใจยิ่งขึ้น เราควรโฟกัสที่อะไรก่อน?",
    youtube_tutor:
      "สวัสดี! ฉันโหลดคำบรรยายวิดีโอ YouTube แล้ว ฉันจะอธิบายแนวคิดหลักก่อน แล้วค่อยๆ แนะนำตามวิดีโอ",
  },
  id: {
    tutor: "Halo! Saya siap membuat pelajaran ini jelas dan menarik. Apa yang ingin kamu jelajahi dulu?",
    video_create: "Halo! Beri tahu saat kamu siap, saya akan mengajarkan topik ini langkah demi langkah.",
    video_engage: "Halo! Mari buat pelajaran ini lebih menarik. Apa yang kita fokuskan dulu?",
    youtube_tutor:
      "Halo! Saya telah memuat transkrip video YouTube. Saya akan menjelaskan ide utama dulu, lalu membimbingmu langkah demi langkah saat menonton.",
  },
  ur: {
    tutor: "السلام علیکم! میں اس سبق کو واضح اور دلچسپ بنانے کے لیے تیار ہوں۔ آپ پہلے کیا دیکھنا چاہیں گے؟",
    video_create: "السلام علیکم! جب آپ تیار ہوں تو بتائیں، میں یہ موضوع قدم بہ قدم سکھاؤں گا۔",
    video_engage: "السلام علیکم! اس سبق کو مزید دلچسپ بنائیں۔ پہلے ہم کس پر توجہ دیں؟",
    youtube_tutor:
      "السلام علیکم! YouTube ویڈیو کا transcript لوڈ ہو گیا ہے۔ پہلے مرکزی خیال سمجھاؤں گا، پھر ویڈیو دیکھتے ہوئے قدم بہ قدم رہنمائی کروں گا۔",
  },
};

export function localizedGreeting(mode: LiveTutorMode, code: AppLanguageCode): string {
  return greetings[code][mode] ?? greetings.en[mode];
}

export function tutorNoEvidenceMessage(code: AppLanguageCode): string {
  const messages: Record<AppLanguageCode, string> = {
    en: "I could not find enough evidence in this study space to answer that reliably. Try asking about a concept covered by one of your indexed materials.",
    ta: "இந்த study space-ல் போதுமான ஆதாரம் கிடக்கவில்லை. உங்கள் indexed materials-ல் உள்ள concept பற்றி கேளுங்கள்.",
    si: "මෙම study space තුළ විශ්වාසව පිළිතුරු දීමට ප්‍රමාණවත් සාක්ෂි නොමැත. indexed materials වල ඇති concept ගැන අහන්න.",
    hi: "इस study space में पर्याप्त साक्ष्य नहीं मिला। किसी indexed material में शामिल concept के बारे में पूछें।",
    es: "No encontré suficiente evidencia en este espacio de estudio. Pregunta sobre un concepto de tus materiales indexados.",
    fr: "Je n'ai pas trouvé assez de preuves dans cet espace d'étude. Posez une question sur un concept couvert par vos documents indexés.",
    de: "Ich habe in diesem Lernbereich nicht genug Belege gefunden. Fragen Sie nach einem Konzept aus Ihren indexierten Materialien.",
    pt: "Não encontrei evidências suficientes neste espaço de estudo. Pergunte sobre um conceito dos seus materiais indexados.",
    it: "Non ho trovato prove sufficienti in questo spazio di studio. Chiedi di un concetto presente nei materiali indicizzati.",
    ja: "この学習スペースで十分な根拠が見つかりませんでした。インデックス済み教材の概念について質問してください。",
    ko: "이 학습 공간에서 충분한 근거를 찾지 못했습니다. 색인된 자료의 개념에 대해 질문해 보세요.",
    zh: "我在此学习空间找不到足够依据。请询问已索引资料中的概念。",
    ar: "لم أجد أدلة كافية في مساحة الدراسة هذه. اسأل عن مفهوم في موادك المفهرسة.",
    ru: "Недостаточно данных в этом учебном пространстве. Спросите о понятии из проиндексированных материалов.",
    bn: "এই study space-এ পর্যাপ্ত প্রমাণ পাইনি। indexed materials-এর কোনো concept সম্পর্কে জিজ্ঞাসা করুন।",
    te: "ఈ study space లో సరిపడా సాక్ష్యం దొరకలేదు. indexed materials లో ఉన్న concept గురించి అడగండి.",
    mr: "या study space मध्ये पुरेशी पुरावा सापडला नाही. indexed materials मधील concept विषयी विचारा.",
    nl: "Ik vond onvoldoende bewijs in deze studieruimte. Vraag over een concept uit je geïndexeerde materialen.",
    pl: "Nie znalazłem wystarczających dowodów w tej przestrzeni nauki. Zapytaj o pojęcie z zindeksowanych materiałów.",
    tr: "Bu çalışma alanında yeterli kanıt bulamadım. Dizinlenmiş materyallerinizdeki bir kavramı sorun.",
    vi: "Tôi không tìm đủ bằng chứng trong không gian học này. Hãy hỏi về khái niệm trong tài liệu đã lập chỉ mục.",
    th: "ไม่พบหลักฐานเพียงพอในพื้นที่เรียนนี้ ลองถามเกี่ยวกับแนวคิดจากสื่อที่จัดทำดัชนีแล้ว",
    id: "Saya tidak menemukan cukup bukti di ruang belajar ini. Tanyakan tentang konsep dari materi yang diindeks.",
    ur: "اس study space میں کافی ثبوت نہیں ملا۔ indexed materials کے کسی concept کے بارے میں پوچھیں۔",
  };
  return messages[code];
}

export function liveVoiceErrorMessage(code: AppLanguageCode): string | null {
  const def = getAppLanguageDefinition(code);
  if (def.liveVoiceSupported) return null;
  return `Live voice tutor is not available in ${def.englishLabel} yet. Switch to a supported language or use text tutor.`;
}
