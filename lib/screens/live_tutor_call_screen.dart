import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';

import '../live_tutor_captions.dart';
import '../models.dart';

/// Full screen call with the Beyond Presence avatar.
class LiveTutorCallScreen extends StatefulWidget {
  const LiveTutorCallScreen({super.key, required this.session});

  final LiveTutorSession session;

  @override
  State<LiveTutorCallScreen> createState() => _LiveTutorCallScreenState();
}

class _LiveTutorCallScreenState extends State<LiveTutorCallScreen> {
  final Room _room = Room(
    roomOptions: const RoomOptions(adaptiveStream: true, dynacast: true),
  );
  EventsListener<RoomEvent>? _listener;

  VideoTrack? _avatarTrack;
  bool _tutorJoined = false;
  String _status = 'Connecting…';
  String? _error;
  String _caption = '';
  bool _micEnabled = true;
  bool _leaving = false;
  Timer? _tutorJoinTimer;
  Timer? _avatarVideoTimer;

  TranscriptionStreamReceiver? _transcriptionReceiver;
  StreamSubscription<ReceivedMessage>? _transcriptionSub;
  DateTime? _lastStreamCaptionAt;

  final List<String> _segmentOrder = [];
  final Map<String, String> _segmentTexts = {};
  bool? _captionFromLearner;

