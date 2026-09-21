import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api_client.dart';
import 'auth_controller.dart';
import 'gamification_provider.dart';
import 'settings_provider.dart';

/// Max seconds accepted by one POST (API / RPC cap). Capture itself is uncapped.
const maxForegroundDeltaSeconds = 14400;

/// Compact label for lifetime foreground time. [totalSeconds] under 60 shows as `Xs`.
String formatForegroundMinutes(int totalSeconds) {
  if (totalSeconds < 60) return '${totalSeconds}s';
  final totalMinutes = totalSeconds ~/ 60;
  if (totalMinutes < 60) return '${totalMinutes}m';
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;
  if (minutes == 0) return '${hours}h';
  return '${hours}h ${minutes}m';
}

int clampForegroundDeltaSeconds(int delta) {
  if (delta < 1) return 0;
  if (delta > maxForegroundDeltaSeconds) return maxForegroundDeltaSeconds;
  return delta;
}

final appUsageProvider = NotifierProvider<AppUsageNotifier, int>(AppUsageNotifier.new);

/// Lifetime foreground seconds. Live tick is local-only; network only on pause / sign-out.
class AppUsageNotifier extends Notifier<int> {
  DateTime? _foregroundSince;
  String? _userId;
  int _serverSeconds = 0;
  int _pendingSeconds = 0;
  bool _flushing = false;
  Timer? _tickTimer;

  SharedPreferences get _prefs => ref.read(sharedPreferencesProvider);

  @override
  int build() {
    ref.onDispose(() {
      _tickTimer?.cancel();
      _tickTimer = null;
      _captureElapsedToPrefsOnDispose();
    });

    ref.listen(authControllerProvider, (previous, next) {
      unawaited(_onAuthChanged(next.valueOrNull?.user.id));
    });
    ref.listen(gamificationProvider, (previous, next) {
      final seconds = next.valueOrNull?.foregroundSeconds;
      if (seconds != null) _syncFromServer(seconds);
    });

    final userId = ref.read(authControllerProvider).valueOrNull?.user.id;
    _userId = userId;
    if (userId != null) {
      _serverSeconds = _prefs.getInt(_secondsKey(userId)) ?? 0;
      _pendingSeconds = _prefs.getInt(_pendingKey(userId)) ?? 0;
      _recoverKilledSession(userId);
      final summarySeconds = ref.read(gamificationProvider).valueOrNull?.foregroundSeconds;
      if (summarySeconds != null && summarySeconds > _serverSeconds) {
        _serverSeconds = summarySeconds;
      }
      unawaited(_beginForegroundSession());
      unawaited(_flushPending());
    }
    return _totalSeconds();
  }

  int _elapsedLiveSeconds() {
    final started = _foregroundSince;
    if (started == null) return 0;
    final delta = DateTime.now().difference(started).inSeconds;
    return delta < 0 ? 0 : delta;
  }

  int _totalSeconds() => _serverSeconds + _pendingSeconds + _elapsedLiveSeconds();

