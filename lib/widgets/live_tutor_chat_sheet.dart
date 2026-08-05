import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../api_client.dart';
import '../models.dart';
import '../repositories.dart';
import '../widgets/study_space_picker.dart';

/// Text and voice Q&A tutor in a bottom sheet (used from Live tutor tab).
class LiveTutorChatSheet extends ConsumerStatefulWidget {
  const LiveTutorChatSheet({
    required this.spaces,
    required this.spaceId,
    required this.onSpaceChanged,
    super.key,
  });

  final List<StudySpace> spaces;
  final String? spaceId;
  final ValueChanged<String?> onSpaceChanged;

  @override
  ConsumerState<LiveTutorChatSheet> createState() => _LiveTutorChatSheetState();
}

class _LiveTutorChatSheetState extends ConsumerState<LiveTutorChatSheet> {
  final _question = TextEditingController();
  final _recorder = AudioRecorder();
  List<ChatMessage> _messages = [];
  String? _sessionId;
  String? _error;
  String _status = '';
  bool _busy = false;
  bool _recording = false;

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void dispose() {
    _question.dispose();
    _recorder.dispose();
    super.dispose();
  }

  Future<String> _ensureSession() async {
    if (_sessionId != null) return _sessionId!;
    final spaceId = widget.spaceId;
    if (spaceId == null) throw const BridgeException('Create and select a study space first.');
    final id = await repository.bridge.createTutorSession(spaceId);
    setState(() => _sessionId = id);
    return id;
  }

  Future<void> _ask() async {
    final content = _question.text.trim();
    if (content.isEmpty || _busy) return;
    if (widget.spaceId == null) {
      redirectToCreateStudySpace(context, message: 'Create a study space to chat with your tutor.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _status = 'Thinking from your indexed material…';
    });
    try {
      final response = await repository.bridge.sendTutorMessage(await _ensureSession(), content);
      if (mounted) {
        setState(() {
          _messages = [..._messages, response.$1, response.$2];
          _question.clear();
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() { _busy = false; _status = ''; });
    }
  }

  Future<void> _toggleRecording() async {
    if (_busy) return;
    if (widget.spaceId == null) {
      redirectToCreateStudySpace(context, message: 'Create a study space to use voice questions.');
      return;
    }
    if (_recording) {
      final path = await _recorder.stop();
      setState(() { _recording = false; _status = 'Transcribing your question…'; _busy = true; });
      if (path == null) {
        setState(() { _busy = false; _status = ''; });
        return;
      }
      try {
        final response = await repository.bridge.sendVoiceQuestion(await _ensureSession(), path);
        if (mounted) {
          setState(() {
            _messages = [..._messages, response.$1, response.$2];
            if (response.$3 != null && response.$3!.trim().isNotEmpty) {
              _status = 'You asked: ${response.$3}';
            }
          });
        }
      } catch (error) {
        if (mounted) setState(() => _error = '$error');
      } finally {
        if (mounted) {
          setState(() {
            _busy = false;
            if (!_recording) _status = '';
          });
        }
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

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.75,
      minChildSize: 0.45,
      maxChildSize: 0.92,
      builder: (context, scrollController) {
        return Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Chat & voice',
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(Icons.close)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: StudySpacePickerCard(
                spaces: widget.spaces,
                selectedId: widget.spaceId,
                enabled: !_busy,
                onSelected: (value) {
                  widget.onSpaceChanged(value);
                  setState(() {
                    _sessionId = null;
                    _messages = [];
                    _error = null;
                  });
                },
              ),
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _messages.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 58,
                              height: 58,
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primaryContainer,
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: Icon(Icons.chat_bubble_outline, color: primary),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Ask about your material',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Answers include citations from your study space.',
                              textAlign: TextAlign.center,
                              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: scrollController,
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) => TutorMessageBubble(message: _messages[index]),
                    ),
            ),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Text(_error!, style: TextStyle(color: Colors.red.shade800)),
                ),
              ),
            if (_status.isNotEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                child: Text(_status, style: TextStyle(color: primary, fontSize: 12)),
              ),
            Padding(
              padding: EdgeInsets.fromLTRB(20, 8, 20, MediaQuery.paddingOf(context).bottom + 12),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _question,
                          minLines: 1,
                          maxLines: 4,
                          enabled: !_busy,
                          onSubmitted: (_) => _ask(),
                          decoration: const InputDecoration(hintText: 'Ask about your materials…'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(onPressed: _busy ? null : _ask, icon: const Icon(Icons.arrow_upward)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: _busy ? null : _toggleRecording,
                    icon: Icon(_recording ? Icons.stop_circle_outlined : Icons.mic_none_outlined),
                    label: Text(_recording ? 'Stop and send' : 'Ask with microphone'),
                    style: _recording ? OutlinedButton.styleFrom(foregroundColor: Colors.red) : null,
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

class TutorMessageBubble extends StatelessWidget {
  const TutorMessageBubble({required this.message, super.key});

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final user = message.role == 'user';
    final primary = Theme.of(context).colorScheme.primary;
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 330),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: user ? const Color(0xFF0C1222) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              user ? 'You' : 'Tutor',
              style: TextStyle(
                color: user ? Colors.white60 : Colors.blueGrey,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 5),
            Text(
              message.content,
              style: TextStyle(color: user ? Colors.white : const Color(0xFF334155), height: 1.45),
            ),
            if (!user && message.citations.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('Sources', style: TextStyle(color: primary, fontWeight: FontWeight.w700, fontSize: 11)),
              const SizedBox(height: 4),
              ...message.citations.map(
                (citation) => Text(citation.label, style: TextStyle(color: primary, fontSize: 12)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

void showLiveTutorChatSheet(
  BuildContext context, {
  required List<StudySpace> spaces,
  required String? spaceId,
  required ValueChanged<String?> onSpaceChanged,
}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => LiveTutorChatSheet(
      spaces: spaces,
      spaceId: spaceId,
      onSpaceChanged: onSpaceChanged,
    ),
  );
}
