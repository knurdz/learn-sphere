import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:learnsphere_mobile/app_usage_provider.dart';
import 'package:learnsphere_mobile/gamification_models.dart';
import 'package:learnsphere_mobile/gamification_provider.dart';
import 'package:learnsphere_mobile/l10n/app_localizations.dart';
import 'package:learnsphere_mobile/widgets/app_header_actions.dart';

void main() {
  testWidgets('DualWalletChip shows credits and stored minutes, not 120m', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gamificationProvider.overrideWith(
            () => _FakeGamificationNotifier(
              const GamificationSummary(
                currentStreak: 5,
                longestStreak: 7,
                totalXp: 8,
                dailyGoal: 3,
                todayEventCount: 2,
                todayXp: 18,
                onboardingStep: 3,
                coachTour: CoachTourState(version: 1, steps: []),
                pendingTourSteps: [],
                coachMessage: CoachMessage(id: 'x', text: 'Hi'),
                foregroundSeconds: 2700,
              ),
            ),
          ),
          // Provider state is lifetime seconds; 45 minutes = 2700s.
          appUsageProvider.overrideWith(() => _FakeAppUsageNotifier(45 * 60)),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: DualWalletChip()),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('80'), findsOneWidget);
    expect(find.text('45m'), findsOneWidget);
    expect(find.text('120m'), findsNothing);
  });
}

class _FakeGamificationNotifier extends GamificationNotifier {
  _FakeGamificationNotifier(this._summary);

  final GamificationSummary _summary;

  @override
  Future<GamificationSummary?> build() async => _summary;
}

class _FakeAppUsageNotifier extends AppUsageNotifier {
  _FakeAppUsageNotifier(this._seconds);

  final int _seconds;

  @override
  int build() => _seconds;
}
