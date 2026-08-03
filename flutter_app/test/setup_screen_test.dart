import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:learnsphere_mobile/screens/setup_screen.dart';

void main() {
  testWidgets('shows mobile configuration guidance', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: SetupScreen()));

    expect(find.text('Connect LearnSphere'), findsOneWidget);
    expect(find.textContaining('SUPABASE_URL'), findsOneWidget);
  });
}
