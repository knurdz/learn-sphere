import 'package:flutter/material.dart';

import '../../gamification_models.dart';
import '../../l10n/app_localizations.dart';
import 'coach_character.dart';
import 'coach_navigation.dart';

class CoachBubble extends StatelessWidget {
  const CoachBubble({
    super.key,
    required this.message,
    this.onDismiss,
    this.compact = false,
    this.primaryActionLabel,
    this.onPrimaryAction,
    this.primaryActionBusy = false,
    this.secondaryActionLabel,
    this.onSecondaryAction,
    this.secondaryActionBusy = false,
    this.hideCtaForRoute,
  });

  final CoachMessage message;
  final VoidCallback? onDismiss;
  final bool compact;

  /// When set (e.g. tour "Next"), shown instead of [CoachMessage.ctaLabel].
  final String? primaryActionLabel;
  final VoidCallback? onPrimaryAction;
  final bool primaryActionBusy;
  final String? secondaryActionLabel;
  final VoidCallback? onSecondaryAction;
  final bool secondaryActionBusy;

  /// Hide the message CTA when it would navigate to this route (already there).
  final String? hideCtaForRoute;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    return Material(
      color: Colors.transparent,
      child: Container(
        constraints: BoxConstraints(maxWidth: compact ? 340 : 360),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.12),
              blurRadius: 18,
              offset: const Offset(0, 8),
            ),
          ],
          border: Border.all(color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const CoachCharacter(size: 40),
                const SizedBox(width: 8),
                Text(
                  'Sphere',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                ),
                const Spacer(),
                if (onDismiss != null)
                  IconButton(
                    tooltip: l10n.coachCloseMessage,
                    visualDensity: VisualDensity.compact,
                    onPressed: onDismiss,
                    icon: const Icon(Icons.close, size: 20),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              message.text,
              style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
            ),
            if (primaryActionLabel != null && onPrimaryAction != null) ...[
              const SizedBox(height: 12),
              FilledButton(
                onPressed: primaryActionBusy ? null : onPrimaryAction,
                child: primaryActionBusy
                    ? const SizedBox.square(
                        dimension: 22,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(primaryActionLabel!),
              ),
            ] else if (message.ctaLabel != null &&
                message.ctaRoute != null &&
                message.ctaRoute != hideCtaForRoute) ...[
              const SizedBox(height: 12),
              FilledButton(
                onPressed: () {
                  final route = message.ctaRoute!;
                  navigateCoachCta(context, route);
                  onDismiss?.call();
                },
                child: Text(message.ctaLabel!),
              ),
            ],
            if (secondaryActionLabel != null && onSecondaryAction != null) ...[
              const SizedBox(height: 4),
              TextButton(
                onPressed: secondaryActionBusy ? null : onSecondaryAction,
                child: Text(secondaryActionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
