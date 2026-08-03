import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../models.dart';
import '../repositories.dart';

const feedKinds = <({String value, String label})>[
  (value: 'all', label: 'All'),
  (value: 'meme', label: 'Memes'),
  (value: 'quiz', label: 'Quizzes'),
  (value: 'flashcard', label: 'Cards'),
  (value: 'fill_blank', label: 'Fill in'),
  (value: 'true_false', label: 'True / false'),
  (value: 'did_you_know', label: 'Did you know'),
];

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
  String? _error;
  bool _busy = true;

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final spaces = await repository.listSpaces();
      final items = await repository.feed(spaceId: _spaceId.isEmpty ? null : _spaceId, kind: _kind);
      if (!mounted) return;
      setState(() {
        _spaces = spaces;
        _items = items;
      });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _changeFilter({String? spaceId, String? kind}) async {
    setState(() {
      if (spaceId != null) _spaceId = spaceId;
      if (kind != null) _kind = kind;
    });
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _header(context)),
          if (_busy)
            const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            SliverFillRemaining(child: _ErrorState(message: _error!, onRetry: _load))
          else if (_items.isEmpty)
            const SliverFillRemaining(child: _EmptyFeed())
          else
            SliverFillRemaining(
              hasScrollBody: true,
              child: PageView.builder(
                scrollDirection: Axis.vertical,
                itemCount: _items.length,
                itemBuilder: (context, index) => Padding(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  child: FeedCard(item: _items[index], onChanged: _load),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _header(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 46, 20, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Your learning feed', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
          const SizedBox(height: 8),
          Text('Keep your streak of understanding.', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 18),
          SizedBox(
            height: 38,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: feedKinds.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final filter = feedKinds[index];
                return ChoiceChip(label: Text(filter.label), selected: _kind == filter.value, onSelected: (_) => _changeFilter(kind: filter.value));
              },
            ),
          ),
          if (_spaces.isNotEmpty) ...[
            const SizedBox(height: 10),
            DropdownButtonFormField<String>(
              value: _spaceId,
              decoration: const InputDecoration(labelText: 'Subject', prefixIcon: Icon(Icons.book_outlined), isDense: true),
              items: [
                const DropdownMenuItem(value: '', child: Text('All subjects')),
                ..._spaces.map((space) => DropdownMenuItem(value: space.id, child: Text(space.name))),
              ],
              onChanged: (value) => _changeFilter(spaceId: value ?? ''),
            ),
          ],
        ],
      ),
    );
  }
}

class FeedCard extends StatefulWidget {
  const FeedCard({required this.item, required this.onChanged, super.key});

  final FeedItem item;
  final VoidCallback onChanged;

  @override
  State<FeedCard> createState() => _FeedCardState();
}

class _FeedCardState extends State<FeedCard> {
  final _answerController = TextEditingController();
  String? _result;
  bool _busy = false;
  int? _selectedOption;

  FeedItem get item => widget.item;

  @override
  void dispose() {
    _answerController.dispose();
    super.dispose();
  }

