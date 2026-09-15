import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'app_header_actions.dart';
import 'user_avatar.dart';

String timeOfDayGreeting(DateTime now) {
  final hour = now.hour;
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/// Avatar + title on the left, circular chrome on the right — Beyond Blood header rhythm.
class AppPageHeader extends StatelessWidget {
  const AppPageHeader({
    required this.title,
    this.subtitle,
    this.useDateSubtitle = false,
    super.key,
  });

  final String title;
  final String? subtitle;
  final bool useDateSubtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resolvedSubtitle = useDateSubtitle
        ? DateFormat('EEEE, d MMMM').format(DateTime.now())
        : subtitle;

    return Row(
      children: [
        const AccountAvatarButton(radius: 24),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleLarge,
              ),
              if (resolvedSubtitle != null && resolvedSubtitle.isNotEmpty) ...[
                const SizedBox(height: 2),
                Text(
                  resolvedSubtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
        const AppHeaderActions(),
      ],
    );
  }
}

class AccountAvatarButton extends StatelessWidget {
  const AccountAvatarButton({this.radius = 22, super.key});

  final double radius;

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<String>(
      tooltip: 'Account',
      offset: const Offset(0, 48),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
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
        if (value != 'signout') return;
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (dialogContext) => AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
            title: const Text('Sign out?'),
            content: const Text('Are you sure you want to sign out of your account?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: const Text('Sign out'),
              ),
            ],
          ),
        );
        if (!context.mounted || confirmed != true) return;
        await signOutToLogin(context);
      },
      child: UserAvatar(radius: radius),
    );
  }
}
