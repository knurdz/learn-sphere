import 'models.dart';

class CoachMessage {
  const CoachMessage({
    required this.id,
    required this.text,
    this.ctaLabel,
    this.ctaRoute,
  });

  final String id;
  final String text;
  final String? ctaLabel;
  final String? ctaRoute;

  factory CoachMessage.fromMap(Map<String, dynamic> map) {
    return CoachMessage(
      id: '${map['id'] ?? ''}',
      text: '${map['text'] ?? ''}',
      ctaLabel: map['ctaLabel'] as String?,
      ctaRoute: map['ctaRoute'] as String?,
    );
  }
}

class CoachTourState {
  const CoachTourState({required this.version, required this.steps});

  final int version;
  final List<String> steps;

  factory CoachTourState.fromMap(Map<String, dynamic> map) {
    return CoachTourState(
      version: (map['version'] as num?)?.toInt() ?? 1,
      steps: jsonList(map['steps']).map((step) => '$step').toList(),
    );
  }
}

class GamificationSummary {
  const GamificationSummary({
    required this.currentStreak,
    required this.longestStreak,
    required this.totalXp,
    required this.dailyGoal,
    required this.todayEventCount,
    required this.todayXp,
    required this.onboardingStep,
    required this.coachTour,
    required this.pendingTourSteps,
    required this.coachMessage,
  });

  final int currentStreak;
  final int longestStreak;
  final int totalXp;
  final int dailyGoal;
  final int todayEventCount;
  final int todayXp;
  final int onboardingStep;
  final CoachTourState coachTour;
  final List<String> pendingTourSteps;
  final CoachMessage coachMessage;

  bool get dailyGoalMet => todayEventCount >= dailyGoal;

  factory GamificationSummary.fromMap(Map<String, dynamic> map) {
    return GamificationSummary(
      currentStreak: (map['currentStreak'] as num?)?.toInt() ?? 0,
      longestStreak: (map['longestStreak'] as num?)?.toInt() ?? 0,
      totalXp: (map['totalXp'] as num?)?.toInt() ?? 0,
      dailyGoal: (map['dailyGoal'] as num?)?.toInt() ?? 3,
      todayEventCount: (map['todayEventCount'] as num?)?.toInt() ?? 0,
      todayXp: (map['todayXp'] as num?)?.toInt() ?? 0,
      onboardingStep: (map['onboardingStep'] as num?)?.toInt() ?? 3,
      coachTour: CoachTourState.fromMap(jsonMap(map['coachTour'])),
      pendingTourSteps: jsonList(map['pendingTourSteps']).map((step) => '$step').toList(),
      coachMessage: CoachMessage.fromMap(jsonMap(map['coachMessage'])),
    );
  }
}

class AnalyticsBucket {
  const AnalyticsBucket({
    required this.label,
    required this.startDate,
    required this.eventCount,
    required this.xp,
  });

  final String label;
  final String startDate;
  final int eventCount;
  final int xp;

  factory AnalyticsBucket.fromMap(Map<String, dynamic> map) {
    return AnalyticsBucket(
      label: '${map['label'] ?? ''}',
      startDate: '${map['startDate'] ?? ''}',
      eventCount: (map['eventCount'] as num?)?.toInt() ?? 0,
      xp: (map['xp'] as num?)?.toInt() ?? 0,
    );
  }
}

class ActivityAnalytics {
  const ActivityAnalytics({
    required this.range,
    required this.timezone,
    required this.totalEvents,
    required this.totalXp,
    required this.byType,
    required this.buckets,
  });

  final String range;
  final String timezone;
  final int totalEvents;
  final int totalXp;
  final Map<String, ({int count, int xp})> byType;
  final List<AnalyticsBucket> buckets;

  factory ActivityAnalytics.fromMap(Map<String, dynamic> map) {
    final byTypeRaw = jsonMap(map['byType']);
    final byType = <String, ({int count, int xp})>{};
    for (final entry in byTypeRaw.entries) {
      final value = jsonMap(entry.value);
      byType[entry.key] = (
        count: (value['count'] as num?)?.toInt() ?? 0,
        xp: (value['xp'] as num?)?.toInt() ?? 0,
      );
    }
    return ActivityAnalytics(
      range: '${map['range'] ?? 'week'}',
      timezone: '${map['timezone'] ?? 'UTC'}',
      totalEvents: (map['totalEvents'] as num?)?.toInt() ?? 0,
      totalXp: (map['totalXp'] as num?)?.toInt() ?? 0,
      byType: byType,
      buckets: jsonList(map['buckets']).map((item) => AnalyticsBucket.fromMap(jsonMap(item))).toList(),
    );
  }
}

const coachTourStepOrder = [
  'welcome',
  'feed',
  'learn_tab',
  'learn_live',
  'learn_tools',
  'library',
  'settings',
];

String humanizeActivityType(String type) {
  return switch (type) {
    'feed_completed' => 'Feed cards',
    'feed_attempt' => 'Quizzes & drills',
    'video_quiz_completed' => 'Video quizzes',
    'study_tool_generated' => 'Study tools',
    'material_uploaded' => 'Uploads',
    'tutor_message' => 'Tutor chat',
    'live_tutor_started' => 'Live sessions',
    _ => type.replaceAll('_', ' '),
  };
}
