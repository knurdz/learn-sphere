import 'l10n/app_localizations.dart';

extension FeedKindLabels on AppLocalizations {
  String feedKindLabel(String kind) {
    switch (kind) {
      case 'all':
        return feedKindAll;
      case 'meme':
        return feedKindMeme;
      case 'quiz':
        return feedKindQuiz;
      case 'flashcard':
        return feedKindFlashcard;
      case 'fill_blank':
        return feedKindFillBlank;
      case 'true_false':
        return feedKindTrueFalse;
      case 'did_you_know':
        return feedKindDidYouKnow;
      default:
        return kind;
    }
  }
}

List<({String value, String label})> localizedFeedKinds(AppLocalizations l10n) {
  return [
    (value: 'all', label: l10n.feedKindAll),
    (value: 'meme', label: l10n.feedKindMeme),
    (value: 'quiz', label: l10n.feedKindQuiz),
    (value: 'flashcard', label: l10n.feedKindFlashcard),
    (value: 'fill_blank', label: l10n.feedKindFillBlank),
    (value: 'true_false', label: l10n.feedKindTrueFalse),
    (value: 'did_you_know', label: l10n.feedKindDidYouKnow),
  ];
}
