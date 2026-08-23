/// Helpers for live-tutor subtitle text: scrub markup, merge stream deltas,
/// dedupe repeated paragraphs, and window the last few sentences.
library;

final _channelOpen = RegExp(r'<\|channel>\w+\s*');
final _channelClose = RegExp(r'<channel\|>');
final _speechJson = RegExp(
  r'''\{\s*["']?speech["']?\s*:\s*["']([^"']*)["']\s*\}''',
  caseSensitive: false,
);
final _speechLeftover = RegExp(
  r'''^\s*\{?\s*["']?speech["']?\s*:?\s*["']?''',
  caseSensitive: false,
);
final _whitespace = RegExp(r'\s');
final _punctuation = RegExp(r'[.!?,;:]');

/// Strip Gemma / speech-channel markup. Does **not** trim edges so token
/// spaces survive until the final display string is built.
String scrubSpeechMarkup(String text) {
  var next = text;
  next = next.replaceAll(_channelOpen, '');
  next = next.replaceAll(_channelClose, '');
  next = next.replaceAllMapped(_speechJson, (match) => match.group(1) ?? '');
  next = next.replaceAll(_speechLeftover, '');
  return next;
}

/// Merge an incoming stream chunk into the current utterance.
///
/// Supports cumulative snapshots (keep the longer prefix) and token deltas
/// (append, inserting a space when both sides lack whitespace/punctuation).
String mergeCaptionText(String current, String incoming) {
  if (incoming.isEmpty) return current;
  if (current.isEmpty) return incoming;
  if (incoming == current) return current;
  if (incoming.startsWith(current)) return incoming;
  if (current.startsWith(incoming)) return current;
  return _appendCaptionToken(current, incoming);
}

String _appendCaptionToken(String left, String right) {
  final leftEnd = left[left.length - 1];
  final rightStart = right[0];
  final leftOk = !_whitespace.hasMatch(leftEnd) && !_punctuation.hasMatch(leftEnd);
  final rightOk = !_whitespace.hasMatch(rightStart) && !_punctuation.hasMatch(rightStart);
  if (leftOk && rightOk) {
    return '$left $right';
  }
  return '$left$right';
}

/// Collapse a blob that is the same paragraph twice (with or without a space).
String dedupeDoubledParagraph(String text) {
  final t = text;
  if (t.length < 2) return t;

  if (t.length.isEven) {
    final mid = t.length ~/ 2;
    final a = t.substring(0, mid);
    final b = t.substring(mid);
    if (a == b) return a;
  }

  final spaced = RegExp(r'^(.+?)\s+\1$', dotAll: true).firstMatch(t);
  if (spaced != null) {
    return spaced.group(1)!;
  }
  return t;
}

/// Split on sentence-ending punctuation even when no space follows, drop
/// consecutive identical sentences, and keep the last [count].
String lastCaptionSentences(String text, int count) {
  final parts = <String>[];
  final buffer = StringBuffer();

  for (var i = 0; i < text.length; i++) {
    final ch = text[i];
    buffer.write(ch);
    if ('.!?'.contains(ch)) {
      while (i + 1 < text.length && '.!?'.contains(text[i + 1])) {
        i++;
        buffer.write(text[i]);
      }
      final part = buffer.toString().trim();
      buffer.clear();
      if (part.isNotEmpty) parts.add(part);
      while (i + 1 < text.length && _whitespace.hasMatch(text[i + 1])) {
        i++;
      }
    }
  }

  final trailing = buffer.toString().trim();
  if (trailing.isNotEmpty) parts.add(trailing);

  final deduped = <String>[];
  for (final part in parts) {
    if (deduped.isNotEmpty && deduped.last == part) continue;
    deduped.add(part);
  }

  if (deduped.isEmpty) return text.trim();
  if (deduped.length <= count) return deduped.join(' ');
  return deduped.sublist(deduped.length - count).join(' ');
}

/// Build the final on-screen caption from joined utterance text.
String buildLiveTutorCaption(
  String body, {
  required bool fromLearner,
  int sentenceCount = 2,
}) {
  if (body.trim().isEmpty) return '';
  final window = lastCaptionSentences(dedupeDoubledParagraph(body), sentenceCount).trim();
  if (window.isEmpty) return '';
  return fromLearner ? 'You: $window' : window;
}
