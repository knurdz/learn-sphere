import 'package:flutter/material.dart';

import 'coach/coach_overlay.dart';

/// Exposes tour spotlight keys to tab screens.
class CoachTourScope extends InheritedWidget {
  const CoachTourScope({super.key, required this.keys, required super.child});

  final CoachTourKeys keys;

  static CoachTourKeys? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<CoachTourScope>()?.keys;
  }

  @override
  bool updateShouldNotify(CoachTourScope oldWidget) => keys != oldWidget.keys;
}
