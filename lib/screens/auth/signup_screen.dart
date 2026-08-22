import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth_controller.dart';
import '../../auth_validation.dart';
import '../../widgets/auth/auth_password_field.dart';
import '../../widgets/auth/auth_scaffold.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});

  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmPassword = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  Future<void> _googleSignIn() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).signInWithGoogle();
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
      final response = await ref.read(authControllerProvider.notifier).signUp(
            _email.text,
            _password.text,
            _name.text,
          );
      if (!mounted) return;
      final needsVerify = response.user?.emailConfirmedAt == null;
      if (needsVerify) {
        final email = Uri.encodeComponent(_email.text.trim());
        context.go('/verify-email?email=$email');
      } else {
        context.go('/feed');
      }
    } catch (error) {
      if (mounted) setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Create your study space.',
      subtitle: 'Keep your materials, tutor, and practice in one focused place.',
      footer: TextButton(
        onPressed: _busy ? null : () => context.go('/login'),
        child: const Text('Already have an account? Sign in'),
      ),
      child: AuthCard(
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              GoogleSignInButton(onPressed: _googleSignIn, busy: _busy),
              const SizedBox(height: 20),
              const AuthDivider(),
              const SizedBox(height: 20),
              TextFormField(
                controller: _name,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (value) => value == null || value.trim().length < 2 ? 'Enter your name.' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                validator: (value) => value == null || !value.contains('@') ? 'Enter a valid email.' : null,
              ),
              const SizedBox(height: 14),
              AuthPasswordField(
                controller: _password,
                labelText: 'Password',
                textInputAction: TextInputAction.next,
                validator: validateNewPassword,
              ),
              const SizedBox(height: 14),
              AuthPasswordField(
                controller: _confirmPassword,
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
              AuthSubmitButton(label: 'Create account', onPressed: _submit, busy: _busy),
            ],
          ),
        ),
      ),
    );
  }
}
