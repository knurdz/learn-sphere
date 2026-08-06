import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../repositories.dart';
import '../gamification_provider.dart';
import '../settings_provider.dart';
import '../widgets/app_header_actions.dart';
import '../l10n/app_localizations.dart';
import '../l10n_ext.dart';

void sortFeedItems(List<FeedItem> items) {
  items.sort((left, right) {
    final leftCompleted = left.progress.completedAt != null ? 1 : 0;
    final rightCompleted = right.progress.completedAt != null ? 1 : 0;
    if (leftCompleted != rightCompleted) return leftCompleted - rightCompleted;
    return right.createdAt.compareTo(left.createdAt);
  });
}

String? _payloadString(Map<String, dynamic> payload, String key) {
  final value = payload[key];
  if (value == null) return null;
  final text = '$value'.trim();
  return text.isEmpty ? null : text;
}

List<String> _memeCaptionLines(Map<String, dynamic> payload) {
  final captions = payload['captions'];
  if (captions is! Map) return const [];
  return captions.entries
      .map((entry) {
        final label = '${entry.key}'.replaceAll('_', ' ').trim();
        final text = '${entry.value}'.trim();
        if (text.isEmpty) return null;
        if (label.isEmpty) return text;
        return '${label[0].toUpperCase()}${label.substring(1)}: $text';
      })
      .whereType<String>()
      .toList();
}

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  List<StudySpace> _spaces = [];
  List<FeedItem> _items = [];
  String _spaceId = '';
  String _kind = 'all';
  String _completionFilter = 'all';
  String? _error;
  String? _nextCursor;
  bool _busy = true;
  bool _bootstrapping = false;
  bool _loadingMore = false;
  bool _generating = false;
  bool _exhausted = false;
  bool _hasLibraryMaterials = false;
  bool _hasReadyMaterials = false;
  bool _hasAnyFeedItems = false;
  final _scrollController = ScrollController();

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  bool _needsInteractiveBackfill(List<FeedItem> items) {
    if (_kind != 'all') return false;
    final uncompletedKinds = items.where((item) => !item.progress.completed).map((item) => item.kind).toSet();
    return !uncompletedKinds.contains('quiz') || !uncompletedKinds.contains('meme');
  }

  bool _kindSupportsGeneration(String kind) {
    return kind != 'all';
  }

  @override
  void initState() {
    super.initState();
    _load();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 500) {
      if (_nextCursor != null) {
        _loadMore();
      } else {
        _generateMore();
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
      _nextCursor = null;
      _exhausted = false;
    });
    try {
      final spaces = await repository.listSpaces();
      final materials = await repository.listMaterials();
      final hasMaterials = repository.hasMaterialsInScope(
        materials,
        spaceId: _spaceId.isEmpty ? null : _spaceId,
      );
      final readyMaterials = materials.where((material) {
        if (_spaceId.isNotEmpty && material.studySpaceId != _spaceId) return false;
        return material.status == MaterialStatus.ready;
      }).toList();
      var page = await repository.feedPage(
        spaceId: _spaceId.isEmpty ? null : _spaceId,
        kind: _kind,
      );
      if (page.items.isEmpty && hasMaterials) {
        if (mounted) setState(() => _bootstrapping = true);
        if (_kind == 'all') {
          await repository.bootstrapFeedContent(spaceId: _spaceId.isEmpty ? null : _spaceId);
        } else if (readyMaterials.isNotEmpty && _kindSupportsGeneration(_kind)) {
          await repository.backfillFeedKind(_kind, spaceId: _spaceId.isEmpty ? null : _spaceId);
        } else if (readyMaterials.isEmpty) {
          await repository.bootstrapFeedContent(spaceId: _spaceId.isEmpty ? null : _spaceId);
        }
        page = await repository.feedPage(
          spaceId: _spaceId.isEmpty ? null : _spaceId,
          kind: _kind,
        );
      } else if (hasMaterials && _needsInteractiveBackfill(page.items)) {
        if (mounted) setState(() => _bootstrapping = true);
        await repository.backfillInteractiveFeed(spaceId: _spaceId.isEmpty ? null : _spaceId);
        page = await repository.feedPage(
          spaceId: _spaceId.isEmpty ? null : _spaceId,
          kind: _kind,
        );
      }
      final allFeed = _kind == 'all'
          ? page
          : await repository.feedPage(
              spaceId: _spaceId.isEmpty ? null : _spaceId,
              kind: 'all',
            );
      if (!mounted) return;
      sortFeedItems(page.items);
      setState(() {
        _spaces = spaces;
        _items = page.items;
        _nextCursor = page.nextCursor;
        _hasLibraryMaterials = hasMaterials;
        _hasReadyMaterials = readyMaterials.isNotEmpty;
        _hasAnyFeedItems = allFeed.items.isNotEmpty;
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _bootstrapping = false;
        });
      }
    }
  }

  Future<void> _loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null || _loadingMore || _busy) return;
    setState(() => _loadingMore = true);
    try {
      final page = await repository.feedPage(
        spaceId: _spaceId.isEmpty ? null : _spaceId,
        kind: _kind,
        cursor: cursor,
      );
      if (!mounted) return;
      final known = _items.map((item) => item.id).toSet();
      setState(() {
        _items = [..._items, ...page.items.where((item) => !known.contains(item.id))];
        _nextCursor = page.nextCursor;
      });
    } catch (_) {
      // Keep scrolling with what we already have.
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _changeFilter({String? spaceId, String? kind}) async {
    setState(() {
      if (spaceId != null) _spaceId = spaceId;
      if (kind != null) _kind = kind;
    });
    await _load();
  }

  /// Keeps the feed going once stored cards run out by asking the bridge for
  /// cards on concepts that do not have any yet.
  Future<void> _generateMore() async {
    if (_generating || _busy || _exhausted || !_hasReadyMaterials) return;
    setState(() => _generating = true);
    try {
      final created = await repository.generateMoreFeed(
        spaceId: _spaceId.isEmpty ? null : _spaceId,
        kind: _kind,
      );
      if (created == 0) {
        if (mounted) setState(() => _exhausted = true);
        return;
      }
      final page = await repository.feedPage(
        spaceId: _spaceId.isEmpty ? null : _spaceId,
        kind: _kind,
      );
      if (!mounted) return;
      final known = _items.map((item) => item.id).toSet();
      final additions = page.items.where((item) => !known.contains(item.id)).toList();
      if (additions.isEmpty) {
        setState(() => _exhausted = true);
        return;
      }
      sortFeedItems(additions);
      setState(() => _items = [..._items, ...additions]);
    } catch (_) {
      // Leave the reader on the cards they already have.
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _applyProgress(String itemId, Progress progress) {
    if (!mounted) return;
    setState(() {
      _items = [
        for (final item in _items) item.id == itemId ? item.withProgress(progress) : item,
      ];
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _header(context),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: _content(context),
          ),
        ),
      ],
    );
  }

  Widget _content(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final filteredItems = switch (_completionFilter) {
      'learned' => _items.where((item) => item.progress.completed).toList(),
      'unlearned' => _items.where((item) => !item.progress.completed).toList(),
      _ => _items,
    };
    if (_busy || _bootstrapping) {
      return _refreshableCenter(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            if (_bootstrapping) ...[
              const SizedBox(height: 16),
              Text(
                l10n.buildingFeed,
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      );
    }
    if (_error != null) {
      return _refreshableCenter(_ErrorState(message: _error!, onRetry: _load));
    }
    if (_items.isEmpty) {
      return _refreshableCenter(
        _EmptyFeed(
          kind: _kind,
          hasLibraryMaterials: _hasLibraryMaterials,
          hasReadyMaterials: _hasReadyMaterials,
          hasAnyFeedItems: _hasAnyFeedItems,
          onViewAll: _kind == 'all' ? null : () => _changeFilter(kind: 'all'),
        ),
      );
    }
    if (filteredItems.isEmpty) {
      final message = _completionFilter == 'learned'
          ? 'No learned cards in this view yet.'
          : 'No unlearned cards in this view.';
      return _refreshableCenter(
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.filter_alt_off_outlined, size: 42, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => setState(() => _completionFilter = 'all'),
              child: const Text('Show all cards'),
            ),
          ],
        ),
      );
    }
    return Stack(
      children: [
        ListView.builder(
          controller: _scrollController,
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 80),
          itemCount: filteredItems.length,
          itemBuilder: (context, index) => Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: FeedCard(
              key: ValueKey(filteredItems[index].id),
              item: filteredItems[index],
              onProgress: _applyProgress,
            ),
          ),
        ),
        if (_loadingMore || _generating)
          Positioned(
            left: 0,
            right: 0,
            bottom: 6,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(999),
                  boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const SizedBox.square(dimension: 14, child: CircularProgressIndicator(strokeWidth: 2)),
                    const SizedBox(width: 10),
                    Text(
                      _generating ? l10n.creatingNewCards : l10n.loadingMore,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  Widget _refreshableCenter(Widget child) {
    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: constraints.maxHeight),
          child: Center(child: child),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;
    final feedKinds = localizedFeedKinds(l10n);
    return Padding(
      padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 14, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Feed',
                style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
              ),
              const AppHeaderActions(),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Review your study cards.',
            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey, height: 1.45),
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                if (_spaces.isNotEmpty) ...[
                  Container(
                    height: 36,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.3)),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _spaceId,
                        isDense: true,
                        icon: const Icon(Icons.arrow_drop_down, size: 20),
                        style: theme.textTheme.bodyMedium,
                        items: [
                          const DropdownMenuItem(value: '', child: Text('All subjects')),
                          ..._spaces.map((space) => DropdownMenuItem(value: space.id, child: Text(space.name))),
                        ],
                        onChanged: (value) => _changeFilter(spaceId: value ?? ''),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                ...feedKinds.map((filter) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(filter.label),
                    selected: _kind == filter.value,
                    onSelected: (_) => _changeFilter(kind: filter.value),
                  ),
                )),
                const SizedBox(width: 4),
                ChoiceChip(
                  label: const Text('All'),
                  selected: _completionFilter == 'all',
                  onSelected: (_) => setState(() => _completionFilter = 'all'),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Unlearned'),
                  selected: _completionFilter == 'unlearned',
                  onSelected: (_) => setState(() => _completionFilter = 'unlearned'),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Learned'),
                  selected: _completionFilter == 'learned',
                  onSelected: (_) => setState(() => _completionFilter = 'learned'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class FeedCard extends ConsumerStatefulWidget {
  const FeedCard({required this.item, required this.onProgress, super.key});

  final FeedItem item;
  final void Function(String itemId, Progress progress) onProgress;

  @override
  ConsumerState<FeedCard> createState() => _FeedCardState();
}

class _FeedCardState extends ConsumerState<FeedCard> {
  final _answerController = TextEditingController();
  String? _result;
  bool _correct = false;
  bool _busy = false;
  bool _showFlashcardBack = false;
  int? _selectedOption;
  int? _correctOptionIndex;
  bool? _selectedTrueFalse;

  FeedItem get item => widget.item;

  bool get _attemptLocked => item.progress.completed;

  @override
  void initState() {
    super.initState();
    _syncFromProgress();
  }

  @override
  void didUpdateWidget(covariant FeedCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.item.progress != widget.item.progress || oldWidget.item.id != widget.item.id) {
      _syncFromProgress();
    }
  }

  void _syncFromProgress() {
    _result = null;
    _correct = false;
    _selectedOption = null;
    _correctOptionIndex = null;
    _selectedTrueFalse = null;

    if (item.kind == 'quiz') {
      _selectedOption = item.progress.quizSelectedIndex;
      _correctOptionIndex = item.progress.quizCorrectIndex;
      if (item.progress.quizSelectedIndex != null && item.progress.quizCorrectIndex != null) {
        _correct = item.progress.quizSelectedIndex == item.progress.quizCorrectIndex;
        _result = _correct ? 'Correct.' : 'Not quite.';
      } else if (item.progress.completed) {
        _result = 'Saved to your progress.';
        _correct = true;
      }
      return;
    }

    if (item.kind == 'fill_blank') {
      if (item.progress.fillBlankSelectedAnswer != null) {
        _answerController.text = item.progress.fillBlankSelectedAnswer!;
      }
      if (item.progress.completed) {
        _result = 'Saved to your progress.';
        _correct = (item.progress.lastScore ?? 0) >= 100;
      }
      return;
    }

    if (item.kind == 'true_false') {
      _selectedTrueFalse = item.progress.trueFalseSelected;
      if (item.progress.completed) {
        _result = 'Saved to your progress.';
        _correct = (item.progress.lastScore ?? 0) >= 100;
      }
      return;
    }

    if (item.progress.completed) {
      _result = 'Saved to your progress.';
      _correct = true;
    }
  }

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  Future<void> _markLearned() async {
    setState(() => _busy = true);
    try {
      await ProviderScope.containerOf(context, listen: false).read(studyRepositoryProvider).bridge.markFeedProgress(item.id);
      if (!mounted) return;
      setState(() {
        _result = 'Saved to your progress.';
        _correct = true;
      });
      widget.onProgress(item.id, Progress(completedAt: DateTime.now(), lastScore: item.progress.lastScore));
      ProviderScope.containerOf(context, listen: false).read(gamificationProvider.notifier).refresh();
    } catch (error) {
      if (mounted) setState(() => _result = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitAttempt(Object answer) async {
    setState(() => _busy = true);
    try {
      final bridge = ProviderScope.containerOf(context, listen: false).read(studyRepositoryProvider).bridge;
      final result = await bridge.submitFeedAttempt(item.id, answer);
      if (!mounted) return;
      final correct = result['correct'] == true;
      final explanation = '${result['explanation'] ?? ''}'.trim();
      final correctIndex = result['correctIndex'] as int?;
      setState(() {
        _correct = correct;
        _correctOptionIndex = correctIndex ?? _correctOptionIndex;
        _result = correct
            ? (explanation.isEmpty ? 'Correct.' : 'Correct — $explanation')
            : (explanation.isEmpty ? 'Not quite. Try again.' : 'Keep going — $explanation');
      });
      final selectedText = item.kind == 'fill_blank' ? _answerController.text.trim() : null;
      widget.onProgress(
        item.id,
        Progress(
          completedAt: DateTime.now(),
          lastScore: result['score'] as num?,
          quizSelectedIndex: item.kind == 'quiz' ? _selectedOption : null,
          quizCorrectIndex: item.kind == 'quiz' ? correctIndex : null,
          trueFalseSelected: item.kind == 'true_false' ? _selectedTrueFalse : null,
          fillBlankSelectedAnswer: item.kind == 'fill_blank' ? selectedText : null,
        ),
      );
      ProviderScope.containerOf(context, listen: false).read(gamificationProvider.notifier).refresh();
    } catch (error) {
      if (mounted) {
        setState(() {
          _correct = false;
          _result = '$error';
        });
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitAnswer() async {
    final Object? answer;
    if (item.kind == 'quiz' && item.payload['options'] is List) {
      answer = _selectedOption;
    } else {
      answer = _answerController.text.trim();
    }
    if (answer == null || answer == '') return;
    await _submitAttempt(answer);
  }

  Future<void> _submitTrueFalse(bool value) {
    _selectedTrueFalse = value;
    return _submitAttempt(value);
  }

  Widget _body(BuildContext context) {
    final payload = item.payload;
    switch (item.kind) {
      case 'flashcard':
        return _FlashCard(
          front: _payloadString(payload, 'front') ?? item.title,
          back: _payloadString(payload, 'back') ?? 'This card has no answer yet.',
          flipped: _showFlashcardBack,
          onFlip: () => setState(() => _showFlashcardBack = !_showFlashcardBack),
          onLightPanel: true,
        );
      case 'did_you_know':
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _payloadString(payload, 'headline') ?? item.title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800, height: 1.25),
            ),
            if (_payloadString(payload, 'fact') != null) ...[
              const SizedBox(height: 16),
              Text(
                _payloadString(payload, 'fact')!,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white.withValues(alpha: 0.92), height: 1.5),
              ),
            ],
            if (_payloadString(payload, 'concept') != null) ...[
              const SizedBox(height: 18),
              _Pill(text: _payloadString(payload, 'concept')!),
            ],
          ],
        );
      case 'meme':
        final meme = item.meme;
        if (meme != null && meme.imageUrl.isNotEmpty) {
          return ClipRRect(borderRadius: BorderRadius.circular(16), child: _MemeImage(meme: meme));
        }
        final captions = _memeCaptionLines(payload);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (captions.isEmpty)
              Text('This meme has no captions yet.', style: TextStyle(color: Colors.white.withValues(alpha: 0.8)))
            else
              ...captions.map(
                (line) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text(line, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white, height: 1.4)),
                ),
              ),
          ],
        );
      case 'true_false':
        return _prompt(context, _payloadString(payload, 'statement') ?? item.title, onLightPanel: _cleanStudyLayout);
      case 'quiz':
        return _prompt(context, _payloadString(payload, 'question') ?? item.title, onLightPanel: _cleanStudyLayout);
      case 'fill_blank':
        return _prompt(context, _payloadString(payload, 'prompt') ?? item.title);
      default:
        final fallback = _payloadString(payload, 'question') ?? _payloadString(payload, 'prompt') ?? _payloadString(payload, 'concept');
        return _prompt(context, fallback ?? item.title);
    }
  }

  Widget _prompt(BuildContext context, String text, {bool onLightPanel = false}) => Text(
        text,
        style: Theme.of(context).textTheme.titleLarge?.copyWith(
              color: onLightPanel ? Theme.of(context).colorScheme.onSurface : Colors.white,
              fontWeight: FontWeight.w700,
              height: 1.35,
            ),
      );

  bool get _cleanStudyLayout {
    final tone = ref.watch(settingsProvider).cardTone;
    if (tone == AppCardTone.single) return true;
    if (tone == AppCardTone.colorful) return false;
    return item.kind == 'quiz' || item.kind == 'flashcard' || item.kind == 'true_false';
  }

  _OptionFeedbackState _feedbackForOption(int optionIndex) {
    if (!_attemptLocked || item.kind != 'quiz') return _OptionFeedbackState.none;
    final selected = _selectedOption;
    final correctIndex = _correctOptionIndex;
    if (selected == null || correctIndex == null) return _OptionFeedbackState.none;
    if (optionIndex == correctIndex) return _OptionFeedbackState.correct;
    if (optionIndex == selected && selected != correctIndex) return _OptionFeedbackState.wrong;
    return _OptionFeedbackState.none;
  }

  Widget _buildStudyPanelContent(List<String> options) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _body(context),
        if (item.kind == 'quiz' && options.isNotEmpty) ...[
          const SizedBox(height: 22),
          ...options.asMap().entries.map(
                (entry) => _OptionTile(
                  label: entry.value,
                  index: entry.key,
                  selected: _selectedOption == entry.key,
                  feedbackState: _feedbackForOption(entry.key),
                  onTap: (_busy || _attemptLocked) ? null : () => setState(() => _selectedOption = entry.key),
                  onLightPanel: true,
                ),
              ),
        ],
        if (item.kind == 'true_false') ...[
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: _StudyPollButton(
                  label: 'True',
                  icon: Icons.check_rounded,
                  accent: const Color(0xFF047857),
                  onPressed: (_busy || _attemptLocked) ? null : () => _submitTrueFalse(true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _StudyPollButton(
                  label: 'False',
                  icon: Icons.close_rounded,
                  accent: const Color(0xFFB45309),
                  onPressed: (_busy || _attemptLocked) ? null : () => _submitTrueFalse(false),
                ),
              ),
            ],
          ),
        ],
        if (_result != null) ...[
          const SizedBox(height: 18),
          _FeedbackBanner(correct: _correct, message: _result!),
        ],
      ],
    );
  }

  Widget _buildScrollableBody(List<String> options) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        _body(context),
        if (item.kind == 'quiz' && options.isNotEmpty) ...[
          const SizedBox(height: 18),
          ...options.asMap().entries.map(
                (entry) => _OptionTile(
                  label: entry.value,
                  index: entry.key,
                  selected: _selectedOption == entry.key,
                  feedbackState: _feedbackForOption(entry.key),
                  onTap: (_busy || _attemptLocked) ? null : () => setState(() => _selectedOption = entry.key),
                ),
              ),
        ],
        if (item.kind == 'true_false') ...[
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: _ChoiceButton(
                  label: 'True',
                  icon: Icons.thumb_up_outlined,
                  onPressed: (_busy || _attemptLocked) ? null : () => _submitTrueFalse(true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ChoiceButton(
                  label: 'False',
                  icon: Icons.thumb_down_outlined,
                  onPressed: (_busy || _attemptLocked) ? null : () => _submitTrueFalse(false),
                ),
              ),
            ],
          ),
        ],
        if (item.kind == 'fill_blank') ...[
          const SizedBox(height: 18),
          TextField(
            controller: _answerController,
            enabled: !_busy && !_attemptLocked,
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            cursorColor: Colors.white,
            onSubmitted: (_busy || _attemptLocked) ? null : (_) => _submitAnswer(),
            decoration: InputDecoration(
              hintText: 'Type the missing word',
              hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.6)),
              filled: true,
              fillColor: Colors.white.withValues(alpha: 0.16),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.28)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: const BorderSide(color: Colors.white),
              ),
            ),
          ),
        ],
        if (_result != null) ...[
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(_correct ? Icons.check_circle_outline : Icons.info_outline, color: Colors.white, size: 20),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(_result!, style: const TextStyle(color: Colors.white, height: 1.4)),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final style = feedKindStyle(item.kind);
    final options = item.payload['options'] is List
        ? (item.payload['options'] as List).map((value) => '$value').toList()
        : const <String>[];
    final needsCheckButton = (item.kind == 'quiz' || item.kind == 'fill_blank') && !_attemptLocked;
    final primaryAction = needsCheckButton
        ? (_busy ? null : _submitAnswer)
        : (item.progress.completed ? null : _markLearned);

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isClean = _cleanStudyLayout;
    
    final mutedTextColor = isClean ? (isDark ? Colors.white70 : const Color(0xFF64748B)) : Colors.white.withValues(alpha: 0.7);
    final iconColor = isClean ? theme.colorScheme.primary : Colors.white;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(26),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isClean
              ? [theme.cardTheme.color ?? Colors.white, theme.cardTheme.color ?? Colors.white]
              : style.gradient,
        ),
        border: isClean ? Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.2)) : null,
        boxShadow: [
          BoxShadow(
            color: (isClean ? Colors.black : style.gradient.last).withValues(alpha: isClean ? (isDark ? 0.2 : 0.06) : 0.28),
            blurRadius: 24,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(style.icon, color: iconColor, size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    style.label.toUpperCase(),
                    style: TextStyle(color: iconColor, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.4),
                  ),
                ),
                if (item.progress.completed)
                  Icon(Icons.check_circle, color: iconColor, size: 20),
              ],
            ),
            const SizedBox(height: 16),
            isClean ? _buildStudyPanelContent(options) : _buildScrollableBody(options),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _busy
                      ? Center(
                          child: SizedBox.square(
                            dimension: 22,
                            child: CircularProgressIndicator(strokeWidth: 2, color: iconColor),
                          ),
                        )
                      : (isClean
                          ? FilledButton.icon(
                              onPressed: primaryAction,
                              icon: Icon(needsCheckButton ? Icons.check : Icons.bookmark_add_outlined),
                              label: Text(needsCheckButton
                                  ? 'Check answer'
                                  : item.progress.completed
                                      ? 'Learned'
                                      : 'Mark learned'),
                            )
                          : _ChoiceButton(
                              label: needsCheckButton
                                  ? 'Check answer'
                                  : item.progress.completed
                                      ? 'Learned'
                                      : 'Mark learned',
                              icon: needsCheckButton ? Icons.check : Icons.bookmark_add_outlined,
                              onPressed: primaryAction,
                            )),
                ),
                const SizedBox(width: 10),
                IconButton(
                  onPressed: () => context.go('/learn?tab=live&drawer=chat'),
                  icon: Icon(Icons.chat_bubble_outline, color: iconColor),
                  tooltip: 'Ask tutor',
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${item.studySpaceName} · ${DateFormat.MMMd().format(item.createdAt)}',
              style: TextStyle(color: mutedTextColor, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }
}

