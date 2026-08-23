import 'package:flutter_test/flutter_test.dart';
import 'package:learnsphere_mobile/live_tutor_captions.dart';

void main() {
  group('mergeCaptionText', () {
    test('inserts spaces between word tokens', () {
      var text = '';
      for (final token in ['This', 'course', 'focuses']) {
        text = mergeCaptionText(text, token);
      }
      expect(text, 'This course focuses');
    });

    test('keeps growing cumulative snapshots', () {
      expect(
        mergeCaptionText('This', 'This course'),
        'This course',
      );
      expect(
        mergeCaptionText('This course', 'This course focuses'),
        'This course focuses',
      );
    });

    test('ignores exact duplicates', () {
      expect(mergeCaptionText('Hello there.', 'Hello there.'), 'Hello there.');
    });

    test('preserves leading spaces on deltas', () {
      expect(mergeCaptionText('This', ' course'), 'This course');
    });

    test('does not insert a space before punctuation', () {
      expect(mergeCaptionText('workflow', '?'), 'workflow?');
    });

    test('inserts a space when cumulative growth skips the space', () {
      expect(mergeCaptionText('We', 'Wecan'), 'We can');
      expect(mergeCaptionText('We can', 'We can also'), 'We can also');
    });

    test('does not break mid-word character growth', () {
      expect(mergeCaptionText('Thi', 'This'), 'This');
    });
  });

  group('repairCaptionSpacing', () {
    test('repairs the screenshot-style glued tutor caption', () {
      const glued =
          'WecanalsogoovertheGitworkflow,likeforkingandcloningrepositories,orIcanwalkyouthroughspecificGitcommandsformanagingfilesandhistory. Whichonesoundsbesttoyou?';
      final repaired = repairCaptionSpacing(glued);
      expect(repaired, contains('We can also go over the Git workflow'));
      expect(repaired, contains(', like forking and cloning repositories'));
      expect(repaired, contains('or I can walk you through'));
      expect(repaired, isNot(contains('Wecanalsogoover')));
      expect(repaired.toLowerCase(), contains('sounds best'));
    });

    test('does not split ordinary words like This', () {
      expect(repairCaptionSpacing('This course focuses on the workflow?'), 'This course focuses on the workflow?');
    });
  });
  group('dedupeDoubledParagraph', () {
    test('collapses a paragraph repeated twice without a space', () {
      const para =
          'This course focuses on the workflow?This course focuses on the workflow?';
      expect(
        dedupeDoubledParagraph(para),
        'This course focuses on the workflow?',
      );
    });

    test('collapses a paragraph repeated twice with a space', () {
      expect(
        dedupeDoubledParagraph('Hello there. Hello there.'),
        'Hello there.',
      );
    });
  });

  group('lastCaptionSentences', () {
    test('splits when punctuation has no following space', () {
      expect(
        lastCaptionSentences('end?Start', 2),
        'end? Start',
      );
    });

    test('drops consecutive identical sentences', () {
      expect(
        lastCaptionSentences('Hello. Hello. Next.', 2),
        'Hello. Next.',
      );
    });

    test('keeps only the last N sentences', () {
      expect(
        lastCaptionSentences('One. Two. Three.', 2),
        'Two. Three.',
      );
    });
  });

  group('buildLiveTutorCaption', () {
    test('trims only the final display string', () {
      expect(
        buildLiveTutorCaption('  Hello there.  ', fromLearner: false),
        'Hello there.',
      );
      expect(
        buildLiveTutorCaption('Hello there.', fromLearner: true),
        'You: Hello there.',
      );
    });

    test('dedupes then windows the screenshot-style blob', () {
      const blob =
          'This course focuses on the workflow?This course focuses on the workflow?';
      expect(
        buildLiveTutorCaption(blob, fromLearner: false),
        'This course focuses on the workflow?',
      );
    });
  });

  group('scrubSpeechMarkup', () {
    test('does not trim edges so token spaces survive', () {
      expect(scrubSpeechMarkup(' Hello'), ' Hello');
    });
  });
}
