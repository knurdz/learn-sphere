// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Arabic (`ar`).
class AppLocalizationsAr extends AppLocalizations {
  AppLocalizationsAr([String locale = 'ar']) : super(locale);

  @override
  String get appTitle => 'LearnSphere';

  @override
  String get navFeed => 'Feed';

  @override
  String get navLearn => 'Learn';

  @override
  String get navLibrary => 'Library';

  @override
  String get addMaterial => 'Add material';

  @override
  String get settings => 'Settings';

  @override
  String get appearance => 'Appearance';

  @override
  String get themeMode => 'Theme Mode';

  @override
  String get themeSystem => 'System';

  @override
  String get themeLight => 'Light';

  @override
  String get themeDark => 'Dark';

  @override
  String get colorTheme => 'Color Theme';

  @override
  String get cardTone => 'Card Tone';

  @override
  String get cardToneDefault => 'Default';

  @override
  String get cardToneColorful => 'Colorful';

  @override
  String get cardToneSingle => 'Single Tone';

  @override
  String get language => 'Language';

  @override
  String get languageSectionHint =>
      'UI, feed cards, tutor, and live avatar follow this language. Existing cards stay in their original language until you generate new ones.';

  @override
  String get languageChangedSnackbar =>
      'Language updated. Pull to refresh the feed for new cards in this language.';

  @override
  String get liveVoiceUnavailable => 'Live voice unavailable';

  @override
  String get account => 'Account';

  @override
  String get signOut => 'Sign Out';

  @override
  String get feedKindAll => 'All';

  @override
  String get feedKindMeme => 'Memes';

  @override
  String get feedKindQuiz => 'Quizzes';

  @override
  String get feedKindFlashcard => 'Cards';

  @override
  String get feedKindFillBlank => 'Fill in';

  @override
  String get feedKindTrueFalse => 'True / false';

  @override
  String get feedKindDidYouKnow => 'Did you know';

  @override
  String get buildingFeed => 'Building your feed from library…';

  @override
  String get feedEmptyTitle => 'Your feed will live here';

  @override
  String get feedEmptyStepsLibrary =>
      '1. Library — create a subject and upload material\n2. Feed — swipe cards generated from your files\n3. Learn — live tutor and study tools';

  @override
  String get startInLibrary => 'Start in Library';

  @override
  String get exploreLearn => 'Explore Learn';

  @override
  String noKindInFilter(String kind) {
    return 'No $kind in this filter yet.';
  }

  @override
  String get creatingNewCards => 'Creating new cards…';

  @override
  String get loadingMore => 'Loading more…';

  @override
  String get createStudySpaceForLive =>
      'Create a study space to start a live session.';

  @override
  String get feedEmptyOtherTypes =>
      'Your library has other card types. View all cards or pull to refresh to generate this type.';

  @override
  String get feedStillPreparing => 'Your feed is still preparing.';

  @override
  String feedNoKindYet(String kind) {
    return 'No $kind yet.';
  }

  @override
  String get viewAllCards => 'View all cards';

  @override
  String get pullToRefresh => 'Pull to refresh';

  @override
  String get learnTitle => 'Learn';

  @override
  String get learnSubtitleShort => 'Chat with your tutor or practice.';

  @override
  String get studyToolsTab => 'Study tools';

  @override
  String get liveTutor => 'Live tutor';

  @override
  String get liveTutorModeTutor => 'Live tutor';

  @override
  String get liveTutorModeVideoCreate => 'Create a teaching video';

  @override
  String get liveTutorModeVideoEngage => 'Make a video engaging';

  @override
  String get liveTutorModeYoutube => 'Teach a YouTube video';

  @override
  String get startCameraSession => 'Start camera session';

  @override
  String get chatAndVoice => 'Chat & voice';

  @override
  String get liveVoiceNotSupportedDialogTitle => 'Live voice not available';

  @override
  String get liveVoiceNotSupportedDialogBody =>
      'The live video tutor is not available in your selected language yet. Switch to a supported language in Settings, or use chat and voice in the Learn tab.';

  @override
  String get libraryTitle => 'Library';

  @override
  String get librarySubtitle =>
      'Subjects and materials for your feed and tutor.';

  @override
  String get settingsTooltip => 'Settings';

