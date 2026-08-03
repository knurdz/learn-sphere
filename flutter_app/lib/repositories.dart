import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import 'api_client.dart';
import 'cache_store.dart';
import 'models.dart';

final studyRepositoryProvider = Provider<StudyRepository>((ref) {
  return StudyRepository(
    Supabase.instance.client,
    ref.watch(bridgeApiProvider),
    ref.watch(cacheStoreProvider),
  );
});

class StudyRepository {
  StudyRepository(this.client, this.bridge, this.cache);

  final SupabaseClient client;
  final BridgeApi bridge;
  final CacheStore cache;
  static final _uuid = Uuid();

  Future<List<StudySpace>> listSpaces() async {
    try {
      final rows = await client.from('study_spaces').select().order('created_at', ascending: false);
      final spaces = rows.map((row) => StudySpace.fromMap(Map<String, dynamic>.from(row))).toList();
      await cache.writeList('study_spaces', rows.map((row) => Map<String, dynamic>.from(row)).toList());
      return spaces;
    } catch (_) {
      final stored = await cache.readList('study_spaces');
      return stored.values.map(StudySpace.fromMap).toList();
    }
  }

  Future<StudySpace> createSpace(String name, String description) async {
    final user = client.auth.currentUser;
    if (user == null) throw const BridgeException('Sign in to create a study space.');
    final row = await client
        .from('study_spaces')
        .insert({'user_id': user.id, 'name': name.trim(), 'description': description.trim().isEmpty ? null : description.trim()})
        .select()
        .single();
    return StudySpace.fromMap(Map<String, dynamic>.from(row));
  }

  Future<List<MaterialItem>> listMaterials() async {
    try {
      final rows = await client.from('materials').select().order('created_at', ascending: false);
      final mapped = rows.map((row) => MaterialItem.fromMap(Map<String, dynamic>.from(row))).toList();
      await cache.writeList('materials', rows.map((row) => Map<String, dynamic>.from(row)).toList());
      return mapped;
    } catch (_) {
      final stored = await cache.readList('materials');
      return stored.values.map(MaterialItem.fromMap).toList();
    }
  }

  Future<MaterialItem> uploadMaterial({
    required String studySpaceId,
    required PlatformFile file,
  }) async {
    final user = client.auth.currentUser;
    if (user == null) throw const BridgeException('Sign in before uploading material.');
    final bytes = file.bytes ?? await File(file.path!).readAsBytes();
    if (bytes.isEmpty || bytes.length > 25 * 1024 * 1024) {
      throw const BridgeException('Materials must be between 1 byte and 25 MB.');
    }
    final materialId = _uuid.v4();
    final safeName = file.name.replaceAll(RegExp(r'[^a-zA-Z0-9._-]'), '-');
    final storagePath = '${user.id}/$materialId/$safeName';
    final mime = file.extension == 'pdf'
        ? 'application/pdf'
        : file.extension == 'txt'
            ? 'text/plain'
            : 'application/octet-stream';

    await client.from('materials').insert({
      'id': materialId,
      'user_id': user.id,
      'study_space_id': studySpaceId,
      'name': file.name,
      'mime_type': mime,
      'size_bytes': bytes.length,
      'storage_path': storagePath,
      'status': 'created',
    }).select().single();

    try {
      await client.storage.from('materials').uploadBinary(
            storagePath,
            bytes,
            fileOptions: FileOptions(contentType: mime, upsert: false),
          );
      final row = await client.from('materials').update({
        'status': 'uploaded',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', materialId).select().single();
      return MaterialItem.fromMap(Map<String, dynamic>.from(row));
    } catch (error) {
      await client.from('materials').update({
        'status': 'upload_failed',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', materialId);
      throw BridgeException('$error');
    }
  }

  Future<void> ingest(MaterialItem material) => bridge.ingestMaterial(material.id);

  Future<Map<String, dynamic>> generateLearning(MaterialItem material) {
    return bridge.generateLearning(
      studySpaceId: material.studySpaceId,
      materialId: material.id,
    );
  }

  Future<List<FeedItem>> feed({String? spaceId, String? kind}) async {
    try {
      final items = await bridge.fetchFeed(studySpaceId: spaceId, kind: kind);
      await cache.writeList('feed_${spaceId ?? 'all'}_${kind ?? 'all'}', items.map(_feedToMap).toList());
      return items;
    } catch (_) {
      final stored = await cache.readList('feed_${spaceId ?? 'all'}_${kind ?? 'all'}');
      return stored.values.map(FeedItem.fromMap).toList();
    }
  }

  Map<String, dynamic> _feedToMap(FeedItem item) => {
        'id': item.id,
        'kind': item.kind,
        'title': item.title,
        'payload': item.payload,
        'assetUrl': item.assetUrl,
        'studySpaceId': item.studySpaceId,
        'studySpaceName': item.studySpaceName,
        'materialId': item.materialId,
        'materialName': item.materialName,
        'createdAt': item.createdAt.toIso8601String(),
        'progress': {
          'completedAt': item.progress.completedAt?.toIso8601String(),
          'lastScore': item.progress.lastScore,
        },
      };

  Future<List<StudyArtifact>> studyTools(String studySpaceId) => bridge.fetchStudyTools(studySpaceId);

  Future<StudyArtifact> generateStudyTool(String studySpaceId, String kind, {String? brief}) {
    return bridge.generateStudyTool(studySpaceId: studySpaceId, kind: kind, brief: brief);
  }
}
