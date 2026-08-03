import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import 'theme.dart';

class LearnSphereApp extends ConsumerWidget {
  const LearnSphereApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'LearnSphere',
      debugShowCheckedModeBanner: false,
      theme: buildLearnSphereTheme(),
      routerConfig: router,
    );
  }
}
