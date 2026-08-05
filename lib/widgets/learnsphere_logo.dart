import 'package:flutter/material.dart';

/// LearnSphere brand mark (launcher icon asset).
class LearnSphereLogo extends StatelessWidget {
  const LearnSphereLogo({
    super.key,
    this.size = 58,
    this.borderRadius = 18,
  });

  final double size;
  final double borderRadius;

  static const _assetPath = 'assets/images/app_icon.png';

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(borderRadius),
      child: Image.asset(
        _assetPath,
        width: size,
        height: size,
        fit: BoxFit.cover,
        semanticLabel: 'LearnSphere',
      ),
    );
  }
}
