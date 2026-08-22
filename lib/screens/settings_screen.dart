import 'package:cached_network_image/cached_network_image.dart';
import 'package:dice_bear/dice_bear.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../auth_controller.dart';
import '../avatar_utils.dart';
import '../gamification_provider.dart';
import '../profile_repository.dart';
import '../settings_provider.dart';
import '../widgets/user_avatar.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  bool _avatarBusy = false;
  String? _avatarError;
  bool _goalBusy = false;

  String _formatAvatarError(Object error) {
    if (error is FormatException) return error.message;

    // Avoid surfacing raw exception text (which can include dev error codes).
    final message = error.toString().toLowerCase();
    final looksLikeNetworkIssue = message.contains('timeout') ||
        message.contains('connection') ||
        message.contains('socketexception') ||
        message.contains('network') ||
        message.contains('failed to fetch') ||
        message.contains('connect');

    if (looksLikeNetworkIssue) {
      return 'Could not reach the server. Please check your internet connection and try again.';
    }
    return 'Could not update your avatar. Please try again.';
  }

  Future<void> _changeDailyGoal(int nextGoal) async {
    if (_goalBusy) return;
    setState(() => _goalBusy = true);
    try {
      await ref.read(gamificationProvider.notifier).updateDailyGoal(nextGoal);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not update your daily goal.\n$error')),
        );
      }
    } finally {
      if (mounted) setState(() => _goalBusy = false);
    }
  }

  Future<void> _pickPhoto() async {
    setState(() {
      _avatarBusy = true;
      _avatarError = null;
    });
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        withData: true,
      );
      final file = result?.files.single;
      if (file == null) return;
      await ref.read(profileProvider.notifier).uploadAvatar(file);
    } catch (error) {
      if (mounted) setState(() => _avatarError = _formatAvatarError(error));
    } finally {
      if (mounted) setState(() => _avatarBusy = false);
    }
  }

  Future<void> _pickDiceBear(DiceBearStyle style) async {
    final userId = Supabase.instance.client.auth.currentUser?.id;
    if (userId == null) return;
    setState(() {
      _avatarBusy = true;
      _avatarError = null;
    });
    try {
      final url = diceBearAvatarUrl(seed: '$userId-${style.name}', style: style);
      await ref.read(profileProvider.notifier).setAvatarUrl(url);
    } catch (error) {
      if (mounted) setState(() => _avatarError = _formatAvatarError(error));
    } finally {
      if (mounted) setState(() => _avatarBusy = false);
    }
  }

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Sign out?'),
        content: const Text('Are you sure you want to sign out of your account?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );

    if (!mounted || confirmed != true) return;
    await ref.read(authControllerProvider.notifier).signOut();
    if (mounted) context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    final settings = ref.watch(settingsProvider);
    final profile = ref.watch(profileProvider);
    final summary = ref.watch(gamificationProvider).valueOrNull;
    final theme = Theme.of(context);
    final user = Supabase.instance.client.auth.currentUser;
    final googlePhoto = user != null ? googlePhotoFromUser(user) : null;
    final showGoogleRestore = googlePhoto != null && userSignedInWithGoogle(user!);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: FilledButton.tonalIcon(
              onPressed: () => context.push('/progress'),
              icon: const Icon(Icons.analytics_outlined, size: 18),
              label: const Text('Analytics'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                minimumSize: const Size(0, 36),
              ),
            ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 8),
            child: Text('ACCOUNT', style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800, color: theme.colorScheme.primary, letterSpacing: 1.2)),
          ),
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.15)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const UserAvatar(radius: 36, showRing: true),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile.valueOrNull?.displayName ?? 'Student',
                              style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                            ),
                            if (user?.email != null)
                              Text(
                                user!.email!,
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_avatarError != null) ...[
                    const SizedBox(height: 16),
                    Text(_avatarError!, style: TextStyle(color: theme.colorScheme.error)),
                  ],
                  const SizedBox(height: 24),
                  Wrap(
                    spacing: 12,
                    runSpacing: 12,
                    children: [
                      FilledButton.tonalIcon(
                        onPressed: _avatarBusy ? null : _pickPhoto,
                        icon: _avatarBusy
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.upload_outlined, size: 20),
                        label: const Text('Upload photo'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(0, 44),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                        ),
                      ),
                      if (showGoogleRestore)
                        OutlinedButton.icon(
                          onPressed: _avatarBusy
                              ? null
                              : () => ref.read(profileProvider.notifier).useGooglePhoto(),
                          icon: const Icon(Icons.account_circle_outlined, size: 20),
                          label: const Text('Use Google photo'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 44),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Choose an avatar',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 64,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: pickableAvatarStyles.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 12),
                      itemBuilder: (context, index) {
                        final style = pickableAvatarStyles[index];
                        final userId = user?.id ?? 'guest';
                        final previewUrl = diceBearAvatarUrl(seed: '$userId-${style.name}', style: style, size: 128);
                        return InkWell(
                          onTap: _avatarBusy
                              ? null
                              : () async {
                                  final confirmed = await showDialog<bool>(
                                    context: context,
                                    builder: (dialogContext) => AlertDialog(
                                      title: const Text('Use this avatar?'),
                                      content: Column(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          ClipOval(
                                            child: SizedBox(
                                              width: 64,
                                              height: 64,
                                              child: CachedNetworkImage(
                                                imageUrl: previewUrl,
                                                width: 64,
                                                height: 64,
                                                fit: BoxFit.cover,
                                                placeholder: (_, __) => SizedBox(
                                                  width: 64,
                                                  height: 64,
                                                  child: const Center(
                                                    child: CircularProgressIndicator(strokeWidth: 2),
                                                  ),
                                                ),
                                                errorWidget: (_, __, ___) => SizedBox(
                                                  width: 64,
                                                  height: 64,
                                                  child: const Center(child: Icon(Icons.person_outline)),
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 12),
                                          Text('This will update your profile picture.')
                                        ],
                                      ),
                                      actions: [
                                        TextButton(
                                          onPressed: () => Navigator.of(dialogContext).pop(false),
                                          child: const Text('Cancel'),
                                        ),
                                        FilledButton(
                                          onPressed: () => Navigator.of(dialogContext).pop(true),
                                          child: const Text('Confirm'),
                                        ),
                                      ],
                                    ),
                                  );

                                  if (!context.mounted) return;
                                  if (confirmed != true) return;
                                  await _pickDiceBear(style);
                                },
                          borderRadius: BorderRadius.circular(32),
                          child: CircleAvatar(
                            radius: 32,
                            backgroundColor: theme.colorScheme.surfaceContainerHighest,
                            child: ClipOval(
                              child: CachedNetworkImage(
                                imageUrl: previewUrl,
                                width: 64,
                                height: 64,
                                fit: BoxFit.cover,
                                placeholder: (_, __) => SizedBox(
                                  width: 64,
                                  height: 64,
                                  child: Center(
                                    child: SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                                      ),
                                    ),
                                  ),
                                ),
                                errorWidget: (_, __, ___) => Icon(
                                  Icons.person_outline,
                                  size: 40,
                                  color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.15)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: theme.colorScheme.primaryContainer,
                        child: const Text('🔥'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              summary == null
                                  ? 'Progress snapshot'
                                  : '${summary.currentStreak}-day streak · ${summary.totalXp} XP',
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              summary == null
                                  ? 'Open Analytics to view your activity progress.'
                                  : summary.dailyGoalMet
                                      ? 'Daily goal completed. Keep going if you want extra XP.'
                                      : 'Today: ${summary.todayEventCount.clamp(0, summary.dailyGoal <= 0 ? 1 : summary.dailyGoal)}/${summary.dailyGoal <= 0 ? 1 : summary.dailyGoal}',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.65),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  FilledButton.tonalIcon(
                    onPressed: () => context.push('/progress'),
                    icon: const Icon(Icons.analytics_outlined, size: 18),
                    label: const Text('Open Analytics'),
                  ),
                  if (summary != null) ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Daily goal',
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Fewer activities',
                          onPressed: _goalBusy || summary.dailyGoal <= 1
                              ? null
                              : () => _changeDailyGoal(summary.dailyGoal - 1),
                          icon: const Icon(Icons.remove_circle_outline),
                        ),
                        Text(
                          '${summary.dailyGoal}',
                          style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        IconButton(
                          tooltip: 'More activities',
                          onPressed: _goalBusy || summary.dailyGoal >= 50
                              ? null
                              : () => _changeDailyGoal(summary.dailyGoal + 1),
                          icon: const Icon(Icons.add_circle_outline),
                        ),
                      ],
                    ),
                    Text(
                      'How many study activities count as a full day.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.65),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 8),
            child: Text('APPEARANCE', style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800, color: theme.colorScheme.primary, letterSpacing: 1.2)),
          ),
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.15)),
            ),
            child: Column(
              children: [
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.brightness_6_outlined, color: theme.colorScheme.primary),
                  ),
                  title: const Text('Theme Mode', style: TextStyle(fontWeight: FontWeight.w600)),
                  trailing: DropdownButton<AppThemeMode>(
                    value: settings.themeMode,
                    underline: const SizedBox(),
                    icon: const Icon(Icons.keyboard_arrow_down_rounded),
                    borderRadius: BorderRadius.circular(16),
                    items: const [
                      DropdownMenuItem(value: AppThemeMode.system, child: Text('System')),
                      DropdownMenuItem(value: AppThemeMode.light, child: Text('Light')),
                      DropdownMenuItem(value: AppThemeMode.dark, child: Text('Dark')),
                    ],
                    onChanged: (mode) {
                      if (mode != null) {
                        ref.read(settingsProvider.notifier).setThemeMode(mode);
                      }
                    },
                  ),
                ),
                Divider(height: 1, color: theme.colorScheme.outline.withValues(alpha: 0.1)),
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.palette_outlined, color: theme.colorScheme.primary),
                  ),
                  title: const Text('Color Theme', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Wrap(
                      spacing: 12,
                      children: [
                        _ColorOption(color: 0xFF059669, selected: settings.colorTheme == 0xFF059669),
                        _ColorOption(color: 0xFF2563EB, selected: settings.colorTheme == 0xFF2563EB),
                        _ColorOption(color: 0xFF7C3AED, selected: settings.colorTheme == 0xFF7C3AED),
                        _ColorOption(color: 0xFFDB2777, selected: settings.colorTheme == 0xFFDB2777),
                        _ColorOption(color: 0xFFEA580C, selected: settings.colorTheme == 0xFFEA580C),
                      ],
                    ),
                  ),
                ),
                Divider(height: 1, color: theme.colorScheme.outline.withValues(alpha: 0.1)),
                ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.style_outlined, color: theme.colorScheme.primary),
                  ),
                  title: const Text('Card Tone', style: TextStyle(fontWeight: FontWeight.w600)),
                  trailing: DropdownButton<AppCardTone>(
                    value: settings.cardTone,
                    underline: const SizedBox(),
                    icon: const Icon(Icons.keyboard_arrow_down_rounded),
                    borderRadius: BorderRadius.circular(16),
                    items: const [
                      DropdownMenuItem(value: AppCardTone.defaultTone, child: Text('Default')),
                      DropdownMenuItem(value: AppCardTone.colorful, child: Text('Colorful')),
                      DropdownMenuItem(value: AppCardTone.single, child: Text('Single Tone')),
                    ],
                    onChanged: (tone) {
                      if (tone != null) {
                        ref.read(settingsProvider.notifier).setCardTone(tone);
                      }
                    },
                  ),
                ),
                Divider(height: 1, color: theme.colorScheme.outline.withValues(alpha: 0.1)),
                SwitchListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 4),
                  secondary: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.smart_toy_outlined, color: theme.colorScheme.primary),
                  ),
                  title: const Text('Show coach mascot', style: TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: const Text('Hide Sphere and coach tips on the main screens'),
                  value: settings.showCoachMascot,
                  onChanged: (enabled) {
                    ref.read(settingsProvider.notifier).setShowCoachMascot(enabled);
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Padding(
            padding: const EdgeInsets.only(left: 8, bottom: 8),
            child: Text('ABOUT', style: theme.textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w800, color: theme.colorScheme.primary, letterSpacing: 1.2)),
          ),
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(24),
              side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.15)),
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 18),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surfaceContainerHighest,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.code, size: 28, color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Designed and developed by',
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Team Knurdz Neural',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 40),
          FilledButton.icon(
            onPressed: _signOut,
            icon: const Icon(Icons.logout_outlined),
            label: const Text('Sign out'),
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(56),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class _ColorOption extends ConsumerWidget {
  const _ColorOption({required this.color, required this.selected});

  final int color;
  final bool selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GestureDetector(
      onTap: () => ref.read(settingsProvider.notifier).setColorTheme(color),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: Color(color),
          shape: BoxShape.circle,
          border: selected ? Border.all(color: Theme.of(context).colorScheme.onSurface, width: 2) : null,
        ),
        child: selected ? const Icon(Icons.check, size: 16, color: Colors.white) : null,
      ),
    );
  }
}
