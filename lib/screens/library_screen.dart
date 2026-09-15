import 'dart:async';

import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../models.dart';
import '../repositories.dart';
import '../theme.dart';
import '../widgets/clinical_sections.dart';

class LibraryScreen extends ConsumerStatefulWidget {
  const LibraryScreen({super.key});

  @override
  ConsumerState<LibraryScreen> createState() => _LibraryScreenState();
}

class _LibraryScreenState extends ConsumerState<LibraryScreen> {
  List<StudySpace> _spaces = [];
  List<MaterialItem> _materials = [];
  String? _selectedSpaceId;
  String? _busyId;
  String? _error;
  bool _handledCreatePrompt = false;
  bool _handledUploadPrompt = false;
  final Set<String> _preparingIds = {};

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _handleLibraryPrompt();
  }

  void _handleLibraryPrompt() {
    if (!mounted) return;
    final prompt = GoRouterState.of(context).uri.queryParameters['prompt'];

    if (prompt == null || prompt.isEmpty) {
      _handledCreatePrompt = false;
      _handledUploadPrompt = false;
      return;
    }

    if (prompt == 'createSpace') {
      if (_handledCreatePrompt) return;
      _handledCreatePrompt = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        // Clear query so the same prompt can fire again later.
        context.replace('/library');
        unawaited(_createSpace());
      });
      return;
    }

    if (prompt == 'upload') {
      if (_handledUploadPrompt) return;
      _handledUploadPrompt = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        context.replace('/library');
        unawaited(_upload());
      });
    }
  }

  Future<void> _load() async {
    try {
      final spaces = await repository.listSpaces();
      final materials = await repository.listMaterials();
      if (!mounted) return;
      setState(() {
        _spaces = spaces;
        _materials = materials;
        _selectedSpaceId ??= spaces.isEmpty ? null : spaces.first.id;
      });
      _resumePendingMaterials(materials);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  void _resumePendingMaterials(List<MaterialItem> materials) {
    for (final material in materials) {
      if (material.status == MaterialStatus.uploaded || material.status == MaterialStatus.error) {
        unawaited(_prepareMaterial(material, showSuccessMessage: false));
      }
    }
  }

  Future<void> _createSpace() async {
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => const _CreateStudySpaceDialog(),
    );
    if (created == true) await _load();
  }

  Future<void> _upload() async {
    final spaceId = _selectedSpaceId;
    if (spaceId == null) {
      setState(() => _error = 'Create a study space first.');
      return;
    }
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: true,
      withData: true,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'docx', 'txt', 'mp3', 'wav', 'mp4'],
    );
    if (result == null || result.files.isEmpty) return;
    setState(() {
      _busyId = 'upload';
      _error = null;
    });
    try {
      final batch = await repository.uploadMaterials(studySpaceId: spaceId, files: result.files);
      await _load();
      if (mounted) {
        for (final item in batch.items) {
          unawaited(_prepareMaterial(item, showSuccessMessage: false));
        }
        if (batch.items.isNotEmpty) {
          final count = batch.items.length;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$count file${count == 1 ? '' : 's'} uploaded. Preparing for Feed.')),
          );
        }
        if (batch.failures.isNotEmpty) {
          final first = batch.failures.first;
          final more = batch.failures.length - 1;
          final suffix = more > 0 ? ' (+$more more)' : '';
          setState(() {
            _error = 'Some files failed: ${first.fileName}$suffix — ${first.error}';
          });
        }
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _prepareMaterial(MaterialItem material, {required bool showSuccessMessage}) async {
    if (_preparingIds.contains(material.id)) return;
    if (!mounted) return;
    setState(() => _preparingIds.add(material.id));
    try {
      await repository.prepareMaterialForFeed(material.id);
      await _load();
      if (mounted && showSuccessMessage) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Your file is ready. Open Feed to start studying.')),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
      await _load();
    } finally {
      if (mounted) {
        setState(() => _preparingIds.remove(material.id));
      }
    }
  }

  Future<bool> _confirmDeleteMaterial(MaterialItem material) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Delete file?'),
        content: Text(
          'Delete "${material.name}" from this space? This also removes generated learning content from this file.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    return confirmed == true;
  }

  Future<void> _deleteMaterial(MaterialItem material) async {
    final confirmed = await _confirmDeleteMaterial(material);
    if (!confirmed) return;
    if (!mounted) return;
    setState(() {
      _busyId = 'delete:${material.id}';
      _error = null;
    });
    try {
      await repository.deleteMaterial(material.id);
      _preparingIds.remove(material.id);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('File deleted.')),
        );
      }
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  String _materialStatusLabel(MaterialItem material) {
    if (_preparingIds.contains(material.id) ||
        material.status == MaterialStatus.uploaded ||
        material.status == MaterialStatus.processing) {
      return 'Preparing for Feed…';
    }
    return switch (material.status) {
      MaterialStatus.ready => 'Added to your library',
      MaterialStatus.uploadFailed => 'Upload failed',
      MaterialStatus.error => 'Could not prepare — tap retry',
      MaterialStatus.created => 'Uploading…',
      _ => 'Preparing for Feed…',
    };
  }

  bool _showMaterialProgress(MaterialItem material) {
    if (material.status == MaterialStatus.uploadFailed || material.status == MaterialStatus.error) {
      return false;
    }
    return _preparingIds.contains(material.id) ||
        material.status == MaterialStatus.uploaded ||
        material.status == MaterialStatus.processing;
  }

  int _materialCountFor(String? spaceId) {
    if (spaceId == null) return _materials.length;
    return _materials.where((item) => item.studySpaceId == spaceId).length;
  }

  IconData _fileIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return Icons.picture_as_pdf_outlined;
    if (lower.endsWith('.mp3') || lower.endsWith('.wav')) return Icons.audiotrack_outlined;
    if (lower.endsWith('.mp4')) return Icons.movie_outlined;
    if (lower.endsWith('.docx')) return Icons.description_outlined;
    return Icons.insert_drive_file_outlined;
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final selectedMaterials = _selectedSpaceId == null
        ? _materials
        : _materials.where((item) => item.studySpaceId == _selectedSpaceId).toList();
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final readyCount = selectedMaterials.where((m) => m.status == MaterialStatus.ready).length;

    return ClinicalSectionBackground(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 14, 20, 0),
            child: ClinicalSectionHeader(
              title: l10n.libraryTitle,
              subtitle: l10n.librarySubtitle,
            ),
          ),
          const SizedBox(height: 14),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
                children: [
                  if (_error != null) ...[
                    const SizedBox(height: 16),
                    ClinicalGlassCard(
                      tint: Colors.red.withValues(alpha: isDark ? 0.14 : 0.08),
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(_error!, style: TextStyle(color: Colors.red.shade800, height: 1.4)),
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      const Expanded(child: ClinicalSectionLabel('Subjects')),
                      TextButton.icon(
                        onPressed: _createSpace,
                        icon: const Icon(Icons.add_rounded, size: 18),
                        label: const Text('New'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  if (_spaces.isEmpty)
                    ClinicalGlassCard(
                      tint: theme.colorScheme.primary.withValues(alpha: isDark ? 0.12 : 0.08),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Create your first subject',
                            style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Subjects organize materials for Feed, Live Tutor, and Study Tools.',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                              height: 1.45,
                            ),
                          ),
                          const SizedBox(height: 14),
                          FilledButton(
                            onPressed: _createSpace,
                            style: FilledButton.styleFrom(shape: const StadiumBorder()),
                            child: const Text('Create subject'),
                          ),
                        ],
                      ),
                    )
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 10,
                        crossAxisSpacing: 10,
                        childAspectRatio: 1.05,
                      ),
                      itemCount: _spaces.length,
                      itemBuilder: (context, index) {
                        final space = _spaces[index];
                        final selected = space.id == _selectedSpaceId;
                        final count = _materialCountFor(space.id);
                        return _LibrarySpaceTile(
                          name: space.name,
                          description: space.description,
                          fileCount: count,
                          selected: selected,
                          onTap: () => setState(() => _selectedSpaceId = space.id),
                        );
                      },
                    ),
                  const SizedBox(height: 16),
                  const ClinicalSectionLabel('Files'),
                  const SizedBox(height: 8),
                  Text(
                    '${selectedMaterials.length} file${selectedMaterials.length == 1 ? '' : 's'} · $readyCount feed ready',
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 10),
                  if (selectedMaterials.isEmpty)
                    const ClinicalGlassCard(
                      child: Text(
                        'No files yet. Tap Add material to upload PDF, DOCX, TXT, MP3, WAV, or MP4.',
                      ),
                    ),
                  if (_busyId == 'upload') ...[
                    const SizedBox(height: 12),
                    const LinearProgressIndicator(minHeight: 4, borderRadius: BorderRadius.all(Radius.circular(16))),
                  ],
                  ...selectedMaterials.map(_materialCard),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _materialCard(MaterialItem material) {
    final preparing = _preparingIds.contains(material.id);
    final deleting = _busyId == 'delete:${material.id}';
    final ready = material.status == MaterialStatus.ready && !preparing;
    final failed = material.status == MaterialStatus.error || material.status == MaterialStatus.uploadFailed;
    final showProgress = _showMaterialProgress(material) && !failed;
    final theme = Theme.of(context);
    final primary = theme.colorScheme.primary;

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: ClinicalGlassCard(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: primary.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(_fileIcon(material.name), color: primary, size: 24),
                ),
                if (ready)
                  Positioned(
                    right: -4,
                    bottom: -4,
                    child: Container(
                      padding: const EdgeInsets.all(2),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.check_circle_rounded, color: Colors.green.shade600, size: 18),
                    ),
                  ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    material.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  _MaterialStatusPill(
                    label: _materialStatusLabel(material),
                    ready: ready,
                    failed: failed,
                  ),
                  if (showProgress) ...[
                    const SizedBox(height: 10),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: LinearProgressIndicator(
                        minHeight: 4,
                        backgroundColor: primary.withValues(alpha: 0.12),
                        color: primary,
                      ),
                    ),
                  ],
                  if (failed && material.ingestionError != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      material.ingestionError!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Colors.red.shade700, fontSize: 11, height: 1.35),
                    ),
                  ],
                ],
              ),
            ),
            if (preparing || deleting)
              Padding(
                padding: const EdgeInsets.only(left: 8, top: 4),
                child: SizedBox.square(
                  dimension: 22,
                  child: CircularProgressIndicator(strokeWidth: 2, color: primary),
                ),
              )
            else
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (material.status == MaterialStatus.error)
                    IconButton(
                      onPressed: () => _prepareMaterial(material, showSuccessMessage: true),
                      icon: const Icon(Icons.refresh_rounded),
                      tooltip: 'Try again',
                    ),
                  IconButton(
                    onPressed: () => _deleteMaterial(material),
                    icon: const Icon(Icons.delete_outline_rounded),
                    tooltip: 'Delete file',
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _LibrarySpaceTile extends StatelessWidget {
  const _LibrarySpaceTile({
    required this.name,
    required this.description,
    required this.fileCount,
    required this.selected,
    required this.onTap,
  });

  final String name;
  final String? description;
  final int fileCount;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return ClinicalGlassCard(
      onTap: onTap,
      tint: selected
                          ? (isDark ? theme.colorScheme.primary.withValues(alpha: 0.16) : theme.colorScheme.primary.withValues(alpha: 0.10))
          : null,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: (selected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant).withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.class_outlined,
                  size: 18,
                  color: selected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const Spacer(),
              if (selected)
                Icon(Icons.check_circle_rounded, size: 18, color: theme.colorScheme.primary),
            ],
          ),
          const Spacer(),
          Text(
            name,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w800, height: 1.2),
          ),
          if (description != null && description!.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              description!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            '$fileCount file${fileCount == 1 ? '' : 's'}',
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _MaterialStatusPill extends StatelessWidget {
  const _MaterialStatusPill({
    required this.label,
    required this.ready,
    required this.failed,
  });

  final String label;
  final bool ready;
  final bool failed;

  @override
  Widget build(BuildContext context) {
    final color = ready
        ? Colors.green.shade700
        : failed
            ? Colors.red.shade700
            : Theme.of(context).colorScheme.onSurfaceVariant;
    final bg = ready
        ? Colors.green.withValues(alpha: 0.12)
        : failed
            ? Colors.red.withValues(alpha: 0.1)
            : Theme.of(context).colorScheme.surfaceContainerHighest;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(LsRadii.pill),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w700),
      ),
    );
  }
}

