import 'package:flutter/material.dart';

import '../l10n/app_localizations.dart';
import '../widgets/learnsphere_logo.dart';
import '../widgets/responsive_page.dart';

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Scaffold(
      body: Center(
        child: ResponsivePage(
          maxWidth: AppBreakpoints.authMaxWidth,
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const LearnSphereLogo(size: 72, borderRadius: 24),
                const SizedBox(height: 20),
                Text(l10n.setupTitle, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Text(
                  l10n.setupBody,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
