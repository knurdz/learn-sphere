import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth_controller.dart';
import '../models.dart';
import '../repositories.dart';

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

  StudyRepository get repository => ref.read(studyRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _load();
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
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    }
  }

  Future<void> _createSpace() async {
    final name = TextEditingController();
    final description = TextEditingController();
    final created = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New study space'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [TextField(controller: name, autofocus: true, decoration: const InputDecoration(labelText: 'Subject name')), const SizedBox(height: 12), TextField(controller: description, maxLines: 2, decoration: const InputDecoration(labelText: 'Description (optional)'))]),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () async { if (name.text.trim().length < 2) return; await repository.createSpace(name.text, description.text); if (context.mounted) Navigator.pop(context, true); }, child: const Text('Create'))],
      ),
    );
    name.dispose();
    description.dispose();
    if (created == true) await _load();
  }

  Future<void> _upload() async {
    final spaceId = _selectedSpaceId;
    if (spaceId == null) {
      setState(() => _error = 'Create a study space first.');
      return;
    }
    final result = await FilePicker.platform.pickFiles(
      allowMultiple: false,
      withData: false,
      type: FileType.custom,
      allowedExtensions: ['pdf', 'docx', 'txt', 'mp3', 'wav', 'mp4'],
    );
    if (result == null || result.files.isEmpty) return;
    setState(() {
      _busyId = 'upload';
      _error = null;
    });
    try {
      await repository.uploadMaterial(studySpaceId: spaceId, file: result.files.single);
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _ingest(MaterialItem material) async {
    setState(() => _busyId = material.id);
    try {
      await repository.ingest(material);
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _generate(MaterialItem material) async {
    setState(() => _busyId = material.id);
    try {
      await repository.generateLearning(material);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Learning pack generated. Open Learn to study it.')));
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final selectedMaterials = _selectedSpaceId == null ? _materials : _materials.where((item) => item.studySpaceId == _selectedSpaceId).toList();
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 48, 20, 28),
        children: [
          Row(children: [Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Your library', style: Theme.of(context).textTheme.labelLarge?.copyWith(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700, letterSpacing: 1.2)), const SizedBox(height: 8), Text('Build a calmer place to study.', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700))])), IconButton(onPressed: () => ref.read(authControllerProvider.notifier).signOut().then((_) { if (context.mounted) context.go('/login'); }), icon: const Icon(Icons.logout_outlined), tooltip: 'Sign out')]),
          const SizedBox(height: 22),
          if (_error != null) ...[Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(16)), child: Text(_error!, style: TextStyle(color: Colors.red.shade800))), const SizedBox(height: 14)],
          Card(child: Padding(padding: const EdgeInsets.all(18), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Row(children: [const Expanded(child: Text('Study spaces', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700))), TextButton.icon(onPressed: _createSpace, icon: const Icon(Icons.add), label: const Text('New'))]), const SizedBox(height: 12), if (_spaces.isEmpty) const Text('Create a subject before adding material.') else DropdownButtonFormField<String>(value: _selectedSpaceId, decoration: const InputDecoration(prefixIcon: Icon(Icons.book_outlined), labelText: 'Current subject'), items: _spaces.map((space) => DropdownMenuItem(value: space.id, child: Text(space.name))).toList(), onChanged: (value) => setState(() => _selectedSpaceId = value))]))),
          const SizedBox(height: 16),
          FilledButton.icon(onPressed: _busyId == 'upload' ? null : _upload, icon: _busyId == 'upload' ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.upload_file_outlined), label: const Text('Upload material')),
          const SizedBox(height: 24),
          Text('${selectedMaterials.length} material${selectedMaterials.length == 1 ? '' : 's'}', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          if (selectedMaterials.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(22), child: Text('PDF, DOCX, TXT, MP3, WAV, and MP4 files up to 25 MB are supported.'))),
          ...selectedMaterials.map(_materialCard),
        ],
      ),
    );
  }

  Widget _materialCard(MaterialItem material) {
    final busy = _busyId == material.id;
    final canIndex = material.status == MaterialStatus.uploaded || material.status == MaterialStatus.error;
    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(width: 46, height: 46, decoration: BoxDecoration(color: Theme.of(context).colorScheme.primaryContainer, borderRadius: BorderRadius.circular(14)), child: Center(child: Text(material.mimeType.split('/').last.toUpperCase().take(3), style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w800)))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(material.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)), const SizedBox(height: 5), Text(material.status.label, style: TextStyle(color: material.status == MaterialStatus.ready ? Colors.green.shade700 : Colors.blueGrey, fontSize: 12)), if (material.ingestionError != null) Text(material.ingestionError!, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: Colors.red.shade700, fontSize: 12))])),
            if (busy) const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2)) else if (canIndex) IconButton(onPressed: () => _ingest(material), icon: const Icon(Icons.manage_search_outlined), tooltip: 'Index') else if (material.status == MaterialStatus.ready) IconButton(onPressed: () => _generate(material), icon: const Icon(Icons.auto_awesome_outlined), tooltip: 'Generate'),
          ]),
        ),
      ),
    );
  }
}

extension on String {
  String take(int count) => length <= count ? this : substring(0, count);
}
