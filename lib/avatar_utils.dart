import 'package:dice_bear/dice_bear.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// DiceBear styles offered when picking a generated avatar in Settings.
const pickableAvatarStyles = <DiceBearStyle>[
  DiceBearStyle.avataaars,
  DiceBearStyle.notionists,
  DiceBearStyle.lorelei,
  DiceBearStyle.micah,
  DiceBearStyle.adventurer,
  DiceBearStyle.funEmoji,
];

String diceBearAvatarUrl({
  required String seed,
  DiceBearStyle style = DiceBearStyle.avataaars,
  int size = 256,
}) {
  return DiceBearRequest(
    style: style,
    format: DiceBearFormat.png,
    coreOptions: DiceBearCoreOptions(seed: seed, size: size),
  ).uri.toString();
}

String? googlePhotoFromUser(User user) {
  final meta = user.userMetadata;
  if (meta == null) return null;
  final fromMeta = meta['avatar_url'] ?? meta['picture'];
  if (fromMeta is String && fromMeta.trim().isNotEmpty) {
    return fromMeta.trim();
  }
  for (final identity in user.identities ?? const []) {
    final data = identity.identityData;
    if (data == null) continue;
    final fromIdentity = data['avatar_url'] ?? data['picture'];
    if (fromIdentity is String && fromIdentity.trim().isNotEmpty) {
      return fromIdentity.trim();
    }
  }
  return null;
}

bool userSignedInWithGoogle(User user) {
  return user.appMetadata['provider'] == 'google' ||
      (user.identities ?? []).any((id) => id.provider == 'google');
}
