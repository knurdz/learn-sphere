import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:learnsphere_mobile/l10n/app_localizations.dart';
import 'package:learnsphere_mobile/gamification_models.dart';
import 'package:learnsphere_mobile/gamification_provider.dart';
import 'package:learnsphere_mobile/widgets/coach/streak_chip.dart';

void main() {
  testWidgets('StreakChip shows streak count', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          gamificationProvider.overrideWith(
            () => _FakeGamificationNotifier(
              const GamificationSummary(
                currentStreak: 5,
                longestStreak: 7,
                totalXp: 120,
                dailyGoal: 3,
                todayEventCount: 2,
                todayXp: 18,
                onboardingStep: 3,
                coachTour: CoachTourState(version: 1, steps: []),
                pendingTourSteps: [],
                coachMessage: CoachMessage(id: 'x', text: 'Hi'),
              ),
            ),
          ),
        ],
        child: const MaterialApp(
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: Scaffold(body: StreakChip()),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('5'), findsOneWidget);
    expect(find.textContaining('2/3'), findsOneWidget);
  });
}

class _FakeGamificationNotifier extends GamificationNotifier {
  _FakeGamificationNotifier(this._summary);

  final GamificationSummary _summary;

  @override
  Future<GamificationSummary?> build() async => _summary;
}
