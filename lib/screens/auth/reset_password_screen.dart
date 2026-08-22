import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth_controller.dart';
import '../../auth_validation.dart';
import '../../widgets/auth/auth_password_field.dart';
import '../../widgets/auth/auth_scaffold.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({required this.email, super.key});

  final String email;

  @override
  ConsumerState<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).verifyRecoveryAndSetPassword(
            email: widget.email,
            token: _code.text,
            newPassword: _password.text,
          );
      if (mounted) context.go('/login');
    } catch (error) {
      if (mounted) setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Choose a new password',
      subtitle: 'Enter the code from your email and a new password for ${widget.email}.',
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
                controller: _code,
                keyboardType: TextInputType.number,
                textAlign: TextAlign.center,
                maxLength: 6,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                decoration: const InputDecoration(
                  labelText: 'Reset code',
                  prefixIcon: Icon(Icons.pin_outlined),
                  counterText: '',
                ),
                validator: (value) => isValidEmailOtp(value) ? null : 'Enter the 6-digit code.',
              ),
              const SizedBox(height: 14),
              AuthPasswordField(
                controller: _password,
                labelText: 'New password',
                textInputAction: TextInputAction.next,
                validator: validateNewPassword,
              ),
              const SizedBox(height: 14),
              AuthPasswordField(
                controller: _confirm,
                labelText: 'Confirm password',
                validator: (value) {
                  if (!isStrongPassword(value)) return strongPasswordHint;
                  if (value != _password.text) return 'Passwords do not match.';
                  return null;
                },
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                AuthErrorText(_error!),
              ],
              const SizedBox(height: 20),
              AuthSubmitButton(label: 'Update password', onPressed: _submit, busy: _busy),
            ],
          ),
        ),
      ),
    );
  }
}
