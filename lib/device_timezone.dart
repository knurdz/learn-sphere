import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

bool isIanaTimezoneId(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return false;
  if (trimmed == 'UTC' || trimmed == 'GMT') return true;
  return trimmed.contains('/');
}

String ianaTimezoneIdFrom(Object timezone) {
  if (timezone is String && isIanaTimezoneId(timezone)) return timezone.trim();
  try {
    final identifier = (timezone as dynamic).identifier;
    if (identifier is String && isIanaTimezoneId(identifier)) return identifier.trim();
  } catch (_) {}
  return 'UTC';
}

/// IANA timezone id for gamification streaks (e.g. `Asia/Kolkata`).
/// Never send abbreviations like `IST` to the API — Intl cannot parse them.
Future<String> readDeviceTimezone() async {
  try {
    final timezone = await FlutterTimezone.getLocalTimezone();
    return ianaTimezoneIdFrom(timezone);
  } catch (_) {
    return 'UTC';
  }
}

final deviceTimezoneProvider = FutureProvider<String>((ref) => readDeviceTimezone());