  void handleLifecycle(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_onResumed());
      return;
    }
    if (state == AppLifecycleState.inactive) return;
    unawaited(_onBackgrounded());
  }

  Future<void> _onResumed() async {
    if (_userId == null) return;
    if (_foregroundSince == null) {
      await _beginForegroundSession();
    } else {
      _restartTickTimer();
    }
    unawaited(_flushPending());
  }

  Future<void> _onBackgrounded() async {
    _stopTickTimer();
    _captureElapsed();
    await _flushPending();
  }

  Future<void> _beginForegroundSession() async {
    final userId = _userId;
    if (userId == null) return;
    final now = DateTime.now();
    _foregroundSince = now;
    final ms = now.millisecondsSinceEpoch;
    await _prefs.setInt(_sessionStartKey(userId), ms);
    await _prefs.setInt(_lastAliveKey(userId), ms);
    _restartTickTimer();
    state = _totalSeconds();
  }

  void _captureElapsed() {
    final userId = _userId;
    final started = _foregroundSince;
    _foregroundSince = null;
    if (started == null || userId == null) return;
    final delta = DateTime.now().difference(started).inSeconds;
    if (delta >= 1) {
      _pendingSeconds += delta;
    }
    unawaited(_clearSessionMarkers(userId));
    _persist();
    state = _totalSeconds();
  }

  /// Capture into pending and clear session markers so recover does not double-count.
  void _captureElapsedToPrefsOnDispose() {
    final userId = _userId;
    final started = _foregroundSince;
    _foregroundSince = null;
    if (started == null || userId == null) return;
    final delta = DateTime.now().difference(started).inSeconds;
    if (delta >= 1) {
      _pendingSeconds += delta;
    }
    unawaited(_prefs.setInt(_secondsKey(userId), _serverSeconds));
    unawaited(_prefs.setInt(_pendingKey(userId), _pendingSeconds));
    unawaited(_clearSessionMarkers(userId));
  }

  void _recoverKilledSession(String userId) {
    final startMs = _prefs.getInt(_sessionStartKey(userId));
    final lastAliveMs = _prefs.getInt(_lastAliveKey(userId));
    if (startMs != null && lastAliveMs != null && lastAliveMs > startMs) {
      final seconds = (lastAliveMs - startMs) ~/ 1000;
      if (seconds > 0) {
        _pendingSeconds += seconds;
      }
    }
    unawaited(_clearSessionMarkers(userId));
    _persist();
  }

  Future<void> _clearSessionMarkers(String userId) async {
    await _prefs.remove(_sessionStartKey(userId));
    await _prefs.remove(_lastAliveKey(userId));
  }

  void _stopTickTimer() {
    _tickTimer?.cancel();
    _tickTimer = null;
  }

  void _restartTickTimer() {
    _stopTickTimer();
    if (_userId == null || _foregroundSince == null) return;
    _scheduleNextTick();
  }

  void _scheduleNextTick() {
    _tickTimer?.cancel();
    if (_userId == null || _foregroundSince == null) return;

    final total = _totalSeconds();
    // Local only: 1s while label is Xs, then once per minute. Never POSTs.
    final delay = total < 60
        ? const Duration(seconds: 1)
        : Duration(seconds: (60 - (total % 60)).clamp(1, 60));

    _tickTimer = Timer(delay, () {
      if (_userId == null || _foregroundSince == null) return;
      final next = _totalSeconds();
      final prevLabel = formatForegroundMinutes(state);
      final nextLabel = formatForegroundMinutes(next);
      if (nextLabel != prevLabel) {
        state = next;
      }
      // Local prefs only (no API). Second ticks while Xs; minute ticks after that.
      unawaited(_touchLastAlive());
      _scheduleNextTick();
    });
  }

  Future<void> _touchLastAlive() async {
    final userId = _userId;
    if (userId == null || _foregroundSince == null) return;
    await _prefs.setInt(_lastAliveKey(userId), DateTime.now().millisecondsSinceEpoch);
  }

  Future<void> _onAuthChanged(String? userId) async {
    if (userId == _userId) {
      if (userId != null && _foregroundSince == null) {
        await _beginForegroundSession();
      }
      return;
    }

    await _onBackgrounded();

    _userId = userId;
    _serverSeconds = 0;
    _pendingSeconds = 0;
    _foregroundSince = null;
    _stopTickTimer();
    if (userId != null) {
      _serverSeconds = _prefs.getInt(_secondsKey(userId)) ?? 0;
      _pendingSeconds = _prefs.getInt(_pendingKey(userId)) ?? 0;
      _recoverKilledSession(userId);
      await _beginForegroundSession();
      unawaited(_flushPending());
    }
    state = _totalSeconds();
  }

  void _syncFromServer(int seconds) {
    if (seconds > _serverSeconds) {
      _serverSeconds = seconds;
      _persist();
      state = _totalSeconds();
    }
  }

  Future<void> _flushPending() async {
    final userId = _userId;
    if (userId == null || _flushing) return;
    if (_pendingSeconds < 1) return;
    _flushing = true;
    try {
      while (true) {
        final pending = _pendingFor(userId);
        final delta = clampForegroundDeltaSeconds(pending);
        if (delta < 1) break;

        final total = await ref.read(bridgeApiProvider).reportForegroundSeconds(delta);
        final remaining = pending - delta;

        // Always persist for the flushed user — even if auth already switched.
        await _prefs.setInt(_secondsKey(userId), total);
        await _prefs.setInt(_pendingKey(userId), remaining < 0 ? 0 : remaining);

        if (_userId == userId) {
          _serverSeconds = total;
          _pendingSeconds = remaining < 0 ? 0 : remaining;
          state = _totalSeconds();
        } else {
          // Signed out / switched mid-flush: stop using this session's API token.
          break;
        }
      }
    } catch (_) {
      // Keep pending locally; the next pause or resume retries.
    } finally {
      _flushing = false;
    }
  }

  int _pendingFor(String userId) {
    if (_userId == userId) return _pendingSeconds;
    return _prefs.getInt(_pendingKey(userId)) ?? 0;
  }

  void _persist() {
    final userId = _userId;
    if (userId == null) return;
    unawaited(_prefs.setInt(_secondsKey(userId), _serverSeconds));
    unawaited(_prefs.setInt(_pendingKey(userId), _pendingSeconds));
  }

  String _secondsKey(String userId) => 'app_usage_seconds_$userId';
  String _pendingKey(String userId) => 'app_usage_pending_$userId';
  String _sessionStartKey(String userId) => 'app_usage_session_start_$userId';
  String _lastAliveKey(String userId) => 'app_usage_last_alive_$userId';
}