typedef FeedKindStyle = ({IconData icon, String label, List<Color> gradient});

FeedKindStyle feedKindStyle(String kind) {
  switch (kind) {
    case 'meme':
      return (icon: Icons.emoji_emotions_outlined, label: 'Meme', gradient: const [Color(0xFF1E293B), Color(0xFF0F172A)]);
    case 'quiz':
      return (icon: Icons.quiz_outlined, label: 'Quiz', gradient: const [Color(0xFF2A3530), Color(0xFF1C2420)]);
    case 'flashcard':
      return (icon: Icons.style_outlined, label: 'Flashcard', gradient: const [Color(0xFF2A3530), Color(0xFF1C2420)]);
    case 'fill_blank':
      return (icon: Icons.edit_note_outlined, label: 'Fill in the blank', gradient: const [Color(0xFF059669), Color(0xFF0D9488)]);
    case 'true_false':
      return (icon: Icons.rule_outlined, label: 'True or false', gradient: const [Color(0xFF2A3530), Color(0xFF1C2420)]);
    case 'did_you_know':
      return (icon: Icons.lightbulb_outline, label: 'Did you know', gradient: const [Color(0xFFF59E0B), Color(0xFFF97316)]);
    default:
      return (icon: Icons.auto_awesome_outlined, label: kind.replaceAll('_', ' '), gradient: const [Color(0xFF059669), Color(0xFF047857)]);
  }
}

