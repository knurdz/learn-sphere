import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';
import 'screens/auth/forgot_password_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/reset_password_screen.dart';
import 'screens/auth/signup_screen.dart';
import 'screens/auth/verify_email_screen.dart';
import 'screens/feed_screen.dart';
import 'screens/learn_screen.dart';
import 'screens/library_screen.dart';
import 'screens/progress_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/setup_screen.dart';
import 'widgets/app_shell.dart';

const _authRoutes = {
  '/login',
  '/signup',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
};

bool _isAuthRoute(String location) => _authRoutes.contains(location);

/// Notifies GoRouter to re-run its `redirect` callback whenever Supabase auth
/// state changes, without recreating the GoRouter instance itself (which
/// would otherwise reset navigation back to `initialLocation` mid-flow).
class _AuthRefreshNotifier extends ChangeNotifier {
  _AuthRefreshNotifier(SupabaseClient client) {
    _subscription = client.auth.onAuthStateChange.listen((_) => notifyListeners());
  }

  late final StreamSubscription<AuthState> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

String? _legacyLearnRedirect(String location, {String? tab, String? drawer}) {
  if (location == '/tutor' || location == '/avatar') {
    final params = <String, String>{'tab': tab ?? 'live'};
    if (drawer != null) {
      params['drawer'] = drawer;
    } else if (location == '/tutor') {
      params['drawer'] = 'chat';
    }
    return Uri(path: '/learn', queryParameters: params).toString();
  }
  if (location == '/study') {
    return Uri(path: '/learn', queryParameters: {'tab': 'tools'}).toString();
  }
  return null;
}

final routerProvider = Provider<GoRouter>((ref) {
  final config = ref.watch(appConfigProvider);

  _AuthRefreshNotifier? refreshNotifier;
  if (config.isConfigured) {
    refreshNotifier = _AuthRefreshNotifier(Supabase.instance.client);
    ref.onDispose(refreshNotifier.dispose);
  }

  return GoRouter(
    initialLocation: config.isConfigured ? '/feed' : '/setup',
    refreshListenable: refreshNotifier,
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text('Page not found: ${state.uri.path}'),
        ),
      ),
    ),
    redirect: (context, state) {
      if (!config.isConfigured) return state.matchedLocation == '/setup' ? null : '/setup';
      final loggedIn = Supabase.instance.client.auth.currentSession != null;
      final authRoute = _isAuthRoute(state.matchedLocation);
      if (!loggedIn && !authRoute && state.matchedLocation != '/setup') return '/login';
      if (loggedIn && authRoute) {
        if (state.matchedLocation == '/verify-email') {
          final user = Supabase.instance.client.auth.currentUser;
          if (user?.emailConfirmedAt == null) return null;
        }
        return '/feed';
      }

      final legacy = _legacyLearnRedirect(
        state.matchedLocation,
        drawer: state.uri.queryParameters['drawer'],
      );
      if (legacy != null) return legacy;

      return null;
    },
    routes: [
      GoRoute(path: '/setup', builder: (context, state) => const SetupScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (context, state) => const SignupScreen()),
      GoRoute(
        path: '/verify-email',
        builder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return VerifyEmailScreen(email: Uri.decodeComponent(email));
        },
      ),
      GoRoute(path: '/forgot-password', builder: (context, state) => const ForgotPasswordScreen()),
      GoRoute(
        path: '/reset-password',
        builder: (context, state) {
          final email = state.uri.queryParameters['email'] ?? '';
          return ResetPasswordScreen(email: Uri.decodeComponent(email));
        },
      ),
      GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
      GoRoute(path: '/progress', builder: (context, state) => const ProgressScreen()),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/feed', builder: (context, state) => const FeedScreen()),
          GoRoute(path: '/learn', builder: (context, state) => const LearnScreen()),
          GoRoute(path: '/library', builder: (context, state) => LibraryScreen(key: AppShell.libraryScreenKey)),
          GoRoute(
            path: '/tutor',
            redirect: (context, state) => _legacyLearnRedirect('/tutor', drawer: 'chat'),
          ),
          GoRoute(
            path: '/study',
            redirect: (context, state) => _legacyLearnRedirect('/study'),
          ),
          GoRoute(
            path: '/avatar',
            redirect: (context, state) => _legacyLearnRedirect('/avatar'),
          ),
        ],
      ),
    ],
  );
});
