import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

import '../api_client.dart';
import '../models.dart';
import '../repositories.dart';
import '../widgets/study_space_picker.dart';

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
  static const _minVoiceRecordingBytes = 2048;

  final _question = TextEditingController();
  final _recorder = AudioRecorder();

  List<ChatMessage> _messages = [];
  List<TutorSessionSummary> _sessions = [];
  String? _sessionId;
  String? _error;
  String _status = '';
  bool _busy = false;
  bool _recording = false;
  bool _loadingSessions = false;
  bool _loadingMessages = false;
  bool _voicePreview = false;
  final Set<String> _expandedSourceMessageIds = <String>{};

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadSessionsAndSelectLatest();
  }

  @override
  void didUpdateWidget(covariant LiveTutorChatSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.spaceId != widget.spaceId) {
      _resetForSpaceChange();
      _loadSessionsAndSelectLatest();
    }
  }

  @override
  void dispose() {
    _question.dispose();
    _recorder.dispose();
    super.dispose();
  }

  void _resetForSpaceChange() {
    setState(() {
      _sessionId = null;
      _sessions = [];
      _messages = [];
      _error = null;
      _status = '';
      _expandedSourceMessageIds.clear();
      _voicePreview = false;
      _question.clear();
    });
  }

  Future<void> _loadSessionsAndSelectLatest() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;
    setState(() {
      _loadingSessions = true;
      _error = null;
    });
    try {
      final sessions = await repository.tutorSessions(spaceId);
      if (!mounted) return;
      final selected = sessions.isEmpty ? null : sessions.first.id;
      setState(() {
        _sessions = sessions;
        _sessionId = selected;
      });
      if (selected != null) {
        await _loadMessages(selected);
      } else if (mounted) {
        setState(() => _messages = []);
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loadingSessions = false);
    }
  }

  Future<void> _loadMessages(String sessionId) async {
    setState(() {
      _loadingMessages = true;
      _expandedSourceMessageIds.clear();
      _error = null;
    });
    try {
      final messages = await repository.tutorMessages(sessionId);
      if (!mounted) return;
      setState(() => _messages = messages);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _loadingMessages = false);
    }
  }

  Future<void> _refreshSessionList() async {
    final spaceId = widget.spaceId;
    if (spaceId == null) return;
    try {
      final sessions = await repository.tutorSessions(spaceId);
      if (!mounted) return;
      setState(() => _sessions = sessions);
    } catch (_) {}
  }

  Future<void> _createAndSelectNewSession() async {
    if (_busy) return;
    setState(() {
      _sessionId = null;
      _messages = [];
      _error = null;
      _status = '';
      _expandedSourceMessageIds.clear();
      _voicePreview = false;
      _question.clear();
    });
  }

  Future<void> _deleteCurrentSession() async {
    final sessionId = _sessionId;
    if (sessionId == null || _busy) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this chat?'),
        content: const Text('This thread and its messages will be removed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await repository.bridge.deleteTutorSession(sessionId);
      if (!mounted) return;
      setState(() {
        _sessionId = null;
        _messages = [];
      });
      await _refreshSessionList();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String> _ensureSession() async {
    if (_sessionId != null) return _sessionId!;
    final spaceId = widget.spaceId;
    if (spaceId == null) throw const BridgeException('Create and select a study space first.');
    final id = await repository.bridge.createTutorSession(spaceId);
    setState(() => _sessionId = id);
    await _refreshSessionList();
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
          _voicePreview = false;
        });
        _refreshSessionList();
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) {
        setState(() {
          _busy = false;
          _status = '';
        });
      }
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
      setState(() {
        _recording = false;
        _status = 'Transcribing your question…';
        _busy = true;
      });
      if (path == null) {
        setState(() {
          _busy = false;
          _status = '';
          _error = 'No speech was captured. Try again.';
        });
        return;
      }
      final file = File(path);
      if (!await file.exists() || await file.length() < _minVoiceRecordingBytes) {
        try {
          await file.delete();
        } catch (_) {}
        if (mounted) {
          setState(() {
            _busy = false;
            _status = '';
            _error = 'No speech was captured. Try again.';
          });
        }
        return;
      }
      try {
        final transcript = await repository.bridge.transcribeVoiceQuestion(path);
        if (!mounted) return;
        if (transcript.isEmpty) {
          setState(() {
            _busy = false;
            _status = '';
            _error = 'No speech was detected. Try again.';
          });
          return;
        }
        setState(() {
          _question.text = transcript;
          _voicePreview = true;
          _busy = false;
          _status = 'Review the text, then send or cancel.';
        });
      } catch (error) {
        if (mounted) {
          setState(() {
            _busy = false;
            _status = '';
            _error = '$error';
          });
        }
      } finally {
        try {
          await File(path).delete();
        } catch (_) {}
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
    setState(() {
      _recording = true;
      _error = null;
      _status = 'Recording… tap again to review.';
    });
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
                  _resetForSpaceChange();
                },
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      key: ValueKey('thread-${_sessionId ?? 'none'}-${_sessions.length}'),
                      initialValue: _sessionId,
                      isExpanded: true,
                      decoration: const InputDecoration(
                        labelText: 'Thread',
                        prefixIcon: Icon(Icons.history),
                      ),
                      hint: const Text('Select a thread'),
                      items: _sessions
                          .map(
                            (session) => DropdownMenuItem(
                              value: session.id,
                              child: Text(
                                session.title,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          )
                          .toList(),
                      onChanged: _busy || _loadingSessions
                          ? null
                          : (value) async {
                              if (value == null || value == _sessionId) return;
                              setState(() => _sessionId = value);
                              await _loadMessages(value);
                            },
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    tooltip: 'New chat',
                    onPressed: _busy ? null : _createAndSelectNewSession,
                    icon: const Icon(Icons.add_comment_outlined),
                  ),
                  IconButton(
                    tooltip: 'Delete chat',
                    onPressed: _busy || _sessionId == null ? null : _deleteCurrentSession,
                    icon: const Icon(Icons.delete_outline),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _loadingMessages || _loadingSessions
                  ? const Center(child: CircularProgressIndicator())
                  : _messages.isEmpty
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
                          itemBuilder: (context, index) {
                            final message = _messages[index];
                            final expanded = _expandedSourceMessageIds.contains(message.id);
                            return TutorMessageBubble(
                              message: message,
                              sourcesExpanded: expanded,
                              onToggleSources: () {
                                setState(() {
                                  if (expanded) {
                                    _expandedSourceMessageIds.remove(message.id);
                                  } else {
                                    _expandedSourceMessageIds.add(message.id);
                                  }
                                });
                              },
                            );
                          },
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
                    label: Text(_recording ? 'Stop and review' : 'Ask with microphone'),
                    style: _recording ? OutlinedButton.styleFrom(foregroundColor: Colors.red) : null,
                  ),
                  if (_voicePreview) ...[
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () {
                              setState(() {
                                _question.clear();
                                _voicePreview = false;
                                _status = '';
                              });
                            },
                      child: const Text('Cancel voice text'),
                    ),
                  ],
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
  const TutorMessageBubble({
    required this.message,
    required this.sourcesExpanded,
    required this.onToggleSources,
    super.key,
  });

  final ChatMessage message;
  final bool sourcesExpanded;
  final VoidCallback onToggleSources;

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
              TextButton(
                onPressed: onToggleSources,
                style: TextButton.styleFrom(
                  foregroundColor: primary,
                  padding: EdgeInsets.zero,
                  minimumSize: const Size(0, 0),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  sourcesExpanded ? 'Hide sources' : 'View sources',
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                ),
              ),
              if (sourcesExpanded) ...[
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: message.citations
                      .map(
                        (citation) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.72),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            citation.label,
                            style: const TextStyle(fontSize: 11, color: Color(0xFF334155)),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ],
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