class _CreateStudySpaceDialog extends ConsumerStatefulWidget {
  const _CreateStudySpaceDialog();

  @override
  ConsumerState<_CreateStudySpaceDialog> createState() => _CreateStudySpaceDialogState();
}

class _CreateStudySpaceDialogState extends ConsumerState<_CreateStudySpaceDialog> {
  final _name = TextEditingController();
  final _description = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _name.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_name.text.trim().length < 2) {
      setState(() => _error = 'Enter a subject name (at least 2 characters).');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(studyRepositoryProvider).createSpace(_name.text, _description.text);
      if (!mounted) return;
      FocusManager.instance.primaryFocus?.unfocus();
      Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = '$error';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final width = MediaQuery.sizeOf(context).width;
    final dialogWidth = width >= 520 ? 440.0 : width * 0.92;

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: dialogWidth),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'New study space',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                'Give this subject a clear name so Feed and Learn stay organized.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),
              TextField(
                controller: _name,
                autofocus: true,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Subject name',
                  hintText: 'e.g. Partnership Development',
                ),
                enabled: !_busy,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _description,
                maxLines: 3,
                minLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  alignLabelWithHint: true,
                ),
                enabled: !_busy,
              ),
              if (_error != null) ...[
                const SizedBox(height: 14),
                Text(_error!, style: TextStyle(color: Colors.red.shade700, fontSize: 13)),
              ],
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _busy ? null : () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                        foregroundColor: theme.colorScheme.onSurface,
                      ),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: FilledButton(
                      onPressed: _busy ? null : _submit,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(48),
                      ),
                      child: _busy
                          ? const SizedBox.square(
                              dimension: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Create'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
