import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// IANA timezone id for gamification streaks (e.g. `Asia/Kolkata`).
Future<String> readDeviceTimezone() async {
  try {
    final timezone = await FlutterTimezone.getLocalTimezone();
    if (timezone.trim().isNotEmpty) return timezone.trim();
  } catch (_) {
    // fall through
  }
  return DateTime.now().timeZoneName;
}

final deviceTimezoneProvider = FutureProvider<String>((ref) => readDeviceTimezone());
