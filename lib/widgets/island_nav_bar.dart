import 'package:flutter/material.dart';

import '../theme.dart';

class IslandNavBar extends StatelessWidget {
  const IslandNavBar({
    required this.selectedIndex,
    required this.onDestinationSelected,
    required this.destinations,
    this.immersive = false,
    super.key,
  });

  final int selectedIndex;
  final ValueChanged<int> onDestinationSelected;
  final List<NavigationDestination> destinations;
  final bool immersive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final seed = theme.colorScheme.primary;
    final ink = theme.colorScheme.onSurface;
    final muted = theme.colorScheme.onSurfaceVariant;
    final bar = immersive
        ? (isDark ? Color.lerp(const Color(0xF2101018), seed, 0.16)! : Color.lerp(const Color(0xF2FFF8F0), seed, 0.08)!)
        : theme.colorScheme.surface;

    return Material(
      color: bar,
      elevation: 0,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: theme.dividerColor.withValues(alpha: 0.55)),
          ),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: LsLayout.islandNavHeight,
            child: Row(
              children: [
                for (var i = 0; i < destinations.length; i++)
                  Expanded(
                    child: _YoutubeNavItem(
                      destination: destinations[i],
                      selected: i == selectedIndex,
                      ink: ink,
                      muted: muted,
                      seed: seed,
                      onTap: () => onDestinationSelected(i),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _YoutubeNavItem extends StatelessWidget {
  const _YoutubeNavItem({
    required this.destination,
    required this.selected,
    required this.ink,
    required this.muted,
    required this.seed,
    required this.onTap,
  });

  final NavigationDestination destination;
  final bool selected;
  final Color ink;
  final Color muted;
  final Color seed;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final iconColor = selected ? ink : muted;
    return InkWell(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            curve: Curves.easeOutCubic,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 4),
            decoration: BoxDecoration(
              color: selected ? seed.withValues(alpha: 0.16) : Colors.transparent,
              borderRadius: BorderRadius.circular(20),
            ),
            child: IconTheme(
              data: IconThemeData(color: iconColor, size: 24),
              child: selected ? (destination.selectedIcon ?? destination.icon) : destination.icon,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            destination.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 11,
              height: 1.1,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? ink : muted,
            ),
          ),
        ],
      ),
    );
  }
}
