import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../models.dart';
import '../api_client.dart';
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

  Future<void> _generate({
    bool allowAudioTranscription = false,
    bool replaceExisting = false,
  }) async {
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
        allowAudioTranscription: allowAudioTranscription,
        replaceExisting: replaceExisting,
      );
      await _loadTools();
    } on BridgeException catch (error) {
      if (!mounted) return;
      if (error.isYouTubeCaptionsMissing && !allowAudioTranscription) {
        setState(() => _busy = false);
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('No captions found'),
            content: Text(
              error.message.isNotEmpty
                  ? error.message
                  : 'This YouTube video has no captions. Generating a quiz from the audio uses extra credits.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Continue'),
              ),
            ],
          ),
        );
        if (confirmed == true && mounted) {
          await _generate(
            allowAudioTranscription: true,
            replaceExisting: replaceExisting,
          );
        }
        return;
      }
      if (error.isQuizExists && !replaceExisting) {
        setState(() => _busy = false);
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Replace quiz?'),
            content: const Text(
              'This video already has a quiz. Replace it with a newly generated set?',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text('Keep existing'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Replace'),
              ),
            ],
          ),
        );
        if (confirmed == true && mounted) {
          await _generate(
            allowAudioTranscription: allowAudioTranscription,
            replaceExisting: true,
          );
        }
        return;
      }
      setState(() => _error = error.message);
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
                    hintText: 'Any public YouTube watch, Shorts, or youtu.be link',
                    helperText: 'Captions are used when available; otherwise you can confirm audio transcription.',
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
    final isQuiz = artifact.kind == 'video_quiz';
    final openIcon = isQuiz
        ? Icons.play_arrow_rounded
        : artifact.kind == 'video_engage'
            ? Icons.visibility_outlined
            : Icons.menu_book_outlined;
    final openTooltip = isQuiz
        ? 'Take quiz'
        : artifact.kind == 'video_engage'
            ? 'View engagement plan'
            : 'View lesson plan';

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _openArtifact(artifact),
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
                    isQuiz
                        ? Icons.quiz_outlined
                        : artifact.kind == 'video_engage'
                            ? Icons.play_circle_outline
                            : Icons.movie_creation_outlined,
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
                IconButton(
                  onPressed: () => _openArtifact(artifact),
                  icon: Icon(openIcon),
                  tooltip: openTooltip,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _openArtifact(StudyArtifact artifact) async {
    try {
      if (artifact.kind == 'video_quiz') {
        await _takeQuiz(artifact);
        return;
      }
      if (artifact.kind == 'video_create' || artifact.kind == 'video_engage') {
        await Navigator.of(context, rootNavigator: true).push<void>(
          MaterialPageRoute<void>(
            fullscreenDialog: true,
            builder: (context) => _StudyToolViewerScreen(artifact: artifact),
          ),
        );
        return;
      }
      if (mounted) {
        setState(() => _error = 'This study tool cannot be opened yet.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = 'Could not open this study tool. $error');
      }
    }
  }

  Future<void> _takeQuiz(StudyArtifact artifact) async {
    final questions = (artifact.payload['questions'] as List? ?? []).map((value) => jsonMap(value)).toList();
    if (questions.isEmpty) {
      setState(() => _error = 'This quiz has no questions yet.');
      return;
    }

    final bridge = repository.bridge;
    // Root fullscreen route so Learn tab rebuilds cannot dispose the quiz mid-Check.
    final completed = await Navigator.of(context, rootNavigator: true).push<bool>(
      MaterialPageRoute<bool>(
        fullscreenDialog: true,
        builder: (context) => _QuizSessionScreen(
          artifactId: artifact.id,
          title: artifact.title,
          questions: questions,
          bridge: bridge,
        ),
      ),
    );
    if (completed == true && mounted) {
      ref.read(gamificationProvider.notifier).refresh();
    }
  }
}

enum _OptionFeedbackState { none, correct, wrong }

class _QuizSessionScreen extends StatefulWidget {
  const _QuizSessionScreen({
    required this.artifactId,
    required this.title,
    required this.questions,
    required this.bridge,
  });

  final String artifactId;
  final String title;
  final List<Map<String, dynamic>> questions;
  final BridgeApi bridge;

  @override
  State<_QuizSessionScreen> createState() => _QuizSessionScreenState();
}

class _QuizSessionScreenState extends State<_QuizSessionScreen> {
  int _index = 0;
  int? _selected;
  bool _checked = false;
  bool _busy = false;
  bool _finished = false;
  String? _error;
  bool? _correct;
  int? _correctIndex;
  String? _explanation;
  final Map<String, int> _answers = {};
  Map<String, dynamic>? _finalResult;

  Map<String, dynamic> get _question => widget.questions[_index];

  String get _questionId => '${_question['id'] ?? _index}';

  List<String> get _options =>
      (_question['options'] as List? ?? []).map((value) => '$value').toList();

  String get _prompt =>
      '${_question['question'] ?? _question['prompt'] ?? 'Question'}';

  _OptionFeedbackState _feedbackFor(int optionIndex) {
    if (!_checked) return _OptionFeedbackState.none;
    if (_correctIndex != null && optionIndex == _correctIndex) {
      return _OptionFeedbackState.correct;
    }
    if (_selected == optionIndex && _correct != true) {
      return _OptionFeedbackState.wrong;
    }
    return _OptionFeedbackState.none;
  }

  Future<void> _check() async {
    if (_selected == null || _busy || _checked) return;
    final selected = _selected!;
    final questionId = _questionId;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final feedback = await widget.bridge.gradeVideoQuizQuestion(
        widget.artifactId,
        questionId: questionId,
        answer: selected,
      );
      if (!mounted) return;
      final correctIndex = feedback['correctIndex'];
      setState(() {
        _checked = true;
        _correct = feedback['correct'] == true;
        _correctIndex = correctIndex is int ? correctIndex : int.tryParse('$correctIndex');
        _explanation = '${feedback['explanation'] ?? ''}'.trim();
        _answers[questionId] = selected;
        // Keep selection even if state was rebuilt.
        _selected = selected;
      });
    } catch (error) {
      if (!mounted) return;
      // Leave the selected option so the learner can tap Check again.
      setState(() {
        _selected = selected;
        _error = error is BridgeException
            ? error.message
            : 'Could not check that answer. Check your connection and try again.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _next() async {
    if (!_checked || _busy) return;

    final isLast = _index >= widget.questions.length - 1;
    if (!isLast) {
      setState(() {
        _index += 1;
        _selected = null;
        _checked = false;
        _correct = null;
        _correctIndex = null;
        _explanation = null;
        _error = null;
      });
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.bridge.submitVideoQuiz(widget.artifactId, Map<String, int>.from(_answers));
      if (!mounted) return;
      setState(() {
        _finished = true;
        _finalResult = result;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error is BridgeException
            ? error.message
            : 'Could not save your quiz score. Check your connection and try again.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context, _finished),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
          child: _finished ? _buildFinished(theme) : _buildQuestion(theme),
        ),
      ),
    );
  }

  Widget _buildFinished(ThemeData theme) {
    final score = _finalResult?['score'] ?? 0;
    final correctCount = _finalResult?['correctCount'] ?? 0;
    final total = _finalResult?['total'] ?? widget.questions.length;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Spacer(),
        Text(
          'Quiz complete',
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          'Score: $score% ($correctCount / $total correct)',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
          textAlign: TextAlign.center,
        ),
        const Spacer(),
        FilledButton(
          onPressed: () => Navigator.pop(context, true),
          child: const Text('Done'),
        ),
      ],
    );
  }

  Widget _buildQuestion(ThemeData theme) {
    final feedbackMessage = _checked
        ? (_correct == true
            ? (_explanation?.isNotEmpty == true ? 'Correct. $_explanation' : 'Correct.')
            : (_explanation?.isNotEmpty == true ? 'Not quite. $_explanation' : 'Not quite.'))
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Question ${_index + 1} of ${widget.questions.length}',
          style: TextStyle(color: Colors.blueGrey.shade700, fontSize: 13, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 10),
        Text(_prompt, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700, height: 1.35)),
        const SizedBox(height: 18),
        Expanded(
          child: ListView(
            children: [
              ..._options.asMap().entries.map(
                (entry) => _QuizOptionTile(
                  label: entry.value,
                  index: entry.key,
                  selected: _selected == entry.key,
                  feedbackState: _feedbackFor(entry.key),
                  onTap: (_busy || _checked)
                      ? null
                      : () => setState(() {
                            _selected = entry.key;
                            _error = null;
                          }),
                ),
              ),
              if (feedbackMessage != null) ...[
                const SizedBox(height: 8),
                _QuizFeedbackBanner(correct: _correct == true, message: feedbackMessage),
              ],
              if (_error != null) ...[
                const SizedBox(height: 10),
                Text(_error!, style: TextStyle(color: theme.colorScheme.error, height: 1.35)),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),
        if (!_checked)
          FilledButton(
            onPressed: (_selected == null || _busy) ? null : _check,
            child: _busy
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Check'),
          )
        else
          FilledButton(
            onPressed: _busy ? null : _next,
            child: _busy
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(_index >= widget.questions.length - 1 ? 'Finish' : 'Next'),
          ),
      ],
    );
  }
}

class _QuizFeedbackBanner extends StatelessWidget {
  const _QuizFeedbackBanner({required this.correct, required this.message});

  final bool correct;
  final String message;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final background = correct
        ? (isDark ? const Color(0xFF064E3B) : const Color(0xFFE8F0EA))
        : (isDark ? const Color(0xFF451A03) : const Color(0xFFFEF3C7));
    final border = correct
        ? (isDark ? const Color(0xFF047857) : const Color(0xFFBBF7D0))
        : (isDark ? const Color(0xFFB45309) : const Color(0xFFFDE68A));
    final foreground = correct
        ? (isDark ? const Color(0xFFA7F3D0) : const Color(0xFF14532D))
        : (isDark ? const Color(0xFFFDE68A) : const Color(0xFF78350F));
    final iconColor = correct
        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF047857))
        : (isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309));

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            correct ? Icons.check_circle_outline : Icons.info_outline,
            color: iconColor,
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: foreground,
                height: 1.4,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuizOptionTile extends StatelessWidget {
  const _QuizOptionTile({
    required this.label,
    required this.index,
    required this.selected,
    required this.feedbackState,
    required this.onTap,
  });

  final String label;
  final int index;
  final bool selected;
  final _OptionFeedbackState feedbackState;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isCorrect = feedbackState == _OptionFeedbackState.correct;
    final isWrong = feedbackState == _OptionFeedbackState.wrong;
    final accent = isCorrect
        ? (isDark ? const Color(0xFF34D399) : const Color(0xFF047857))
        : isWrong
            ? (isDark ? const Color(0xFFF87171) : const Color(0xFFB91C1C))
            : theme.colorScheme.primary;
    final correctBackground = isDark ? const Color(0xFF064E3B) : const Color(0xFFE8F0EA);
    final wrongBackground = isDark ? const Color(0xFF450A0A) : const Color(0xFFFEE2E2);
    final labelColor = isCorrect
        ? (isDark ? const Color(0xFFD1FAE5) : const Color(0xFF14532D))
        : isWrong
            ? (isDark ? const Color(0xFFFECACA) : const Color(0xFF991B1B))
            : theme.colorScheme.onSurface;
    final idleBackground = isDark ? const Color(0xFF273449) : Colors.white;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: isCorrect
            ? correctBackground
            : isWrong
                ? wrongBackground
                : selected
                    ? theme.colorScheme.primaryContainer
                    : idleBackground,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: (isCorrect || isWrong || selected)
                    ? accent
                    : theme.colorScheme.outline.withValues(alpha: 0.2),
                width: (isCorrect || isWrong || selected) ? 2 : 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: (isCorrect || isWrong || selected)
                        ? accent
                        : theme.colorScheme.surfaceContainerHighest,
                  ),
                  child: Text(
                    String.fromCharCode(65 + index),
                    style: TextStyle(
                      color: (isCorrect || isWrong || selected)
                          ? (isDark ? const Color(0xFF0C1222) : Colors.white)
                          : theme.colorScheme.onSurface,
                      fontWeight: FontWeight.w800,
                      fontSize: 13,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      color: labelColor,
                      height: 1.4,
                      fontWeight: (isCorrect || isWrong || selected) ? FontWeight.w700 : FontWeight.w500,
                      fontSize: 15,
                    ),
                  ),
                ),
                if (isCorrect) Icon(Icons.check_circle, color: accent, size: 22),
                if (isWrong) Icon(Icons.cancel, color: accent, size: 22),
                if (!isCorrect && !isWrong && selected)
                  Icon(Icons.check_circle, color: theme.colorScheme.primary, size: 22),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StudyToolViewerScreen extends StatefulWidget {
  const _StudyToolViewerScreen({required this.artifact});

  final StudyArtifact artifact;

  @override
  State<_StudyToolViewerScreen> createState() => _StudyToolViewerScreenState();
}

