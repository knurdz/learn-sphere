import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../models.dart';

/// Tappable card that opens a bottom sheet to pick a study space.
class StudySpacePickerCard extends StatelessWidget {
  const StudySpacePickerCard({
    required this.spaces,
    required this.selectedId,
    required this.onSelected,
    this.enabled = true,
    super.key,
  });

  final List<StudySpace> spaces;
  final String? selectedId;
  final ValueChanged<String?> onSelected;
  final bool enabled;

  StudySpace? get _selected {
    if (selectedId == null) return null;
    for (final space in spaces) {
      if (space.id == selectedId) return space;
    }
    return null;
  }

  Future<void> _openSheet(BuildContext context) async {
    if (!enabled) return;
    final picked = await showModalBottomSheet<String?>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _StudySpaceSheet(
        spaces: spaces,
        selectedId: selectedId,
      ),
    );
    if (picked != null && context.mounted) {
      onSelected(picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final selected = _selected;

    if (spaces.isEmpty) {
      return Card(
        child: InkWell(
          onTap: enabled ? () => context.go('/library?prompt=createSpace') : null,
          borderRadius: BorderRadius.circular(24),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primaryContainer,
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(Icons.add_circle_outline, color: theme.colorScheme.primary),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No study space yet',
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tap to create a subject in Library',
                        style: theme.textTheme.bodySmall?.copyWith(color: Colors.blueGrey),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right, color: theme.colorScheme.primary),
              ],
            ),
          ),
        ),
      );
    }

    return Card(
      child: InkWell(
        onTap: enabled ? () => _openSheet(context) : null,
        borderRadius: BorderRadius.circular(24),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(Icons.menu_book_rounded, color: theme.colorScheme.primary),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Study space',
                      style: theme.textTheme.labelMedium?.copyWith(
                        color: Colors.blueGrey,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      selected?.name ?? 'Choose a subject',
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
              Icon(Icons.expand_more, color: theme.colorScheme.primary, size: 28),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudySpaceSheet extends StatelessWidget {
  const _StudySpaceSheet({required this.spaces, required this.selectedId});

  final List<StudySpace> spaces;
  final String? selectedId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 0, 8, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: Text(
                'Choose study space',
                style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            Flexible(
              child: ListView(
                shrinkWrap: true,
                children: [
                  for (final space in spaces)
                    ListTile(
                      leading: Icon(
                        Icons.folder_copy_outlined,
                        color: space.id == selectedId ? theme.colorScheme.primary : Colors.blueGrey,
                      ),
                      title: Text(space.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: (space.description ?? '').isNotEmpty
                          ? Text(space.description!, maxLines: 2, overflow: TextOverflow.ellipsis)
                          : null,
                      trailing: space.id == selectedId
                          ? Icon(Icons.check_circle, color: theme.colorScheme.primary)
                          : null,
                      onTap: () => Navigator.pop(context, space.id),
                    ),
                  const Divider(height: 1),
                  ListTile(
                    leading: Icon(Icons.add, color: theme.colorScheme.primary),
                    title: const Text('Add subject in Library'),
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/library?prompt=createSpace');
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

void redirectToCreateStudySpace(BuildContext context, {required String message}) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  context.go('/library?prompt=createSpace');
}
