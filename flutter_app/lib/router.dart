import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app_config.dart';
import 'screens/auth_screen.dart';
import 'screens/avatar_screen.dart';
import 'screens/feed_screen.dart';
import 'screens/library_screen.dart';
import 'screens/setup_screen.dart';
import 'screens/study_screen.dart';
import 'screens/tutor_screen.dart';
import 'widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final config = ref.watch(appConfigProvider);
  return GoRouter(
    initialLocation: config.isConfigured ? '/feed' : '/setup',
    redirect: (context, state) {
      if (!config.isConfigured) return state.matchedLocation == '/setup' ? null : '/setup';
      final loggedIn = Supabase.instance.client.auth.currentSession != null;
      final authRoute = state.matchedLocation == '/login' || state.matchedLocation == '/signup';
      if (!loggedIn && !authRoute && state.matchedLocation != '/setup') return '/login';
      if (loggedIn && authRoute) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/setup', builder: (context, state) => const SetupScreen()),
      GoRoute(path: '/login', builder: (context, state) => const AuthScreen(mode: AuthMode.login)),
      GoRoute(path: '/signup', builder: (context, state) => const AuthScreen(mode: AuthMode.signup)),
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/feed', builder: (context, state) => const FeedScreen()),
          GoRoute(path: '/library', builder: (context, state) => const LibraryScreen()),
          GoRoute(path: '/tutor', builder: (context, state) => const TutorScreen()),
          GoRoute(path: '/study', builder: (context, state) => const StudyScreen()),
          GoRoute(path: '/avatar', builder: (context, state) => const AvatarScreen()),
        ],
      ),
    ],
  );
});
