import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../models.dart';
import '../repositories.dart';
import '../gamification_provider.dart';
import '../widgets/study_space_picker.dart';

const studyKinds = <({String value, String label, IconData icon})>[
  (value: 'video_quiz', label: 'Video quiz', icon: Icons.quiz_outlined),
  (value: 'video_create', label: 'Create lesson', icon: Icons.movie_creation_outlined),
  (value: 'video_engage', label: 'Engage video', icon: Icons.play_circle_outline),
];

class StudyToolsPanel extends ConsumerStatefulWidget {
  const StudyToolsPanel({super.key});

  @override
  ConsumerState<StudyToolsPanel> createState() => _StudyToolsPanelState();
}

class _StudyToolsPanelState extends ConsumerState<StudyToolsPanel> {
  List<StudySpace> _spaces = [];
  List<StudyArtifact> _artifacts = [];
  String? _spaceId;
  String _kind = 'video_quiz';
  final _youtubeUrl = TextEditingController();
  final _brief = TextEditingController();
  String? _error;
  bool _busy = false;

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadSpaces();
  }

  @override
  void dispose() {
    _youtubeUrl.dispose();
    _brief.dispose();
    super.dispose();
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
      redirectToCreateStudySpace(
        context,
        message: 'Create a study space before generating tools.',
      );
      return;
    }
    final youtube = _youtubeUrl.text.trim();
    final brief = _brief.text.trim();
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await repository.generateStudyTool(
        _spaceId!,
        _kind,
        brief: brief.isEmpty ? null : brief,
        youtubeUrl: youtube.isEmpty ? null : youtube,
      );
      await _loadTools();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
      children: [
        if (_spaces.isEmpty)
          Card(
            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.45),
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Set up a study space first',
                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  const Text('Add a subject and materials in Library, then generate quizzes and lessons here.'),
                  const SizedBox(height: 12),
                  FilledButton(
                    onPressed: () => context.go('/library?prompt=createSpace'),
                    child: const Text('Set up in Library'),
                  ),
                ],
              ),
            ),
          ),
        if (_spaces.isEmpty) const SizedBox(height: 24),
        if (_spaces.isNotEmpty) ...[
          Text(
            'Choose your subject',
            style: theme.textTheme.labelLarge?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.2,
            ),
          ),
          const SizedBox(height: 14),
          StudySpacePickerCard(
            spaces: _spaces,
            selectedId: _spaceId,
            enabled: !_busy,
            onSelected: (value) async {
              setState(() => _spaceId = value);
              await _loadTools();
            },
          ),
          const SizedBox(height: 24),
        ],
        Text(
          'Create a tool',
          style: theme.textTheme.labelLarge?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Generate from YouTube or Library',
                  style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: studyKinds
                      .map(
                        (kind) => ChoiceChip(
                          avatar: Icon(kind.icon, size: 17),
                          label: Text(kind.label),
                          selected: _kind == kind.value,
                          onSelected: _busy ? null : (_) => setState(() => _kind = kind.value),
                        ),
                      )
                      .toList(),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _youtubeUrl,
                  enabled: !_busy,
                  decoration: const InputDecoration(
                    labelText: 'YouTube URL (optional)',
                    hintText: 'https://www.youtube.com/watch?v=…',
                    prefixIcon: Icon(Icons.link),
                  ),
                  keyboardType: TextInputType.url,
                ),
                if (_kind == 'video_create') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _brief,
                    enabled: !_busy,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Lesson brief (optional)',
                      hintText: 'What should this lesson cover?',
                      alignLabelWithHint: true,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                FilledButton.icon(
                  onPressed: _busy ? null : _generate,
                  icon: _busy
                      ? const SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.auto_awesome),
                  label: const Text('Generate'),
                ),
              ],
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 14),
          Text(_error!, style: TextStyle(color: Colors.red.shade700)),
        ],
        const SizedBox(height: 28),
        Text(
          'Saved tools',
          style: theme.textTheme.labelLarge?.copyWith(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.2,
          ),
        ),
        const SizedBox(height: 12),
        if (_artifacts.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text('No tools yet. Generate one from a YouTube URL or Library material.'),
            ),
          ),
        ..._artifacts.map(_artifactCard),
      ],
    );
  }

  Widget _artifactCard(StudyArtifact artifact) {
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  artifact.kind == 'video_quiz' ? Icons.quiz_outlined : Icons.movie_creation_outlined,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(artifact.title, style: const TextStyle(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text(
                      artifact.kind.replaceAll('_', ' '),
                      style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
                    ),
                  ],
                ),
              ),
              if (artifact.kind == 'video_quiz')
                IconButton(
                  onPressed: () => _takeQuiz(artifact),
                  icon: const Icon(Icons.play_arrow_rounded),
                  tooltip: 'Take quiz',
                ),
            ],
          ),
        ),
      ),
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
      if (mounted) {
        showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Quiz complete'),
            content: Text('Score: ${response['score'] ?? 0}%'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done')),
            ],
          ),
        );
      }
      ref.read(gamificationProvider.notifier).refresh();
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
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 20),
        child: ListView(
          shrinkWrap: true,
          children: [
            const Text('Video quiz', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
            const SizedBox(height: 18),
            ...widget.questions.asMap().entries.map((entry) {
              final question = entry.value;
              final options = (question['options'] as List? ?? []).map((value) => '$value').toList();
              final key = '${question['id'] ?? entry.key}';
              return Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${entry.key + 1}. ${question['question'] ?? question['prompt'] ?? 'Question'}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    RadioGroup<int>(
                      groupValue: widget.answers[key],
                      onChanged: (value) => setState(() => widget.answers[key] = value ?? 0),
                      child: Column(
                        children: [
                          ...options.asMap().entries.map(
                            (option) => RadioListTile<int>(
                              value: option.key,
                              title: Text(option.value),
                              contentPadding: EdgeInsets.zero,
                              dense: true,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            }),
            FilledButton(
              onPressed: widget.answers.length == widget.questions.length
                  ? () => Navigator.pop(context, widget.answers)
                  : null,
              child: const Text('Submit answers'),
            ),
          ],
        ),
      ),
    );
  }
}
