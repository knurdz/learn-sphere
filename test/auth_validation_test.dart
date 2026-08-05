import 'package:flutter_test/flutter_test.dart';
import 'package:learnsphere_mobile/auth_validation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

void main() {
  test('isValidEmailOtp accepts six digits', () {
    expect(isValidEmailOtp('123456'), isTrue);
    expect(isValidEmailOtp(' 654321 '), isTrue);
  });

  test('isValidEmailOtp rejects invalid codes', () {
    expect(isValidEmailOtp(null), isFalse);
    expect(isValidEmailOtp('12345'), isFalse);
    expect(isValidEmailOtp('abcdef'), isFalse);
  });

  test('authErrorMessage maps invalid OTP to friendly copy', () {
    const error = AuthException('The OTP provided is invalid or has expired');
    expect(
      authErrorMessage(error),
      "That code doesn't match. Check the 6 digits from your latest email, or tap Resend code.",
    );
  });

  test('authErrorMessage maps explicit expiry to expired copy', () {
    const error = AuthException('The OTP has expired', statusCode: '400', code: 'otp_expired');
    expect(
      authErrorMessage(error),
      'That code has expired. Tap Resend code to get a new one.',
    );
  });
}
