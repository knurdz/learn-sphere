import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sensors_plus/sensors_plus.dart';

import '../models.dart';
import '../repositories.dart';
import '../gamification_provider.dart';
import '../settings_provider.dart';
import '../theme.dart';
import '../widgets/coach_tour_scope.dart';
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

/// Extra vertical inset so feed cards sit lower and breathe above bottom chrome.
const _feedContentTopInset = 72.0;
const _feedContentBottomExtra = 20.0;

String _attemptFeedbackMessage({
  required bool correct,
  String? correctAnswer,
  String? selectedAnswer,
}) {
  if (correct) return 'Correct.';
  final parts = <String>['Not quite.'];
  if (selectedAnswer != null && selectedAnswer.trim().isNotEmpty) {
    parts.add('Your answer: ${selectedAnswer.trim()}.');
  }
  if (correctAnswer != null && correctAnswer.trim().isNotEmpty) {
    parts.add('Answer: ${correctAnswer.trim()}.');
  }
  return parts.join(' ');
}

TextStyle _feedBaseStyle(
  FeedWorldLook look, {
  required double size,
  FontWeight weight = FontWeight.w800,
  double height = 1.28,
}) {
  return TextStyle(
    color: look.ink,
    fontSize: size,
    fontWeight: weight,
    height: height,
    letterSpacing: -0.35,
  );
}

List<InlineSpan> _accentSpans(
  String text,
  FeedWorldLook look, {
  required double size,
  FontWeight weight = FontWeight.w800,
  double height = 1.28,
  Color? color,
}) {
  final ink = color ?? look.ink;
  final pop = color ?? look.seed;
  final base = _feedBaseStyle(look, size: size, weight: weight, height: height).copyWith(color: ink);
  final accent = base.copyWith(color: pop, fontWeight: FontWeight.w800);
  final quote = base.copyWith(color: pop, fontStyle: FontStyle.italic, fontWeight: FontWeight.w700);
  final number = base.copyWith(color: pop);
  final pattern = RegExp(
    r'"([^"]+)"|'
    r"'([^']+)'|"
    r'`([^`]+)`|'
    r'(_{3,})|'
    r'(\b\d+(?:\.\d+)?%?\b)|'
    r'\b(What|Why|How|Which|When|Where|Who|True|False)\b',
    caseSensitive: false,
  );

  final spans = <InlineSpan>[];
  var cursor = 0;
  for (final match in pattern.allMatches(text)) {
    if (match.start > cursor) {
      spans.add(TextSpan(text: text.substring(cursor, match.start), style: base));
    }
    if (match.group(4) != null) {
      spans.add(
        WidgetSpan(
          alignment: PlaceholderAlignment.middle,
          child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 3, vertical: 2),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
            decoration: BoxDecoration(
              color: look.seed.withValues(alpha: look.isDark ? 0.28 : 0.16),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: look.seed.withValues(alpha: 0.55)),
            ),
            child: Text(
              '  ?  ',
              style: TextStyle(color: look.seed, fontWeight: FontWeight.w900, fontSize: size * 0.72),
            ),
          ),
        ),
      );
    } else if (match.group(5) != null) {
      spans.add(TextSpan(text: match.group(0), style: number));
    } else if (match.group(1) != null || match.group(2) != null || match.group(3) != null) {
      final quoted = match.group(1) ?? match.group(2) ?? match.group(3)!;
      spans.add(TextSpan(text: '“$quoted”', style: quote));
    } else {
      spans.add(TextSpan(text: match.group(0), style: accent));
    }
    cursor = match.end;
  }
  if (cursor < text.length) {
    spans.add(TextSpan(text: text.substring(cursor), style: base));
  }
  if (spans.isEmpty) {
    spans.add(TextSpan(text: text, style: base));
  }
  return spans;
}

class _FeedRichText extends StatelessWidget {
  const _FeedRichText({
    required this.text,
    required this.fontSize,
    this.weight = FontWeight.w800,
    this.height = 1.28,
    this.textAlign = TextAlign.start,
    this.color,
  });

  final String text;
  final double fontSize;
  final FontWeight weight;
  final double height;
  final TextAlign textAlign;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    return Text.rich(
      TextSpan(children: _accentSpans(text, look, size: fontSize, weight: weight, height: height, color: color)),
      textAlign: textAlign,
    );
  }
}

class _KindChip extends StatelessWidget {
  const _KindChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: look.seed.withValues(alpha: look.isDark ? 0.28 : 0.16),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: look.seed),
          const SizedBox(width: 6),
          Text(
            label.toUpperCase(),
            style: TextStyle(
              color: look.seed,
              fontSize: 11,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.1,
            ),
          ),
        ],
      ),
    );
  }
}

class _StudyTextCard extends StatelessWidget {
  const _StudyTextCard({
    required this.icon,
    required this.label,
    required this.child,
    this.showQuote = false,
    this.onLongPress,
  });

