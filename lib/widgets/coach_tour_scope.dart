import 'package:flutter/material.dart';

import 'coach/coach_overlay.dart';

/// Exposes tour spotlight keys to tab screens.
///
/// [activeStep] is the current pending tour step id (or null). Target
/// [GlobalKey]s must only be attached while that step is active so GoRouter
/// rebuilds cannot mount the same key on two screens at once.
class CoachTourScope extends InheritedWidget {
  const CoachTourScope({
    super.key,
    required this.keys,
    required this.activeStep,
    required super.child,
  });

  final CoachTourKeys keys;
  final String? activeStep;

  static CoachTourKeys? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<CoachTourScope>()?.keys;
  }

  /// Returns the tour [GlobalKey] for [step] only when that step is active.
  static Key? targetKey(BuildContext context, String step) {
    final scope = context.dependOnInheritedWidgetOfExactType<CoachTourScope>();
    if (scope == null || scope.activeStep != step) return null;
    return scope.keys.keyForStep(step);
  }

  @override
  bool updateShouldNotify(CoachTourScope oldWidget) =>
      keys != oldWidget.keys || activeStep != oldWidget.activeStep;
}
