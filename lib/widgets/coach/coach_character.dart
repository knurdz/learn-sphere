import 'dart:math' as math;

import 'package:flutter/material.dart';

/// LearnSphere coach "Sphere" — simple vector mascot.
class CoachCharacter extends StatefulWidget {
  const CoachCharacter({super.key, this.size = 72, this.tapHint = false});

  final double size;
  final bool tapHint;

  @override
  State<CoachCharacter> createState() => _CoachCharacterState();
}

class _CoachCharacterState extends State<CoachCharacter> with TickerProviderStateMixin {
  AnimationController? _bobController;
  AnimationController? _eyeController;

  void _ensureControllers() {
    if (_bobController != null && _eyeController != null) return;
    _bobController ??= AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    _eyeController ??= AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4800),
    )..repeat();
  }

  @override
  void initState() {
    super.initState();
    _ensureControllers();
  }

  @override
  void reassemble() {
    super.reassemble();
    // Hot reload keeps State but may skip initState; ensure animators exist.
    _ensureControllers();
  }

  @override
  void dispose() {
    _bobController?.dispose();
    _eyeController?.dispose();
    super.dispose();
  }

  Offset _eyeLook(double t) {
    final angle = t * math.pi * 2;
    // Gentle wander: two slow waves so the gaze feels alive, not robotic.
    final x = math.sin(angle) * 0.55 + math.sin(angle * 1.7 + 0.8) * 0.25;
    final y = math.sin(angle * 0.85 + 1.4) * 0.4 + math.cos(angle * 1.3) * 0.15;
    return Offset(x.clamp(-1.0, 1.0), y.clamp(-1.0, 1.0));
  }

  @override
  Widget build(BuildContext context) {
    _ensureControllers();
    final bobController = _bobController!;
    final eyeController = _eyeController!;
    final theme = Theme.of(context);
    return AnimatedBuilder(
      animation: Listenable.merge([bobController, eyeController]),
      builder: (context, child) {
        final bob = (bobController.value - 0.5) * 6;
        final look = _eyeLook(eyeController.value);
        return Transform.translate(
          offset: Offset(0, bob),
          child: SizedBox(
            width: widget.size,
            height: widget.size,
            child: CustomPaint(
              painter: _SpherePainter(
                primary: theme.colorScheme.primary,
                surface: theme.colorScheme.surfaceContainerHighest,
                eyeLook: look,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SpherePainter extends CustomPainter {
  _SpherePainter({
    required this.primary,
    required this.surface,
    required this.eyeLook,
  });

  final Color primary;
  final Color surface;
  final Offset eyeLook;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width * 0.38;
    final pupilShift = Offset(eyeLook.dx * radius * 0.11, eyeLook.dy * radius * 0.11);

    final bodyPaint = Paint()..color = primary;
    canvas.drawCircle(center + const Offset(0, 4), radius, bodyPaint);

    final highlight = Paint()..color = Colors.white.withValues(alpha: 0.35);
    canvas.drawCircle(center + Offset(-radius * 0.25, -radius * 0.2), radius * 0.22, highlight);

    final eyeWhite = Paint()..color = Colors.white;
    final pupil = Paint()..color = const Color(0xFF0C1222);
    for (final dx in [-0.22, 0.22]) {
      final eyeCenter = center + Offset(radius * dx, -radius * 0.05);
      canvas.drawCircle(eyeCenter, radius * 0.18, eyeWhite);
      canvas.drawCircle(eyeCenter + pupilShift, radius * 0.08, pupil);
    }

    final smile = Path()
      ..moveTo(center.dx - radius * 0.35, center.dy + radius * 0.15)
      ..quadraticBezierTo(
        center.dx,
        center.dy + radius * 0.45,
        center.dx + radius * 0.35,
        center.dy + radius * 0.15,
      );
    canvas.drawPath(
      smile,
      Paint()
        ..color = surface
        ..style = PaintingStyle.stroke
        ..strokeWidth = radius * 0.09
        ..strokeCap = StrokeCap.round,
    );

    final wing = Paint()..color = primary.withValues(alpha: 0.85);
    canvas.drawOval(
      Rect.fromCenter(
        center: center + Offset(-radius * 0.95, radius * 0.05),
        width: radius * 0.55,
        height: radius * 0.35,
      ),
      wing,
    );
    canvas.drawOval(
      Rect.fromCenter(
        center: center + Offset(radius * 0.95, radius * 0.05),
        width: radius * 0.55,
        height: radius * 0.35,
      ),
      wing,
    );
  }

  @override
  bool shouldRepaint(covariant _SpherePainter oldDelegate) {
    return oldDelegate.primary != primary ||
        oldDelegate.surface != surface ||
        oldDelegate.eyeLook != eyeLook;
  }
}
