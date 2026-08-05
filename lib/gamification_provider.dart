import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'api_client.dart';
import 'device_timezone.dart';
import 'gamification_models.dart';

class GamificationNotifier extends AsyncNotifier<GamificationSummary?> {
  String _timezone = 'UTC';

  @override
  Future<GamificationSummary?> build() async {
    _timezone = await ref.watch(deviceTimezoneProvider.future);
    return _load();
  }

  Future<GamificationSummary?> _load() async {
    try {
      final api = ref.read(bridgeApiProvider);
      return await api.fetchGamificationSummary(timezone: _timezone);
    } catch (_) {
      return null;
    }
  }

  Future<void> refresh() async {
    final previous = state.valueOrNull;
    if (previous != null) {
      state = AsyncData(previous);
    }
    state = AsyncData(await _load());
  }

  Future<void> completeTourStep(String stepId) async {
    final api = ref.read(bridgeApiProvider);
    await api.completeCoachTourStep(stepId, timezone: _timezone);
    final updated = await _load();
    state = AsyncData(updated);
  }

  Future<void> skipCoachTour() async {
    final api = ref.read(bridgeApiProvider);
    await api.skipCoachTour(timezone: _timezone);
    final updated = await _load();
    state = AsyncData(updated);
  }
}

final gamificationProvider =
    AsyncNotifierProvider<GamificationNotifier, GamificationSummary?>(GamificationNotifier.new);

final activityAnalyticsProvider =
    FutureProvider.family<ActivityAnalytics?, String>((ref, range) async {
  try {
    final timezone = await ref.watch(deviceTimezoneProvider.future);
    final api = ref.read(bridgeApiProvider);
    return await api.fetchGamificationAnalytics(range: range, timezone: timezone);
  } catch (_) {
    return null;
  }
});
