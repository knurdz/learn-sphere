/// Must stay aligned with [api/src/lib/app-language.ts].
class AppLanguageOption {
  const AppLanguageOption({
    required this.code,
    required this.nativeLabel,
    required this.englishLabel,
    required this.liveVoiceSupported,
  });

  final String code;
  final String nativeLabel;
  final String englishLabel;
  final bool liveVoiceSupported;

  String get pickerLabel =>
      liveVoiceSupported ? nativeLabel : '$nativeLabel (live voice unavailable)';
}

const appLanguageOptions = <AppLanguageOption>[
  AppLanguageOption(code: 'en', nativeLabel: 'English', englishLabel: 'English', liveVoiceSupported: true),
  AppLanguageOption(code: 'ta', nativeLabel: 'தமிழ்', englishLabel: 'Tamil', liveVoiceSupported: true),
  AppLanguageOption(code: 'si', nativeLabel: 'සිංහල', englishLabel: 'Sinhala', liveVoiceSupported: false),
  AppLanguageOption(code: 'hi', nativeLabel: 'हिन्दी', englishLabel: 'Hindi', liveVoiceSupported: true),
  AppLanguageOption(code: 'es', nativeLabel: 'Español', englishLabel: 'Spanish', liveVoiceSupported: true),
  AppLanguageOption(code: 'fr', nativeLabel: 'Français', englishLabel: 'French', liveVoiceSupported: true),
  AppLanguageOption(code: 'de', nativeLabel: 'Deutsch', englishLabel: 'German', liveVoiceSupported: true),
  AppLanguageOption(code: 'pt', nativeLabel: 'Português', englishLabel: 'Portuguese', liveVoiceSupported: true),
  AppLanguageOption(code: 'it', nativeLabel: 'Italiano', englishLabel: 'Italian', liveVoiceSupported: true),
  AppLanguageOption(code: 'ja', nativeLabel: '日本語', englishLabel: 'Japanese', liveVoiceSupported: true),
  AppLanguageOption(code: 'ko', nativeLabel: '한국어', englishLabel: 'Korean', liveVoiceSupported: true),
  AppLanguageOption(code: 'zh', nativeLabel: '中文', englishLabel: 'Chinese', liveVoiceSupported: true),
  AppLanguageOption(code: 'ar', nativeLabel: 'العربية', englishLabel: 'Arabic', liveVoiceSupported: true),
  AppLanguageOption(code: 'ru', nativeLabel: 'Русский', englishLabel: 'Russian', liveVoiceSupported: true),
  AppLanguageOption(code: 'bn', nativeLabel: 'বাংলা', englishLabel: 'Bengali', liveVoiceSupported: true),
  AppLanguageOption(code: 'te', nativeLabel: 'తెలుగు', englishLabel: 'Telugu', liveVoiceSupported: true),
  AppLanguageOption(code: 'mr', nativeLabel: 'मराठी', englishLabel: 'Marathi', liveVoiceSupported: true),
  AppLanguageOption(code: 'nl', nativeLabel: 'Nederlands', englishLabel: 'Dutch', liveVoiceSupported: true),
  AppLanguageOption(code: 'pl', nativeLabel: 'Polski', englishLabel: 'Polish', liveVoiceSupported: true),
  AppLanguageOption(code: 'tr', nativeLabel: 'Türkçe', englishLabel: 'Turkish', liveVoiceSupported: true),
  AppLanguageOption(code: 'vi', nativeLabel: 'Tiếng Việt', englishLabel: 'Vietnamese', liveVoiceSupported: true),
  AppLanguageOption(code: 'th', nativeLabel: 'ไทย', englishLabel: 'Thai', liveVoiceSupported: true),
  AppLanguageOption(code: 'id', nativeLabel: 'Bahasa Indonesia', englishLabel: 'Indonesian', liveVoiceSupported: true),
  AppLanguageOption(code: 'ur', nativeLabel: 'اردو', englishLabel: 'Urdu', liveVoiceSupported: true),
];

AppLanguageOption? appLanguageByCode(String code) {
  for (final option in appLanguageOptions) {
    if (option.code == code) return option;
  }
  return null;
}

String normalizeAppLanguageCode(String? code) {
  final trimmed = (code ?? '').trim().toLowerCase().split('-').first;
  if (appLanguageByCode(trimmed) != null) return trimmed;
  return 'en';
}
