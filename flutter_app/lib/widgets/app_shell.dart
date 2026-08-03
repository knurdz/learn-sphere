import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class AppShell extends StatelessWidget {
  const AppShell({required this.child, super.key});

  final Widget child;

  static const destinations = <({String path, String label, IconData icon})>[
    (path: '/feed', label: 'Learn', icon: Icons.auto_awesome_outlined),
    (path: '/library', label: 'Library', icon: Icons.folder_copy_outlined),
    (path: '/tutor', label: 'Tutor', icon: Icons.chat_bubble_outline),
    (path: '/study', label: 'Study', icon: Icons.school_outlined),
  ];

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final selected = destinations.indexWhere((item) => location.startsWith(item.path));
    return Scaffold(
      body: SafeArea(top: false, child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected < 0 ? 0 : selected,
        onDestinationSelected: (index) => context.go(destinations[index].path),
        destinations: [
          for (final destination in destinations)
            NavigationDestination(icon: Icon(destination.icon), label: destination.label),
        ],
      ),
      floatingActionButton: location.startsWith('/library')
          ? FloatingActionButton.extended(
              onPressed: () => context.go('/library'),
              icon: const Icon(Icons.add),
              label: const Text('Add material'),
            )
          : null,
    );
  }
}
