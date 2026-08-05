import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth_controller.dart';
import '../../auth_validation.dart';
import '../../widgets/auth/auth_scaffold.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({required this.email, super.key});

  final String email;

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();
  String? _error;
  bool _busy = false;
  bool _resent = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _resend() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).resendSignupOtp(widget.email);
      if (mounted) setState(() => _resent = true);
    } catch (error) {
      if (mounted) setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).verifySignupOtp(
            email: widget.email,
            token: _code.text,
          );
      if (mounted) context.go('/feed');
    } catch (error) {
      if (mounted) setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AuthScaffold(
      title: 'Verify your email',
      subtitle: 'Enter the 6-digit code we sent to ${widget.email}.',
      child: AuthCard(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _code,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Verification code',
                  prefixIcon: Icon(Icons.pin_outlined),
                  counterText: '',
                ),
                validator: (value) => isValidEmailOtp(value) ? null : 'Enter the 6-digit code.',
              ),
              if (_resent)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'A new code was sent.',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary),
                  ),
                ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                AuthErrorText(_error!),
              ],
              const SizedBox(height: 12),
              AuthSubmitButton(label: 'Verify and continue', onPressed: _submit, busy: _busy),
              TextButton(onPressed: _busy ? null : _resend, child: const Text('Resend code')),
            ],
          ),
        ),
      ),
      footer: TextButton(
        onPressed: _busy ? null : () => context.go('/login'),
        child: const Text('Back to sign in'),
      ),
    );
  }
}