  final IconData icon;
  final String label;
  final Widget child;
  final bool showQuote;
  final VoidCallback? onLongPress;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    return GestureDetector(
      onLongPress: onLongPress,
      child: Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color.lerp(look.sheet, look.seed, look.isDark ? 0.22 : 0.10)!,
            look.sheet,
          ],
        ),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: look.seed.withValues(alpha: 0.32), width: 1.4),
        boxShadow: [
          BoxShadow(
            color: look.seed.withValues(alpha: look.isDark ? 0.22 : 0.12),
            blurRadius: 22,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(26),
        child: Stack(
          children: [
            Positioned(
              top: -18,
              right: 8,
              child: Icon(
                showQuote ? Icons.format_quote_rounded : Icons.auto_awesome,
                size: 92,
                color: look.seed.withValues(alpha: look.isDark ? 0.16 : 0.12),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _KindChip(icon: icon, label: label),
                  const SizedBox(height: 14),
                  child,
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

class FeedWorldLook {
  const FeedWorldLook({
    required this.isDark,
    required this.seed,
    required this.canvas,
    required this.ink,
    required this.muted,
    required this.glass,
    required this.glassStrong,
    required this.glassBorder,
    required this.sheet,
    required this.dropdown,
    required this.ctaBackground,
    required this.ctaForeground,
    required this.vignette,
    required this.floor,
  });

  final bool isDark;
  final Color seed;
  final Color canvas;
  final Color ink;
  final Color muted;
  final Color glass;
  final Color glassStrong;
  final Color glassBorder;
  final Color sheet;
  final Color dropdown;
  final Color ctaBackground;
  final Color ctaForeground;
  final Color vignette;
  final Color floor;

  factory FeedWorldLook.of(BuildContext context) {
    final theme = Theme.of(context);
    return FeedWorldLook.fromSeed(theme.colorScheme.primary, theme.brightness);
  }

  factory FeedWorldLook.fromSeed(Color seed, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    if (isDark) {
      final canvas = FeedWorld.canvasFor(brightness, seed);
      return FeedWorldLook(
        isDark: true,
        seed: seed,
        canvas: canvas,
        ink: Colors.white,
        muted: Color.lerp(const Color(0xFFB9B6C8), seed, 0.18)!,
        glass: seed.withValues(alpha: 0.20),
        glassStrong: seed.withValues(alpha: 0.32),
        glassBorder: Colors.white.withValues(alpha: 0.18),
        sheet: Color.lerp(const Color(0xFF14141E), seed, 0.16)!,
        dropdown: Color.lerp(const Color(0xFF161622), seed, 0.18)!,
        ctaBackground: seed,
        ctaForeground: Colors.white,
        vignette: const Color(0x99000000),
        floor: Color.lerp(const Color(0xFF050508), seed, 0.22)!,
      );
    }
    final canvas = FeedWorld.canvasFor(brightness, seed);
    return FeedWorldLook(
      isDark: false,
      seed: seed,
      canvas: canvas,
      ink: const Color(0xFF16141C),
      muted: Color.lerp(const Color(0xFF5C5668), seed, 0.12)!,
      glass: seed.withValues(alpha: 0.12),
      glassStrong: seed.withValues(alpha: 0.22),
      glassBorder: seed.withValues(alpha: 0.24),
      sheet: Color.lerp(Colors.white, seed, 0.05)!,
      dropdown: Color.lerp(Colors.white, seed, 0.05)!,
      ctaBackground: seed,
      ctaForeground: Colors.white,
      vignette: seed.withValues(alpha: 0.16),
      floor: canvas,
    );
  }
}

ThemeData _feedTheme(FeedWorldLook look) {
  final brightness = look.isDark ? Brightness.dark : Brightness.light;
  return ThemeData(
    brightness: brightness,
    useMaterial3: true,
    colorScheme: ColorScheme(
      brightness: brightness,
      primary: look.seed,
      onPrimary: look.ctaForeground,
      secondary: look.ink,
      onSecondary: look.canvas,
      error: const Color(0xFFB91C1C),
      onError: Colors.white,
      surface: look.canvas,
      onSurface: look.ink,
      onSurfaceVariant: look.muted,
    ),
    scaffoldBackgroundColor: look.canvas,
    chipTheme: ChipThemeData(
      backgroundColor: look.glass,
      selectedColor: look.glassStrong,
      labelStyle: TextStyle(color: look.ink, fontWeight: FontWeight.w700, fontSize: 12),
      side: BorderSide.none,
      shape: const StadiumBorder(),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: look.glass,
      hintStyle: TextStyle(color: look.muted),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide(color: look.ink.withValues(alpha: 0.35)),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: look.ctaBackground,
        foregroundColor: look.ctaForeground,
        shape: const StadiumBorder(),
      ),
    ),
  );
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
  final _pageController = PageController();

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  bool _needsInteractiveBackfill(List<FeedItem> items) {
    if (_kind != 'all') return false;
    final uncompletedKinds = items.where((item) => !item.progress.completed).map((item) => item.kind).toSet();
    return !uncompletedKinds.contains('quiz') ||
        !uncompletedKinds.contains('meme') ||
        !uncompletedKinds.contains('fill_blank') ||
        !uncompletedKinds.contains('true_false');
  }

  bool _kindSupportsGeneration(String kind) {
    return kind != 'all';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _pageController.dispose();
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
        _resetScroll();
        _maybeGenerateSparseKind();
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
      final additions = page.items.where((addition) => !_items.any((existing) => existing.id == addition.id)).toList();
      sortFeedItems(additions);
      setState(() {
        _items = [..._items, ...additions];
        _nextCursor = page.nextCursor;
        if (additions.isEmpty && page.nextCursor == null) {
          _exhausted = true;
        }
      });
    } catch (_) {
      // Keep state intact
    } finally {
      if (mounted) setState(() => _loadingMore = false);
    }
  }

  Future<void> _generateMore() async {
    if (_generating || _busy || !_hasReadyMaterials || !_kindSupportsGeneration(_kind) || _exhausted) return;
    setState(() => _generating = true);
    try {
      final created = await repository.generateMoreFeed(
        spaceId: _spaceId.isEmpty ? null : _spaceId,
        kind: _kind,
      );
      if (!mounted || created <= 0) return;
      final page = await repository.feedPage(
        spaceId: _spaceId.isEmpty ? null : _spaceId,
        kind: _kind,
      );
      if (!mounted) return;
      sortFeedItems(page.items);
      setState(() => _items = page.items);
    } catch (_) {
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  void _resetScroll() {
    if (_pageController.hasClients) {
      _pageController.jumpToPage(0);
    }
  }

  void _maybeGenerateSparseKind() {
    if (!_busy && _items.length < 3 && _hasReadyMaterials && _kindSupportsGeneration(_kind) && !_exhausted) {
      _generateMore();
    }
  }

  void _changeFilter({String? spaceId, String? kind}) {
    final nextSpace = spaceId ?? _spaceId;
    final nextKind = kind ?? _kind;
    if (nextSpace == _spaceId && nextKind == _kind) return;
    setState(() {
      if (spaceId != null) _spaceId = spaceId;
      if (kind != null) _kind = kind;
    });
    _load();
  }

  void _setCompletionFilter(String value) {
    if (_completionFilter == value) return;
    setState(() => _completionFilter = value);
    _resetScroll();
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
    final seed = Color(ref.watch(settingsProvider).colorTheme);
    final look = FeedWorldLook.fromSeed(seed, Theme.of(context).brightness);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: look.isDark ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark,
      child: Theme(
        data: _feedTheme(look),
        child: ColoredBox(
          color: look.canvas,
          child: Stack(
            fit: StackFit.expand,
            children: [
              Positioned.fill(child: _content(context)),
              Positioned(
                top: 0,
                left: 0,
                right: 0,
                child: _floatingHeader(context),
              ),
            ],
          ),
        ),
      ),
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
            const Icon(Icons.filter_alt_off_outlined, size: 42),
            const SizedBox(height: 10),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: () => _setCompletionFilter('all'),
              child: const Text('Show all cards'),
            ),
          ],
        ),
      );
    }
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          controller: _pageController,
          scrollDirection: Axis.vertical,
          pageSnapping: true,
          allowImplicitScrolling: true,
          physics: const PageScrollPhysics(),
          itemCount: filteredItems.length,
          onPageChanged: (index) {
            if (index >= filteredItems.length - 2) {
              if (_nextCursor != null) {
                _loadMore();
              } else {
                _generateMore();
              }
            }
          },
          itemBuilder: (context, index) => FeedCard(
            key: ValueKey(filteredItems[index].id),
            item: filteredItems[index],
            onProgress: _applyProgress,
          ),
        ),
        if (_loadingMore || _generating)
          Positioned(
            left: 0,
            right: 0,
            bottom: islandNavClearance(context) + 12,
            child: Center(
              child: Builder(
                builder: (context) {
                  final look = FeedWorldLook.of(context);
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: look.sheet.withValues(alpha: 0.92),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: look.glassBorder),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox.square(
                          dimension: 14,
                          child: CircularProgressIndicator(strokeWidth: 2, color: look.ink),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          _generating ? l10n.creatingNewCards : l10n.loadingMore,
                          style: TextStyle(color: look.ink, fontWeight: FontWeight.w600, fontSize: 12),
                        ),
                      ],
                    ),
                  );
                },
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

  Widget _floatingHeader(BuildContext context) {
    final look = FeedWorldLook.of(context);
    final l10n = AppLocalizations.of(context)!;
    final feedKinds = localizedFeedKinds(l10n);

    return Padding(
      padding: EdgeInsets.fromLTRB(12, MediaQuery.paddingOf(context).top + 6, 12, 0),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  if (_spaces.isNotEmpty) ...[
                    Container(
                      height: 36,
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                      decoration: BoxDecoration(
                        color: look.glass,
                        borderRadius: BorderRadius.circular(18),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<String>(
                          value: _spaceId,
                          isDense: true,
                          dropdownColor: look.dropdown,
                          icon: Icon(Icons.arrow_drop_down, size: 18, color: look.ink),
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 12,
                            color: look.ink,
                          ),
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
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(filter.label, style: const TextStyle(fontSize: 12)),
                      selected: _kind == filter.value,
                      onSelected: (_) => _changeFilter(kind: filter.value),
                      visualDensity: VisualDensity.compact,
                    ),
                  )),
                ],
              ),
            ),
          ),
          const SizedBox(width: 8),
          Material(
            color: look.glass,
            shape: const CircleBorder(),
            child: IconButton(
              key: CoachTourScope.targetKey(context, 'settings'),
              onPressed: () => context.push('/settings'),
              icon: Icon(Icons.settings_outlined, color: look.ink),
              tooltip: 'Settings',
              visualDensity: VisualDensity.compact,
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
  final ValueNotifier<Offset> _parallaxOffset = ValueNotifier(Offset.zero);
  StreamSubscription<AccelerometerEvent>? _accelerometerSubscription;
  String? _result;
  String? _explanation;
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
    _accelerometerSubscription = accelerometerEventStream(
      samplingPeriod: const Duration(milliseconds: 100),
    ).listen((event) {
      if (!mounted) return;
      _parallaxOffset.value = Offset(
        (-event.x / 9.81 * 10).clamp(-10.0, 10.0),
        (-event.y / 9.81 * 10).clamp(-10.0, 10.0),
      );
    });
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
    _explanation = null;
    _correct = false;
    _selectedOption = null;
    _correctOptionIndex = null;
    _selectedTrueFalse = null;

    if (item.kind == 'quiz') {
      _selectedOption = item.progress.quizSelectedIndex;
      _correctOptionIndex = item.progress.quizCorrectIndex;
      if (item.progress.completed) {
        if (item.progress.quizSelectedIndex != null && item.progress.quizCorrectIndex != null) {
          _correct = item.progress.quizSelectedIndex == item.progress.quizCorrectIndex;
        } else {
          _correct = (item.progress.lastScore ?? 0) >= 100;
        }
        _result = _attemptFeedbackMessage(
          correct: _correct,
        );
        _explanation = item.progress.explanation?.trim();
        if (_explanation != null && _explanation!.isEmpty) _explanation = null;
      }
      return;
    }

    if (item.kind == 'fill_blank') {
      if (item.progress.fillBlankSelectedAnswer != null) {
        _answerController.text = item.progress.fillBlankSelectedAnswer!;
      }
      if (item.progress.completed) {
        _correct = (item.progress.lastScore ?? 0) >= 100;
        _result = _attemptFeedbackMessage(
          correct: _correct,
          correctAnswer: item.progress.fillBlankCorrectAnswer,
          selectedAnswer: _correct ? null : item.progress.fillBlankSelectedAnswer,
        );
        _explanation = item.progress.explanation?.trim();
        if (_explanation != null && _explanation!.isEmpty) _explanation = null;
      }
      return;
    }

    if (item.kind == 'true_false') {
      _selectedTrueFalse = item.progress.trueFalseSelected;
      if (item.progress.completed) {
        if (item.progress.trueFalseSelected != null && item.progress.trueFalseCorrect != null) {
          _correct = item.progress.trueFalseSelected == item.progress.trueFalseCorrect;
        } else {
          _correct = (item.progress.lastScore ?? 0) >= 100;
        }
        final answerLabel = item.progress.trueFalseCorrect == null
            ? null
            : (item.progress.trueFalseCorrect! ? 'True' : 'False');
        _result = _attemptFeedbackMessage(
          correct: _correct,
          correctAnswer: answerLabel == null ? null : 'The statement is $answerLabel.',
        );
        _explanation = item.progress.explanation?.trim();
        if (_explanation != null && _explanation!.isEmpty) _explanation = null;
      }
      return;
    }
  }

  @override
  void dispose() {
    _accelerometerSubscription?.cancel();
    _parallaxOffset.dispose();
    _answerController.dispose();
    super.dispose();
  }

  Future<void> _markLearned() async {
    setState(() => _busy = true);
    try {
      await ProviderScope.containerOf(context, listen: false).read(studyRepositoryProvider).bridge.markFeedProgress(item.id);
      if (!mounted) return;
      setState(() {
        _result = null;
        _explanation = null;
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
      final correctAnswerRaw = result['correctAnswer'];
      final fillBlankCorrect = item.kind == 'fill_blank'
          ? '${result['correctAnswer'] ?? result['answer'] ?? ''}'.trim()
          : '';
      final trueFalseCorrect = item.kind == 'true_false' && correctAnswerRaw is bool
          ? correctAnswerRaw
          : null;
      setState(() {
        _correct = correct;
        _correctOptionIndex = correctIndex ?? _correctOptionIndex;
        _result = _attemptFeedbackMessage(
          correct: correct,
          correctAnswer: item.kind == 'fill_blank'
              ? (fillBlankCorrect.isEmpty ? null : fillBlankCorrect)
              : item.kind == 'true_false' && trueFalseCorrect != null
                  ? 'The statement is ${trueFalseCorrect ? 'True' : 'False'}.'
                  : null,
          selectedAnswer: item.kind == 'fill_blank' && !correct
              ? _answerController.text.trim()
              : null,
        );
        _explanation = explanation.isEmpty ? null : explanation;
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
          trueFalseCorrect: trueFalseCorrect,
          fillBlankSelectedAnswer: item.kind == 'fill_blank' ? selectedText : null,
          fillBlankCorrectAnswer: item.kind == 'fill_blank'
              ? (fillBlankCorrect.isEmpty ? null : fillBlankCorrect)
              : null,
          explanation: explanation.isEmpty ? null : explanation,
        ),
      );
      ProviderScope.containerOf(context, listen: false).read(gamificationProvider.notifier).refresh();
    } catch (error) {
      if (mounted) {
        setState(() {
          _correct = false;
          _result = '$error';
          _explanation = null;
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

  void _showExplanationSheet() {
    final explanation = _explanation;
    if (explanation == null || explanation.isEmpty) return;
    final look = FeedWorldLook.of(context);
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: look.sheet,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (context) => Theme(
        data: _feedTheme(look),
        child: Padding(
          padding: EdgeInsets.fromLTRB(24, 16, 24, 24 + MediaQuery.paddingOf(context).bottom),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: look.glassBorder,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Icon(
                    _correct ? Icons.lightbulb_outline : Icons.menu_book_outlined,
                    color: look.seed,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _correct ? 'Why this is right' : 'Why this is wrong',
                    style: TextStyle(
                      color: look.ink,
                      fontWeight: FontWeight.w800,
                      fontSize: 18,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              _FeedRichText(
                text: explanation,
                fontSize: 16,
                weight: FontWeight.w600,
                height: 1.45,
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Got it'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSourceDialog(BuildContext context) {
    final look = FeedWorldLook.of(context);
    showModalBottomSheet(
      context: context,
      backgroundColor: look.sheet,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (context) => Theme(
        data: _feedTheme(look),
        child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: look.glassBorder,
                  borderRadius: BorderRadius.circular(99),
                ),
              ),
            ),
            const SizedBox(height: 18),
            Text(
              'From your library',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                letterSpacing: 0.4,
                color: look.seed,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              item.title,
              style: TextStyle(color: look.ink, fontWeight: FontWeight.w800, fontSize: 18, height: 1.25),
            ),
            const SizedBox(height: 8),
            Text(
              item.studySpaceName,
              style: TextStyle(color: look.muted),
            ),
            const SizedBox(height: 16),
            Text(
              'This card was built from your materials in ${item.studySpaceName}.',
              style: TextStyle(color: look.muted, height: 1.45),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
        ),
      ),
    );
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
        );
      case 'did_you_know':
        final look = FeedWorldLook.of(context);
        final style = feedKindStyle(item.kind, isDark: look.isDark, seed: look.seed);
        final fact = _payloadString(payload, 'fact');
        return _StudyTextCard(
          icon: style.icon,
          label: 'Study tip',
          showQuote: true,
          onLongPress: () => _showSourceDialog(context),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FeedRichText(
                text: _payloadString(payload, 'headline') ?? item.title,
                fontSize: 24,
                height: 1.22,
              ),
              if (fact != null) ...[
                const SizedBox(height: 12),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: look.seed.withValues(alpha: look.isDark ? 0.16 : 0.08),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: _FeedRichText(
                    text: fact,
                    fontSize: 16,
                    weight: FontWeight.w600,
                    height: 1.45,
                  ),
                ),
              ],
              if (_payloadString(payload, 'concept') != null) ...[
                const SizedBox(height: 12),
                _Pill(text: _payloadString(payload, 'concept')!),
              ],
            ],
          ),
        );
      case 'meme':
        final captions = _memeCaptionLines(payload);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (captions.isEmpty)
              Text('This meme has no captions yet.', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.8)))
            else
              ...captions.map(
                (line) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Text(line, style: Theme.of(context).textTheme.titleMedium?.copyWith(height: 1.4)),
                ),
              ),
          ],
        );
      case 'true_false':
        return _prompt(context, _payloadString(payload, 'statement') ?? item.title);
      case 'quiz':
        return _prompt(context, _payloadString(payload, 'question') ?? item.title);
      case 'fill_blank':
        return _prompt(context, _payloadString(payload, 'prompt') ?? item.title);
      default:
        final fallback = _payloadString(payload, 'question') ?? _payloadString(payload, 'prompt') ?? _payloadString(payload, 'concept');
        return _prompt(context, fallback ?? item.title);
    }
  }

  Widget _prompt(BuildContext context, String text) {
    final look = FeedWorldLook.of(context);
    final style = feedKindStyle(item.kind, isDark: look.isDark, seed: look.seed);
    return _StudyTextCard(
      icon: style.icon,
      label: style.label,
      onLongPress: () => _showSourceDialog(context),
      child: _FeedRichText(text: text, fontSize: 22, height: 1.32),
    );
  }

  _OptionFeedbackState _feedbackForTrueFalse(bool value) {
    if (!_attemptLocked || item.kind != 'true_false') return _OptionFeedbackState.none;
    final selected = _selectedTrueFalse ?? item.progress.trueFalseSelected;
    final correctValue = item.progress.trueFalseCorrect;
    if (selected == null || correctValue == null) {
      return _OptionFeedbackState.none;
    }
    if (value == correctValue) return _OptionFeedbackState.correct;
    if (value == selected && selected != correctValue) return _OptionFeedbackState.wrong;
    return _OptionFeedbackState.none;
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

  Widget _buildStudyPanelContent(
    List<String> options, {
    required bool showCheck,
    required VoidCallback? onCheck,
  }) {
    final look = FeedWorldLook.of(context);
    final isInteractive = item.kind == 'quiz' || item.kind == 'true_false' || item.kind == 'fill_blank';

    Widget answers() {
      return Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          _body(context),
          if (item.kind == 'quiz' && options.isNotEmpty) ...[
            const SizedBox(height: 18),
            for (var i = 0; i < options.length; i++) ...[
              if (i > 0) const SizedBox(height: 10),
              _OptionTile(
                label: options[i],
                index: i,
                selected: _selectedOption == i,
                feedbackState: _feedbackForOption(i),
                onTap: (_busy || _attemptLocked) ? null : () => setState(() => _selectedOption = i),
              ),
            ],
          ],
          if (item.kind == 'true_false') ...[
            const SizedBox(height: 24),
            SizedBox(
              height: 128,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: _StudyPollButton(
                      label: 'True',
                      icon: Icons.check_rounded,
                      accent: const Color(0xFF047857),
                      selected: _selectedTrueFalse == true,
                      feedbackState: _feedbackForTrueFalse(true),
                      onPressed: (_busy || _attemptLocked) ? null : () => _submitTrueFalse(true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _StudyPollButton(
                      label: 'False',
                      icon: Icons.close_rounded,
                      accent: const Color(0xFFB45309),
                      selected: _selectedTrueFalse == false,
                      feedbackState: _feedbackForTrueFalse(false),
                      onPressed: (_busy || _attemptLocked) ? null : () => _submitTrueFalse(false),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (item.kind == 'fill_blank') ...[
            const SizedBox(height: 28),
            TextField(
              controller: _answerController,
              enabled: !_busy && !_attemptLocked,
              textAlign: TextAlign.center,
              style: TextStyle(color: look.ink, fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: 0.2),
              onSubmitted: (_busy || _attemptLocked) ? null : (_) => _submitAnswer(),
              decoration: InputDecoration(
                hintText: 'Type the missing word',
                hintStyle: TextStyle(color: look.muted, fontWeight: FontWeight.w600, fontSize: 16),
                filled: true,
                fillColor: look.sheet,
                contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(22),
                  borderSide: BorderSide(color: look.glassBorder),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(22),
                  borderSide: BorderSide(color: look.glassBorder),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(22),
                  borderSide: BorderSide(color: look.seed, width: 2),
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
        ],
      );
    }

    if (!isInteractive) {
      return Center(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: _body(context),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            child: answers(),
          ),
        ),
        if (_result != null) ...[
          _FeedbackBanner(
            correct: _correct,
            message: _result!,
            onExplain: _explanation != null && _explanation!.isNotEmpty ? _showExplanationSheet : null,
          ),
          const SizedBox(height: 10),
        ],
        if (showCheck)
          SizedBox(
            height: 48,
            width: double.infinity,
            child: FilledButton(
              onPressed: onCheck,
              child: const Text('Check answer', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    final style = feedKindStyle(item.kind, isDark: look.isDark, seed: look.seed);
    final options = item.payload['options'] is List
        ? (item.payload['options'] as List).map((value) => '$value').toList()
        : const <String>[];
    final needsCheckButton = (item.kind == 'quiz' || item.kind == 'fill_blank') && !_attemptLocked;
    final primaryAction = needsCheckButton
        ? (_busy ? null : _submitAnswer)
        : (item.progress.completed ? null : _markLearned);

    final chromeBottom = islandNavClearance(context) + _feedContentBottomExtra;

    return SizedBox.expand(
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [
                    style.gradient[0],
                    style.gradient[1],
                    look.floor,
                  ],
                  stops: const [0.0, 0.42, 1.0],
                ),
              ),
            ),
          ),
          Positioned.fill(
            child: ValueListenableBuilder<Offset>(
              valueListenable: _parallaxOffset,
              builder: (context, offset, child) => Transform.translate(
                offset: offset,
                child: Transform.scale(scale: 1.08, child: child),
              ),
              child: CustomPaint(
                painter: _FeedWorldPainter(accent: style.gradient[0], look: look),
              ),
            ),
          ),
          if (item.kind == 'meme' && item.meme != null && item.meme!.imageUrl.isNotEmpty)
            Positioned.fill(child: _MemeImage(meme: item.meme!))
          else
            Positioned.fill(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  16,
                  MediaQuery.paddingOf(context).top + _feedContentTopInset,
                  16,
                  chromeBottom,
                ),
                child: item.kind == 'flashcard'
                    ? _FlashCard(
                        front: _payloadString(item.payload, 'front') ?? item.title,
                        back: _payloadString(item.payload, 'back') ?? 'This card has no answer yet.',
                        flipped: _showFlashcardBack,
                        onFlip: () => setState(() => _showFlashcardBack = !_showFlashcardBack),
                      )
                    : _buildStudyPanelContent(
                        options,
                        showCheck: needsCheckButton,
                        onCheck: primaryAction,
                      ),
              ),
            ),
          if (item.kind != 'meme')
            Positioned(
              right: 16,
              bottom: aboveIslandNav(context),
              child: _TikTokActionButton(
                icon: item.progress.completed ? Icons.favorite : Icons.favorite_border,
                activeIconColor: const Color(0xFFFF4D6D),
                label: item.progress.completed ? 'Learned' : 'Learn',
                onTap: item.progress.completed ? null : _markLearned,
                busy: _busy,
              ),
            ),
        ],
      ),
    );
  }
}

class _TikTokActionButton extends StatelessWidget {
  const _TikTokActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.activeIconColor,
    this.busy = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final Color? activeIconColor;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    final color = activeIconColor ?? look.ink;

    const size = LsLayout.coachMascotSize;

    return GestureDetector(
      onTap: busy ? null : onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              color: look.glassStrong,
              shape: BoxShape.circle,
            ),
            child: busy
                ? Center(child: SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: color)))
                : Icon(icon, color: color, size: 28),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: look.ink,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedWorldPainter extends CustomPainter {
  _FeedWorldPainter({required this.accent, required this.look});

  final Color accent;
  final FeedWorldLook look;

  @override
  void paint(Canvas canvas, Size size) {
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [accent.withValues(alpha: look.isDark ? 0.38 : 0.55), accent.withValues(alpha: 0)],
      ).createShader(Rect.fromCircle(center: Offset(size.width * 0.18, size.height * 0.22), radius: size.width * 0.9));
    canvas.drawCircle(Offset(size.width * 0.18, size.height * 0.22), size.width * 0.9, glow);

    final secondary = look.isDark ? const Color(0xFF7C5CFF) : const Color(0xFFFFB38A);
    final glow2 = Paint()
      ..shader = RadialGradient(
        colors: [secondary.withValues(alpha: look.isDark ? 0.18 : 0.28), secondary.withValues(alpha: 0)],
      ).createShader(Rect.fromCircle(center: Offset(size.width * 0.92, size.height * 0.78), radius: size.width * 0.7));
    canvas.drawCircle(Offset(size.width * 0.92, size.height * 0.78), size.width * 0.7, glow2);

    final vignette = Paint()
      ..shader = RadialGradient(
        colors: [const Color(0x00000000), look.vignette],
        stops: const [0.45, 1],
      ).createShader(Offset.zero & size);
    canvas.drawRect(Offset.zero & size, vignette);
  }

  @override
  bool shouldRepaint(covariant _FeedWorldPainter oldDelegate) =>
      oldDelegate.accent != accent || oldDelegate.look.isDark != look.isDark;
}

