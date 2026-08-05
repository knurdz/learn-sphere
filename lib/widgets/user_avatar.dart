import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../profile_repository.dart';

class UserAvatar extends ConsumerWidget {
  const UserAvatar({
    this.radius = 18,
    this.showRing = true,
    super.key,
  });

  final double radius;
  final bool showRing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);
    final theme = Theme.of(context);
    final url = profile.valueOrNull?.avatarUrl;
    final name = profile.valueOrNull?.displayName ?? '?';
    final initials = name.trim().isEmpty ? '?' : name.trim()[0].toUpperCase();

    Widget image;
    if (url != null && url.isNotEmpty) {
      image = CachedNetworkImage(
        imageUrl: url,
        fit: BoxFit.cover,
        placeholder: (_, __) => _InitialsFallback(initials: initials, theme: theme),
        errorWidget: (_, __, ___) => _InitialsFallback(initials: initials, theme: theme),
      );
    } else {
      image = _InitialsFallback(initials: initials, theme: theme);
    }

    return Container(
      width: radius * 2,
      height: radius * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: showRing ? Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.35), width: 1.5) : null,
      ),
      clipBehavior: Clip.antiAlias,
      child: image,
    );
  }
}

class _InitialsFallback extends StatelessWidget {
  const _InitialsFallback({required this.initials, required this.theme});

  final String initials;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: theme.colorScheme.primaryContainer,
      child: Center(
        child: Text(
          initials,
          style: theme.textTheme.labelLarge?.copyWith(
            fontWeight: FontWeight.w800,
            color: theme.colorScheme.onPrimaryContainer,
          ),
        ),
      ),
    );
  }
}
