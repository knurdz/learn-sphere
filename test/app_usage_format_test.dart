import 'package:flutter_test/flutter_test.dart';

import 'package:learnsphere_mobile/app_usage_provider.dart';

void main() {
  test('formatForegroundMinutes shows seconds under one minute', () {
    expect(formatForegroundMinutes(0), '0s');
    expect(formatForegroundMinutes(12), '12s');
    expect(formatForegroundMinutes(59), '59s');
  });

  test('formatForegroundMinutes stays compact for minutes and hours', () {
    expect(formatForegroundMinutes(60), '1m');
    expect(formatForegroundMinutes(45 * 60), '45m');
    expect(formatForegroundMinutes(60 * 60), '1h');
    expect(formatForegroundMinutes(90 * 60), '1h 30m');
  });

  test('clampForegroundDeltaSeconds caps a single POST chunk at four hours', () {
    expect(clampForegroundDeltaSeconds(0), 0);
    expect(clampForegroundDeltaSeconds(-3), 0);
    expect(clampForegroundDeltaSeconds(90), 90);
    expect(clampForegroundDeltaSeconds(maxForegroundDeltaSeconds + 1), maxForegroundDeltaSeconds);
  });
}
