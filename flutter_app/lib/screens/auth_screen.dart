import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_controller.dart';

enum AuthMode { login, signup }

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({required this.mode, super.key});

  final AuthMode mode;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;
  bool _busy = false;

  bool get isSignup => widget.mode == AuthMode.signup;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = ref.read(authControllerProvider.notifier);
      if (isSignup) {
        final response = await auth.signUp(_email.text, _password.text, _name.text);
        if (!mounted) return;
        if (response.session == null) {
          setState(() => _error = 'Check your email to confirm your account, then sign in.');
        } else {
          context.go('/feed');
        }
      } else {
        await auth.signIn(_email.text, _password.text);
        if (mounted) context.go('/feed');
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 44, 24, 28),
          children: [
            Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(18)),
              child: const Center(child: Text('L', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold))),
            ),
            const SizedBox(height: 28),
            Text(isSignup ? 'Create your study space.' : 'Welcome back.', style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            Text(isSignup ? 'Keep your materials, tutor, and practice in one focused place.' : 'Pick up where your understanding left off.', style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.blueGrey)),
            const SizedBox(height: 32),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      if (isSignup) ...[
                        TextFormField(controller: _name, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Name', prefixIcon: Icon(Icons.person_outline)), validator: (value) => value == null || value.trim().length < 2 ? 'Enter your name.' : null),
                        const SizedBox(height: 14),
                      ],
                      TextFormField(controller: _email, keyboardType: TextInputType.emailAddress, textInputAction: TextInputAction.next, decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)), validator: (value) => value == null || !value.contains('@') ? 'Enter a valid email.' : null),
                      const SizedBox(height: 14),
                      TextFormField(controller: _password, obscureText: true, decoration: const InputDecoration(labelText: 'Password', prefixIcon: Icon(Icons.lock_outline)), validator: (value) => value == null || value.length < 6 ? 'Use at least 6 characters.' : null),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                      ],
                      const SizedBox(height: 20),
                      FilledButton(onPressed: _busy ? null : _submit, child: _busy ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Text(isSignup ? 'Create account' : 'Sign in')),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            TextButton(
              onPressed: _busy ? null : () => context.go(isSignup ? '/login' : '/signup'),
              child: Text(isSignup ? 'Already have an account? Sign in' : 'New to LearnSphere? Create an account'),
            ),
          ],
        ),
      ),
    );
  }
}
