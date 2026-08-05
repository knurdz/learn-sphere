import 'dart:io';

import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_controller.dart';
import 'avatar_utils.dart';

class UserProfile {
  const UserProfile({
    required this.id,
    this.displayName,
    this.avatarUrl,
  });

  final String id;
  final String? displayName;
  final String? avatarUrl;

  UserProfile copyWith({String? displayName, String? avatarUrl}) {
    return UserProfile(
      id: id,
      displayName: displayName ?? this.displayName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
    );
  }

  factory UserProfile.fromMap(Map<String, dynamic> row) {
    return UserProfile(
      id: '${row['id']}',
      displayName: row['display_name'] as String?,
      avatarUrl: row['avatar_url'] as String?,
    );
  }
}

final profileRepositoryProvider = Provider<ProfileRepository>((ref) {
  return ProfileRepository(Supabase.instance.client);
});

final profileProvider = AsyncNotifierProvider<ProfileNotifier, UserProfile?>(ProfileNotifier.new);

class ProfileNotifier extends AsyncNotifier<UserProfile?> {
  @override
  Future<UserProfile?> build() async {
    ref.listen(authControllerProvider, (_, __) {
      ref.invalidateSelf();
    });

    final session = ref.watch(authControllerProvider).valueOrNull;
    if (session == null) return null;

    return ref.read(profileRepositoryProvider).ensureProfile(session.user);
  }

  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }

  Future<void> setAvatarUrl(String url) async {
    final profile = state.valueOrNull;
    if (profile == null) return;
    await ref.read(profileRepositoryProvider).updateAvatarUrl(profile.id, url);
    state = AsyncData(profile.copyWith(avatarUrl: url));
  }

  Future<void> uploadAvatar(PlatformFile file) async {
    final profile = state.valueOrNull;
    if (profile == null) return;
    final url = await ref.read(profileRepositoryProvider).uploadAvatar(profile.id, file);
    state = AsyncData(profile.copyWith(avatarUrl: url));
  }

  Future<void> useGooglePhoto() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    final photo = googlePhotoFromUser(user);
    if (photo == null) return;
    await setAvatarUrl(photo);
  }
}

class ProfileRepository {
  ProfileRepository(this.client);

  final SupabaseClient client;

  Future<UserProfile> ensureProfile(User user) async {
    var row = await _fetchRow(user.id);
    if (row == null) {
      await client.from('profiles').upsert({'id': user.id});
      row = await _fetchRow(user.id);
    }
    var profile = UserProfile.fromMap(row ?? {'id': user.id});

    final googlePhoto = googlePhotoFromUser(user);
    if (profile.avatarUrl == null && googlePhoto != null) {
      profile = await _saveAvatar(user.id, googlePhoto);
    }

    if (profile.avatarUrl == null || profile.avatarUrl!.trim().isEmpty) {
      final defaultUrl = diceBearAvatarUrl(seed: user.id);
      profile = await _saveAvatar(user.id, defaultUrl);
    }

    return profile;
  }

  Future<Map<String, dynamic>?> _fetchRow(String userId) async {
    final row = await client.from('profiles').select().eq('id', userId).maybeSingle();
    if (row == null) return null;
    return Map<String, dynamic>.from(row);
  }

  Future<UserProfile> _saveAvatar(String userId, String url) async {
    await client.from('profiles').update({'avatar_url': url}).eq('id', userId);
    final row = await _fetchRow(userId);
    return UserProfile.fromMap(row ?? {'id': userId, 'avatar_url': url});
  }

  Future<void> updateAvatarUrl(String userId, String url) async {
    await client.from('profiles').update({'avatar_url': url.trim()}).eq('id', userId);
  }

  Future<String> uploadAvatar(String userId, PlatformFile file) async {
    final bytes = file.bytes ?? (file.path != null ? await File(file.path!).readAsBytes() : null);
    if (bytes == null || bytes.isEmpty) {
      throw const FormatException('Choose a non-empty image.');
    }
    final ext = _imageExtension(file);
    final path = '$userId/avatar.$ext';
    await client.storage.from('avatars').uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            upsert: true,
            contentType: _mimeForExtension(ext),
          ),
        );
    final url = client.storage.from('avatars').getPublicUrl(path);
    await updateAvatarUrl(userId, url);
    return url;
  }

  String _imageExtension(PlatformFile file) {
    final name = file.name.toLowerCase();
    if (name.endsWith('.png')) return 'png';
    if (name.endsWith('.webp')) return 'webp';
    if (name.endsWith('.gif')) return 'gif';
    return 'jpg';
  }

  String _mimeForExtension(String ext) {
    switch (ext) {
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      default:
        return 'image/jpeg';
    }
  }
}
