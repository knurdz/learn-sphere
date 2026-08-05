import 'dart:convert';

Map<String, dynamic> jsonMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.map((key, value) => MapEntry('$key', value));
  return <String, dynamic>{};
}

List<dynamic> jsonList(Object? value) => value is List ? value : const [];

class StudySpace {
  const StudySpace({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    required this.createdAt,
  });

  final String id;
  final String userId;
  final String name;
  final String? description;
  final DateTime createdAt;

  factory StudySpace.fromMap(Map<String, dynamic> map) => StudySpace(
        id: '${map['id'] ?? ''}',
        userId: '${map['user_id'] ?? ''}',
        name: '${map['name'] ?? 'Untitled space'}',
        description: map['description'] as String?,
        createdAt: DateTime.tryParse('${map['created_at'] ?? ''}') ?? DateTime.now(),
      );
}

enum MaterialStatus { created, uploaded, processing, ready, uploadFailed, error }

MaterialStatus materialStatusFromString(String value) => switch (value) {
      'uploaded' => MaterialStatus.uploaded,
      'processing' => MaterialStatus.processing,
      'ready' => MaterialStatus.ready,
      'upload_failed' => MaterialStatus.uploadFailed,
      'error' => MaterialStatus.error,
      _ => MaterialStatus.created,
    };

extension MaterialStatusLabel on MaterialStatus {
  String get label => switch (this) {
        MaterialStatus.created => 'Created',
        MaterialStatus.uploaded => 'Uploaded',
        MaterialStatus.processing => 'Indexing',
        MaterialStatus.ready => 'Ready',
        MaterialStatus.uploadFailed => 'Upload failed',
        MaterialStatus.error => 'Indexing failed',
      };
}

class MaterialItem {
  const MaterialItem({
    required this.id,
    required this.userId,
    required this.studySpaceId,
    required this.name,
    required this.mimeType,
    required this.sizeBytes,
    required this.storagePath,
    required this.status,
    this.ingestionError,
    this.ingestedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String userId;
  final String studySpaceId;
  final String name;
  final String mimeType;
  final int sizeBytes;
  final String storagePath;
  final MaterialStatus status;
  final String? ingestionError;
  final DateTime? ingestedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  factory MaterialItem.fromMap(Map<String, dynamic> map) => MaterialItem(
        id: '${map['id'] ?? ''}',
        userId: '${map['user_id'] ?? ''}',
        studySpaceId: '${map['study_space_id'] ?? ''}',
        name: '${map['name'] ?? 'Material'}',
        mimeType: '${map['mime_type'] ?? 'application/octet-stream'}',
        sizeBytes: int.tryParse('${map['size_bytes'] ?? 0}') ?? 0,
        storagePath: '${map['storage_path'] ?? ''}',
        status: materialStatusFromString('${map['status'] ?? 'created'}'),
        ingestionError: map['ingestion_error'] as String?,
        ingestedAt: DateTime.tryParse('${map['ingested_at'] ?? ''}'),
        createdAt: DateTime.tryParse('${map['created_at'] ?? ''}') ?? DateTime.now(),
        updatedAt: DateTime.tryParse('${map['updated_at'] ?? ''}') ?? DateTime.now(),
      );
}

class Progress {
  const Progress({this.completedAt, this.lastScore});

  final DateTime? completedAt;
  final num? lastScore;

  bool get completed => completedAt != null;

  factory Progress.fromMap(Map<String, dynamic> map) => Progress(
        completedAt: DateTime.tryParse('${map['completedAt'] ?? map['completed_at'] ?? ''}'),
        lastScore: map['lastScore'] ?? map['last_score'] as num?,
      );
}

class Citation {
  const Citation({
    required this.chunkId,
    required this.materialId,
    required this.materialName,
    required this.label,
    required this.quote,
    this.pageNumber,
    this.startSeconds,
    this.endSeconds,
  });

  final String chunkId;
  final String materialId;
  final String materialName;
  final String label;
  final String quote;
  final int? pageNumber;
  final num? startSeconds;
  final num? endSeconds;

  factory Citation.fromMap(Map<String, dynamic> map) => Citation(
        chunkId: '${map['chunkId'] ?? ''}',
        materialId: '${map['materialId'] ?? ''}',
        materialName: '${map['materialName'] ?? 'Source'}',
        label: '${map['label'] ?? 'Source excerpt'}',
        quote: '${map['quote'] ?? ''}',
        pageNumber: map['pageNumber'] as int?,
        startSeconds: map['startSeconds'] as num?,
        endSeconds: map['endSeconds'] as num?,
      );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.sessionId,
    required this.role,
    required this.content,
    required this.citations,
    required this.createdAt,
  });