typedef FeedKindStyle = ({IconData icon, String label, List<Color> gradient});

FeedKindStyle feedKindStyle(String kind, {required bool isDark, required Color seed}) {
  List<Color> wash(Color hue) {
    if (isDark) {
      return [
        Color.lerp(Color.lerp(hue, seed, 0.5)!, const Color(0xFF0A0A14), 0.22)!,
        Color.lerp(const Color(0xFF07070F), seed, 0.24)!,
      ];
    }
    return [
      Color.lerp(Color.lerp(hue, seed, 0.42)!, Colors.white, 0.32)!,
      Color.lerp(const Color(0xFFF6F2EC), seed, 0.16)!,
    ];
  }

  switch (kind) {
    case 'meme':
      return (icon: Icons.emoji_emotions_outlined, label: 'Meme', gradient: wash(const Color(0xFFC084FC)));
    case 'quiz':
      return (icon: Icons.quiz_outlined, label: 'Quiz', gradient: wash(const Color(0xFF818CF8)));
    case 'flashcard':
      return (icon: Icons.style_outlined, label: 'Flashcard', gradient: wash(const Color(0xFF67E8F9)));
    case 'fill_blank':
      return (icon: Icons.edit_note_outlined, label: 'Fill in the blank', gradient: wash(const Color(0xFF86EFAC)));
    case 'true_false':
      return (icon: Icons.rule_outlined, label: 'True or false', gradient: wash(const Color(0xFFF9A8D4)));
    case 'did_you_know':
      return (icon: Icons.lightbulb_outline, label: 'Did you know', gradient: wash(const Color(0xFFFCD34D)));
    default:
      return (icon: Icons.auto_awesome_outlined, label: kind.replaceAll('_', ' '), gradient: wash(seed));
  }
}

