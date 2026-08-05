import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navigate for mascot / coach CTAs.
///
/// When the user is already on the target tab (especially Library), a plain
/// `go` to the same path may not remount the screen. We bump a query stamp so
/// `didChangeDependencies` runs and Library can open create/upload flows.
void navigateCoachCta(BuildContext context, String route) {
  final uri = Uri.tryParse(route);
  if (uri == null || !route.startsWith('/')) return;

  final current = GoRouterState.of(context).uri;
  final samePath = current.path == uri.path;

  if (samePath) {
    final params = Map<String, String>.from(uri.queryParameters);
    // Force a URI change so ShellRoute children refresh query handling.
    params['_'] = DateTime.now().millisecondsSinceEpoch.toString();
    context.go(uri.replace(queryParameters: params).toString());
    return;
  }

  context.go(route);
}
