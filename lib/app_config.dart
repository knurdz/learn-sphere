import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AppConfig {
  const AppConfig({
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    required this.apiBaseUrl,
  });

  final String supabaseUrl;
  final String supabaseAnonKey;
  final String apiBaseUrl;

  bool get isConfigured => supabaseUrl.isNotEmpty && supabaseAnonKey.isNotEmpty;
}

String _readEnv(String key, {String defaultValue = ''}) {
  final fromFile = dotenv.env[key];
  if (fromFile != null && fromFile.trim().isNotEmpty) {
    return fromFile.trim();
  }
  return String.fromEnvironment(key, defaultValue: defaultValue);
}

AppConfig readAppConfig() {
  return AppConfig(
    supabaseUrl: _readEnv('SUPABASE_URL'),
    supabaseAnonKey: _readEnv('SUPABASE_ANON_KEY'),
    apiBaseUrl: _readEnv('API_BASE_URL', defaultValue: 'http://127.0.0.1:3000'),
  );
}

final appConfigProvider = Provider<AppConfig>((ref) => readAppConfig());
