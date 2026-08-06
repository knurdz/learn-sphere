import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../gamification_models.dart';
import '../../gamification_provider.dart';
import '../../l10n/app_localizations.dart';
import '../../settings_provider.dart';
import '../coach_tour_scope.dart';
import 'coach_bubble.dart';
import 'coach_character.dart';

/// Floating coach mascot + speech bubble on main shell routes.
class CoachOverlay extends ConsumerStatefulWidget {
  const CoachOverlay({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<CoachOverlay> createState() => _CoachOverlayState();
}

class _CoachOverlayState extends ConsumerState<CoachOverlay> {
  bool _bubbleOpen = false;
  bool _tourBusy = false;
  /// Hides tour scrim + auto-open panel until the user taps Sphere again.
  bool _tourUiDismissed = false;

  final ValueNotifier<Offset> _mascotPosition = ValueNotifier(Offset.zero);

  @override
  void dispose() {
    _mascotPosition.dispose();
    super.dispose();
  }

  void _closeMessagePanel({required bool tourActive}) {
    setState(() {
      _bubbleOpen = false;
      if (tourActive) _tourUiDismissed = true;
    });
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final pending = ref.read(gamificationProvider).valueOrNull?.pendingTourSteps ?? const [];
      if (pending.isNotEmpty && mounted) {
        setState(() {
          _bubbleOpen = true;
          _tourUiDismissed = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(gamificationProvider, (previous, next) {
      final prevStreak = previous?.valueOrNull?.currentStreak;
      final nextStreak = next.valueOrNull?.currentStreak;
      if (prevStreak != null && nextStreak != null && nextStreak > prevStreak) {
        setState(() => _bubbleOpen = true);
      }

      final pending = next.valueOrNull?.pendingTourSteps ?? const [];
      final prevPending = previous?.valueOrNull?.pendingTourSteps ?? const [];
      if (pending.isNotEmpty &&
          mounted &&
          (prevPending.isEmpty || pending.first != prevPending.first)) {
        setState(() {
          _bubbleOpen = true;
          _tourUiDismissed = false;
        });
      }
      if (pending.isEmpty && prevPending.isNotEmpty && mounted) {
        setState(() {
          _tourUiDismissed = false;
          _bubbleOpen = false;
        });
      }
    });

    final showCoachMascot = ref.watch(settingsProvider.select((s) => s.showCoachMascot));
    if (!showCoachMascot) {
      return widget.child;
    }

    final summary = ref.watch(gamificationProvider).valueOrNull;
    final message = summary?.coachMessage;
    final pendingTour = summary?.pendingTourSteps ?? const [];
    final tourStep = pendingTour.isNotEmpty ? pendingTour.first : null;
    final tourActive = tourStep != null;
    final showTourScrim = tourActive && !_tourUiDismissed;
    final showPanel = message != null && _bubbleOpen;
    final l10n = AppLocalizations.of(context)!;
    final tourKeys = CoachTourScope.maybeOf(context);

    final media = MediaQuery.of(context);

    return Stack(
      clipBehavior: Clip.none,
      children: [
        widget.child,
        // Self-contained: drag updates a ValueNotifier only — no parent setState.
        _FloatingMascotLayer(
          positionListenable: _mascotPosition,
          onTap: () {
            setState(() {
              if (tourActive) {
                _bubbleOpen = true;
                _tourUiDismissed = false;
              } else {
                _bubbleOpen = !_bubbleOpen;
              }
            });
          },
        ),
        if (showTourScrim && tourKeys != null)
          Positioned.fill(child: CoachTourOverlay(keys: tourKeys)),
        if (showPanel)
          ValueListenableBuilder<Offset>(
            valueListenable: _mascotPosition,
            builder: (context, pos, _) {
              final screen = media.size;
              const mascotSize = _FloatingMascotLayer.mascotSize;
              final effectivePos = pos == Offset.zero
                  ? _FloatingMascotLayerState.defaultPosition(screen, media.padding)
                  : pos;
              const gap = 12.0;
              final mascotOnRight = effectivePos.dx > screen.width * 0.5;

              return Positioned(
                top: effectivePos.dy,
                left: mascotOnRight ? 16 : effectivePos.dx + mascotSize + gap,
                right: mascotOnRight ? screen.width - effectivePos.dx + gap : 16,
                child: CoachBubble(
                  message: message,
                  compact: true,
                  onDismiss: () => _closeMessagePanel(tourActive: tourActive),
                  primaryActionLabel: tourActive
                      ? (tourStep == 'welcome' ? 'Start tour' : 'Next')
                      : null,
                  onPrimaryAction: tourActive ? () => _advanceTour(tourStep) : null,
                  primaryActionBusy: _tourBusy,
                  secondaryActionLabel: tourActive ? l10n.coachSkipTour : null,
                  onSecondaryAction: tourActive ? _skipTour : null,
                  secondaryActionBusy: _tourBusy,
                ),
              );
            },
          ),
      ],
    );
  }

  Future<void> _skipTour() async {
    if (_tourBusy) return;
    // Dismiss immediately and optimistically — don't leave the scrim up
    // waiting on the network. Any error surfaces via a SnackBar, but the
    // overlay itself is gone the instant the user taps Skip.
    setState(() {
      _tourBusy = true;
      _bubbleOpen = false;
      _tourUiDismissed = true;
    });
    try {
      await ref.read(gamificationProvider.notifier).skipCoachTour();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save that you skipped the tour.\n$error')),
        );
      }
    } finally {
      if (mounted) setState(() => _tourBusy = false);
    }
  }

  Future<void> _advanceTour(String stepId) async {
    if (_tourBusy) return;
    setState(() {
      _tourBusy = true;
      _bubbleOpen = true;
      _tourUiDismissed = false;
    });
    // Navigate immediately so the next spotlight target is on screen while we save.
    _navigateAfterTourStep(stepId);
    try {
      await ref.read(gamificationProvider.notifier).completeTourStep(stepId);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not save tour progress.\n$error')),
        );
      }
    } finally {
      if (mounted) setState(() => _tourBusy = false);
    }
  }

  void _navigateAfterTourStep(String completedStep) {
    final next = _nextTourStepAfter(completedStep);
    if (next == null) {
      setState(() => _bubbleOpen = false);
      return;
    }
    switch (next) {
      case 'feed':
        context.go('/feed');
      case 'learn_tab':
      case 'learn_live':
        context.go('/learn?tab=live');
      case 'learn_tools':
        context.go('/learn?tab=tools');
      case 'library':
        context.go('/library');
      case 'settings':
        break;
      default:
        break;
    }
  }

  String? _nextTourStepAfter(String step) {
    final index = coachTourStepOrder.indexOf(step);
    if (index < 0 || index + 1 >= coachTourStepOrder.length) return null;
    return coachTourStepOrder[index + 1];
  }
}

class _FloatingMascotLayer extends StatefulWidget {
  const _FloatingMascotLayer({
    required this.positionListenable,
    required this.onTap,
  });

