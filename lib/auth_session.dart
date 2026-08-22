import 'package:shared_preferences/shared_preferences.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';

const supabaseUrlPrefKey = 'learnsphere_supabase_url';

/// Initializes Supabase and drops stale sessions (wrong project URL or expired tokens).
Future<void> initializeSupabaseAuth(AppConfig config, SharedPreferences prefs) async {
  await Supabase.initialize(
    url: config.supabaseUrl,
    publishableKey: config.supabaseAnonKey,
    authOptions: const FlutterAuthClientOptions(
      authFlowType: AuthFlowType.pkce,
    ),
  );

  final client = Supabase.instance.client;
  final expectedUrl = config.supabaseUrl.trim();
  final storedUrl = prefs.getString(supabaseUrlPrefKey);
  if (storedUrl != null && storedUrl != expectedUrl) {
    await client.auth.signOut();
  }
  await prefs.setString(supabaseUrlPrefKey, expectedUrl);

  await refreshSessionIfNeeded(client, force: true);
}

bool sessionNeedsRefresh(Session session) {
  final expiresAt = session.expiresAt;
  if (expiresAt == null) return false;
  final expiry = DateTime.fromMillisecondsSinceEpoch(expiresAt * 1000, isUtc: true);
  return DateTime.now().toUtc().isAfter(expiry.subtract(const Duration(minutes: 2)));
}

/// Refreshes the access token when close to expiry (or [force] on cold start).
Future<void> refreshSessionIfNeeded(SupabaseClient client, {bool force = false}) async {
  final session = client.auth.currentSession;
  if (session == null) return;
  if (!force && !sessionNeedsRefresh(session)) return;

  try {
    final response = await client.auth.refreshSession();
    if (response.session == null) {
      await client.auth.signOut();
    }
  } catch (_) {
    await client.auth.signOut();
  }
}