class _StudyToolViewerScreenState extends State<_StudyToolViewerScreen> {
  YoutubePlayerController? _player;

  StudyArtifact get artifact => widget.artifact;

  static String _formatTimestamp(num? seconds) {
    final total = (seconds ?? 0).round().clamp(0, 24 * 60 * 60);
    final minutes = total ~/ 60;
    final secs = total % 60;
    return '$minutes:${secs.toString().padLeft(2, '0')}';
  }

  static String _formatDuration(num? seconds) {
    final total = (seconds ?? 0).round();
    if (total <= 0) return '—';
    if (total < 60) return '${total}s';
    final minutes = total ~/ 60;
    final secs = total % 60;
    if (secs == 0) return '${minutes}m';
    return '${minutes}m ${secs}s';
  }

  @override
  void initState() {
    super.initState();
    final videoId = artifact.sourceVideo?.id.trim() ?? '';
    if (videoId.isNotEmpty) {
      _player = YoutubePlayerController.fromVideoId(
        videoId: videoId,
        autoPlay: false,
        params: const YoutubePlayerParams(
          showFullscreenButton: true,
          strictRelatedVideos: true,
        ),
      );
    }
  }

  @override
  void dispose() {
    _player?.close();
    super.dispose();
  }

  Future<void> _seekTo(num? seconds) async {
    final player = _player;
    if (player == null || seconds == null) return;
    final value = seconds.toDouble();
    if (value < 0) return;
    try {
      await player.seekTo(seconds: value, allowSeekAhead: true);
      await player.playVideo();
    } catch (_) {
      // Player may not be ready yet; ignore seek failures.
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCreate = artifact.kind == 'video_create';
    final hasPlayer = _player != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(artifact.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
          children: [
            Text(
              isCreate ? 'Create lesson' : 'Engage video',
              style: TextStyle(
                color: theme.colorScheme.primary,
                fontWeight: FontWeight.w700,
                fontSize: 13,
                letterSpacing: 0.2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              artifact.title,
              style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 16),
            if (hasPlayer) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: YoutubePlayer(
                    controller: _player!,
                    aspectRatio: 16 / 9,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'Tap a chapter or moment below to jump in the video.',
                style: TextStyle(color: Colors.blueGrey.shade700, fontSize: 13, height: 1.35),
              ),
              const SizedBox(height: 18),
            ] else if (isCreate) ...[
              Card(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.45),
                child: const Padding(
                  padding: EdgeInsets.all(14),
                  child: Text(
                    'This is a lesson script to record — there is no source video to play.',
                    style: TextStyle(height: 1.4),
                  ),
                ),
              ),
              const SizedBox(height: 18),
            ] else ...[
              Card(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.45),
                child: const Padding(
                  padding: EdgeInsets.all(14),
                  child: Text(
                    'No playable YouTube source is linked to this plan yet. Regenerate from a YouTube URL to watch here.',
                    style: TextStyle(height: 1.4),
                  ),
                ),
              ),
              const SizedBox(height: 18),
            ],
            if (isCreate) ..._buildCreateBody(theme) else ..._buildEngageBody(theme),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildCreateBody(ThemeData theme) {
    final payload = artifact.payload;
    final scenes = (payload['scenes'] as List? ?? []).map((value) => jsonMap(value)).toList();
    final title = '${payload['title'] ?? artifact.title}'.trim();
    final audience = '${payload['audience'] ?? ''}'.trim();
    final hook = '${payload['hook'] ?? ''}'.trim();
    final cta = '${payload['call_to_action'] ?? ''}'.trim();
    final duration = payload['duration_seconds'];

    return [
      if (title.isNotEmpty) _section(theme, 'Lesson title', title),
      if (audience.isNotEmpty) _section(theme, 'Audience', audience),
      _section(theme, 'Duration', _formatDuration(duration is num ? duration : num.tryParse('$duration'))),
      if (hook.isNotEmpty) _section(theme, 'Hook', hook),
      const SizedBox(height: 8),
      Text('Scenes', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 10),
      if (scenes.isEmpty)
        const _EmptyBlock(message: 'No scenes were saved for this lesson.')
      else
        ...scenes.asMap().entries.map((entry) {
          final scene = entry.value;
          final sceneTitle = '${scene['title'] ?? 'Scene ${entry.key + 1}'}'.trim();
          final visual = '${scene['visual_direction'] ?? ''}'.trim();
          final narration = '${scene['narration'] ?? ''}'.trim();
          final onScreen = '${scene['on_screen_text'] ?? ''}'.trim();
          final sceneDuration = scene['duration_seconds'];
          return _DetailCard(
            title: '${entry.key + 1}. $sceneTitle',
            subtitle: _formatDuration(sceneDuration is num ? sceneDuration : num.tryParse('$sceneDuration')),
            rows: [
              if (visual.isNotEmpty) ('Visual', visual),
              if (narration.isNotEmpty) ('Narration', narration),
              if (onScreen.isNotEmpty) ('On-screen text', onScreen),
            ],
          );
        }),
      if (cta.isNotEmpty) ...[
        const SizedBox(height: 8),
        _section(theme, 'Call to action', cta),
      ],
    ];
  }

  List<Widget> _buildEngageBody(ThemeData theme) {
    final payload = artifact.payload;
    final chapters = (payload['chapters'] as List? ?? []).map((value) => jsonMap(value)).toList();
    final moments = (payload['engagement_moments'] as List? ?? []).map((value) => jsonMap(value)).toList();
    final title = '${payload['title'] ?? artifact.title}'.trim();
    final opening = '${payload['opening_hook'] ?? ''}'.trim();
    final strategy = '${payload['strategy'] ?? ''}'.trim();
    final closing = '${payload['closing_cta'] ?? ''}'.trim();
    final canSeek = _player != null;

    return [
      if (title.isNotEmpty) _section(theme, 'Plan title', title),
      if (opening.isNotEmpty) _section(theme, 'Opening hook', opening),
      if (strategy.isNotEmpty) _section(theme, 'Strategy', strategy),
      const SizedBox(height: 8),
      Text('Chapters', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 10),
      if (chapters.isEmpty)
        const _EmptyBlock(message: 'No chapters were saved for this plan.')
      else
        ...chapters.map((chapter) {
          final chapterTitle = '${chapter['title'] ?? 'Chapter'}'.trim();
          final ts = chapter['timestamp_seconds'];
          final seconds = ts is num ? ts : num.tryParse('$ts');
          return _DetailCard(
            title: chapterTitle,
            subtitle: _formatTimestamp(seconds),
            rows: const [],
            onTap: canSeek && seconds != null ? () => _seekTo(seconds) : null,
          );
        }),
      const SizedBox(height: 8),
      Text('Engagement moments', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
      const SizedBox(height: 10),
      if (moments.isEmpty)
        const _EmptyBlock(message: 'No engagement moments were saved for this plan.')
      else
        ...moments.map((moment) {
          final momentTitle = '${moment['title'] ?? 'Moment'}'.trim();
          final technique = '${moment['technique'] ?? ''}'.trim();
          final edit = '${moment['suggested_edit'] ?? ''}'.trim();
          final prompt = '${moment['learner_prompt'] ?? ''}'.trim();
          final ts = moment['timestamp_seconds'];
          final seconds = ts is num ? ts : num.tryParse('$ts');
          return _DetailCard(
            title: momentTitle,
            subtitle: _formatTimestamp(seconds),
            rows: [
              if (technique.isNotEmpty) ('Technique', technique),
              if (edit.isNotEmpty) ('Suggested edit', edit),
              if (prompt.isNotEmpty) ('Learner prompt', prompt),
            ],
            onTap: canSeek && seconds != null ? () => _seekTo(seconds) : null,
          );
        }),
      if (closing.isNotEmpty) ...[
        const SizedBox(height: 8),
        _section(theme, 'Closing CTA', closing),
      ],
    ];
  }

  Widget _section(ThemeData theme, String label, String body) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: theme.textTheme.labelLarge?.copyWith(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(body, style: const TextStyle(height: 1.45, fontSize: 15)),
        ],
      ),
    );
  }
}

class _DetailCard extends StatelessWidget {
  const _DetailCard({
    required this.title,
    required this.subtitle,
    required this.rows,
    this.onTap,
  });

  final String title;
  final String subtitle;
  final List<(String, String)> rows;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                    Text(
                      subtitle,
                      style: TextStyle(
                        color: theme.colorScheme.primary,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                    if (onTap != null) ...[
                      const SizedBox(width: 6),
                      Icon(Icons.play_circle_outline, size: 18, color: theme.colorScheme.primary),
                    ],
                  ],
                ),
                for (final row in rows) ...[
                  const SizedBox(height: 10),
                  Text(
                    row.$1,
                    style: const TextStyle(color: Colors.blueGrey, fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(row.$2, style: const TextStyle(height: 1.4, fontSize: 14)),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyBlock extends StatelessWidget {
  const _EmptyBlock({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(message, style: TextStyle(color: Colors.blueGrey.shade700, height: 1.4)),
      ),
    );
  }
}