  final ScrollController _captionScrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    // Drop focus from Learn-tab text fields underneath this fullscreen route so
    // Android does not paint a blinking caret over the avatar video.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      FocusManager.instance.primaryFocus?.unfocus();
    });
    _connect();
  }

  @override
  void dispose() {
    _tutorJoinTimer?.cancel();
    _avatarVideoTimer?.cancel();
    unawaited(_transcriptionSub?.cancel());
    unawaited(_transcriptionReceiver?.dispose());
    _captionScrollController.dispose();
    _listener?.dispose();
    _room.dispose();
    super.dispose();
  }

  Future<bool> _ensureMicrophonePermission() async {
    if (kIsWeb) return true;
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  bool get _hasRemoteParticipant => _room.remoteParticipants.isNotEmpty;

  void _scheduleTutorJoinHint() {
    _tutorJoinTimer?.cancel();
    _tutorJoinTimer = Timer(const Duration(seconds: 40), () {
      if (!mounted || _leaving || _tutorJoined || _error != null) return;
      setState(() {
        _status =
            'Still waiting for your tutor. On your computer, start the worker:\ncd agent && .venv/bin/python agent.py dev';
      });
    });
  }

  void _scheduleAvatarVideoHint() {
    _avatarVideoTimer?.cancel();
    _avatarVideoTimer = Timer(const Duration(seconds: 25), () {
      if (!mounted || _leaving || _avatarTrack != null || _error != null) return;
      if (!_tutorJoined) return;
      setState(() {
        _status =
            'Tutor is connected (audio). Avatar video is still starting — check BEY_API_KEY / BEY_AVATAR_ID in agent/.env.local.';
      });
    });
  }

  void _startTranscriptionReceiver() {
    _transcriptionReceiver?.dispose();
    _transcriptionReceiver = TranscriptionStreamReceiver(room: _room);
    _transcriptionSub?.cancel();
    _transcriptionSub = _transcriptionReceiver!.messages().listen(
      _onStreamTranscription,
      onError: (_, __) {},
    );
  }

  void _resetCaptionBuffer({required bool fromLearner}) {
    _segmentOrder.clear();
    _segmentTexts.clear();
    _captionFromLearner = fromLearner;
  }

  void _upsertSegment({required bool fromLearner, required String segmentId, required String text}) {
    final cleaned = scrubSpeechMarkup(text);
    if (cleaned.trim().isEmpty) return;

    if (_captionFromLearner != fromLearner) {
      _resetCaptionBuffer(fromLearner: fromLearner);
    }

    if (!_segmentTexts.containsKey(segmentId)) {
      _segmentOrder.add(segmentId);
      _segmentTexts[segmentId] = cleaned;
    } else {
      _segmentTexts[segmentId] = mergeCaptionText(_segmentTexts[segmentId]!, cleaned);
    }
  }

  String _buildCaptionText() {
    if (_segmentOrder.isEmpty) return '';
    var body = '';
    for (final id in _segmentOrder) {
      final part = _segmentTexts[id];
      if (part == null || part.isEmpty) continue;
      body = mergeCaptionText(body, part);
    }
    if (body.trim().isEmpty) return '';
    return buildLiveTutorCaption(body, fromLearner: _captionFromLearner == true);
  }

  void _applyCaptionUpdate({required bool fromStream}) {
    final next = _buildCaptionText();
    if (!mounted) return;
    setState(() => _caption = next);
    if (fromStream) {
      _lastStreamCaptionAt = DateTime.now();
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_captionScrollController.hasClients) return;
      _captionScrollController.animateTo(
        _captionScrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
      );
    });
  }

  void _onStreamTranscription(ReceivedMessage message) {
    final text = message.content.text;
    if (text.trim().isEmpty) return;
    final fromLearner = message.content is UserTranscript;
    _upsertSegment(fromLearner: fromLearner, segmentId: message.id, text: text);
    _applyCaptionUpdate(fromStream: true);
  }

  Future<void> _connect() async {
    if (widget.session.url.isEmpty || widget.session.token.isEmpty) {
      setState(() => _error = 'The server did not return LiveKit credentials.');
      return;
    }

    if (!await _ensureMicrophonePermission()) {
      setState(() {
        _error = 'Microphone access is required so your tutor can hear you.';
        _micEnabled = false;
      });
      return;
    }

    if (!kIsWeb) {
      await AudioManager.instance.setSpeakerOutputPreferred(true);
    }

    final listener = _room.createListener();
    _listener = listener;

    listener
      ..on<TrackSubscribedEvent>((_) => _syncRoomState())
      ..on<TrackUnsubscribedEvent>((_) => _syncRoomState())
      ..on<ParticipantConnectedEvent>((_) => _syncRoomState())
      ..on<ParticipantDisconnectedEvent>((_) => _syncRoomState())
      ..on<TranscriptionEvent>(_onTranscriptionFallback)
      ..on<RoomDisconnectedEvent>((event) {
        if (!mounted || _leaving) return;
        setState(() {
          _avatarTrack = null;
          _tutorJoined = false;
          _status = 'The session ended.';
        });
      });

    try {
      setState(() => _status = 'Connecting…');
      await _room.connect(widget.session.url, widget.session.token);
    } catch (error) {
      if (mounted) setState(() => _error = 'Could not join the session: $error');
      return;
    }

    _startTranscriptionReceiver();

    try {
      await _room.localParticipant?.setMicrophoneEnabled(true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _micEnabled = false;
          _caption = 'Microphone is off — tap the mic button after allowing access in Settings.';
        });
      }
    }

    if (!mounted) return;
    setState(() => _status = 'Waking your tutor…');
    _syncRoomState();
    _scheduleTutorJoinHint();
  }

  void _syncRoomState() {
    VideoTrack? track;
    for (final participant in _room.remoteParticipants.values) {
      for (final publication in participant.videoTrackPublications) {
        final candidate = publication.track;
        if (candidate is VideoTrack) {
          track = candidate;
          break;
        }
      }
      if (track != null) break;
    }

    final joined = _hasRemoteParticipant;
    if (!mounted) return;
    if (track == _avatarTrack && joined == _tutorJoined) return;

    setState(() {
      _avatarTrack = track;
      if (joined && !_tutorJoined) {
        _tutorJoined = true;
        _tutorJoinTimer?.cancel();
        _status = track == null ? 'Tutor connected — starting avatar…' : '';
        if (track == null) {
          _scheduleAvatarVideoHint();
        }
      }
      if (track != null) {
        _status = '';
        _tutorJoinTimer?.cancel();
        _avatarVideoTimer?.cancel();
      }
    });
  }

  void _onTranscriptionFallback(TranscriptionEvent event) {
    final streamFresh = _lastStreamCaptionAt != null &&
        DateTime.now().difference(_lastStreamCaptionAt!) < const Duration(seconds: 2);
    if (streamFresh) return;

    if (event.segments.isEmpty) return;
    final fromLearner = event.participant is LocalParticipant;
    for (final segment in event.segments) {
      _upsertSegment(fromLearner: fromLearner, segmentId: segment.id, text: segment.text);
    }
    _applyCaptionUpdate(fromStream: false);
  }

  Future<void> _toggleMic() async {
    if (!_micEnabled) {
      if (!await _ensureMicrophonePermission()) {
        if (mounted) {
          setState(() => _caption = 'Allow microphone access in Settings to talk with your tutor.');
        }
        return;
      }
    }
    final next = !_micEnabled;
    try {
      await _room.localParticipant?.setMicrophoneEnabled(next);
      if (mounted) {
        setState(() => _micEnabled = next);
      }
    } catch (_) {
      if (mounted) {
        setState(() => _caption = 'Could not turn the microphone on. Check app permissions.');
      }
    }
  }

  Future<void> _leave() async {
    // Hang-up + close can both fire while disconnect is in flight; a second pop
    // removes the Learn tab from go_router and leaves a black empty stack.
    if (_leaving) return;
    _leaving = true;
    _tutorJoinTimer?.cancel();
    _avatarVideoTimer?.cancel();

    if (mounted) {
      setState(() {
        _avatarTrack = null;
        _status = 'Ending session…';
      });
    }

    try {
      await _room.disconnect();
    } catch (_) {}

    if (!mounted) return;
    final navigator = Navigator.of(context, rootNavigator: true);
    if (navigator.canPop()) {
      navigator.pop();
    } else {
      // Fallback if the fullscreen route is already gone.
      GoRouter.of(context).go('/learn?tab=live');
    }
  }

  @override
  Widget build(BuildContext context) {
    final track = _avatarTrack;
    final maxSubtitleHeight = MediaQuery.sizeOf(context).height * 0.32;
    return Focus(
      autofocus: true,
      child: Scaffold(
        backgroundColor: const Color(0xFF0C1222),
        body: Stack(
          fit: StackFit.expand,
          children: [
            if (track != null)
              ExcludeFocus(
                child: VideoTrackRenderer(track, fit: VideoViewFit.cover),
              )
            else
              _Placeholder(status: _error ?? _status, failed: _error != null),
            Positioned(
              left: 0,
              right: 0,
              top: 0,
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      IconButton.filledTonal(
                        onPressed: _leaving ? null : _leave,
                        style: IconButton.styleFrom(
                          foregroundColor: Colors.white,
                          backgroundColor: Colors.white24,
                        ),
                        icon: const Icon(Icons.close),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Live tutor',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 17),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_caption.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 20),
                        constraints: BoxConstraints(maxHeight: maxSubtitleHeight),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.55),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: SingleChildScrollView(
                          controller: _captionScrollController,
                          child: SelectionContainer.disabled(
                            child: Text(
                              _caption,
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: Colors.white, height: 1.35, fontSize: 15),
                            ),
                          ),
                        ),
                      ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _OverlayCallButton(
                          icon: _micEnabled ? Icons.mic : Icons.mic_off,
                          color: _micEnabled ? Colors.white.withValues(alpha: 0.22) : Colors.white,
                          iconColor: _micEnabled ? Colors.white : const Color(0xFF0C1222),
                          onPressed: _toggleMic,
                        ),
                        const SizedBox(width: 28),
                        _OverlayCallButton(
                          icon: Icons.call_end,
                          color: const Color(0xFFDC2626),
                          iconColor: Colors.white,
                          onPressed: _leaving ? () {} : _leave,
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Placeholder extends StatelessWidget {
  const _Placeholder({required this.status, required this.failed});

  final String status;
  final bool failed;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!failed) const CircularProgressIndicator(color: Colors.white70),
            if (failed) const Icon(Icons.error_outline, color: Colors.white70, size: 40),
            const SizedBox(height: 20),
            Text(
              status,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white70, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverlayCallButton extends StatelessWidget {
  const _OverlayCallButton({
    required this.icon,
    required this.color,
    required this.iconColor,
    required this.onPressed,
  });

  final IconData icon;
  final Color color;
  final Color iconColor;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: color,
      shape: const CircleBorder(),
      elevation: 4,
      shadowColor: Colors.black45,
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: SizedBox(
          width: 68,
          height: 68,
          child: Icon(icon, color: iconColor, size: 30),
        ),
      ),
    );
  }
}