  static const double mascotSize = 68;

  final ValueNotifier<Offset> positionListenable;
  final VoidCallback onTap;

  @override
  State<_FloatingMascotLayer> createState() => _FloatingMascotLayerState();
}

class _FloatingMascotLayerState extends State<_FloatingMascotLayer> {
  static const double _size = _FloatingMascotLayer.mascotSize;

  ValueNotifier<Offset> get _position => widget.positionListenable;
  final ValueNotifier<bool> _engaged = ValueNotifier<bool>(false);
  bool _positionReady = false;

  static Offset defaultPosition(Size screen, EdgeInsets padding) {
    final bottomInset = padding.bottom + kBottomNavigationBarHeight + 12;
    final topInset = padding.top + 8;
    final maxLeft = screen.width - _size - 8;
    final maxTop = screen.height - bottomInset - _size - 8;
    return Offset((maxLeft - 12).clamp(8.0, maxLeft), (maxTop - 100).clamp(topInset, maxTop));
  }

  int? _activePointer;
  Offset _dragOrigin = Offset.zero;
  Offset _startPosition = Offset.zero;
  bool _dragMoved = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _positionReady) return;
      _positionReady = true;
      _position.value = defaultPosition(MediaQuery.sizeOf(context), MediaQuery.paddingOf(context));
    });
  }

  @override
  void dispose() {
    _engaged.dispose();
    super.dispose();
  }

  Offset _clamp(Offset next, Size screen) {
    final padding = MediaQuery.paddingOf(context);
    final bottomInset = padding.bottom + kBottomNavigationBarHeight + 12;
    final topInset = padding.top + 8;
    final maxLeft = screen.width - _size - 8;
    final maxTop = screen.height - bottomInset - _size - 8;
    return Offset(next.dx.clamp(8.0, maxLeft), next.dy.clamp(topInset, maxTop));
  }

  void _onPointerDown(PointerDownEvent event, Size screen) {
    if (_activePointer != null) return;
    if (!_positionReady) {
      _positionReady = true;
      _position.value = defaultPosition(screen, MediaQuery.paddingOf(context));
    }
    _activePointer = event.pointer;
    _dragMoved = false;
    _dragOrigin = event.position;
    _startPosition = _position.value;
    _engaged.value = true;
  }

  void _onPointerMove(PointerMoveEvent event, Size screen) {
    if (event.pointer != _activePointer) return;
    final delta = event.position - _dragOrigin;
    if (delta.distance > 6) _dragMoved = true;
    _position.value = _clamp(_startPosition + delta, screen);
  }

  void _onPointerEnd(PointerEvent event) {
    if (event.pointer != _activePointer) return;
    _activePointer = null;
    _engaged.value = false;
    if (!_dragMoved) widget.onTap();
    _dragMoved = false;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;
    final screen = MediaQuery.sizeOf(context);

    return Positioned.fill(
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          ValueListenableBuilder<Offset>(
            valueListenable: _position,
            builder: (context, pos, child) {
              return Positioned(
                left: 0,
                top: 0,
                child: Transform.translate(
                  offset: _positionReady
                      ? pos
                      : defaultPosition(screen, MediaQuery.paddingOf(context)),
                  child: child,
                ),
              );
            },
            child: Listener(
              behavior: HitTestBehavior.opaque,
              onPointerDown: (e) => _onPointerDown(e, screen),
              onPointerMove: (e) => _onPointerMove(e, screen),
              onPointerUp: _onPointerEnd,
              onPointerCancel: _onPointerEnd,
              child: ValueListenableBuilder<bool>(
                valueListenable: _engaged,
                builder: (context, engaged, child) {
                  return Transform.scale(
                    scale: engaged ? 1.06 : 1,
                    filterQuality: FilterQuality.low,
                    child: Container(
                      width: _size,
                      height: _size,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: theme.colorScheme.surface,
                        border: Border.all(
                          color: engaged ? primary : primary.withValues(alpha: 0.25),
                          width: engaged ? 3 : 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: engaged ? 0.2 : 0.12),
                            blurRadius: engaged ? 14 : 8,
                            offset: const Offset(0, 4),
                          ),
                          if (engaged)
                            BoxShadow(
                              color: primary.withValues(alpha: 0.4),
                              blurRadius: 14,
                              spreadRadius: 1,
                            ),
                        ],
                      ),
                      child: child,
                    ),
                  );
                },
                child: const RepaintBoundary(
                  child: Padding(
                    padding: EdgeInsets.all(6),
                    child: CoachCharacter(size: 56),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Registers [GlobalKey]s for spotlight tour targets.
class CoachTourKeys {
  CoachTourKeys();

  final navFeedKey = GlobalKey();
  final navLearnKey = GlobalKey();
  final navLibraryKey = GlobalKey();
  final settingsKey = GlobalKey();
  final learnLiveKey = GlobalKey();
  final learnToolsKey = GlobalKey();
  final libraryFabKey = GlobalKey();

  GlobalKey? keyForStep(String step) {
    return switch (step) {
      'feed' => navFeedKey,
      'learn_tab' => navLearnKey,
      'learn_live' => learnLiveKey,
      'learn_tools' => learnToolsKey,
      'library' => navLibraryKey,
      'settings' => settingsKey,
      _ => null,
    };
  }
}

/// Dimmed scrim + highlight ring during the feature tour (copy/actions live in [CoachOverlay]).
class CoachTourOverlay extends ConsumerWidget {
  const CoachTourOverlay({super.key, required this.keys});

  final CoachTourKeys keys;

  Rect? _targetRect(GlobalKey? key) {
    if (key == null) return null;
    final box = key.currentContext?.findRenderObject() as RenderBox?;
    if (box == null || !box.hasSize) return null;
    final offset = box.localToGlobal(Offset.zero);
    return offset & box.size;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(gamificationProvider).valueOrNull;
    final pending = summary?.pendingTourSteps ?? const [];
    if (pending.isEmpty) return const SizedBox.shrink();

    final step = pending.first;
    final highlight = _targetRect(keys.keyForStep(step));
    final theme = Theme.of(context);

    return Stack(
      children: [
        ModalBarrier(
          dismissible: false,
          color: Colors.black.withValues(alpha: 0.45),
        ),
        if (highlight != null)
          Positioned(
            left: highlight.left,
            top: highlight.top,
            width: highlight.width,
            height: highlight.height,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: theme.colorScheme.primary, width: 3),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
