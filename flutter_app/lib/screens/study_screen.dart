import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models.dart';
import '../repositories.dart';

const studyKinds = <({String value, String label, IconData icon})>[
  (value: 'video_quiz', label: 'Video quiz', icon: Icons.quiz_outlined),
  (value: 'video_create', label: 'Create lesson', icon: Icons.movie_creation_outlined),
  (value: 'video_engage', label: 'Engage video', icon: Icons.play_circle_outline),
];

class StudyScreen extends ConsumerStatefulWidget {
  const StudyScreen({super.key});

  @override
  ConsumerState<StudyScreen> createState() => _StudyScreenState();
}

class _StudyScreenState extends ConsumerState<StudyScreen> {
  List<StudySpace> _spaces = [];
  List<StudyArtifact> _artifacts = [];
  String? _spaceId;
  String _kind = 'video_quiz';
  String? _error;
  bool _busy = false;

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadSpaces();
  }

  Future<void> _loadSpaces() async {
    try {
      final spaces = await repository.listSpaces();
      if (!mounted) return;
      setState(() {
        _spaces = spaces;
        _spaceId ??= spaces.isEmpty ? null : spaces.first.id;
      });
      if (_spaceId != null) await _loadTools();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _loadTools() async {
    if (_spaceId == null) return;
    setState(() => _busy = true);
    try {
      final artifacts = await repository.studyTools(_spaceId!);
      if (mounted) setState(() => _artifacts = artifacts);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _generate() async {
    if (_spaceId == null) {
      setState(() => _error = 'Create a study space and index material first.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await repository.generateStudyTool(_spaceId!, _kind);
      await _loadTools();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 48, 20, 28),
      children: [
        Text('Study tools', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
        const SizedBox(height: 8),
        Text('Turn indexed material into practice.', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Create video lessons and timestamped practice from your learning space.'),
        const SizedBox(height: 20),
        if (_spaces.isNotEmpty) DropdownButtonFormField<String>(value: _spaceId, decoration: const InputDecoration(labelText: 'Study space', prefixIcon: Icon(Icons.book_outlined)), items: _spaces.map((space) => DropdownMenuItem(value: space.id, child: Text(space.name))).toList(), onChanged: _busy ? null : (value) async { setState(() => _spaceId = value); await _loadTools(); }),
        const SizedBox(height: 16),
        Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Create a tool', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)), const SizedBox(height: 12), Wrap(spacing: 8, runSpacing: 8, children: studyKinds.map((kind) => ChoiceChip(avatar: Icon(kind.icon, size: 17), label: Text(kind.label), selected: _kind == kind.value, onSelected: _busy ? null : (_) => setState(() => _kind = kind.value))).toList()), const SizedBox(height: 14), FilledButton.icon(onPressed: _busy ? null : _generate, icon: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.auto_awesome), label: const Text('Generate'))])),
        if (_error != null) ...[const SizedBox(height: 12), Text(_error!, style: TextStyle(color: Colors.red.shade700))],
        const SizedBox(height: 26),
        Row(children: [Expanded(child: Text('Saved tools', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700))), if (_spaces.isNotEmpty) TextButton.icon(onPressed: () => context.go('/avatar'), icon: const Icon(Icons.videocam_outlined), label: const Text('Avatar'))]),
        const SizedBox(height: 8),
        if (_artifacts.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(20), child: Text('No tools yet. Generate one after indexing material.'))),
        ..._artifacts.map((artifact) => _artifactCard(artifact)),
      ],
    );
  }

  Widget _artifactCard(StudyArtifact artifact) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Card(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [Container(width: 44, height: 44, decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer, borderRadius: BorderRadius.circular(14)), child: Icon(artifact.kind == 'video_quiz' ? Icons.quiz_outlined : Icons.movie_creation_outlined, color: Theme.of(context).colorScheme.primary)), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(artifact.title, style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 4), Text(artifact.kind.replaceAll('_', ' '), style: const TextStyle(color: Colors.blueGrey, fontSize: 12))])), if (artifact.kind == 'video_quiz') IconButton(onPressed: () => _takeQuiz(artifact), icon: const Icon(Icons.play_arrow_rounded), tooltip: 'Take quiz')]))),
    );
  }

  Future<void> _takeQuiz(StudyArtifact artifact) async {
    final questions = (artifact.payload['questions'] as List? ?? []).map((value) => jsonMap(value)).toList();
    final answers = <String, int>{};
    final result = await showModalBottomSheet<Map<String, int>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _QuizSheet(questions: questions, answers: answers),
    );
    if (result == null) return;
    setState(() => _busy = true);
    try {
      final response = await repository.bridge.submitVideoQuiz(artifact.id, result);
      if (mounted) showDialog<void>(context: context, builder: (context) => AlertDialog(title: const Text('Quiz complete'), content: Text('Score: ${response['score'] ?? 0}%'), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done'))]));
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }
}

class _QuizSheet extends StatefulWidget {
  const _QuizSheet({required this.questions, required this.answers});

  final List<Map<String, dynamic>> questions;
  final Map<String, int> answers;

  @override
  State<_QuizSheet> createState() => _QuizSheetState();
}

class _QuizSheetState extends State<_QuizSheet> {
  @override
  Widget build(BuildContext context) {
    return SafeArea(child: Padding(padding: const EdgeInsets.fromLTRB(20, 4, 20, 20), child: ListView(shrinkWrap: true, children: [const Text('Video quiz', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)), const SizedBox(height: 18), ...widget.questions.asMap().entries.map((entry) { final question = entry.value; final options = (question['options'] as List? ?? []).map((value) => '$value').toList(); final key = '${question['id'] ?? entry.key}'; return Padding(padding: const EdgeInsets.only(bottom: 18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('${entry.key + 1}. ${question['question'] ?? question['prompt'] ?? 'Question'}', style: const TextStyle(fontWeight: FontWeight.w700)), ...options.asMap().entries.map((option) => RadioListTile<int>(value: option.key, groupValue: widget.answers[key], onChanged: (value) => setState(() => widget.answers[key] = value ?? 0), title: Text(option.value), contentPadding: EdgeInsets.zero, dense: true))])); }), FilledButton(onPressed: widget.answers.length == widget.questions.length ? () => Navigator.pop(context, widget.answers) : null, child: const Text('Submit answers'))])));
  }
}
