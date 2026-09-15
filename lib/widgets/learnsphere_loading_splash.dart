import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'learnsphere_logo.dart';

/// Full-screen splash. Same logo + wordmark as before, timed like a Netflix bumper.
class LearnSphereLoadingSplash extends StatefulWidget {
  const LearnSphereLoadingSplash({
    super.key,
    this.seedColor = const Color(0xFF115DE8),
  });

  final Color seedColor;

  @override
  State<LearnSphereLoadingSplash> createState() => _LearnSphereLoadingSplashState();
}

class _LearnSphereLoadingSplashState extends State<LearnSphereLoadingSplash>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fadeLogo;
  late final Animation<double> _scaleLogo;
  late final Animation<double> _zoomLogo;
  late final Animation<double> _glow;
  late final Animation<double> _fadeText;
  late final Animation<double> _trackingText;
  late final Animation<double> _swoosh;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    );

    _fadeLogo = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.0, 0.28, curve: Curves.easeOut),
    );
    _scaleLogo = Tween<double>(begin: 3.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.42, curve: Curves.easeInCubic),
      ),
    );
    _zoomLogo = Tween<double>(begin: 1.0, end: 1.12).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.72, 1.0, curve: Curves.easeInCubic),
      ),
    );
    _glow = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.18, 0.55, curve: Curves.easeOut),
      ),
    );
    _fadeText = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.38, 0.62, curve: Curves.easeOut),
    );
    _trackingText = Tween<double>(begin: 28.0, end: 3.2).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.38, 0.78, curve: Curves.easeOutCubic),
      ),
    );
    _swoosh = Tween<double>(begin: -1.2, end: 1.2).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.08, 0.48, curve: Curves.easeInOutCubic),
      ),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final seed = widget.seedColor;
    final accent = seed;
    final accentSoft = Color.lerp(seed, Colors.white, 0.42)!;
    final background = Color.lerp(const Color(0xFFF7F9FC), seed, 0.14)!;
    final wordmark = Color.lerp(seed, const Color(0xFF0B1220), 0.38)!;

    return Scaffold(
      backgroundColor: background,
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final glowOpacity = _glow.value * 0.42;
          return Stack(
            fit: StackFit.expand,
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    center: const Alignment(0, -0.04),
                    radius: 0.55 + (0.2 * _glow.value),
                    colors: [
                      accentSoft.withValues(alpha: glowOpacity),
                      background.withValues(alpha: 0),
                    ],
                  ),
                ),
              ),
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Opacity(
                      opacity: _fadeLogo.value,
                      child: Transform.scale(
                        scale: _scaleLogo.value * _zoomLogo.value,
                        child: child,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Opacity(
                      opacity: _fadeText.value,
                      child: Text(
                        'LEARNSPHERE',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: wordmark,
                          letterSpacing: _trackingText.value,
                          height: 1,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              IgnorePointer(
                child: Align(
                  alignment: Alignment(_swoosh.value, 0),
                  child: Opacity(
                    opacity: (1 - (_swoosh.value.abs() / 1.2)).clamp(0.0, 1.0) * 0.75,
                    child: Container(
                      width: 18,
                      height: 220,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(20),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            accent.withValues(alpha: 0),
                            accent,
                            accent.withValues(alpha: 0),
                          ],
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: accent.withValues(alpha: 0.45),
                            blurRadius: 28,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
        child: const LearnSphereLogo(size: 88, borderRadius: 26),
      ),
    );
  }
}

/// Standalone [MaterialApp] wrapper used before the main app tree is ready.
class LearnSphereLoadingSplashApp extends StatefulWidget {
  const LearnSphereLoadingSplashApp({super.key});

  @override
  State<LearnSphereLoadingSplashApp> createState() => _LearnSphereLoadingSplashAppState();
}

class _LearnSphereLoadingSplashAppState extends State<LearnSphereLoadingSplashApp> {
  Color _seed = const Color(0xFF115DE8);

  @override
  void initState() {
    super.initState();
    SharedPreferences.getInstance().then((prefs) {
      if (!mounted) return;
      setState(() {
        _seed = Color(prefs.getInt('colorTheme') ?? 0xFF115DE8);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final background = Color.lerp(const Color(0xFFF7F9FC), _seed, 0.14)!;
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      themeMode: ThemeMode.light,
      theme: ThemeData(
        brightness: Brightness.light,
        colorScheme: ColorScheme.fromSeed(seedColor: _seed),
        scaffoldBackgroundColor: background,
      ),
      home: LearnSphereLoadingSplash(seedColor: _seed),
    );
  }
}
