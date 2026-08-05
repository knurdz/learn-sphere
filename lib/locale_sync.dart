import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';
import 'settings_provider.dart';

/// Persists the learner's language choice to Supabase for cross-device sync.
Future<void> syncPreferredLocale(WidgetRef ref, String languageCode) async {
  final config = ref.read(appConfigProvider);
  if (!config.isConfigured) return;

  final user = Supabase.instance.client.auth.currentUser;
  if (user == null) return;

  try {
    await Supabase.instance.client
        .from('profiles')
        .update({'preferred_locale': languageCode})
        .eq('id', user.id);
  } catch (_) {
    // Profile row may not exist yet; ignore.
  }
}

Future<void> loadPreferredLocaleFromProfile(WidgetRef ref) async {
  final config = ref.read(appConfigProvider);
  if (!config.isConfigured) return;

  final user = Supabase.instance.client.auth.currentUser;
  if (user == null) return;

  try {
    final row = await Supabase.instance.client
        .from('profiles')
        .select('preferred_locale')
        .eq('id', user.id)
        .maybeSingle();
    if (row != null) {
      ref.read(settingsProvider.notifier).applyLanguageFromProfile(row['preferred_locale'] as String?);
    }
  } catch (_) {
    // Column may be missing until migration runs.
  }
}
