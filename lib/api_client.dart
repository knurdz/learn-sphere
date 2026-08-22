import 'dart:io' show Platform;

import 'package:dio/dio.dart' as dio;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';
import 'auth_session.dart';
import 'device_timezone.dart';
import 'gamification_models.dart';
import 'models.dart';
import 'settings_provider.dart';

const _localeHeader = 'X-LearnSphere-Locale';
const _timezoneHeader = 'X-Timezone';

final bridgeApiProvider = Provider<BridgeApi>((ref) {
  final config = ref.watch(appConfigProvider);
  final client = Supabase.instance.client;
  final locale = ref.watch(settingsProvider.select((settings) => settings.appLanguage));
  final timezone = ref.watch(deviceTimezoneProvider).valueOrNull ?? 'UTC';
  return BridgeApi(config.apiBaseUrl, client, locale: locale, timezone: timezone);
});

class BridgeApi {
  BridgeApi(String baseUrl, this.supabase, {required this.locale, this.timezone = 'UTC'})
      : _dio = dio.Dio(
          dio.BaseOptions(
            baseUrl: baseUrl.replaceFirst(RegExp(r'/$'), ''),
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 90),
            headers: const {'Accept': 'application/json'},
          ),
        ) {
    _dio.interceptors.add(
      dio.InterceptorsWrapper(
        onRequest: (options, handler) async {
          await _applyAuthHeaders(options);
          handler.next(options);
        },
        onError: (error, handler) async {
          if (error.response?.statusCode == 401 && error.requestOptions.extra['authRetried'] != true) {
            try {
              await refreshSessionIfNeeded(supabase, force: true);
              final retry = error.requestOptions;
              retry.extra['authRetried'] = true;
              await _applyAuthHeaders(retry);
              handler.resolve(await _dio.fetch(retry));
              return;
            } catch (_) {}
          }
          handler.next(error);
        },
      ),
    );
  }

  final dio.Dio _dio;
  final SupabaseClient supabase;
  final String locale;
  final String timezone;

  Future<void> _applyAuthHeaders(dio.RequestOptions options) async {
    await refreshSessionIfNeeded(supabase);
    final token = supabase.auth.currentSession?.accessToken;
    options.headers['Accept'] = 'application/json';
    options.headers[_localeHeader] = locale;
    options.headers[_timezoneHeader] = timezone;
    if (token != null && token.isNotEmpty) {
      options.headers['Authorization'] = 'Bearer $token';
    } else {
      options.headers.remove('Authorization');
    }
  }

  dio.Options _options({String? contentType, String? timezoneOverride}) {
    final tz = timezoneOverride ?? timezone;
    return dio.Options(
      contentType: contentType,
      headers: {
        _localeHeader: locale,
        _timezoneHeader: tz,
      },
    );
  }

  Future<dio.Response<dynamic>> _get(String path, {Map<String, dynamic>? query}) {
    return _dio.get(path, queryParameters: query, options: _options());
  }

  Future<dio.Response<dynamic>> _post(String path, {Object? data}) {
    return _dio.post(path, data: data, options: _options());
  }

  Future<dio.Response<dynamic>> _delete(String path, {Map<String, dynamic>? query}) {
    return _dio.delete(path, queryParameters: query, options: _options());
  }

  String _connectionErrorMessage() {
    final base = _dio.options.baseUrl;
    final buffer = StringBuffer(
      'Cannot reach the LearnSphere API at $base. Start it on your computer: cd api && pnpm dev',
    );
    if (!kIsWeb && (base.contains('127.0.0.1') || base.contains('localhost'))) {
      if (Platform.isAndroid) {
        buffer.write(
          '. On a physical Android phone over USB, also run: adb reverse tcp:3000 tcp:3000',
        );
      } else {
        buffer.write(
          '. On a physical device, set API_BASE_URL to your computer\'s LAN IP (not 127.0.0.1) in .env.local',
        );
      }
    } else if (kIsWeb && (base.contains('127.0.0.1') || base.contains('localhost'))) {
      buffer.write('. Start the API with: cd api && pnpm dev');
    }
    buffer.write('.');
    return buffer.toString();
  }

  Future<T> _handle<T>(Future<dio.Response<dynamic>> request, T Function(dynamic) decode) async {
    try {
      final response = await request;
      return decode(response.data);
    } on dio.DioException catch (error) {
      final data = error.response?.data;
      String message;
      if (data is Map && data['error'] != null) {
        message = '${data['error']}';
        if (error.response?.statusCode == 401) {
          message =
              '$message Sign out and sign in again. If this persists, the release APK and server must use the same Supabase project.';
        }
      } else if (error.response?.statusCode == 401) {
        message =
            'Session expired or invalid. Sign out and sign in again. If this persists, confirm API_BASE_URL and Supabase settings match production.';
      } else if (error.response?.statusCode == 500) {
        message =
            'API server error (500). Stop other dev servers, then run: cd api && rm -rf .next && pnpm dev';
      } else if (error.type == dio.DioExceptionType.connectionError ||
          error.type == dio.DioExceptionType.connectionTimeout) {
        message = _connectionErrorMessage();
      } else {
        message = error.message ?? 'Network request failed.';
      }
      throw BridgeException(message, error.response?.statusCode);
    }
  }

  Future<({List<FeedItem> items, String? nextCursor})> fetchFeed({
    String? studySpaceId,
    String? kind,
    String? cursor,
    int limit = 20,
  }) async {
    return _handle(
      _get('/api/feed', query: {
        'limit': '$limit',
        if (studySpaceId != null && studySpaceId.isNotEmpty) 'studySpaceId': studySpaceId,
        if (kind != null && kind != 'all') 'kind': kind,
        if (cursor != null && cursor.isNotEmpty) 'cursor': cursor,
      }),
      (data) {
        final map = jsonMap(data);
        return (
          items: jsonList(map['items']).map((item) => FeedItem.fromMap(jsonMap(item))).toList(),
          nextCursor: map['nextCursor'] as String?,
        );
      },
    );
  }

  Future<void> ingestMaterial(String materialId) async {
    await _handle(_post('/api/materials/$materialId/ingest'), (_) {});
  }

  Future<void> deleteMaterial(String materialId) async {
    await _handle(_delete('/api/materials/$materialId'), (_) {});
  }

  Future<Map<String, dynamic>> generateLearning({
    required String studySpaceId,
    required String materialId,
    int maxAtoms = 5,
    int quizCount = 5,
    List<String>? types,
    bool fresh = false,
  }) {
    return _handle(
      _dio.post(
        '/api/learning/generate',
        data: {
          'studySpaceId': studySpaceId,
          'materialId': materialId,
          'maxAtoms': maxAtoms,
          'quizCount': quizCount,
          'skipExisting': true,
          'fresh': fresh,
          if (types != null && types.isNotEmpty) 'types': types,
        },
        options: _options()..receiveTimeout = const Duration(seconds: 120),
      ),
      (data) => jsonMap(data),
    );
  }

  Future<Map<String, dynamic>> submitFeedAttempt(String itemId, Object answer) {
    return _handle(
      _post('/api/learning/$itemId/attempt', data: {'answer': answer}),
      (data) => jsonMap(data),
    );
  }

  Future<Map<String, dynamic>> markFeedProgress(String itemId, {bool completed = true}) {
    return _handle(
      _post('/api/learning/$itemId/progress', data: {'completed': completed}),
      (data) => jsonMap(data),
    );
  }

  Future<String> createTutorSession(String studySpaceId) async {
    final result = await _handle(
      _post('/api/tutor/sessions', data: {'studySpaceId': studySpaceId}),
      (data) => jsonMap(data),
    );
    return '${jsonMap(result['session'])['id'] ?? ''}';
  }

  Future<void> deleteTutorSession(String sessionId) async {
    await _handle(
      _delete('/api/tutor/sessions/$sessionId'),
      (data) => jsonMap(data),
    );
  }

  Future<List<TutorSessionSummary>> fetchTutorSessions(String studySpaceId) async {
    return _handle(
      _get('/api/tutor/sessions/list', query: {'studySpaceId': studySpaceId}),
      (data) => jsonList(jsonMap(data)['sessions'])
          .map((item) => TutorSessionSummary.fromMap(jsonMap(item)))
          .toList(),
    );
  }

  Future<List<ChatMessage>> fetchTutorMessages(String sessionId) async {
    return _handle(
      _get('/api/tutor/sessions/$sessionId/messages'),
      (data) => jsonList(jsonMap(data)['messages'])
          .map((item) => ChatMessage.fromMap(jsonMap(item)))
          .toList(),
    );
  }

  Future<(ChatMessage, ChatMessage)> sendTutorMessage(String sessionId, String content) async {
    final result = await _handle(
      _post('/api/tutor/sessions/$sessionId/messages', data: {'content': content}),
      (data) => jsonMap(data),
    );
    return (
      ChatMessage.fromMap(jsonMap(result['userMessage'])),
      ChatMessage.fromMap(jsonMap(result['assistantMessage'])),
    );
  }

  Future<String> transcribeVoiceQuestion(
    List<int> bytes, {
    String filename = 'voice-question.m4a',
  }) async {
    final result = await _handle(
      _dio.post(
        '/api/tutor/voice/transcribe',
        data: dio.FormData.fromMap({
          'audio': dio.MultipartFile.fromBytes(
            bytes,
            filename: filename,
            contentType: _audioMediaType(filename),
          ),
        }),
        options: _options(),
      ),
      (data) => jsonMap(data),
    );
    return '${result['transcript'] ?? ''}'.trim();
  }

  Future<(ChatMessage, ChatMessage, String?)> sendVoiceQuestion(
    String sessionId,
    List<int> bytes, {
    String filename = 'voice-question.m4a',
  }) async {
    final result = await _handle(
      _dio.post(
        '/api/tutor/sessions/$sessionId/voice',
        data: dio.FormData.fromMap({
          'audio': dio.MultipartFile.fromBytes(
            bytes,
            filename: filename,
            contentType: _audioMediaType(filename),
          ),
        }),
        options: _options(),
      ),
      (data) => jsonMap(data),
    );
    return (
      ChatMessage.fromMap(jsonMap(result['userMessage'])),
      ChatMessage.fromMap(jsonMap(result['assistantMessage'])),
      result['transcript'] as String?,
    );
  }

  dio.DioMediaType _audioMediaType(String filename) {
    if (filename.endsWith('.webm')) return dio.DioMediaType('audio', 'webm');
    if (filename.endsWith('.wav')) return dio.DioMediaType('audio', 'wav');
    return dio.DioMediaType('audio', 'mp4');
  }

  Future<List<StudyArtifact>> fetchStudyTools(String studySpaceId) async {
    return _handle(
      _get('/api/study-tools', query: {'studySpaceId': studySpaceId}),
      (data) => jsonList(jsonMap(data)['artifacts'])
          .map((item) => StudyArtifact.fromMap(jsonMap(item)))
          .toList(),
    );
  }

  Future<StudyArtifact> generateStudyTool({
    required String studySpaceId,
    required String kind,
    String? brief,
    String? youtubeUrl,
  }) async {
    final result = await _handle(
      _post('/api/study-tools', data: {
        'studySpaceId': studySpaceId,
        'kind': kind,
        if (brief != null && brief.trim().isNotEmpty) 'brief': brief.trim(),
        if (youtubeUrl != null && youtubeUrl.trim().isNotEmpty) 'youtubeUrl': youtubeUrl.trim(),
      }),
      (data) => jsonMap(data),
    );
    return StudyArtifact.fromMap(jsonMap(result['artifact']));
  }

  Future<Map<String, dynamic>> submitVideoQuiz(String artifactId, Map<String, int> answers) {
    return _handle(
      _post('/api/study-tools/$artifactId/attempts', data: {'answers': answers}),
      (data) => jsonMap(data),
    );
  }

  Future<LiveTutorSession> createLiveTutorSession({
    required String studySpaceId,
    String mode = 'tutor',
    String brief = '',
    String youtubeUrl = '',
  }) async {
    final result = await _handle(
      _post('/api/live-tutor/session', data: {
        'studySpaceId': studySpaceId,
        'mode': mode,
        'brief': brief,
        'youtubeUrl': youtubeUrl,
      }),
      (data) => jsonMap(data),
    );
    return LiveTutorSession.fromMap(jsonMap(result['session']));
  }

  Future<dio.Response<dynamic>> _patch(String path, {Object? data, String? timezoneOverride}) {
    return _dio.patch(path, data: data, options: _options(timezoneOverride: timezoneOverride));
  }

  Future<GamificationSummary> fetchGamificationSummary({String? timezone}) async {
    final tz = timezone ?? this.timezone;
    return _handle(
      _get('/api/gamification/summary', query: {'timezone': tz}),
      (data) => GamificationSummary.fromMap(jsonMap(jsonMap(data)['summary'])),
    );
  }

  Future<ActivityAnalytics> fetchGamificationAnalytics({
    required String range,
    String? timezone,
  }) async {
    final tz = timezone ?? this.timezone;
    return _handle(
      _get('/api/gamification/analytics', query: {'range': range, 'timezone': tz}),
      (data) => ActivityAnalytics.fromMap(jsonMap(jsonMap(data)['analytics'])),
    );
  }

  Future<CoachTourState> completeCoachTourStep(String stepId, {String? timezone}) async {
    final tz = timezone ?? this.timezone;
    return _handle(
      _patch('/api/gamification/tour', data: {'stepId': stepId}, timezoneOverride: tz),
      (data) => CoachTourState.fromMap(jsonMap(jsonMap(data)['coachTour'])),
    );
  }

  Future<CoachTourState> skipCoachTour({String? timezone}) async {
    final tz = timezone ?? this.timezone;
    return _handle(
      _patch('/api/gamification/tour', data: {'skip': true}, timezoneOverride: tz),
      (data) => CoachTourState.fromMap(jsonMap(jsonMap(data)['coachTour'])),
    );
  }

  Future<int> updateDailyGoal(int dailyGoal, {String? timezone}) async {
    final tz = timezone ?? this.timezone;
    return _handle(
      _patch('/api/gamification/goal', data: {'dailyGoal': dailyGoal}, timezoneOverride: tz),
      (data) => (jsonMap(data)['dailyGoal'] as num?)?.toInt() ?? dailyGoal,
    );
  }

  Future<void> endLiveTutorSession(String sessionId) async {
    await _handle(
      _delete('/api/live-tutor/session', query: {'sessionId': sessionId}),
      (data) => jsonMap(data),
    );
  }
}

class BridgeException implements Exception {
  const BridgeException(this.message, [this.statusCode]);

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
