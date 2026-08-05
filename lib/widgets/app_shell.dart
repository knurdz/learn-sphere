import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../screens/library_screen.dart';
import 'coach/coach_overlay.dart';
import 'coach_tour_scope.dart';

class AppShell extends ConsumerStatefulWidget {
  AppShell({required this.child, super.key});

  final Widget child;

  static final libraryScreenKey = GlobalKey<LibraryScreenState>();

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  final _tourKeys = CoachTourKeys();

  static List<({String path, String label, IconData icon, IconData selectedIcon})> destinations(
    AppLocalizations l10n,
  ) {
    return [
      (path: '/feed', label: l10n.navFeed, icon: Icons.dynamic_feed_outlined, selectedIcon: Icons.dynamic_feed),
      (path: '/learn', label: l10n.navLearn, icon: Icons.school_outlined, selectedIcon: Icons.school),
      (path: '/library', label: l10n.navLibrary, icon: Icons.folder_copy_outlined, selectedIcon: Icons.folder_copy),
    ];
  }

  int _selectedIndex(String location, AppLocalizations l10n) {
    if (location.startsWith('/learn')) return 1;
    final tabs = destinations(l10n);
    for (var i = 0; i < tabs.length; i++) {
      if (location.startsWith(tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final tabs = destinations(l10n);
    final location = GoRouterState.of(context).matchedLocation;
    final selected = _selectedIndex(location, l10n);
    final navKeys = [_tourKeys.navFeedKey, _tourKeys.navLearnKey, _tourKeys.navLibraryKey];

    return CoachTourScope(
      keys: _tourKeys,
      child: CoachOverlay(
        child: Scaffold(
          body: SafeArea(top: false, child: widget.child),
          bottomNavigationBar: NavigationBar(
            selectedIndex: selected,
            onDestinationSelected: (index) => context.go(tabs[index].path),
            destinations: [
              for (var i = 0; i < tabs.length; i++)
                NavigationDestination(
                  icon: KeyedSubtree(key: navKeys[i], child: Icon(tabs[i].icon)),
                  selectedIcon: Icon(tabs[i].selectedIcon),
                  label: tabs[i].label,
                ),
            ],
          ),
          floatingActionButton: location.startsWith('/library')
                  ? FloatingActionButton.extended(
                      key: _tourKeys.libraryFabKey,
                      onPressed: () => AppShell.libraryScreenKey.currentState?.uploadMaterial(),
                      icon: const Icon(Icons.upload_file_outlined),
                      label: Text(l10n.addMaterial),
                    )
              : null,
        ),
      ),
    );
  }
}