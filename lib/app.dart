import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_controller.dart';
import 'l10n/app_localizations.dart';
import 'gamification_provider.dart';
import 'locale_sync.dart';
import 'router.dart';
import 'settings_provider.dart';
import 'theme.dart';

class LearnSphereApp extends ConsumerStatefulWidget {
  const LearnSphereApp({super.key});

  @override
  ConsumerState<LearnSphereApp> createState() => _LearnSphereAppState();
}

class _LearnSphereAppState extends ConsumerState<LearnSphereApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    Future.microtask(() => loadPreferredLocaleFromProfile(ref));
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      ref.read(gamificationProvider.notifier).refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<Session?>>(authControllerProvider, (previous, next) {
      next.whenData((session) {
        if (session != null) {
          Future.microtask(() {
            loadPreferredLocaleFromProfile(ref);
            ref.read(gamificationProvider.notifier).refresh();
          });
        }
      });
    });

    final router = ref.watch(routerProvider);
    final settings = ref.watch(settingsProvider);

    ThemeMode themeMode;
    switch (settings.themeMode) {
      case AppThemeMode.system:
        themeMode = ThemeMode.system;
        break;
      case AppThemeMode.light:
        themeMode = ThemeMode.light;
        break;
      case AppThemeMode.dark:
        themeMode = ThemeMode.dark;
        break;
    }

    return MaterialApp.router(
      title: 'LearnSphere',
      debugShowCheckedModeBanner: false,
      locale: settings.appLocale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: AppLocalizations.supportedLocales,
      themeMode: themeMode,
      theme: buildLearnSphereTheme(
        seedColor: Color(settings.colorTheme),
        brightness: Brightness.light,
      ),
      darkTheme: buildLearnSphereTheme(
        seedColor: Color(settings.colorTheme),
        brightness: Brightness.dark,
      ),
      routerConfig: router,
    );
  }
}
