import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

final cacheStoreProvider = Provider<CacheStore>((ref) => CacheStore());

class CacheStore {
  Future<void> writeList(String key, List<Map<String, dynamic>> values) async {
    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(
      key,
      jsonEncode({'savedAt': DateTime.now().toIso8601String(), 'values': values}),
    );
  }

  Future<CachedList> readList(String key) async {
    final preferences = await SharedPreferences.getInstance();
    final raw = preferences.getString(key);
    if (raw == null) return const CachedList(values: [], savedAt: null);
    try {
      final decoded = jsonDecode(raw) as Map<String, dynamic>;
      return CachedList(
        values: (decoded['values'] as List? ?? [])
            .map((value) => Map<String, dynamic>.from(value as Map))
            .toList(),
        savedAt: DateTime.tryParse('${decoded['savedAt'] ?? ''}'),
      );
    } catch (_) {
      return const CachedList(values: [], savedAt: null);
    }
  }
}

class CachedList {
  const CachedList({required this.values, required this.savedAt});

  final List<Map<String, dynamic>> values;
  final DateTime? savedAt;

  bool get isStale => savedAt == null || DateTime.now().difference(savedAt!) > const Duration(minutes: 10);
}
