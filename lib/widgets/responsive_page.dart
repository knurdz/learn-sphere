import 'package:flutter/material.dart';

/// Shared width breakpoints for phone vs tablet/desktop layouts.
abstract final class AppBreakpoints {
  static const double sidebarNav = 720;
  static const double pageMaxWidth = 1080;
  static const double authMaxWidth = 480;
  static const double feedCardMaxWidth = 720;
}

bool useSidebarNavigation(BuildContext context) {
  return MediaQuery.sizeOf(context).width >= AppBreakpoints.sidebarNav;
}

/// Centers page content and caps width on large screens (web / tablet).
class ResponsivePage extends StatelessWidget {
  const ResponsivePage({
    required this.child,
    this.maxWidth = AppBreakpoints.pageMaxWidth,
    super.key,
  });

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: maxWidth),
        child: child,
      ),
    );
  }
}
