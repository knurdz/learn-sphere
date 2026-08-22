import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_constants.dart';

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
    try {
      // Do not pass emailRedirectTo here — that triggers magic-link emails. The app
      // verifies signup with {{ .Token }} via verifyOTP (see Supabase email template).
      final response = await client.auth.signUp(
        email: email.trim(),
        password: password,
        data: {'display_name': displayName.trim()},
      );
      final needsEmailVerification = response.user?.emailConfirmedAt == null;
      if (needsEmailVerification) {
        // Drop the provisional session so OTP verification and auth routes behave correctly.
        await client.auth.signOut();
        state = const AsyncData(null);
      } else {
        state = AsyncData(response.session);
      }
      return response;
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> signInWithGoogle() async {
    // Web must return to the current origin (e.g. http://localhost:8080). Add that
    // URL in Supabase Auth → Redirect URLs. Native keeps the custom scheme.
    await client.auth.signInWithOAuth(
      OAuthProvider.google,
      redirectTo: kIsWeb ? Uri.base.origin : authRedirectUri,
      authScreenLaunchMode: kIsWeb ? LaunchMode.platformDefault : LaunchMode.externalApplication,
    );
  }

  Future<AuthResponse> verifySignupOtp({required String email, required String token}) async {
    state = const AsyncLoading();
    try {
      final response = await client.auth.verifyOTP(
        email: email.trim(),
        token: token.trim(),
        type: OtpType.signup,
      );
      state = AsyncData(response.session);
      return response;
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> resendSignupOtp(String email) async {
    await client.auth.resend(type: OtpType.signup, email: email.trim());
  }

  Future<void> requestPasswordReset(String email) async {
    await client.auth.resetPasswordForEmail(email.trim());
  }

  Future<void> verifyRecoveryAndSetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    state = const AsyncLoading();
    try {
      await client.auth.verifyOTP(
        email: email.trim(),
        token: token.trim(),
        type: OtpType.recovery,
      );
      await client.auth.updateUser(UserAttributes(password: newPassword));
      await client.auth.signOut();
      state = const AsyncData(null);
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
