import 'package:flutter/material.dart';

import '../learnsphere_logo.dart';
import '../responsive_page.dart';

class AuthScaffold extends StatelessWidget {
  const AuthScaffold({
    required this.title,
    required this.subtitle,
    this.footer,
    required this.child,
    super.key,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? footer;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurface.withValues(alpha: 0.62);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ResponsivePage(
            maxWidth: AppBreakpoints.authMaxWidth,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 28),
              children: [
                const _AuthHeroBanner(),
                const SizedBox(height: 28),
                Text(
                  title,
                  style: theme.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 10),
                Text(
                  subtitle,
                  style: theme.textTheme.bodyLarge?.copyWith(color: muted, height: 1.45),
                ),
                const SizedBox(height: 28),
                child,
                if (footer != null) ...[
                  const SizedBox(height: 20),
                  footer!,
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _AuthHeroBanner extends StatelessWidget {
  const _AuthHeroBanner();

  static const _ink = Color(0xFF0C1222);
  static const _border = Color(0xFFE2E8F0);

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _border),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const LearnSphereLogo(size: 52, borderRadius: 16),
          const SizedBox(width: 14),
          Text(
            'LearnSphere',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: _ink,
                  letterSpacing: -0.3,
                ),
          ),
        ],
      ),
    );
  }
}

class AuthCard extends StatelessWidget {
  const AuthCard({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: child,
      ),
    );
  }
}

class AuthErrorText extends StatelessWidget {
  const AuthErrorText(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Text(
      message,
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    );
  }
}

class AuthDivider extends StatelessWidget {
  const AuthDivider({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Expanded(child: Divider(color: theme.dividerColor)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'or',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        Expanded(child: Divider(color: theme.dividerColor)),
      ],
    );
  }
}

class GoogleSignInButton extends StatelessWidget {
  const GoogleSignInButton({required this.onPressed, this.busy = false, super.key});

  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    const labelColor = Color(0xFF1F1F1F);

    return FilledButton.icon(
      onPressed: busy ? null : onPressed,
      icon: busy
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2, color: labelColor),
            )
          : Image.network(
              'https://www.google.com/favicon.ico',
              width: 20,
              height: 20,
              errorBuilder: (_, __, ___) => const Icon(Icons.g_mobiledata, size: 22, color: labelColor),
            ),
      label: const Text(
        'Continue with Google',
        style: TextStyle(fontWeight: FontWeight.w600, color: labelColor),
      ),
      style: FilledButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: labelColor,
        disabledBackgroundColor: const Color(0xFFF1F5F9),
        minimumSize: const Size.fromHeight(52),
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isDark ? const Color(0xFF64748B) : const Color(0xFFE2E8F0),
          ),
        ),
      ),
    );
  }
}

class AuthSubmitButton extends StatelessWidget {
  const AuthSubmitButton({
    required this.label,
    required this.onPressed,
    this.busy = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return FilledButton(
      onPressed: busy ? null : onPressed,
      child: busy
          ? const SizedBox(
              height: 22,
              width: 22,
              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
            )
          : Text(label),
    );
  }
}
