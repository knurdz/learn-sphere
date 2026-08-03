import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../models.dart';
import '../repositories.dart';

class TutorScreen extends ConsumerStatefulWidget {
  const TutorScreen({super.key});

  @override
  ConsumerState<TutorScreen> createState() => _TutorScreenState();
}

class _TutorScreenState extends ConsumerState<TutorScreen> {
  final _question = TextEditingController();
  final _recorder = AudioRecorder();
  List<StudySpace> _spaces = [];
  List<ChatMessage> _messages = [];
  String? _spaceId;
  String? _sessionId;
  String? _error;
  String _status = '';
  bool _busy = false;
  bool _recording = false;

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadSpaces();
  }

  @override
  void dispose() {
    _question.dispose();
    _recorder.dispose();
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

  Future<String> _ensureSession() async {
    if (_sessionId != null) return _sessionId!;
    final spaceId = _spaceId;
    if (spaceId == null) throw const BridgeException('Create and select a study space first.');
    final id = await repository.bridge.createTutorSession(spaceId);
    setState(() => _sessionId = id);
    return id;
  }

  Future<void> _ask() async {
    final content = _question.text.trim();
    if (content.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
      _status = 'Thinking from your indexed material…';
    });
    try {
      final response = await repository.bridge.sendTutorMessage(await _ensureSession(), content);
      if (mounted) setState(() { _messages = [..._messages, response.$1, response.$2]; _question.clear(); });
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() { _busy = false; _status = ''; });
    }
  }

  Future<void> _toggleRecording() async {
    if (_busy) return;
    if (_recording) {
      final path = await _recorder.stop();
      setState(() { _recording = false; _status = 'Transcribing your question…'; _busy = true; });
      if (path == null) {
        setState(() { _busy = false; _status = ''; });
        return;
      }
      try {
        final response = await repository.bridge.sendVoiceQuestion(await _ensureSession(), path);
        if (mounted) setState(() => _messages = [..._messages, response.$1, response.$2]);
      } catch (error) {
        if (mounted) setState(() => _error = '$error');
      } finally {
        if (mounted) setState(() { _busy = false; _status = ''; });
        try { await File(path).delete(); } catch (_) {}
      }
      return;
    }

    if (!await _recorder.hasPermission()) {
      setState(() => _error = 'Microphone permission was not granted.');
      return;
    }
    final directory = await getTemporaryDirectory();
    final path = '${directory.path}/voice-question-${DateTime.now().millisecondsSinceEpoch}.m4a';
    await _recorder.start(const RecordConfig(encoder: AudioEncoder.aacLc), path: path);
    setState(() { _recording = true; _error = null; _status = 'Recording… tap again to send.'; });
  }

  void _changeSpace(String? value) {
    setState(() {
      _spaceId = value;
      _sessionId = null;
      _messages = [];
      _error = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 48, 20, 28),
      children: [
        Text('LearnSphere tutor', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700, letterSpacing: 1.2)),
        const SizedBox(height: 8),
        Text('Ask, verify, and keep moving.', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 18),
        Row(children: [Expanded(child: _spaces.isEmpty ? const Text('Create a study space in Library first.') : DropdownButtonFormField<String>(value: _spaceId, decoration: const InputDecoration(labelText: 'Study space', prefixIcon: Icon(Icons.book_outlined), isDense: true), items: _spaces.map((space) => DropdownMenuItem(value: space.id, child: Text(space.name))).toList(), onChanged: _busy ? null : _changeSpace)), const SizedBox(width: 10), IconButton.filled(onPressed: _spaces.isEmpty ? null : () => context.go('/avatar'), icon: const Icon(Icons.videocam_outlined), tooltip: 'Live avatar')]),
        const SizedBox(height: 14),
        Card(
          child: SizedBox(
            height: 460,
            child: _messages.isEmpty ? const _TutorEmpty() : ListView.builder(padding: const EdgeInsets.all(16), itemCount: _messages.length, itemBuilder: (context, index) => _messageBubble(_messages[index])),
          ),
        ),
        const SizedBox(height: 12),
        if (_error != null) Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(14)), child: Text(_error!, style: TextStyle(color: Colors.red.shade800))),
        if (_status.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(vertical: 8), child: Text(_status, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 12))),
        Row(crossAxisAlignment: CrossAxisAlignment.end, children: [Expanded(child: TextField(controller: _question, minLines: 1, maxLines: 4, enabled: !_busy, onSubmitted: (_) => _ask(), decoration: const InputDecoration(hintText: 'Ask about your materials…'))), const SizedBox(width: 8), IconButton.filled(onPressed: _busy ? null : _ask, icon: const Icon(Icons.arrow_upward)),]),
        const SizedBox(height: 8),
        OutlinedButton.icon(onPressed: _busy ? null : _toggleRecording, icon: Icon(_recording ? Icons.stop_circle_outlined : Icons.mic_none_outlined), label: Text(_recording ? 'Stop and send voice question' : 'Ask with microphone'), style: _recording ? OutlinedButton.styleFrom(foregroundColor: Colors.red) : null),
      ],
    );
  }

  Widget _messageBubble(ChatMessage message) {
    final user = message.role == 'user';
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 330),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: user ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(18)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(user ? 'You' : 'LearnSphere tutor', style: TextStyle(color: user ? Colors.white60 : Colors.blueGrey, fontSize: 11, fontWeight: FontWeight.w700)), const SizedBox(height: 5), Text(message.content, style: TextStyle(color: user ? Colors.white : const Color(0xFF334155), height: 1.45)), if (!user && message.citations.isNotEmpty) ...[const SizedBox(height: 12), const Text('Sources', style: TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.w700, fontSize: 11)), const SizedBox(height: 4), ...message.citations.map((citation) => Text(citation.label, style: const TextStyle(color: Color(0xFF4F46E5), fontSize: 12)))]]),
      ),
    );
  }
}

class _TutorEmpty extends StatelessWidget {
  const _TutorEmpty();

  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(28), child: Column(mainAxisSize: MainAxisSize.min, children: [Container(width: 58, height: 58, decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer, borderRadius: BorderRadius.circular(18)), child: Icon(Icons.question_mark, color: Theme.of(context).colorScheme.primary)), const SizedBox(height: 16), const Text('Ask about your indexed material', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700), textAlign: TextAlign.center), const SizedBox(height: 8), const Text('The tutor answers from the selected study space and includes source citations.', textAlign: TextAlign.center)])));
}
