import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

final authControllerProvider = StateNotifierProvider<AuthController, AsyncValue<Session?>>((ref) {
  return AuthController(Supabase.instance.client);
});

class AuthController extends StateNotifier<AsyncValue<Session?>> {
  AuthController(this.client) : super(AsyncData(client.auth.currentSession)) {
    _subscription = client.auth.onAuthStateChange.listen((data) {
      state = AsyncData(data.session);
    });
  }

  final SupabaseClient client;
  late final StreamSubscription<AuthState> _subscription;

  Future<void> signIn(String email, String password) async {
    state = const AsyncLoading();
    try {
      final response = await client.auth.signInWithPassword(email: email.trim(), password: password);
      state = AsyncData(response.session);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<AuthResponse> signUp(String email, String password, String displayName) async {
    state = const AsyncLoading();
    try {
      final response = await client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'display_name': displayName.trim()},
        emailRedirectTo: 'learnsphere://auth/callback',
      );
      state = AsyncData(response.session);
      return response;
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> signOut() async {
    await client.auth.signOut();
    state = const AsyncData(null);
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