  final String id;
  final String sessionId;
  final String role;
  final String content;
  final List<Citation> citations;
  final DateTime createdAt;

  factory ChatMessage.fromMap(Map<String, dynamic> map) => ChatMessage(
        id: '${map['id'] ?? DateTime.now().microsecondsSinceEpoch}',
        sessionId: '${map['session_id'] ?? ''}',
        role: '${map['role'] ?? 'assistant'}',
        content: '${map['content'] ?? ''}',
        citations: jsonList(map['citations'])
            .map((item) => Citation.fromMap(jsonMap(item)))
            .toList(),
        createdAt: DateTime.tryParse('${map['created_at'] ?? ''}') ?? DateTime.now(),
      );
}

class FeedItem {
  const FeedItem({
    required this.id,
    required this.kind,
    required this.title,
    required this.payload,
    this.assetUrl,
    this.meme,
    required this.studySpaceId,
    required this.studySpaceName,
    this.materialId,
    this.materialName,
    required this.createdAt,
    required this.progress,
  });

  final String id;
  final String kind;
  final String title;
  final Map<String, dynamic> payload;
  final String? assetUrl;
  final MemeLayout? meme;
  final String studySpaceId;
  final String studySpaceName;
  final String? materialId;
  final String? materialName;
  final DateTime createdAt;
  final Progress progress;

  factory FeedItem.fromMap(Map<String, dynamic> map) => FeedItem(
        id: '${map['id'] ?? ''}',
        kind: '${map['kind'] ?? 'flashcard'}',
        title: '${map['title'] ?? 'Learning card'}',
        payload: jsonMap(map['payload']),
        assetUrl: map['assetUrl'] as String?,
        meme: map['meme'] == null ? null : MemeLayout.fromMap(jsonMap(map['meme'])),
        studySpaceId: '${map['studySpaceId'] ?? ''}',
        studySpaceName: '${map['studySpaceName'] ?? 'Study space'}',
        materialId: map['materialId'] as String?,
        materialName: map['materialName'] as String?,
        createdAt: DateTime.tryParse('${map['createdAt'] ?? ''}') ?? DateTime.now(),
        progress: Progress.fromMap(jsonMap(map['progress'])),
      );

  FeedItem withProgress(Progress value) => FeedItem(
        id: id,
        kind: kind,
        title: title,
        payload: payload,
        assetUrl: assetUrl,
        meme: meme,
        studySpaceId: studySpaceId,
        studySpaceName: studySpaceName,
        materialId: materialId,
        materialName: materialName,
        createdAt: createdAt,
        progress: value,
      );
}

class MemeLayout {
  const MemeLayout({
    required this.imageUrl,
    required this.width,
    required this.height,
    required this.textColor,
    required this.strokeColor,
    required this.strokeWidth,
    required this.slots,
  });

  final String imageUrl;
  final double width;
  final double height;
  final String textColor;
  final String strokeColor;
  final double strokeWidth;
  final List<MemeSlot> slots;

