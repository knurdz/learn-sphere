import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../app_languages.dart';
import '../l10n/app_localizations.dart';
import '../models.dart';
import '../repositories.dart';
import '../settings_provider.dart';
import '../widgets/live_tutor_chat_sheet.dart';
import '../widgets/study_space_picker.dart';
import 'live_tutor_call_screen.dart';

const _sessionModes = <({String value, String label, String hint})>[
  (
    value: 'tutor',
    label: 'Live tutor',
    hint: 'Talk naturally — your tutor uses material from the study space.',
  ),
  (
    value: 'video_create',
    label: 'Create a teaching video',
    hint: 'Plan a lesson you can record or share later.',
  ),
  (
    value: 'video_engage',
    label: 'Make a video engaging',
    hint: 'Turn passive video into an interactive session.',
  ),
  (
    value: 'youtube_tutor',
    label: 'Teach a YouTube video',
    hint: 'Paste a YouTube link with captions, or use a Library video that is already indexed.',
  ),
];

class LiveTutorPanel extends ConsumerStatefulWidget {
  const LiveTutorPanel({required this.openChatOnLoad, super.key});

  final bool openChatOnLoad;

  @override
  ConsumerState<LiveTutorPanel> createState() => LiveTutorPanelState();
}

class LiveTutorPanelState extends ConsumerState<LiveTutorPanel> {
  List<StudySpace> _spaces = [];
  String? _spaceId;
  String _mode = 'tutor';
  final _brief = TextEditingController();
  final _youtube = TextEditingController();
  String? _error;
  bool _busy = false;
  bool _openedChat = false;

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadSpaces();
  }

  @override
  void didUpdateWidget(covariant LiveTutorPanel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.openChatOnLoad && !_openedChat) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _maybeOpenChat());
    }
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
      if (widget.openChatOnLoad) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _maybeOpenChat());
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  void _maybeOpenChat() {
    if (_openedChat || !mounted) return;
    _openedChat = true;
    showLiveTutorChatSheet(
      context,
      spaces: _spaces,
      spaceId: _spaceId,
      onSpaceChanged: (value) => setState(() => _spaceId = value),
    );
    if (widget.openChatOnLoad && mounted) {
      GoRouter.of(context).replace('/learn?tab=live');
    }
  }

  Future<void> _start() async {
    final l10n = AppLocalizations.of(context)!;
    final language = ref.read(settingsProvider).appLanguage;
    final languageOption = appLanguageByCode(language);
    if (languageOption != null && !languageOption.liveVoiceSupported) {
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(l10n.liveVoiceNotSupportedDialogTitle),
          content: Text(l10n.liveVoiceNotSupportedDialogBody),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.done)),
          ],
        ),
      );
      return;
    }
    if (_spaces.isEmpty || _spaceId == null) {
      redirectToCreateStudySpace(
        context,
        message: l10n.createStudySpaceForLive,
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final session = await repository.bridge.createLiveTutorSession(
        studySpaceId: _spaceId!,
        mode: _mode,
        brief: _brief.text,
        youtubeUrl: _youtube.text,
      );
      if (!mounted) return;
      await Navigator.of(context, rootNavigator: true).push(
        MaterialPageRoute<void>(
          fullscreenDialog: true,
          builder: (_) => LiveTutorCallScreen(session: session),
        ),
      );
      await repository.bridge.endLiveTutorSession(session.sessionId).catchError((_) {});
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _openChat() {
    showLiveTutorChatSheet(
      context,
      spaces: _spaces,
      spaceId: _spaceId,
      onSpaceChanged: (value) => setState(() => _spaceId = value),
    );
  }

  String get _modeHint {
    for (final entry in _sessionModes) {
      if (entry.value == _mode) return entry.hint;
    }
    return '';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;

    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            children: [
              Text(
                'Step 1 · Choose your subject',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 14),
              StudySpacePickerCard(
                spaces: _spaces,
                selectedId: _spaceId,
                enabled: !_busy,
                onSelected: (value) => setState(() => _spaceId = value),
              ),
              const SizedBox(height: 28),
              Text(
                'Step 2 · Session type',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 14),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      DropdownButtonFormField<String>(
                        key: ValueKey(_mode),
                        initialValue: _mode,
                        decoration: const InputDecoration(
                          labelText: 'What do you want to do?',
                          prefixIcon: Icon(Icons.tune_outlined),
                        ),
                        items: _sessionModes
                            .map(
                              (mode) => DropdownMenuItem(
                                value: mode.value,
                                child: Text(mode.label),
                              ),
                            )
                            .toList(),
                        onChanged: _busy ? null : (value) => setState(() => _mode = value ?? 'tutor'),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _modeHint,
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey, height: 1.4),
                      ),
                      if (_mode != 'tutor') ...[
                        const SizedBox(height: 14),
                        TextField(
                          controller: _youtube,
                          enabled: !_busy,
                          decoration: const InputDecoration(
                            labelText: 'YouTube URL (optional)',
                            prefixIcon: Icon(Icons.link),
                          ),
                          keyboardType: TextInputType.url,
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _brief,
                          enabled: !_busy,
                          maxLines: 3,
                          decoration: const InputDecoration(
                            labelText: 'Lesson brief (optional)',
                            alignLabelWithHint: true,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 28),
              Text(
                'Step 3 · Go live',
                style: theme.textTheme.labelLarge?.copyWith(
                  color: theme.colorScheme.primary,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Your tutor joins on camera and teaches from your indexed material. Just talk — interrupt any time.',
                style: theme.textTheme.bodyMedium?.copyWith(height: 1.45),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: _busy ? null : _start,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(64),
                  textStyle: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
                child: _busy
                    ? const SizedBox.square(
                        dimension: 24,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                      )
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.videocam_rounded, size: 28),
                          const SizedBox(width: 12),
                          Text(l10n.startCameraSession),
                        ],
                      ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Text(_error!, style: TextStyle(color: Colors.red.shade700)),
              ],
              const SizedBox(height: 88),
            ],
          ),
        ),
        Material(
          elevation: 8,
          color: theme.scaffoldBackgroundColor,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 20, 10),
              child: FilledButton.tonalIcon(
                onPressed: _openChat,
                icon: const Icon(Icons.chat_bubble_outline),
                label: Text(l10n.chatAndVoice),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
