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
final _wordChar = RegExp(r'[A-Za-z0-9]');
final _spaceAfterPunct = RegExp(r'([,.!?;:])(\S)');
final _spaceBeforeCapital = RegExp(r'([a-z0-9])([A-Z])');
final _longLetterRun = RegExp(r'[A-Za-z]{10,}');

/// Longest-first lexicon for recovering spaces in glued caption runs.
/// Keep entries that are unlikely to be accidental mid-word substrings when
/// matched greedily from the left of a letter-only run.
const _captionLexicon = <String>{
  'repositories',
  'commands',
  'workflow',
  'through',
  'specific',
  'managing',
  'cloning',
  'forking',
  'history',
  'between',
  'before',
  'sounds',
  'should',
  'would',
  'could',
  'which',
  'where',
  'these',
  'those',
  'about',
  'after',
  'under',
  'again',
  'files',
  'start',
  'wish',
  'walk',
  'with',
  'from',
  'into',
  'over',
  'like',
  'also',
  'this',
  'that',
  'what',
  'when',
  'then',
  'just',
  'more',
  'most',
  'some',
  'such',
  'than',
  'very',
  'best',
  'ones',
  'one',
  'you',
  'can',
  'and',
  'the',
  'for',
  'but',
  'how',
  'are',
  'was',
  'will',
  'your',
  'our',
  'we',
  'go',
  'to',
  'of',
  'or',
};

List<String>? _lexiconByLengthDesc;

List<String> _captionWordsByLength() {
  return _lexiconByLengthDesc ??=
      (_captionLexicon.toList()..sort((a, b) => b.length.compareTo(a.length)));
}

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

/// Greedy longest-match word break for a glued letter run.
String _breakGluedLetterRun(String run) {
  final lower = run.toLowerCase();
  final n = lower.length;
  final words = _captionWordsByLength();
  final breaks = List<String?>.filled(n + 1, null);
  breaks[0] = '';

  for (var i = 0; i < n; i++) {
    if (breaks[i] == null) continue;
    for (final word in words) {
      final end = i + word.length;
      if (end > n) continue;
      if (lower.substring(i, end) != word) continue;
      final piece = run.substring(i, end);
      final next = breaks[i]!.isEmpty ? piece : '${breaks[i]} $piece';
      final existing = breaks[end];
      if (existing == null ||
          next.split(' ').length > existing.split(' ').length ||
          (next.split(' ').length == existing.split(' ').length && next.length < existing.length)) {
        breaks[end] = next;
      }
    }
    // Single-letter advance so we never get stuck on unknown stems.
    if (breaks[i + 1] == null) {
      final piece = run.substring(i, i + 1);
      breaks[i + 1] = breaks[i]!.isEmpty ? piece : '${breaks[i]}$piece';
    }
  }
  return breaks[n] ?? run;
}

/// Insert spaces that streaming / tokenization often drops between words.
String repairCaptionSpacing(String text) {
  if (text.isEmpty) return text;
  var next = text;
  next = next.replaceAllMapped(_spaceAfterPunct, (m) => '${m[1]} ${m[2]}');
  next = next.replaceAllMapped(_spaceBeforeCapital, (m) => '${m[1]} ${m[2]}');
  next = next.replaceAllMapped(_longLetterRun, (m) => _breakGluedLetterRun(m[0]!));
  return next.replaceAll(RegExp(r' {2,}'), ' ');
}

/// Merge an incoming stream chunk into the current utterance.
///
/// Supports cumulative snapshots (keep the longer prefix) and token deltas
/// (append, inserting a space when both sides lack whitespace/punctuation).
String mergeCaptionText(String current, String incoming) {
  if (incoming.isEmpty) return current;
  if (current.isEmpty) return incoming;
  if (incoming == current) return current;
  if (incoming.startsWith(current)) {
    return _joinCumulativeGrowth(current, incoming);
  }
  if (current.startsWith(incoming)) return current;
  return _appendCaptionToken(current, incoming);
}

/// When a cumulative snapshot grows without a leading space on the new suffix
/// (`We` → `Wecan`), insert a boundary space for multi-character word tokens.
/// Single-character growth (`Thi` → `This`) stays unspaced so BPE mid-word
/// pieces are not broken apart.
String _joinCumulativeGrowth(String current, String incoming) {
  if (incoming.length <= current.length) return incoming;
  final suffix = incoming.substring(current.length);
  if (suffix.isEmpty) return incoming;
  if (_whitespace.hasMatch(suffix[0]) || _punctuation.hasMatch(suffix[0])) {
    return incoming;
  }
  if (current.isEmpty) return incoming;
  final leftEnd = current[current.length - 1];
  if (!_wordChar.hasMatch(leftEnd) || !_wordChar.hasMatch(suffix[0])) {
    return incoming;
  }
  // Character-level growth inside one word.
  if (suffix.length == 1) return incoming;
  return '$current $suffix';
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
  final repaired = repairCaptionSpacing(dedupeDoubledParagraph(body));
  final window = lastCaptionSentences(repaired, sentenceCount).trim();
  if (window.isEmpty) return '';
  return fromLearner ? 'You: $window' : window;
}
