import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme.dart';
import 'coach/coach_character.dart';

/// Full-screen animated splash shown while the app initializes.
class LearnSphereLoadingSplash extends StatefulWidget {
  const LearnSphereLoadingSplash({super.key});

  @override
  State<LearnSphereLoadingSplash> createState() => _LearnSphereLoadingSplashState();
}

class _LearnSphereLoadingSplashState extends State<LearnSphereLoadingSplash>
    with TickerProviderStateMixin {
  late final AnimationController _orbit;
  late final AnimationController _ring;
  late final AnimationController _pulse;

  @override
  void initState() {
    super.initState();
    _orbit = AnimationController(vsync: this, duration: const Duration(milliseconds: 3200))..repeat();
    _ring = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();
    _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _orbit.dispose();
    _ring.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 220,
          height: 220,
          child: Stack(
            alignment: Alignment.center,
            children: [
              AnimatedBuilder(
                animation: _orbit,
                builder: (context, _) {
                  return CustomPaint(
                    size: const Size(220, 220),
                    painter: _OrbitDotsPainter(
                      progress: _orbit.value,
                      color: primary,
                    ),
                  );
                },
              ),
              AnimatedBuilder(
                animation: _ring,
                builder: (context, _) {
                  return CustomPaint(
                    size: const Size(180, 180),
                    painter: _GlobeRingsPainter(
                      progress: _ring.value,
                      color: primary,
                    ),
                  );
                },
              ),
              ScaleTransition(
                scale: Tween<double>(begin: 0.94, end: 1.0).animate(
                  CurvedAnimation(parent: _pulse, curve: Curves.easeInOut),
                ),
                child: const CoachCharacter(size: 96),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Standalone [MaterialApp] wrapper used before the main app tree is ready.
class LearnSphereLoadingSplashApp extends StatelessWidget {
  const LearnSphereLoadingSplashApp({super.key});

  static const _defaultSeed = Color(0xFF059669);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildLearnSphereTheme(seedColor: _defaultSeed, brightness: Brightness.light),
      darkTheme: buildLearnSphereTheme(seedColor: _defaultSeed, brightness: Brightness.dark),
      themeMode: ThemeMode.system,
      onGenerateRoute: (_) => MaterialPageRoute<void>(
        settings: const RouteSettings(name: '/'),
        builder: (_) => const LearnSphereLoadingSplash(),
      ),
    );
  }
}

class _OrbitDotsPainter extends CustomPainter {
  _OrbitDotsPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.42;
    const dotCount = 3;

    for (var i = 0; i < dotCount; i++) {
      final angle = (i / dotCount) * math.pi * 2 + progress * math.pi * 2;
      final wobble = math.sin(progress * math.pi * 4 + i) * 4;
      final dotCenter = center + Offset(math.cos(angle), math.sin(angle)) * (radius + wobble);
      final dotRadius = 4.5 + math.sin(progress * math.pi * 2 + i) * 1.2;

      canvas.drawCircle(
        dotCenter,
        dotRadius,
        Paint()..color = color.withValues(alpha: 0.55 + 0.35 * math.sin(progress * math.pi * 2 + i)),
      );
    }
  }

  @override
  bool shouldRepaint(covariant _OrbitDotsPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}

class _GlobeRingsPainter extends CustomPainter {
  _GlobeRingsPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width * 0.38;

    final ringPaint = Paint()
      ..color = color.withValues(alpha: 0.22)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    for (var i = 0; i < 3; i++) {
      final tilt = progress * math.pi * 2 + i * (math.pi / 3);
      canvas.save();
      canvas.translate(center.dx, center.dy);
      canvas.rotate(tilt);
      canvas.scale(1.0, 0.38 + 0.12 * math.sin(tilt));
      canvas.drawCircle(Offset.zero, baseRadius, ringPaint);
      canvas.restore();
    }

    final dashPaint = Paint()
      ..color = color.withValues(alpha: 0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    for (var dash = 0; dash < 12; dash++) {
      final start = dash / 12 + progress;
      const sweep = 0.04;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: baseRadius * 1.08),
        start * math.pi * 2,
        sweep * math.pi * 2,
        false,
        dashPaint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _GlobeRingsPainter oldDelegate) {
    return oldDelegate.progress != progress || oldDelegate.color != color;
  }
}
