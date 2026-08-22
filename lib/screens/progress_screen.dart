import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../gamification_models.dart';
import '../gamification_provider.dart';
import '../l10n/app_localizations.dart';
import '../widgets/coach/coach_bubble.dart';
import '../widgets/coach/coach_character.dart';
import '../widgets/responsive_page.dart';

class ProgressScreen extends ConsumerStatefulWidget {
  const ProgressScreen({super.key});

  @override
  ConsumerState<ProgressScreen> createState() => _ProgressScreenState();
}

class _ProgressScreenState extends ConsumerState<ProgressScreen> {
  String _range = 'week';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final summaryAsync = ref.watch(gamificationProvider);
    final analyticsAsync = ref.watch(activityAnalyticsProvider(_range));
    final summary = summaryAsync.valueOrNull;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.progressTitle),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go('/feed');
            }
          },
        ),
      ),
      body: ResponsivePage(
        child: RefreshIndicator(
          onRefresh: () async {
            await ref.read(gamificationProvider.notifier).refresh();
            ref.invalidate(activityAnalyticsProvider(_range));
          },
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
            children: [
            if (summary != null) ...[
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const CoachCharacter(size: 64),
                  const SizedBox(width: 12),
                  Expanded(
                    child: CoachBubble(
                      message: summary.coachMessage,
                      compact: true,
                      hideCtaForRoute: '/progress',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              _StreakHero(summary: summary, l10n: l10n),
              const SizedBox(height: 16),
              _DailyGoalRing(summary: summary, l10n: l10n),
            ],
            const SizedBox(height: 24),
            SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'day', label: Text(l10n.progressRangeDay)),
                ButtonSegment(value: 'week', label: Text(l10n.progressRangeWeek)),
                ButtonSegment(value: 'month', label: Text(l10n.progressRangeMonth)),
              ],
              selected: {_range},
              onSelectionChanged: (selection) {
                setState(() => _range = selection.first);
              },
            ),
            const SizedBox(height: 20),
            analyticsAsync.when(
              data: (analytics) {
                if (analytics == null) {
                  return Text(l10n.progressAnalyticsUnavailable);
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      l10n.progressActivitySummary(analytics.totalEvents, analytics.totalXp),
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 220,
                      child: _ActivityChart(analytics: analytics),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      l10n.progressBreakdownTitle,
                      style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    ...analytics.byType.entries.map(
                      (entry) => ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(humanizeActivityType(entry.key)),
                        trailing: Text('${entry.value.count} · ${entry.value.xp} XP'),
                      ),
                    ),
                    if (analytics.byType.isEmpty)
                      Text(
                        l10n.progressNoActivityYet,
                        style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                  ],
                );
              },
              loading: () => const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator())),
              error: (_, __) => Text(l10n.progressAnalyticsUnavailable),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

class _StreakHero extends StatelessWidget {
  const _StreakHero({required this.summary, required this.l10n});

  final GamificationSummary summary;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Text('🔥', style: theme.textTheme.displaySmall),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.progressCurrentStreak(summary.currentStreak),
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  Text(
                    l10n.progressLongestStreak(summary.longestStreak),
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  Text(
                    l10n.progressTotalXp(summary.totalXp),
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  Text(
                    'XP tracks your daily goal and streak.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DailyGoalRing extends StatelessWidget {
  const _DailyGoalRing({required this.summary, required this.l10n});

  final GamificationSummary summary;
  final AppLocalizations l10n;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final goal = summary.dailyGoal <= 0 ? 1 : summary.dailyGoal;
    final clampedDone = summary.todayEventCount.clamp(0, goal);
    final extra = (summary.todayEventCount - goal).clamp(0, 99999);
    final progress = summary.dailyGoal == 0
        ? 0.0
        : (summary.todayEventCount / summary.dailyGoal).clamp(0.0, 1.0);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            SizedBox(
              width: 72,
              height: 72,
              child: CircularProgressIndicator(
                value: progress,
                strokeWidth: 8,
                backgroundColor: theme.colorScheme.surfaceContainerHighest,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.progressDailyGoalTitle,
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  Text(
                    summary.dailyGoalMet
                        ? l10n.progressGoalCompleted(clampedDone, goal)
                        : l10n.coachDailyProgress(clampedDone, goal),
                  ),
                  if (summary.dailyGoalMet && extra > 0)
                    Text(
                      l10n.progressExtraActivities(extra),
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  Text(l10n.progressTodayXp(summary.todayXp)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActivityChart extends StatelessWidget {
  const _ActivityChart({required this.analytics});

  final ActivityAnalytics analytics;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final buckets = analytics.buckets;
    if (buckets.every((bucket) => bucket.eventCount == 0)) {
      return Center(
        child: Text(
          'No activity in this period yet.',
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
      );
    }

    final maxCount = buckets.map((b) => b.eventCount).fold<int>(0, (a, b) => a > b ? a : b);
    final maxY = (maxCount < 1 ? 1 : maxCount).toDouble();
    final interval = maxY <= 6 ? 1.0 : (maxY / 4).ceilToDouble();

    return LayoutBuilder(
      builder: (context, constraints) {
        final barWidth = buckets.length <= 4
            ? 28.0
            : buckets.length <= 7
                ? 18.0
                : 14.0;
        return BarChart(
          BarChartData(
            maxY: maxY + (interval > 1 ? 0 : 1),
            gridData: const FlGridData(show: false),
            borderData: FlBorderData(show: false),
            barTouchData: BarTouchData(
              touchTooltipData: BarTouchTooltipData(
                getTooltipItem: (group, groupIndex, rod, rodIndex) {
                  final index = group.x;
                  if (index < 0 || index >= buckets.length) return null;
                  final bucket = buckets[index];
                  return BarTooltipItem(
                    '${bucket.eventCount}',
                    theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w700) ??
                        const TextStyle(fontWeight: FontWeight.w700),
                  );
                },
              ),
            ),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 40,
                  interval: interval,
                  getTitlesWidget: (value, meta) {
                    if (value < 0 || value % 1 != 0) return const SizedBox.shrink();
                    if (value > maxY + 1) return const SizedBox.shrink();
                    return Text('${value.toInt()}', style: theme.textTheme.labelSmall);
                  },
                ),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: 28,
                  getTitlesWidget: (value, meta) {
                    final index = value.toInt();
                    if (index < 0 || index >= buckets.length) return const SizedBox.shrink();
                    return SideTitleWidget(
                      meta: meta,
                      child: Text(buckets[index].label, style: theme.textTheme.labelSmall),
                    );
                  },
                ),
              ),
            ),
            barGroups: [
              for (var i = 0; i < buckets.length; i++)
                BarChartGroupData(
                  x: i,
                  barRods: [
                    BarChartRodData(
                      toY: buckets[i].eventCount.toDouble(),
                      color: theme.colorScheme.primary,
                      width: barWidth,
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                    ),
                  ],
                ),
            ],
          ),
        );
      },
    );
  }
}