class _FlashCard extends StatelessWidget {
  const _FlashCard({
    required this.front,
    required this.back,
    required this.flipped,
    required this.onFlip,
    this.onLightPanel = false,
  });

  final String front;
  final String back;
  final bool flipped;
  final VoidCallback onFlip;
  final bool onLightPanel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GestureDetector(
          onTap: onFlip,
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(end: flipped ? 1 : 0),
            duration: const Duration(milliseconds: 420),
            curve: Curves.easeInOut,
            builder: (context, value, child) {
              final showBack = value > 0.5;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.001)
                  ..rotateY(value * math.pi),
                child: Transform(
                  alignment: Alignment.center,
                  transform: showBack ? (Matrix4.identity()..rotateY(math.pi)) : Matrix4.identity(),
                  child: _face(
                    context,
                    label: showBack ? 'Answer' : 'Term',
                    text: showBack ? back : front,
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.touch_app_outlined,
              size: 16,
              color: onLightPanel ? (isDark ? Colors.white70 : const Color(0xFF64748B)) : Colors.white.withValues(alpha: 0.75),
            ),
            const SizedBox(width: 6),
            Text(
              flipped ? 'Tap to see the term' : 'Tap to reveal the answer',
              style: TextStyle(
                color: onLightPanel ? (isDark ? Colors.white70 : const Color(0xFF64748B)) : Colors.white.withValues(alpha: 0.75),
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _face(BuildContext context, {required String label, required String text}) {
    final theme = Theme.of(context);
    if (onLightPanel) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              text,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    color: theme.colorScheme.onSurface,
                    fontWeight: FontWeight.w700,
                    height: 1.35,
                  ),
            ),
          ],
        ),
      );
    }

    return _legacyFace(context, label: label, text: text);
  }

  Widget _legacyFace(BuildContext context, {required String label, required String text}) {
    return Container(
      constraints: const BoxConstraints(minHeight: 210),
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.4),
          ),
          const SizedBox(height: 12),
          Text(
            text,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w700, height: 1.35),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
      ),
    );
  }
}

