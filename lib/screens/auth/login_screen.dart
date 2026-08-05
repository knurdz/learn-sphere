import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../auth_controller.dart';
import '../../auth_validation.dart';
import '../../widgets/auth/auth_password_field.dart';
import '../../widgets/auth/auth_scaffold.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
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
      await ref.read(authControllerProvider.notifier).signIn(_email.text, _password.text);
      if (mounted) context.go('/feed');
    } catch (error) {
      if (!mounted) return;
      if (looksLikeEmailNotConfirmed(error)) {
        final email = Uri.encodeComponent(_email.text.trim());
        context.go('/verify-email?email=$email');
        return;
      }
      setState(() => _error = authErrorMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      title: 'Welcome back.',
      subtitle: 'Pick up where your understanding left off.',
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
                validator: (value) => value == null || value.length < 6 ? 'Use at least 6 characters.' : null,
              ),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: _busy ? null : () => context.go('/forgot-password'),
                  child: const Text('Forgot password?'),
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                AuthErrorText(_error!),
              ],
              const SizedBox(height: 12),
              AuthSubmitButton(label: 'Sign in', onPressed: _submit, busy: _busy),
            ],
          ),
        ),
      ),
      footer: TextButton(
        onPressed: _busy ? null : () => context.go('/signup'),
        child: const Text('New to LearnSphere? Create an account'),
      ),
    );
  }
}