  @override
  String get fileReadySnack =>
      'Your file is ready. Open Feed to start studying.';

  @override
  String get studySpaces => 'Study spaces';

  @override
  String get newSpace => 'New';

  @override
  String get createSubjectFirst => 'Create a subject before adding material.';

  @override
  String get uploadMaterial => 'Upload material';

  @override
  String get uploading => 'Uploading…';

  @override
  String get supportedFormats =>
      'PDF, DOCX, TXT, MP3, WAV, and MP4 files up to 25 MB are supported.';

  @override
  String get newStudySpace => 'New study space';

  @override
  String get cancel => 'Cancel';

  @override
  String get create => 'Create';

  @override
  String get authWelcomeBack => 'Welcome back.';

  @override
  String get authCreateSpace => 'Create your study space.';

  @override
  String get authSignInSubtitle => 'Pick up where your understanding left off.';

  @override
  String get authSignUpSubtitle =>
      'Keep your materials, tutor, and practice in one focused place.';

  @override
  String get signIn => 'Sign in';

  @override
  String get createAccount => 'Create account';

  @override
  String get alreadyHaveAccount => 'Already have an account? Sign in';

  @override
  String get newToLearnSphere => 'New to LearnSphere? Create an account';

  @override
  String get setupTitle => 'Connect LearnSphere';

  @override
  String get setupBody =>
      'Add Supabase and API settings in .env.local on this device, then restart the app.';

  @override
  String get studyToolsTitle => 'Study tools';

  @override
  String get studyToolsEmpty =>
      'Add a subject and materials in Library, then generate quizzes and lessons here.';

  @override
  String get setupInLibrary => 'Set up in Library';

  @override
  String get generate => 'Generate';

  @override
  String get noToolsYet =>
      'No tools yet. Generate one from a YouTube URL or Library material.';

  @override
  String get quizComplete => 'Quiz complete';

  @override
  String scoreLabel(int score) {
    return 'Score: $score%';
  }

  @override
  String get done => 'Done';

  @override
  String get videoQuiz => 'Video quiz';

  @override
  String get submitAnswers => 'Submit answers';

  @override
  String get toolVideoQuiz => 'Video quiz';

  @override
  String get toolVideoCreate => 'Create lesson';

  @override
  String get toolVideoEngage => 'Engage video';

  @override
  String get addSubjectInLibrary => 'Add subject in Library';

  @override
  String get sources => 'Sources';

  @override
  String get askWithMicrophone => 'Ask with microphone';

  @override
  String get stopAndSend => 'Stop and send';

  @override
  String get email => 'Email';

  @override
  String get password => 'Password';

  @override
  String get spaceName => 'Name';

  @override
  String get spaceDescription => 'Description (optional)';

  @override
  String get progressTitle => 'Your progress';

  @override
  String get progressRangeDay => 'Today';

  @override
  String get progressRangeWeek => 'Week';

  @override
  String get progressRangeMonth => 'Month';

  @override
  String progressCurrentStreak(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count-day streak',
      one: '1-day streak',
      zero: 'No streak yet',
    );
    return '$_temp0';
  }

  @override
  String progressLongestStreak(int count) {
    return 'Best streak: $count days';
  }

  @override
  String progressTotalXp(int xp) {
    return '$xp XP total';
  }

  @override
  String get progressDailyGoalTitle => 'Daily goal';

  @override
  String progressGoalCompleted(int done, int goal) {
    return 'Goal completed ($done/$goal)';
  }

  @override
  String progressExtraActivities(int count) {
    return '+$count extra activities';
  }

  @override
  String progressTodayXp(int xp) {
    return '+$xp XP today';
  }

  @override
  String progressActivitySummary(int events, int xp) {
    return '$events activities · $xp XP';
  }

  @override
  String get progressBreakdownTitle => 'Activity breakdown';

  @override
  String get progressNoActivityYet =>
      'Complete a quiz or chat with the tutor to see stats here.';

  @override
  String get progressAnalyticsUnavailable =>
      'Progress stats need the API running.';

  @override
  String coachDailyProgress(int done, int goal) {
    return '$done/$goal today';
  }

  @override
  String get coachSkipTour => 'Skip tour';

  @override
  String get coachCloseMessage => 'Close';
}