class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({required this.correct, required this.message});

  final bool correct;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: correct ? const Color(0xFFE8F0EA) : const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: correct ? const Color(0xFFBBF7D0) : const Color(0xFFFDE68A)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            correct ? Icons.check_circle_outline : Icons.info_outline,
            color: correct ? const Color(0xFF047857) : const Color(0xFFB45309),
            size: 20,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: correct ? const Color(0xFF14532D) : const Color(0xFF78350F),
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

class _StudyPollButton extends StatelessWidget {
  const _StudyPollButton({
    required this.label,
    required this.icon,
    required this.accent,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final Color accent;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8E6)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: accent, size: 26),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  color: accent,
                  fontWeight: FontWeight.w700,
                  fontSize: 16,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OptionTile extends StatelessWidget {
  const _OptionTile({
    required this.label,
    required this.index,
    required this.selected,
    required this.feedbackState,
    required this.onTap,
    this.onLightPanel = false,
  });

  final String label;
  final int index;
  final bool selected;
  final _OptionFeedbackState feedbackState;
  final VoidCallback? onTap;
  final bool onLightPanel;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isCorrect = feedbackState == _OptionFeedbackState.correct;
    final isWrong = feedbackState == _OptionFeedbackState.wrong;
    final accent = isCorrect
        ? const Color(0xFF047857)
        : isWrong
            ? const Color(0xFFB91C1C)
            : theme.colorScheme.primary;
    
    if (onLightPanel) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Material(
          color: isCorrect
              ? const Color(0xFFE8F0EA)
              : isWrong
                  ? const Color(0xFFFEE2E2)
                  : selected
                      ? theme.colorScheme.primaryContainer
                      : (isDark ? const Color(0xFF1E293B) : Colors.white),
          borderRadius: BorderRadius.circular(14),
          child: InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: (isCorrect || isWrong || selected) ? accent : theme.colorScheme.outline.withValues(alpha: 0.2),
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
                      color: (isCorrect || isWrong || selected) ? accent : theme.colorScheme.surfaceContainerHighest,
                    ),
                    child: Text(
                      String.fromCharCode(65 + index),
                      style: TextStyle(
                        color: (isCorrect || isWrong || selected) ? Colors.white : theme.colorScheme.onSurface,
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
                        color: isWrong ? const Color(0xFF991B1B) : theme.colorScheme.onSurface,
                        height: 1.4,
                        fontWeight: (isCorrect || isWrong || selected) ? FontWeight.w700 : FontWeight.w500,
                        fontSize: 15,
                      ),
                    ),
                  ),
                  if (isCorrect) const Icon(Icons.check_circle, color: Color(0xFF047857), size: 22),
                  if (isWrong) const Icon(Icons.cancel, color: Color(0xFFB91C1C), size: 22),
                  if (!isCorrect && !isWrong && selected) Icon(Icons.check_circle, color: theme.colorScheme.primary, size: 22),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Material(
        color: isCorrect
            ? const Color(0x40047857)
            : isWrong
                ? const Color(0x40B91C1C)
                : Colors.white.withValues(alpha: selected ? 0.28 : 0.12),
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 26,
                  height: 26,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: (isCorrect || isWrong || selected) ? Colors.white : Colors.transparent,
                    border: Border.all(
                      color: isCorrect
                          ? const Color(0xFF047857)
                          : isWrong
                              ? const Color(0xFFB91C1C)
                              : Colors.white.withValues(alpha: 0.8),
                      width: 2,
                    ),
                  ),
                  child: Text(
                    String.fromCharCode(65 + index),
                    style: TextStyle(
                      color: isCorrect
                          ? const Color(0xFF047857)
                          : isWrong
                              ? const Color(0xFFB91C1C)
                              : selected
                                  ? theme.colorScheme.primary
                                  : Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: TextStyle(
                      color: isWrong ? const Color(0xFFFECACA) : Colors.white,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

enum _OptionFeedbackState { none, correct, wrong }

class _ChoiceButton extends StatelessWidget {
  const _ChoiceButton({required this.label, required this.icon, required this.onPressed});

  final String label;
  final IconData icon;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      onPressed: onPressed,
      icon: Icon(icon, size: 18),
      label: Text(label, overflow: TextOverflow.ellipsis),
      style: FilledButton.styleFrom(
        backgroundColor: Colors.white.withValues(alpha: 0.2),
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }
}

Color _memeColor(String value, Color fallback) {
  switch (value.trim().toLowerCase()) {
    case 'white':
      return Colors.white;
    case 'black':
      return Colors.black;
    case 'yellow':
      return const Color(0xFFFFE066);
    case 'red':
      return const Color(0xFFE53935);
  }
  final hex = value.trim().replaceFirst('#', '');
  if (hex.length == 6) {
    final parsed = int.tryParse(hex, radix: 16);
    if (parsed != null) return Color(0xFF000000 | parsed);
  }
  return fallback;
}

class _MemeImage extends StatelessWidget {
  const _MemeImage({required this.meme});

  final MemeLayout meme;

  @override
  Widget build(BuildContext context) {
    final fill = _memeColor(meme.textColor, Colors.white);
    final stroke = _memeColor(meme.strokeColor, Colors.black);
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final scale = meme.width <= 0 ? 1.0 : width / meme.width;
        return SizedBox(
          width: width,
          height: meme.height * scale,
          child: Stack(
            children: [
              Positioned.fill(
                child: Image.network(
                  meme.imageUrl,
                  fit: BoxFit.fill,
                  loadingBuilder: (context, child, progress) => progress == null
                      ? child
                      : const ColoredBox(
                          color: Colors.black26,
                          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        ),
                  errorBuilder: (_, __, ___) => const ColoredBox(
                    color: Colors.black26,
                    child: Center(child: Icon(Icons.image_not_supported_outlined, color: Colors.white54, size: 40)),
                  ),
                ),
              ),
              for (final slot in meme.slots)
                if (slot.caption.trim().isNotEmpty)
                  Positioned(
                    left: slot.left * scale,
                    top: slot.top * scale,
                    width: slot.width * scale,
                    height: slot.height * scale,
                    child: _MemeCaption(
                      text: slot.caption,
                      fontSize: slot.fontSize * scale,
                      fill: fill,
                      stroke: stroke,
                      strokeWidth: (meme.strokeWidth * scale).clamp(1.0, 6.0),
                    ),
                  ),
            ],
          ),
        );
      },
    );
  }
}

class _MemeCaption extends StatelessWidget {
  const _MemeCaption({
    required this.text,
    required this.fontSize,
    required this.fill,
    required this.stroke,
    required this.strokeWidth,
  });

  final String text;
  final double fontSize;
  final Color fill;
  final Color stroke;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final base = TextStyle(fontSize: fontSize, fontWeight: FontWeight.w900, height: 1.1);
    return LayoutBuilder(
      builder: (context, constraints) => Center(
        child: FittedBox(
          fit: BoxFit.scaleDown,
          child: SizedBox(
            width: constraints.maxWidth,
            child: Stack(
              children: [
                Text(
                  text,
                  textAlign: TextAlign.center,
                  style: base.copyWith(
                    foreground: Paint()
                      ..style = PaintingStyle.stroke
                      ..strokeWidth = strokeWidth
                      ..color = stroke,
                  ),
                ),
                Text(text, textAlign: TextAlign.center, style: base.copyWith(color: fill)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyFeed extends StatelessWidget {
  const _EmptyFeed({
    required this.kind,
    required this.hasLibraryMaterials,
    required this.hasReadyMaterials,
    required this.hasAnyFeedItems,
    this.onViewAll,
  });

  final String kind;
  final bool hasLibraryMaterials;
  final bool hasReadyMaterials;
  final bool hasAnyFeedItems;
  final VoidCallback? onViewAll;

  String _kindLabel(AppLocalizations l10n) {
    return l10n.feedKindLabel(kind).toLowerCase();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    if (!hasLibraryMaterials) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.dynamic_feed, size: 56, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 16),
              Text(
                l10n.feedEmptyTitle,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                l10n.feedEmptyStepsLibrary,
                textAlign: TextAlign.center,
                style: const TextStyle(height: 1.5),
              ),
              const SizedBox(height: 22),
              FilledButton(
                onPressed: () => context.go('/library?prompt=createSpace'),
                child: Text(l10n.startInLibrary),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () => context.go('/learn'),
                child: Text(l10n.exploreLearn),
              ),
            ],
          ),
        ),
      );
    }

    if (kind != 'all' && hasAnyFeedItems) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.filter_alt_outlined, size: 56, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 16),
              Text(
                l10n.noKindInFilter(_kindLabel(l10n)),
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                l10n.feedEmptyOtherTypes,
                textAlign: TextAlign.center,
              ),
              if (onViewAll != null) ...[
                const SizedBox(height: 18),
                FilledButton(onPressed: onViewAll, child: Text(l10n.viewAllCards)),
              ],
            ],
          ),
        ),
      );
    }

    if (!hasReadyMaterials) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.manage_search_outlined, size: 56, color: Theme.of(context).colorScheme.primary),
              const SizedBox(height: 16),
              const Text(
                'Your files are still getting ready.',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Upload in Library and wait until you see the checkmark, then pull to refresh here.',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.hourglass_top_outlined, size: 56, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 16),
            Text(
              kind == 'all' ? l10n.feedStillPreparing : l10n.feedNoKindYet(_kindLabel(l10n)),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              kind == 'all'
                  ? 'We could not build cards from your library yet. Pull to refresh, or open Library and tap Generate on ready material.'
                  : 'Pull to refresh to load new ${_kindLabel(l10n)} cards from your library.',
              textAlign: TextAlign.center,
            ),
            if (onViewAll != null) ...[
              const SizedBox(height: 18),
              TextButton(onPressed: onViewAll, child: Text(l10n.viewAllCards)),
            ],
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.cloud_off_outlined, size: 48), const SizedBox(height: 12), Text(message, textAlign: TextAlign.center), const SizedBox(height: 16), OutlinedButton(onPressed: onRetry, child: const Text('Try again'))])));
}
