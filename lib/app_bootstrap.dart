import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app.dart';
import 'app_config.dart';
import 'auth_session.dart';
import 'settings_provider.dart';
import 'widgets/learnsphere_loading_splash.dart';

class _BootstrapData {
  const _BootstrapData(this.prefs);

  final SharedPreferences prefs;
}

/// Runs async startup work, showing [LearnSphereLoadingSplashApp] until ready.
class AppBootstrap extends StatefulWidget {
  const AppBootstrap({super.key});

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
  late final Future<_BootstrapData> _bootstrapFuture;

  @override
  void initState() {
    super.initState();
    _bootstrapFuture = _bootstrap();
  }

  Future<_BootstrapData> _bootstrap() async {
    final results = await Future.wait([
      _loadServices(),
      Future<void>.delayed(const Duration(milliseconds: 1400)),
    ]);
    return results.first as _BootstrapData;
  }

  Future<_BootstrapData> _loadServices() async {
    await dotenv.load(fileName: '.env.local', isOptional: true);
    final prefs = await SharedPreferences.getInstance();

    final config = readAppConfig();
    if (config.isConfigured) {
      await initializeSupabaseAuth(config, prefs);
    }

    return _BootstrapData(prefs);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<_BootstrapData>(
      future: _bootstrapFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const LearnSphereLoadingSplashApp();
        }
        if (snapshot.hasError) {
          return MaterialApp(
            home: Scaffold(
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text('Startup failed: ${snapshot.error}'),
                ),
              ),
            ),
          );
        }

        final prefs = snapshot.data!.prefs;
        return ProviderScope(
          overrides: [
            sharedPreferencesProvider.overrideWithValue(prefs),
          ],
          child: const LearnSphereApp(),
        );
      },
    );
  }
}