  factory MemeLayout.fromMap(Map<String, dynamic> map) => MemeLayout(
        imageUrl: '${map['imageUrl'] ?? ''}',
        width: (map['width'] as num?)?.toDouble() ?? 1200,
        height: (map['height'] as num?)?.toDouble() ?? 1200,
        textColor: '${map['textColor'] ?? 'white'}',
        strokeColor: '${map['strokeColor'] ?? 'black'}',
        strokeWidth: (map['strokeWidth'] as num?)?.toDouble() ?? 3,
        slots: jsonList(map['slots']).map((slot) => MemeSlot.fromMap(jsonMap(slot))).toList(),
      );

  Map<String, dynamic> toMap() => {
        'imageUrl': imageUrl,
        'width': width,
        'height': height,
        'textColor': textColor,
        'strokeColor': strokeColor,
        'strokeWidth': strokeWidth,
        'slots': slots.map((slot) => slot.toMap()).toList(),
      };
}

class MemeSlot {
  const MemeSlot({
    required this.name,
    required this.caption,
    required this.left,
    required this.top,
    required this.right,
    required this.bottom,
    required this.fontSize,
  });

  final String name;
  final String caption;
  final double left;
  final double top;
  final double right;
  final double bottom;
  final double fontSize;

  double get width => right - left;
  double get height => bottom - top;

  factory MemeSlot.fromMap(Map<String, dynamic> map) {
    final box = jsonList(map['box']).map((value) => (value as num?)?.toDouble() ?? 0).toList();
    return MemeSlot(
      name: '${map['name'] ?? ''}',
      caption: '${map['caption'] ?? ''}',
      left: box.isNotEmpty ? box[0] : 0,
      top: box.length > 1 ? box[1] : 0,
      right: box.length > 2 ? box[2] : 0,
      bottom: box.length > 3 ? box[3] : 0,
      fontSize: (map['fontSize'] as num?)?.toDouble() ?? 36,
    );
  }

  Map<String, dynamic> toMap() => {
        'name': name,
        'caption': caption,
        'box': [left, top, right, bottom],
        'fontSize': fontSize,
      };
}

class StudyArtifact {
  const StudyArtifact({
    required this.id,
    required this.studySpaceId,
    required this.kind,
    required this.title,
    required this.payload,
    required this.createdAt,
    this.progress,
  });

  final String id;
  final String studySpaceId;
  final String kind;
  final String title;
  final Map<String, dynamic> payload;
  final DateTime createdAt;
  final Progress? progress;

  factory StudyArtifact.fromMap(Map<String, dynamic> map) => StudyArtifact(
        id: '${map['id'] ?? ''}',
        studySpaceId: '${map['study_space_id'] ?? map['studySpaceId'] ?? ''}',
        kind: '${map['kind'] ?? 'video_quiz'}',
        title: '${map['title'] ?? 'Study tool'}',
        payload: jsonMap(map['payload']),
        createdAt: DateTime.tryParse('${map['created_at'] ?? ''}') ?? DateTime.now(),
        progress: map['progress'] == null ? null : Progress.fromMap(jsonMap(map['progress'])),
      );
}

class LiveTutorSession {
  const LiveTutorSession({
    required this.sessionId,
    required this.greeting,
    required this.mode,
    required this.url,
    required this.room,
    required this.token,
  });

  final String sessionId;
  final String greeting;
  final String mode;

  /// LiveKit room the learner and the Beyond Presence avatar share.
  final String url;
  final String room;
  final String token;

  factory LiveTutorSession.fromMap(Map<String, dynamic> map) => LiveTutorSession(
        sessionId: '${map['id'] ?? map['sessionId'] ?? ''}',
        greeting: '${map['greeting'] ?? ''}',
        mode: '${map['mode'] ?? 'tutor'}',
        url: '${map['url'] ?? ''}',
        room: '${map['room'] ?? ''}',
        token: '${map['token'] ?? ''}',
      );
}

String encodeJson(Object value) => jsonEncode(value);
