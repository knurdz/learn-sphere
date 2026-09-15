import 'package:flutter/material.dart';

import '../theme.dart';
import 'app_header_actions.dart';
import 'app_page_header.dart';

/// Shared chrome for Learn + Library (icy clinical world, distinct from Feed).
class ClinicalSectionBackground extends StatelessWidget {
  const ClinicalSectionBackground({
    required this.child,
    this.accent,
    super.key,
  });

  final Widget child;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final seed = theme.colorScheme.primary;
    final base = themedCanvas(seed, theme.brightness);
    final wash = themedCanvasWash(seed, theme.brightness);
    final blob = accent ?? seed;
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [base, wash],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            top: -80,
            right: -40,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: blob.withValues(alpha: isDark ? 0.16 : 0.18),
              ),
            ),
          ),
          Positioned(
            bottom: 120,
            left: -60,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: blob.withValues(alpha: isDark ? 0.10 : 0.12),
              ),
            ),
          ),
          child,
        ],
      ),
    );
  }
}

class ClinicalSectionHeader extends StatelessWidget {
  const ClinicalSectionHeader({
    required this.title,
    this.subtitle,
    this.trailing,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const AccountAvatarButton(radius: 24),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              if (subtitle != null && subtitle!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  subtitle!,
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.78),
                    height: 1.35,
                  ),
                ),
              ],
            ],
          ),
        ),
        trailing ?? const AppHeaderActions(),
      ],
    );
  }
}

class ClinicalSegmentedTabs extends StatelessWidget {
  const ClinicalSegmentedTabs({
    required this.index,
    required this.onChanged,
    required this.items,
    super.key,
  });

  final int index;
  final ValueChanged<int> onChanged;
  final List<({String label, IconData icon, Key? key})> items;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark ? themedCard(theme.colorScheme.primary, Brightness.dark) : themedCard(theme.colorScheme.primary, Brightness.light),
        borderRadius: BorderRadius.circular(LsRadii.pill),
        boxShadow: [
          BoxShadow(
            color: LsColors.ink.withValues(alpha: isDark ? 0.35 : 0.08),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          for (var i = 0; i < items.length; i++)
            Expanded(
              child: _SegmentTab(
                key: items[i].key,
                label: items[i].label,
                icon: items[i].icon,
                selected: index == i,
                onTap: () => onChanged(i),
              ),
            ),
        ],
      ),
    );
  }
}

class _SegmentTab extends StatelessWidget {
  const _SegmentTab({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final selectedFill = theme.colorScheme.primary;
    final selectedFg = theme.colorScheme.onPrimary;
    final ink = isDark ? Colors.white : LsColors.ink;
    return Material(
      color: selected ? selectedFill : Colors.transparent,
      borderRadius: BorderRadius.circular(LsRadii.pill - 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(LsRadii.pill - 4),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 18,
                color: selected ? selectedFg : theme.colorScheme.onSurfaceVariant,
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 13,
                  color: selected ? selectedFg : ink.withValues(alpha: 0.82),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class ClinicalGlassCard extends StatelessWidget {
  const ClinicalGlassCard({
    required this.child,
    this.padding = const EdgeInsets.all(18),
    this.onTap,
    this.tint,
    super.key,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final surface = themedCard(theme.colorScheme.primary, theme.brightness);
    return Material(
      color: tint ?? surface,
      borderRadius: BorderRadius.circular(LsRadii.card),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(LsRadii.card),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(LsRadii.card),
            border: Border.all(
              color: (isDark ? Colors.white : LsColors.ink).withValues(alpha: 0.06),
            ),
            boxShadow: [
              BoxShadow(
                color: LsColors.ink.withValues(alpha: isDark ? 0.28 : 0.06),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: child,
        ),
      ),
    );
  }
}

class ClinicalSectionLabel extends StatelessWidget {
  const ClinicalSectionLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.78),
        fontWeight: FontWeight.w800,
        letterSpacing: 1.8,
        fontSize: 11,
      ),
    );
  }
}

class ClinicalModeTile extends StatelessWidget {
  const ClinicalModeTile({
    required this.label,
    required this.hint,
    required this.icon,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final String label;
  final String hint;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final accent = selected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant;
    return ClinicalGlassCard(
      onTap: onTap,
      tint: selected
          ? (isDark ? theme.colorScheme.primary.withValues(alpha: 0.14) : LsColors.mist.withValues(alpha: 0.45))
          : null,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: accent.withValues(alpha: selected ? 0.18 : 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: accent, size: 22),
          ),
          const SizedBox(height: 12),
          Text(label, style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            hint,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              height: 1.35,
            ),
          ),
        ],
      ),
    );
  }
}
