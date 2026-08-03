import 'package:flutter/material.dart';

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(24)),
                child: const Center(child: Text('L', style: TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.bold))),
              ),
              const SizedBox(height: 20),
              Text('Connect LearnSphere', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              const Text('Pass SUPABASE_URL, SUPABASE_ANON_KEY, and API_BASE_URL with --dart-define before running the app.', textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    );
  }
}
