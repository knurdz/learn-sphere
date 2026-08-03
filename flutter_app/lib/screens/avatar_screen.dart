import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../models.dart';
import '../repositories.dart';

class AvatarScreen extends ConsumerStatefulWidget {
  const AvatarScreen({super.key});

  @override
  ConsumerState<AvatarScreen> createState() => _AvatarScreenState();
}

class _AvatarScreenState extends ConsumerState<AvatarScreen> {
  List<StudySpace> _spaces = [];
  String? _spaceId;
  String _mode = 'tutor';
  final _brief = TextEditingController();
  final _youtube = TextEditingController();
  AvatarSession? _session;
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
    _brief.dispose();
    _youtube.dispose();
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
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _start() async {
    if (_spaceId == null) {
      setState(() => _error = 'Select a study space first.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await repository.bridge.createAvatarSession(
        studySpaceId: _spaceId!,
        mode: _mode,
        brief: _brief.text,
        youtubeUrl: _youtube.text,
      );
      if (mounted) setState(() => _session = session);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _stop() async {
    final session = _session;
    setState(() => _session = null);
    if (session != null) await repository.bridge.deleteAvatarSession(session.agentId);
  }

  @override
  Widget build(BuildContext context) {
    final session = _session;
    return Scaffold(
      appBar: AppBar(title: const Text('Teaching avatar')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
        children: [
          Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [const Text('Learn in motion', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)), const SizedBox(height: 8), const Text('Ask with your voice or turn a video into an engaging lesson without exposing provider keys.'), const SizedBox(height: 16), if (_spaces.isEmpty) const Text('Create a study space in Library first.') else DropdownButtonFormField<String>(value: _spaceId, decoration: const InputDecoration(labelText: 'Study space'), items: _spaces.map((space) => DropdownMenuItem(value: space.id, child: Text(space.name))).toList(), onChanged: session == null ? (value) => setState(() => _spaceId = value) : null), const SizedBox(height: 12), DropdownButtonFormField<String>(value: _mode, decoration: const InputDecoration(labelText: 'Session type'), items: const [DropdownMenuItem(value: 'tutor', child: Text('Live tutor')), DropdownMenuItem(value: 'video_create', child: Text('Create a teaching video')), DropdownMenuItem(value: 'video_engage', child: Text('Make a video engaging')), DropdownMenuItem(value: 'youtube_tutor', child: Text('Teach a YouTube video'))], onChanged: session == null ? (value) => setState(() => _mode = value ?? 'tutor') : null), if (_mode != 'tutor') ...[const SizedBox(height: 12), TextField(controller: _youtube, enabled: session == null, decoration: const InputDecoration(labelText: 'YouTube URL (optional)', prefixIcon: Icon(Icons.link)), keyboardType: TextInputType.url), const SizedBox(height: 12), TextField(controller: _brief, enabled: session == null, maxLines: 3, decoration: const InputDecoration(labelText: 'Lesson brief (optional)'))], const SizedBox(height: 16), FilledButton.icon(onPressed: _busy ? null : session == null ? _start : _stop, icon: _busy ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : Icon(session == null ? Icons.play_arrow_rounded : Icons.stop_circle_outlined), label: Text(session == null ? 'Start teaching session' : 'Stop session'))])),
          if (_error != null) ...[const SizedBox(height: 12), Text(_error!, style: TextStyle(color: Colors.red.shade700))],
          if (session != null) ...[const SizedBox(height: 18), _SessionView(session: session)],
        ],
      ),
    );
  }
}

class _SessionView extends StatelessWidget {
  const _SessionView({required this.session});

  final AvatarSession session;

  @override
  Widget build(BuildContext context) {
    if (session.transport == 'iframe') {
      return Card(child: SizedBox(height: 520, child: ClipRRect(borderRadius: BorderRadius.circular(24), child: WebViewWidget(controller: WebViewController()..setJavaScriptMode(JavaScriptMode.unrestricted)..loadRequest(Uri.parse(session.url))))));
    }
    return _LiveKitSessionView(session: session);
  }
}

class _LiveKitSessionView extends StatefulWidget {
  const _LiveKitSessionView({required this.session});

  final AvatarSession session;

  @override
  State<_LiveKitSessionView> createState() => _LiveKitSessionViewState();
}

class _LiveKitSessionViewState extends State<_LiveKitSessionView> {
  Room? _room;
  String _status = 'Preparing native video…';
  VideoTrack? _remoteVideo;

  @override
  void initState() {
    super.initState();
    _connect();
  }

  Future<void> _connect() async {
    final url = widget.session.livekitUrl;
    final token = widget.session.livekitToken;
    if (url == null || token == null) {
      setState(() => _status = 'The avatar session did not return LiveKit credentials.');
      return;
    }
    await Permission.microphone.request();
    if (widget.session.webcamVisionEnabled) await Permission.camera.request();
    try {
      final room = Room();
      await room.connect(url, token, roomOptions: const RoomOptions(adaptiveStream: true, dynacast: true));
      await room.localParticipant?.setMicrophoneEnabled(true);
      if (widget.session.webcamVisionEnabled) await room.localParticipant?.setCameraEnabled(true);
      VideoTrack? track;
      for (final participant in room.remoteParticipants.values) {
        for (final publication in participant.videoTrackPublications) {
          if (publication.track is VideoTrack) track = publication.track as VideoTrack;
        }
      }
      if (!mounted) return;
      setState(() {
        _room = room;
        _remoteVideo = track;
        _status = 'Connected';
      });
    } catch (error) {
      if (mounted) setState(() => _status = 'Native avatar connection failed: $error');
    }
  }

  @override
  void dispose() {
    _room?.disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Card(color: const Color(0xFF0F172A), child: SizedBox(height: 520, child: Column(children: [Expanded(child: _remoteVideo == null ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.videocam_outlined, color: Colors.white, size: 48), const SizedBox(height: 12), Text(_status, style: const TextStyle(color: Colors.white70), textAlign: TextAlign.center)]) : VideoTrackRenderer(_remoteVideo!)), Padding(padding: const EdgeInsets.all(16), child: Row(children: [const Icon(Icons.mic, color: Colors.white70), const SizedBox(width: 8), Expanded(child: Text(_status, style: const TextStyle(color: Colors.white70))), IconButton(onPressed: () async { await _room?.localParticipant?.setMicrophoneEnabled(false); }, icon: const Icon(Icons.mic_off, color: Colors.white))]))]));
  }
}