class _FlashCard extends StatelessWidget {
  const _FlashCard({
    required this.front,
    required this.back,
    required this.flipped,
    required this.onFlip,
  });

  final String front;
  final String back;
  final bool flipped;
  final VoidCallback onFlip;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);

    return Stack(
      fit: StackFit.expand,
      children: [
        Transform.rotate(
          angle: 0.03,
          child: Container(
            margin: const EdgeInsets.fromLTRB(8, 24, 0, 16),
            decoration: BoxDecoration(
              color: look.glass,
              borderRadius: BorderRadius.circular(36),
              border: Border.all(color: look.glassBorder),
            ),
          ),
        ),
        GestureDetector(
          onTap: onFlip,
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(end: flipped ? 1 : 0),
            duration: const Duration(milliseconds: 520),
            curve: Curves.easeInOutCubic,
            builder: (context, value, child) {
              final showBack = value > 0.5;
              return Transform(
                alignment: Alignment.center,
                transform: Matrix4.identity()
                  ..setEntry(3, 2, 0.0012)
                  ..rotateY(value * math.pi),
                child: Transform(
                  alignment: Alignment.center,
                  transform: showBack ? (Matrix4.identity()..rotateY(math.pi)) : Matrix4.identity(),
                  child: _face(
                    context,
                    label: showBack ? 'Answer' : 'Term',
                    text: showBack ? back : front,
                    hint: showBack ? 'Tap to see the term' : 'Tap to flip',
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _face(
    BuildContext context, {
    required String label,
    required String text,
    required String hint,
  }) {
    final look = FeedWorldLook.of(context);
    return Container(
      decoration: BoxDecoration(
        color: Color.lerp(look.sheet, look.seed, look.isDark ? 0.16 : 0.08),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: look.seed.withValues(alpha: 0.28), width: 1.4),
        boxShadow: [
          BoxShadow(
            color: look.seed.withValues(alpha: look.isDark ? 0.22 : 0.14),
            blurRadius: 28,
            offset: const Offset(0, 16),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 22),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: look.seed.withValues(alpha: look.isDark ? 0.24 : 0.14),
                borderRadius: BorderRadius.circular(99),
              ),
              child: Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: look.seed,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.8,
                ),
              ),
            ),
            Expanded(
              child: Center(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: label == 'Term'
                        ? Text(
                            text,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: look.seed,
                              fontWeight: FontWeight.w800,
                              fontSize: 36,
                              height: 1.2,
                              letterSpacing: -0.8,
                            ),
                          )
                        : _FeedRichText(
                            text: text,
                            fontSize: 32,
                            height: 1.22,
                            textAlign: TextAlign.center,
                          ),
                  ),
                ),
              ),
            ),
            Text(
              hint,
              style: TextStyle(
                color: look.seed.withValues(alpha: 0.72),
                fontSize: 13,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: theme.colorScheme.primary.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.3), width: 0.5),
        ),
        child: Text(
          text,
          style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w700, fontSize: 12),
        ),
      ),
    );
  }
}

