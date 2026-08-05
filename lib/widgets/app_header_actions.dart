import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_controller.dart';
import '../widgets/coach/streak_chip.dart';
import '../widgets/coach_tour_scope.dart';
import 'user_avatar.dart';

/// Profile avatar (with sign-out menu) and settings shortcut for main tabs.
class AppHeaderActions extends ConsumerWidget {
  const AppHeaderActions({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tourKeys = CoachTourScope.maybeOf(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const StreakChip(),
        const SizedBox(width: 4),
        IconButton(
          key: tourKeys?.settingsKey,
          onPressed: () => context.push('/settings'),
          icon: const Icon(Icons.settings_outlined),
          tooltip: 'Settings',
        ),
        PopupMenuButton<String>(
          tooltip: 'Account',
          offset: const Offset(0, 44),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          itemBuilder: (context) => [
            const PopupMenuItem(
              value: 'signout',
              child: ListTile(
                leading: Icon(Icons.logout_outlined, color: Colors.red),
                title: Text('Sign out', style: TextStyle(color: Colors.red)),
                contentPadding: EdgeInsets.zero,
                visualDensity: VisualDensity.compact,
              ),
            ),
          ],
          onSelected: (value) async {
            if (value == 'signout') {
              await ref.read(authControllerProvider.notifier).signOut();
              if (context.mounted) context.go('/login');
            }
          },
          child: const Padding(
            padding: EdgeInsets.all(4),
            child: UserAvatar(radius: 18),
          ),
        ),
      ],
    );
  }
}
