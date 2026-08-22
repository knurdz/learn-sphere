import 'package:supabase_flutter/supabase_flutter.dart';

bool isValidEmailOtp(String? code) {
  if (code == null) return false;
  return RegExp(r'^\d{6}$').hasMatch(code.trim());
}

const strongPasswordHint = 'Use at least 8 characters with a letter and a number.';

bool isStrongPassword(String? value) {
  if (value == null) return false;
  if (value.length < 8) return false;
  return RegExp(r'[A-Za-z]').hasMatch(value) && RegExp(r'\d').hasMatch(value);
}

String? validateNewPassword(String? value) {
  if (!isStrongPassword(value)) return strongPasswordHint;
  return null;
}

bool looksLikeEmailNotConfirmed(Object error) {
  if (error is AuthException) {
    if (error.code == 'email_not_confirmed') return true;
    return error.message.toLowerCase().contains('email not confirmed');
  }
  return error.toString().toLowerCase().contains('email not confirmed');
}

/// User-facing copy for Supabase Auth errors (avoid raw API messages in the UI).
String authErrorMessage(Object error) {
  if (error is AuthException) {
    final code = error.code ?? '';
    final message = error.message.toLowerCase();

    switch (code) {
      case 'otp_expired':
        return 'That code has expired. Tap Resend code to get a new one.';
      case 'otp_disabled':
        return 'Email codes are not enabled for this project. Contact support.';
      case 'over_email_send_rate_limit':
        return 'Too many emails were sent. Wait a few minutes, then try Resend code.';
      case 'over_request_rate_limit':
        return 'Too many attempts. Please wait a minute and try again.';
      case 'email_exists':
      case 'user_already_exists':
        return 'An account with this email already exists. Sign in instead.';
      case 'email_not_confirmed':
        return 'Confirm your email with the code we sent, then sign in.';
      case 'invalid_credentials':
        return 'Email or password is incorrect.';
      case 'weak_password':
        return 'Choose a stronger password (at least 8 characters with a letter and a number).';
      case 'validation_failed':
        if (_looksLikeOtpError(message)) {
          return _otpMismatchMessage(message);
        }
        break;
    }

    if (_looksLikeOtpError(message)) {
      return _otpMismatchMessage(message);
    }

    if (message.contains('invalid login credentials')) {
      return 'Email or password is incorrect.';
    }

    final trimmed = error.message.trim();
    if (trimmed.isNotEmpty && trimmed.length < 120 && !trimmed.contains('AuthApiException')) {
      return trimmed;
    }
  }

  return 'Something went wrong. Please try again.';
}

/// Supabase uses one message for wrong and expired codes; only say "expired" when explicit.
String _otpMismatchMessage(String messageLower) {
  if (_isExplicitOtpExpired(messageLower)) {
    return 'That code has expired. Tap Resend code to get a new one.';
  }
  return "That code doesn't match. Check the 6 digits from your latest email, or tap Resend code.";
}

bool _isExplicitOtpExpired(String messageLower) {
  if (messageLower.contains('invalid or has expired') ||
      messageLower.contains('invalid or expired')) {
    return false;
  }
  return messageLower.contains('expired') && !messageLower.contains('invalid');
}

bool _looksLikeOtpError(String messageLower) {
  return messageLower.contains('otp') ||
      (messageLower.contains('token') && messageLower.contains('invalid')) ||
      messageLower.contains('invalid or has expired');
}
