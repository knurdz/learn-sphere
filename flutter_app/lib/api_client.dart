import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';
import 'models.dart';

final bridgeApiProvider = Provider<BridgeApi>((ref) {
  final config = ref.watch(appConfigProvider);
  final client = Supabase.instance.client;
  return BridgeApi(config.apiBaseUrl, client);
});

class BridgeApi {
  BridgeApi(String baseUrl, this.supabase)
      : _dio = Dio(
          BaseOptions(
            baseUrl: baseUrl.replaceFirst(RegExp(r'/$'), ''),
            connectTimeout: const Duration(seconds: 20),
            receiveTimeout: const Duration(seconds: 90),
            headers: const {'Accept': 'application/json'},
          ),
        );

  final Dio _dio;
  final SupabaseClient supabase;

  Options _options({String? contentType}) {
    final token = supabase.auth.currentSession?.accessToken;
    return Options(
      contentType: contentType,
      headers: {
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    );
  }

  Future<Response<dynamic>> _get(String path, {Map<String, dynamic>? query}) {
    return _dio.get(path, queryParameters: query, options: _options());
  }

  Future<Response<dynamic>> _post(String path, {Object? data}) {
    return _dio.post(path, data: data, options: _options());
  }

  Future<T> _handle<T>(Future<Response<dynamic>> request, T Function(dynamic) decode) async {
    try {
      final response = await request;
      return decode(response.data);
    } on DioException catch (error) {
      final data = error.response?.data;
      final message = data is Map && data['error'] != null
          ? '${data['error']}'
          : error.message ?? 'Network request failed.';
      throw BridgeException(message, error.response?.statusCode);
    }
  }

  Future<List<FeedItem>> fetchFeed({String? studySpaceId, String? kind}) async {
    final response = await _handle(
      _get('/api/feed', query: {
        'limit': '80',
        if (studySpaceId != null && studySpaceId.isNotEmpty) 'studySpaceId': studySpaceId,
        if (kind != null && kind != 'all') 'kind': kind,
      }),
      (data) => jsonList(jsonMap(data)['items'])
          .map((item) => FeedItem.fromMap(jsonMap(item)))
          .toList(),
    );
    return response;
  }

  Future<void> ingestMaterial(String materialId) async {
    await _handle(_post('/api/materials/$materialId/ingest'), (_) {});
  }

  Future<Map<String, dynamic>> generateLearning({
    required String studySpaceId,
    required String materialId,
    int maxAtoms = 5,
    int quizCount = 3,
  }) {
    return _handle(
      _post('/api/learning/generate', data: {
        'studySpaceId': studySpaceId,
        'materialId': materialId,
        'maxAtoms': maxAtoms,
        'quizCount': quizCount,
        'skipExisting': true,
      }),
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

  Future<(ChatMessage, ChatMessage, String?)> sendVoiceQuestion(
    String sessionId,
    String path,
  ) async {
    final token = supabase.auth.currentSession?.accessToken;
    try {
      final response = await _dio.post(
        '/api/tutor/sessions/$sessionId/voice',
        data: FormData.fromMap({
          'audio': await MultipartFile.fromFile(path, filename: 'voice-question.m4a'),
        }),
        options: Options(
          headers: {
            if (token != null) 'Authorization': 'Bearer $token',
            'Content-Type': 'multipart/form-data',
          },
        ),
      );
      final result = jsonMap(response.data);
      return (
        ChatMessage.fromMap(jsonMap(result['userMessage'])),
        ChatMessage.fromMap(jsonMap(result['assistantMessage'])),
        result['transcript'] as String?,
      );
    } on DioException catch (error) {
      final data = error.response?.data;
      throw BridgeException(
        data is Map && data['error'] != null ? '${data['error']}' : 'Voice question failed.',
        error.response?.statusCode,
      );
    }
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
  }) async {
    final result = await _handle(
      _post('/api/study-tools', data: {
        'studySpaceId': studySpaceId,
        'kind': kind,
        if (brief != null && brief.trim().isNotEmpty) 'brief': brief.trim(),
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

  Future<AvatarSession> createAvatarSession({
    required String studySpaceId,
    String mode = 'tutor',
    String brief = '',
    String youtubeUrl = '',
  }) async {
    final result = await _handle(
      _post('/api/beyond-presence/session', data: {
        'studySpaceId': studySpaceId,
        'mode': mode,
        'brief': brief,
        'youtubeUrl': youtubeUrl,
      }),
      (data) => jsonMap(data),
    );
    return AvatarSession.fromMap(jsonMap(result['session']));
  }

  Future<void> deleteAvatarSession(String agentId) async {
    await _handle(
      _dio.delete(
        '/api/beyond-presence/session',
        data: {'agentId': agentId},
        options: _options(),
      ),
      (_) {},
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
