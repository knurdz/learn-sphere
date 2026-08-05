import 'dart:async';

import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';

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
  String _status = 'Connecting…';
  String? _error;
  String _caption = '';
  bool _micEnabled = true;
  bool _leaving = false;
  Timer? _tutorJoinTimer;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  @override
  void dispose() {
    _tutorJoinTimer?.cancel();
    _listener?.dispose();
    _room.dispose();
    super.dispose();
  }

  Future<bool> _ensureMicrophonePermission() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  void _scheduleTutorJoinHint() {
    _tutorJoinTimer?.cancel();
    _tutorJoinTimer = Timer(const Duration(seconds: 40), () {
      if (!mounted || _leaving || _avatarTrack != null || _error != null) return;
      setState(() {
        _status =
            'Still waiting for your tutor. On your computer, start the worker:\ncd agent && .venv/bin/python agent.py dev';
      });
    });
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

    await AudioManager.instance.setSpeakerOutputPreferred(true);

    final listener = _room.createListener();
    _listener = listener;

    listener
      ..on<TrackSubscribedEvent>((_) => _syncAvatarTrack())
      ..on<TrackUnsubscribedEvent>((_) => _syncAvatarTrack())
      ..on<ParticipantConnectedEvent>((_) => _syncAvatarTrack())
      ..on<ParticipantDisconnectedEvent>((_) => _syncAvatarTrack())
      ..on<TranscriptionEvent>(_onTranscription)
      ..on<RoomDisconnectedEvent>((event) {
        if (!mounted || _leaving) return;
        setState(() {
          _avatarTrack = null;
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
    _syncAvatarTrack();
    _scheduleTutorJoinHint();
  }

  void _syncAvatarTrack() {
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
    if (!mounted || track == _avatarTrack) return;
    setState(() {
      _avatarTrack = track;
      if (track != null) {
        _status = '';
        _tutorJoinTimer?.cancel();
      }
    });
  }

  void _onTranscription(TranscriptionEvent event) {
    final segment = event.segments.isEmpty ? null : event.segments.last;
    if (segment == null || segment.text.trim().isEmpty) return;
    final fromLearner = event.participant is LocalParticipant;
    if (!mounted) return;
    setState(() => _caption = fromLearner ? 'You: ${segment.text}' : segment.text);
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
        setState(() {
          _micEnabled = next;
          if (next) _caption = '';
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _caption = 'Could not turn the microphone on. Check app permissions.');
      }
    }
  }

  Future<void> _leave() async {
    _leaving = true;
    await _room.disconnect();
    if (mounted) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final track = _avatarTrack;
    return Scaffold(
      backgroundColor: const Color(0xFF0C1222),
      body: Stack(
        fit: StackFit.expand,
        children: [
          if (track != null)
            VideoTrackRenderer(track, fit: VideoViewFit.cover)
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
                      onPressed: _leave,
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
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.55),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        _caption,
                        textAlign: TextAlign.center,
                        maxLines: 3,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(color: Colors.white, height: 1.35),
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
                        onPressed: _leave,
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
