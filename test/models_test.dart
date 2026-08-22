import 'package:flutter_test/flutter_test.dart';

import 'package:learnsphere_mobile/models.dart';

void main() {
  test('decodes a feed item and its progress', () {
    final item = FeedItem.fromMap({
      'id': 'artifact-1',
      'kind': 'quiz',
      'title': 'Binary trees',
      'payload': {'question': 'What is a leaf?', 'options': ['A', 'B']},
      'studySpaceId': 'space-1',
      'studySpaceName': 'Data structures',
      'createdAt': '2026-08-03T10:00:00Z',
      'progress': {'completedAt': '2026-08-03T11:00:00Z', 'lastScore': 100},
    });

    expect(item.kind, 'quiz');
    expect(item.payload['options'], ['A', 'B']);
    expect(item.progress.completed, isTrue);
    expect(item.progress.lastScore, 100);
  });

  test('decodes completed fill-in and true/false answer keys', () {
    final fill = Progress.fromMap({
      'completedAt': '2026-08-03T11:00:00Z',
      'lastScore': 0,
      'fillBlankSelectedAnswer': 'water',
      'fillBlankCorrectAnswer': 'sunlight',
      'explanation': 'Light powers photosynthesis.',
    });
    expect(fill.fillBlankCorrectAnswer, 'sunlight');
    expect(fill.explanation, contains('photosynthesis'));

    final tf = Progress.fromMap({
      'completedAt': '2026-08-03T11:00:00Z',
      'lastScore': 100,
      'trueFalseSelected': false,
      'trueFalseCorrect': false,
    });
    expect(tf.trueFalseCorrect, isFalse);
    expect(tf.trueFalseSelected, isFalse);
  });

  test('maps material statuses and preserves errors', () {
    final material = MaterialItem.fromMap({
      'id': 'material-1',
      'user_id': 'user-1',
      'study_space_id': 'space-1',
      'name': 'notes.pdf',
      'mime_type': 'application/pdf',
      'size_bytes': 1024,
      'storage_path': 'user-1/material-1/notes.pdf',
      'status': 'error',
      'ingestion_error': 'Could not parse PDF',
      'created_at': '2026-08-03T10:00:00Z',
      'updated_at': '2026-08-03T10:01:00Z',
    });

    expect(material.status, MaterialStatus.error);
    expect(material.status.label, 'Indexing failed');
    expect(material.ingestionError, 'Could not parse PDF');
  });

  test('decodes source citations on tutor messages', () {
    final message = ChatMessage.fromMap({
      'id': 'message-1',
      'session_id': 'session-1',
      'role': 'assistant',
      'content': 'A leaf has no children.',
      'citations': [
        {
          'chunkId': 'chunk-1',
          'materialId': 'material-1',
          'materialName': 'notes.pdf',
          'label': 'notes.pdf · page 2',
          'quote': 'A leaf is a node without children.',
        },
      ],
    });

    expect(message.citations.single.label, 'notes.pdf · page 2');
    expect(message.citations.single.quote, contains('without children'));
  });
}
