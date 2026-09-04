import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../gamification_provider.dart';
import '../l10n/app_localizations.dart';
import 'coach/coach_overlay.dart';
import 'coach_tour_scope.dart';
import 'responsive_page.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final _tourKeys = CoachTourKeys();

  static const _navTourSteps = ['feed', 'learn_tab', 'library'];

  static List<({String path, String label, IconData icon, IconData selectedIcon})> destinations(
    AppLocalizations l10n,
  ) {
    return [
      (path: '/feed', label: l10n.navFeed, icon: Icons.dynamic_feed_outlined, selectedIcon: Icons.dynamic_feed),
      (path: '/learn?tab=live', label: l10n.navLearn, icon: Icons.school_outlined, selectedIcon: Icons.school),
      (path: '/library', label: l10n.navLibrary, icon: Icons.folder_copy_outlined, selectedIcon: Icons.folder_copy),
    ];
  }

  int _selectedIndex(String location, AppLocalizations l10n) {
    if (location.startsWith('/learn')) return 1;
    final tabs = destinations(l10n);
    for (var i = 0; i < tabs.length; i++) {
      final path = tabs[i].path.split('?').first;
      if (location.startsWith(path)) return i;
    }
    return 0;
  }

  Widget _pageContent() {
    return ResponsivePage(
      child: SafeArea(top: false, child: widget.child),
    );
  }

  Key? _navTourKey(int index, String? activeStep) {
    if (index < 0 || index >= _navTourSteps.length) return null;
    if (activeStep != _navTourSteps[index]) return null;
    return _tourKeys.keyForStep(activeStep!);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tabs = destinations(l10n);
    final location = GoRouterState.of(context).matchedLocation;
    final selected = _selectedIndex(location, l10n);
    final pending = ref.watch(gamificationProvider).valueOrNull?.pendingTourSteps ?? const [];
    final activeStep = pending.isNotEmpty ? pending.first : null;
    final sidebar = useSidebarNavigation(context);

    final fab = location.startsWith('/library')
        ? FloatingActionButton.extended(
            key: activeStep == 'library' ? _tourKeys.libraryFabKey : null,
            onPressed: () => context.go('/library?prompt=upload'),
            icon: const Icon(Icons.upload_file_outlined),
            label: Text(l10n.addMaterial),
          )
        : null;

    final scaffold = sidebar
        ? Scaffold(
            floatingActionButton: fab,
            body: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                NavigationRail(
                  selectedIndex: selected,
                  onDestinationSelected: (index) => context.go(tabs[index].path),
                  labelType: NavigationRailLabelType.all,
                  destinations: [
                    for (var i = 0; i < tabs.length; i++)
                      NavigationRailDestination(
                        icon: KeyedSubtree(
                          key: _navTourKey(i, activeStep),
                          child: Icon(tabs[i].icon),
                        ),
                        selectedIcon: Icon(tabs[i].selectedIcon),
                        label: Text(tabs[i].label),
                      ),
                  ],
                ),
                const VerticalDivider(width: 1),
                Expanded(child: _pageContent()),
              ],
            ),
          )
        : Scaffold(
            body: _pageContent(),
            bottomNavigationBar: NavigationBar(
              selectedIndex: selected,
              onDestinationSelected: (index) => context.go(tabs[index].path),
              destinations: [
                for (var i = 0; i < tabs.length; i++)
                  NavigationDestination(
                    icon: KeyedSubtree(
                      key: _navTourKey(i, activeStep),
                      child: Icon(tabs[i].icon),
                    ),
                    selectedIcon: Icon(tabs[i].selectedIcon),
                    label: tabs[i].label,
                  ),
              ],
            ),
            floatingActionButton: fab,
          );

    return CoachTourScope(
      keys: _tourKeys,
      activeStep: activeStep,
      child: CoachOverlay(child: scaffold),
    );
  }
}
