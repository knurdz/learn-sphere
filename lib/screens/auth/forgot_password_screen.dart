import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth_controller.dart';
import '../../auth_validation.dart';
import '../../widgets/auth/auth_scaffold.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).requestPasswordReset(_email.text);
      if (!mounted) return;
      final email = Uri.encodeComponent(_email.text.trim());
      context.go('/reset-password?email=$email');
    } catch (error) {
      if (mounted) setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Reset your password',
      subtitle: 'We will email you a 6-digit code to choose a new password.',
      footer: TextButton(
        onPressed: _busy ? null : () => context.go('/login'),
        child: const Text('Back to sign in'),
      ),
      child: AuthCard(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                validator: (value) => value == null || !value.contains('@') ? 'Enter a valid email.' : null,
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                AuthErrorText(_error!),
              ],
              const SizedBox(height: 20),
              AuthSubmitButton(label: 'Send reset code', onPressed: _submit, busy: _busy),
            ],
          ),
        ),
      ),
    );
  }
}