  Future<void> _markLearned() async {
    setState(() => _busy = true);
    try {
      await ProviderScope.containerOf(context, listen: false).read(studyRepositoryProvider).bridge.markFeedProgress(item.id);
      if (mounted) setState(() => _result = 'Saved to your progress.');
      widget.onChanged();
    } catch (error) {
      if (mounted) setState(() => _result = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submitAnswer() async {
    final answer = item.payload['options'] is List && _selectedOption != null
        ? _selectedOption
        : _answerController.text.trim();
    if (answer == null || answer == '') return;
    setState(() => _busy = true);
    try {
      final bridge = ProviderScope.containerOf(context, listen: false).read(studyRepositoryProvider).bridge;
      final result = await bridge.submitFeedAttempt(item.id, answer);
      if (!mounted) return;
      setState(() => _result = result['correct'] == true ? 'Correct — ${result['explanation'] ?? ''}' : 'Keep going — ${result['explanation'] ?? ''}');
      widget.onChanged();
    } catch (error) {
      if (mounted) setState(() => _result = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = item.kind == 'meme' || item.assetUrl != null;
    final background = dark ? const Color(0xFF0F172A) : Colors.white;
    final foreground = dark ? Colors.white : const Color(0xFF0F172A);
    final prompt = '${item.payload['question'] ?? item.payload['prompt'] ?? item.payload['concept'] ?? item.title}';
    final options = item.payload['options'] is List ? (item.payload['options'] as List).map((value) => '$value').toList() : const <String>[];
    final acceptsAnswer = <String>{'quiz', 'fill_blank', 'true_false'}.contains(item.kind);
    return Card(
      clipBehavior: Clip.antiAlias,
      color: background,
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [Expanded(child: Text(item.kind.replaceAll('_', ' ').toUpperCase(), style: TextStyle(color: dark ? Colors.indigo.shade200 : Colors.indigo, fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.5))), if (item.progress.completed) Icon(Icons.check_circle, color: Colors.green.shade300)]),
            const SizedBox(height: 18),
            if (item.assetUrl != null) ...[
              Expanded(child: ClipRRect(borderRadius: BorderRadius.circular(18), child: Image.network(item.assetUrl!, width: double.infinity, fit: BoxFit.cover, errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.image_not_supported_outlined, size: 48))))),
              const SizedBox(height: 18),
            ],
            Text(item.title, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: foreground, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            Text(prompt, style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: foreground.withOpacity(.78), height: 1.45)),
            if (options.isNotEmpty) ...[
              const SizedBox(height: 14),
              ...options.asMap().entries.map((entry) => RadioListTile<int>(value: entry.key, groupValue: _selectedOption, onChanged: _busy ? null : (value) => setState(() => _selectedOption = value), title: Text(entry.value, style: TextStyle(color: foreground)), contentPadding: EdgeInsets.zero, dense: true)),
            ],
            if (acceptsAnswer && options.isEmpty) ...[
              const SizedBox(height: 14),
              TextField(controller: _answerController, style: TextStyle(color: foreground), decoration: InputDecoration(labelText: 'Your answer', labelStyle: TextStyle(color: foreground.withOpacity(.7)), filled: true, fillColor: dark ? Colors.white10 : Colors.black.withOpacity(.03))),
            ],
            if (_result != null) ...[
              const SizedBox(height: 12),
              Text(_result!, style: TextStyle(color: _result!.startsWith('Correct') ? Colors.green.shade300 : foreground.withOpacity(.78))),
            ],
            const Spacer(),
            Row(
              children: [
                Expanded(child: OutlinedButton.icon(onPressed: _busy ? null : (acceptsAnswer ? _submitAnswer : _markLearned), icon: Icon(acceptsAnswer ? Icons.check_outlined : Icons.bookmark_add_outlined), label: Text(acceptsAnswer ? 'Check answer' : item.progress.completed ? 'Learned' : 'Mark learned'), style: OutlinedButton.styleFrom(foregroundColor: foreground, side: BorderSide(color: foreground.withOpacity(.3))))),
                const SizedBox(width: 10),
                IconButton(onPressed: () => context.go('/tutor'), icon: Icon(Icons.chat_bubble_outline, color: foreground), tooltip: 'Ask tutor'),
              ],
            ),
            const SizedBox(height: 10),
            Text('${item.studySpaceName} · ${DateFormat.MMMd().format(item.createdAt)}', style: TextStyle(color: foreground.withOpacity(.55), fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _EmptyFeed extends StatelessWidget {
  const _EmptyFeed();

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(32), child: Column(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.auto_awesome_outlined, size: 56, color: Theme.of(context).colorScheme.primary), const SizedBox(height: 16), const Text('Your feed is waiting for its first lesson.', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700), textAlign: TextAlign.center), const SizedBox(height: 8), const Text('Add material in Library, index it, and generate a learning pack.', textAlign: TextAlign.center)])));
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.cloud_off_outlined, size: 48), const SizedBox(height: 12), Text(message, textAlign: TextAlign.center), const SizedBox(height: 16), OutlinedButton(onPressed: onRetry, child: const Text('Try again'))])));
}