class _FeedbackBanner extends StatelessWidget {
  const _FeedbackBanner({
    required this.correct,
    required this.message,
    this.onExplain,
  });

  final bool correct;
  final String message;
  final VoidCallback? onExplain;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    final isDark = look.isDark;
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
      padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: border, width: 0.5),
      ),
      child: Row(
        children: [
          Icon(
            correct ? Icons.check_circle_outline : Icons.info_outline,
            color: iconColor,
            size: 18,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: foreground,
                height: 1.3,
                fontWeight: FontWeight.w700,
                fontSize: 13,
              ),
            ),
          ),
          if (onExplain != null)
            TextButton(
              onPressed: onExplain,
              style: TextButton.styleFrom(
                foregroundColor: foreground,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: const Text('Explain', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
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
    this.selected = false,
    this.feedbackState = _OptionFeedbackState.none,
  });

  final String label;
  final IconData icon;
  final Color accent;
  final VoidCallback? onPressed;
  final bool selected;
  final _OptionFeedbackState feedbackState;

  @override
  Widget build(BuildContext context) {
    final look = FeedWorldLook.of(context);
    final isCorrect = feedbackState == _OptionFeedbackState.correct;
    final isWrong = feedbackState == _OptionFeedbackState.wrong;
    final background = isCorrect
        ? (look.isDark ? const Color(0xFF064E3B) : const Color(0xFFE8F0EA))
        : isWrong
            ? (look.isDark ? const Color(0xFF450A0A) : const Color(0xFFFEE2E2))
            : selected
                ? Color.lerp(look.sheet, look.seed, look.isDark ? 0.28 : 0.14)!
                : look.sheet;
    final border = isCorrect
        ? (look.isDark ? const Color(0xFF34D399) : const Color(0xFF047857))
        : isWrong
            ? (look.isDark ? const Color(0xFFF87171) : const Color(0xFFB91C1C))
            : look.glassBorder;
    final labelColor = isCorrect
        ? (look.isDark ? const Color(0xFFD1FAE5) : const Color(0xFF14532D))
        : isWrong
            ? (look.isDark ? const Color(0xFFFECACA) : const Color(0xFF991B1B))
            : look.ink;

    return Material(
      color: background,
      borderRadius: BorderRadius.circular(28),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(28),
        child: SizedBox.expand(
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 8),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: border, width: (isCorrect || isWrong || selected) ? 2 : 1),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isCorrect
                    ? Icons.check_circle
                    : isWrong
                        ? Icons.cancel
                        : icon,
                color: labelColor,
                size: 30,
              ),
              const SizedBox(height: 10),
              Text(
                label,
                style: TextStyle(
                  color: selected && !isCorrect && !isWrong ? look.seed : labelColor,
                  fontWeight: FontWeight.w800,
                  fontSize: 22,
                  letterSpacing: -0.3,
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

class _OptionTile extends StatelessWidget {
  const _OptionTile({
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
    final look = FeedWorldLook.of(context);
    final isCorrect = feedbackState == _OptionFeedbackState.correct;
    final isWrong = feedbackState == _OptionFeedbackState.wrong;
    final accent = isCorrect
        ? (look.isDark ? const Color(0xFF34D399) : const Color(0xFF047857))
        : isWrong
            ? (look.isDark ? const Color(0xFFF87171) : const Color(0xFFB91C1C))
            : selected
                ? look.seed
                : look.ink;
    final background = isCorrect
        ? (look.isDark ? const Color(0xFF064E3B) : const Color(0xFFE8F0EA))
        : isWrong
            ? (look.isDark ? const Color(0xFF450A0A) : const Color(0xFFFEE2E2))
            : selected
                ? Color.lerp(look.sheet, look.seed, look.isDark ? 0.28 : 0.12)!
                : look.sheet;
    final labelColor = isCorrect
        ? (look.isDark ? const Color(0xFFD1FAE5) : const Color(0xFF14532D))
        : isWrong
            ? (look.isDark ? const Color(0xFFFECACA) : const Color(0xFF991B1B))
            : look.ink;

    return Material(
      color: background,
      elevation: selected || isCorrect || isWrong ? 0 : 1,
      shadowColor: look.ink.withValues(alpha: 0.12),
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(minHeight: 58),
          padding: const EdgeInsets.fromLTRB(12, 12, 14, 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isCorrect || isWrong
                  ? accent
                  : selected
                      ? look.seed
                      : look.glassBorder,
              width: selected || isCorrect || isWrong ? 2 : 1,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Container(
                width: 34,
                height: 34,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: selected || isCorrect || isWrong
                      ? accent.withValues(alpha: 0.16)
                      : look.glass,
                ),
                child: Text(
                  String.fromCharCode(65 + index),
                  style: TextStyle(
                    color: accent,
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _FeedRichText(
                  text: label,
                  fontSize: 16,
                  weight: FontWeight.w700,
                  height: 1.35,
                  color: (isCorrect || isWrong) ? labelColor : null,
                ),
              ),
              if (isCorrect) Icon(Icons.check_circle, color: accent, size: 20),
              if (isWrong) Icon(Icons.cancel, color: accent, size: 20),
              if (!isCorrect && !isWrong && selected) Icon(Icons.check_circle, color: look.seed, size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

enum _OptionFeedbackState { none, correct, wrong }

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
        final srcW = meme.width <= 0 ? 1.0 : meme.width;
        final srcH = meme.height <= 0 ? 1.0 : meme.height;
        final scale = math.min(constraints.maxWidth / srcW, constraints.maxHeight / srcH);
        final width = srcW * scale;
        final height = srcH * scale;
        return Center(
          child: SizedBox(
            width: width,
            height: height,
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
              Icon(Icons.nights_stay_outlined, size: 56, color: Theme.of(context).colorScheme.onSurfaceVariant),
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
              Icon(Icons.filter_alt_outlined, size: 56, color: Theme.of(context).colorScheme.onSurfaceVariant),
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
              Icon(Icons.hourglass_empty, size: 56, color: Theme.of(context).colorScheme.onSurfaceVariant),
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
            Icon(Icons.auto_awesome_outlined, size: 56, color: Theme.of(context).colorScheme.onSurfaceVariant),
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
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.nights_stay_outlined, size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
              const SizedBox(height: 12),
              Text(message, textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.onSurface, height: 1.4)),
              const SizedBox(height: 16),
              FilledButton(onPressed: onRetry, child: const Text('Try again')),
            ],
          ),
        ),
      );
}
