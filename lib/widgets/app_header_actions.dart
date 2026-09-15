import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_controller.dart';
import '../gamification_provider.dart';
import '../theme.dart';
import 'coach_tour_scope.dart';

Future<void> signOutToLogin(BuildContext context) async {
  final container = ProviderScope.containerOf(context, listen: false);
  await container.read(authControllerProvider.notifier).signOut();
  if (context.mounted) context.go('/login');
}

class CircleIconButton extends StatelessWidget {
  const CircleIconButton({
    required this.icon,
    required this.onPressed,
    this.tooltip,
    this.size = 44,
    super.key,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final String? tooltip;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Tooltip(
      message: tooltip ?? '',
      child: Material(
        color: isDark ? LsColors.cardDark : Colors.white,
        shape: const CircleBorder(),
        elevation: 0,
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onPressed,
          child: Ink(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDark ? LsColors.cardDark : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: LsColors.ink.withValues(alpha: isDark ? 0.35 : 0.08),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Icon(icon, size: 20, color: theme.colorScheme.onSurface),
          ),
        ),
      ),
    );
  }
}

/// Wallet chip and settings shortcut for main tabs. Account lives on the left avatar.
class AppHeaderActions extends ConsumerWidget {
  const AppHeaderActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const DualWalletChip(),
        const SizedBox(width: 8),
        CircleIconButton(
          key: CoachTourScope.targetKey(context, 'settings'),
          onPressed: () => context.push('/settings'),
          icon: Icons.settings_outlined,
          tooltip: 'Settings',
        ),
      ],
    );
  }
}

class DualWalletChip extends ConsumerWidget {
  const DualWalletChip({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(gamificationProvider).valueOrNull;
    final studyCredits = (summary?.totalXp ?? 0) * 10;
    const liveMinutes = 120;

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      decoration: BoxDecoration(
        color: isDark ? LsColors.cardDark : Colors.white,
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: LsColors.ink.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.stars_rounded, size: 16, color: theme.colorScheme.primary),
          const SizedBox(width: 4),
          Text(
            '$studyCredits',
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          ),
          const SizedBox(width: 8),
          Container(width: 1, height: 16, color: theme.dividerColor.withValues(alpha: 0.35)),
          const SizedBox(width: 8),
          Icon(Icons.schedule, size: 16, color: theme.colorScheme.tertiary),
          const SizedBox(width: 4),
          const Text(
            '${liveMinutes}m',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
