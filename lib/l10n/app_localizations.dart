import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ar.dart';
import 'app_localizations_bn.dart';
import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_hi.dart';
import 'app_localizations_id.dart';
import 'app_localizations_it.dart';
import 'app_localizations_ja.dart';
import 'app_localizations_ko.dart';
import 'app_localizations_mr.dart';
import 'app_localizations_nl.dart';
import 'app_localizations_pl.dart';
import 'app_localizations_pt.dart';
import 'app_localizations_ru.dart';
import 'app_localizations_si.dart';
import 'app_localizations_ta.dart';
import 'app_localizations_te.dart';
import 'app_localizations_th.dart';
import 'app_localizations_tr.dart';
import 'app_localizations_ur.dart';
import 'app_localizations_vi.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
      : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('ar'),
    Locale('bn'),
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('hi'),
    Locale('id'),
    Locale('it'),
    Locale('ja'),
    Locale('ko'),
    Locale('mr'),
    Locale('nl'),
    Locale('pl'),
    Locale('pt'),
    Locale('ru'),
    Locale('si'),
    Locale('ta'),
    Locale('te'),
    Locale('th'),
    Locale('tr'),
    Locale('ur'),
    Locale('vi'),
    Locale('zh')
  ];

  /// No description provided for @appTitle.
  ///
  /// In en, this message translates to:
  /// **'LearnSphere'**
  String get appTitle;

  /// No description provided for @navFeed.
  ///
  /// In en, this message translates to:
  /// **'Feed'**
  String get navFeed;

  /// No description provided for @navLearn.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get navLearn;

  /// No description provided for @navLibrary.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get navLibrary;

  /// No description provided for @addMaterial.
  ///
  /// In en, this message translates to:
  /// **'Add material'**
  String get addMaterial;

  /// No description provided for @settings.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settings;

  /// No description provided for @appearance.
  ///
  /// In en, this message translates to:
  /// **'Appearance'**
  String get appearance;

  /// No description provided for @themeMode.
  ///
  /// In en, this message translates to:
  /// **'Theme Mode'**
  String get themeMode;

  /// No description provided for @themeSystem.
  ///
  /// In en, this message translates to:
  /// **'System'**
  String get themeSystem;

  /// No description provided for @themeLight.
  ///
  /// In en, this message translates to:
  /// **'Light'**
  String get themeLight;

  /// No description provided for @themeDark.
  ///
  /// In en, this message translates to:
  /// **'Dark'**
  String get themeDark;

  /// No description provided for @colorTheme.
  ///
  /// In en, this message translates to:
  /// **'Color Theme'**
  String get colorTheme;

  /// No description provided for @cardTone.
  ///
  /// In en, this message translates to:
  /// **'Card Tone'**
  String get cardTone;

  /// No description provided for @cardToneDefault.
  ///
  /// In en, this message translates to:
  /// **'Default'**
  String get cardToneDefault;

  /// No description provided for @cardToneColorful.
  ///
  /// In en, this message translates to:
  /// **'Colorful'**
  String get cardToneColorful;

  /// No description provided for @cardToneSingle.
  ///
  /// In en, this message translates to:
  /// **'Single Tone'**
  String get cardToneSingle;

  /// No description provided for @language.
  ///
  /// In en, this message translates to:
  /// **'Language'**
  String get language;

  /// No description provided for @languageSectionHint.
  ///
  /// In en, this message translates to:
  /// **'UI, feed cards, tutor, and live avatar follow this language. Existing cards stay in their original language until you generate new ones.'**
  String get languageSectionHint;

  /// No description provided for @languageChangedSnackbar.
  ///
  /// In en, this message translates to:
  /// **'Language updated. Pull to refresh the feed for new cards in this language.'**
  String get languageChangedSnackbar;

  /// No description provided for @liveVoiceUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Live voice unavailable'**
  String get liveVoiceUnavailable;

  /// No description provided for @account.
  ///
  /// In en, this message translates to:
  /// **'Account'**
  String get account;

  /// No description provided for @signOut.
  ///
  /// In en, this message translates to:
  /// **'Sign Out'**
  String get signOut;

  /// No description provided for @feedKindAll.
  ///
  /// In en, this message translates to:
  /// **'All'**
  String get feedKindAll;

  /// No description provided for @feedKindMeme.
  ///
  /// In en, this message translates to:
  /// **'Memes'**
  String get feedKindMeme;

  /// No description provided for @feedKindQuiz.
  ///
  /// In en, this message translates to:
  /// **'Quizzes'**
  String get feedKindQuiz;

  /// No description provided for @feedKindFlashcard.
  ///
  /// In en, this message translates to:
  /// **'Cards'**
  String get feedKindFlashcard;

  /// No description provided for @feedKindFillBlank.
  ///
  /// In en, this message translates to:
  /// **'Fill in'**
  String get feedKindFillBlank;

  /// No description provided for @feedKindTrueFalse.
  ///
  /// In en, this message translates to:
  /// **'True / false'**
  String get feedKindTrueFalse;

  /// No description provided for @feedKindDidYouKnow.
  ///
  /// In en, this message translates to:
  /// **'Did you know'**
  String get feedKindDidYouKnow;

  /// No description provided for @buildingFeed.
  ///
  /// In en, this message translates to:
  /// **'Building your feed from library…'**
  String get buildingFeed;

  /// No description provided for @feedEmptyTitle.
  ///
  /// In en, this message translates to:
  /// **'Your feed will live here'**
  String get feedEmptyTitle;

  /// No description provided for @feedEmptyStepsLibrary.
  ///
  /// In en, this message translates to:
  /// **'1. Library — create a subject and upload material\n2. Feed — swipe cards generated from your files\n3. Learn — live tutor and study tools'**
  String get feedEmptyStepsLibrary;

  /// No description provided for @startInLibrary.
  ///
  /// In en, this message translates to:
  /// **'Start in Library'**
  String get startInLibrary;

  /// No description provided for @exploreLearn.
  ///
  /// In en, this message translates to:
  /// **'Explore Learn'**
  String get exploreLearn;

  /// No description provided for @noKindInFilter.
  ///
  /// In en, this message translates to:
  /// **'No {kind} in this filter yet.'**
  String noKindInFilter(String kind);

  /// No description provided for @creatingNewCards.
  ///
  /// In en, this message translates to:
  /// **'Creating new cards…'**
  String get creatingNewCards;

  /// No description provided for @loadingMore.
  ///
  /// In en, this message translates to:
  /// **'Loading more…'**
  String get loadingMore;

  /// No description provided for @createStudySpaceForLive.
  ///
  /// In en, this message translates to:
  /// **'Create a study space to start a live session.'**
  String get createStudySpaceForLive;

  /// No description provided for @feedEmptyOtherTypes.
  ///
  /// In en, this message translates to:
  /// **'Your library has other card types. View all cards or pull to refresh to generate this type.'**
  String get feedEmptyOtherTypes;

  /// No description provided for @feedStillPreparing.
  ///
  /// In en, this message translates to:
  /// **'Your feed is still preparing.'**
  String get feedStillPreparing;

  /// No description provided for @feedNoKindYet.
  ///
  /// In en, this message translates to:
  /// **'No {kind} yet.'**
  String feedNoKindYet(String kind);

  /// No description provided for @viewAllCards.
  ///
  /// In en, this message translates to:
  /// **'View all cards'**
  String get viewAllCards;

  /// No description provided for @pullToRefresh.
  ///
  /// In en, this message translates to:
  /// **'Pull to refresh'**
  String get pullToRefresh;

  /// No description provided for @learnTitle.
  ///
  /// In en, this message translates to:
  /// **'Learn'**
  String get learnTitle;

  /// No description provided for @learnSubtitleShort.
  ///
  /// In en, this message translates to:
  /// **'Chat with your tutor or practice.'**
  String get learnSubtitleShort;

  /// No description provided for @studyToolsTab.
  ///
  /// In en, this message translates to:
  /// **'Study tools'**
  String get studyToolsTab;

  /// No description provided for @liveTutor.
  ///
  /// In en, this message translates to:
  /// **'Live tutor'**
  String get liveTutor;

  /// No description provided for @liveTutorModeTutor.
  ///
  /// In en, this message translates to:
  /// **'Live tutor'**
  String get liveTutorModeTutor;

  /// No description provided for @liveTutorModeVideoCreate.
  ///
  /// In en, this message translates to:
  /// **'Create a teaching video'**
  String get liveTutorModeVideoCreate;

  /// No description provided for @liveTutorModeVideoEngage.
  ///
  /// In en, this message translates to:
  /// **'Make a video engaging'**
  String get liveTutorModeVideoEngage;

  /// No description provided for @liveTutorModeYoutube.
  ///
  /// In en, this message translates to:
  /// **'Teach a YouTube video'**
  String get liveTutorModeYoutube;

  /// No description provided for @startCameraSession.
  ///
  /// In en, this message translates to:
  /// **'Start camera session'**
  String get startCameraSession;

  /// No description provided for @chatAndVoice.
  ///
  /// In en, this message translates to:
  /// **'Chat & voice'**
  String get chatAndVoice;

  /// No description provided for @liveVoiceNotSupportedDialogTitle.
  ///
  /// In en, this message translates to:
  /// **'Live voice not available'**
  String get liveVoiceNotSupportedDialogTitle;

  /// No description provided for @liveVoiceNotSupportedDialogBody.
  ///
  /// In en, this message translates to:
  /// **'The live video tutor is not available in your selected language yet. Switch to a supported language in Settings, or use chat and voice in the Learn tab.'**
  String get liveVoiceNotSupportedDialogBody;

  /// No description provided for @libraryTitle.
  ///
  /// In en, this message translates to:
  /// **'Library'**
  String get libraryTitle;

  /// No description provided for @librarySubtitle.
  ///
  /// In en, this message translates to:
  /// **'Subjects and materials for your feed and tutor.'**
  String get librarySubtitle;

  /// No description provided for @settingsTooltip.
  ///
  /// In en, this message translates to:
  /// **'Settings'**
  String get settingsTooltip;

  /// No description provided for @fileReadySnack.
  ///
  /// In en, this message translates to:
  /// **'Your file is ready. Open Feed to start studying.'**
  String get fileReadySnack;

  /// No description provided for @studySpaces.
  ///
  /// In en, this message translates to:
  /// **'Study spaces'**
  String get studySpaces;

  /// No description provided for @newSpace.
  ///
  /// In en, this message translates to:
  /// **'New'**
  String get newSpace;

  /// No description provided for @createSubjectFirst.
  ///
  /// In en, this message translates to:
  /// **'Create a subject before adding material.'**
  String get createSubjectFirst;

  /// No description provided for @uploadMaterial.
  ///
  /// In en, this message translates to:
  /// **'Upload material'**
  String get uploadMaterial;

  /// No description provided for @uploading.
  ///
  /// In en, this message translates to:
  /// **'Uploading…'**
  String get uploading;

  /// No description provided for @supportedFormats.
  ///
  /// In en, this message translates to:
  /// **'PDF, DOCX, TXT, MP3, WAV, and MP4 files up to 25 MB are supported.'**
  String get supportedFormats;

  /// No description provided for @newStudySpace.
  ///
  /// In en, this message translates to:
  /// **'New study space'**
  String get newStudySpace;

  /// No description provided for @cancel.
  ///
  /// In en, this message translates to:
  /// **'Cancel'**
  String get cancel;

  /// No description provided for @create.
  ///
  /// In en, this message translates to:
  /// **'Create'**
  String get create;

  /// No description provided for @authWelcomeBack.
  ///
  /// In en, this message translates to:
  /// **'Welcome back.'**
  String get authWelcomeBack;

  /// No description provided for @authCreateSpace.
  ///
  /// In en, this message translates to:
  /// **'Create your study space.'**
  String get authCreateSpace;

  /// No description provided for @authSignInSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Pick up where your understanding left off.'**
  String get authSignInSubtitle;

  /// No description provided for @authSignUpSubtitle.
  ///
  /// In en, this message translates to:
  /// **'Keep your materials, tutor, and practice in one focused place.'**
  String get authSignUpSubtitle;

  /// No description provided for @signIn.
  ///
  /// In en, this message translates to:
  /// **'Sign in'**
  String get signIn;

  /// No description provided for @createAccount.
  ///
  /// In en, this message translates to:
  /// **'Create account'**
  String get createAccount;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In en, this message translates to:
  /// **'Already have an account? Sign in'**
  String get alreadyHaveAccount;

  /// No description provided for @newToLearnSphere.
  ///
  /// In en, this message translates to:
  /// **'New to LearnSphere? Create an account'**
  String get newToLearnSphere;

  /// No description provided for @setupTitle.
  ///
  /// In en, this message translates to:
  /// **'Connect LearnSphere'**
  String get setupTitle;

  /// No description provided for @setupBody.
  ///
  /// In en, this message translates to:
  /// **'Add Supabase and API settings in .env.local on this device, then restart the app.'**
  String get setupBody;

  /// No description provided for @studyToolsTitle.
  ///
  /// In en, this message translates to:
  /// **'Study tools'**
  String get studyToolsTitle;

  /// No description provided for @studyToolsEmpty.
  ///
  /// In en, this message translates to:
  /// **'Add a subject and materials in Library, then generate quizzes and lessons here.'**
  String get studyToolsEmpty;

  /// No description provided for @setupInLibrary.
  ///
  /// In en, this message translates to:
  /// **'Set up in Library'**
  String get setupInLibrary;

  /// No description provided for @generate.
  ///
  /// In en, this message translates to:
  /// **'Generate'**
  String get generate;

  /// No description provided for @noToolsYet.
  ///
  /// In en, this message translates to:
  /// **'No tools yet. Generate one from a YouTube URL or Library material.'**
  String get noToolsYet;

  /// No description provided for @quizComplete.
  ///
  /// In en, this message translates to:
  /// **'Quiz complete'**
  String get quizComplete;

  /// No description provided for @scoreLabel.
  ///
  /// In en, this message translates to:
  /// **'Score: {score}%'**
  String scoreLabel(int score);

  /// No description provided for @done.
  ///
  /// In en, this message translates to:
  /// **'Done'**
  String get done;

  /// No description provided for @videoQuiz.
  ///
  /// In en, this message translates to:
  /// **'Video quiz'**
  String get videoQuiz;

  /// No description provided for @submitAnswers.
  ///
  /// In en, this message translates to:
  /// **'Submit answers'**
  String get submitAnswers;

  /// No description provided for @toolVideoQuiz.
  ///
  /// In en, this message translates to:
  /// **'Video quiz'**
  String get toolVideoQuiz;

  /// No description provided for @toolVideoCreate.
  ///
  /// In en, this message translates to:
  /// **'Create lesson'**
  String get toolVideoCreate;

  /// No description provided for @toolVideoEngage.
  ///
  /// In en, this message translates to:
  /// **'Engage video'**
  String get toolVideoEngage;

  /// No description provided for @addSubjectInLibrary.
  ///
  /// In en, this message translates to:
  /// **'Add subject in Library'**
  String get addSubjectInLibrary;

  /// No description provided for @sources.
  ///
  /// In en, this message translates to:
  /// **'Sources'**
  String get sources;

  /// No description provided for @askWithMicrophone.
  ///
  /// In en, this message translates to:
  /// **'Ask with microphone'**
  String get askWithMicrophone;

  /// No description provided for @stopAndSend.
  ///
  /// In en, this message translates to:
  /// **'Stop and send'**
  String get stopAndSend;

  /// No description provided for @email.
  ///
  /// In en, this message translates to:
  /// **'Email'**
  String get email;

  /// No description provided for @password.
  ///
  /// In en, this message translates to:
  /// **'Password'**
  String get password;

  /// No description provided for @spaceName.
  ///
  /// In en, this message translates to:
  /// **'Name'**
  String get spaceName;

  /// No description provided for @spaceDescription.
  ///
  /// In en, this message translates to:
  /// **'Description (optional)'**
  String get spaceDescription;

  /// No description provided for @progressTitle.
  ///
  /// In en, this message translates to:
  /// **'Your progress'**
  String get progressTitle;

  /// No description provided for @progressRangeDay.
  ///
  /// In en, this message translates to:
  /// **'Today'**
  String get progressRangeDay;

  /// No description provided for @progressRangeWeek.
  ///
  /// In en, this message translates to:
  /// **'Week'**
  String get progressRangeWeek;

  /// No description provided for @progressRangeMonth.
  ///
  /// In en, this message translates to:
  /// **'Month'**
  String get progressRangeMonth;

  /// No description provided for @progressCurrentStreak.
  ///
  /// In en, this message translates to:
  /// **'{count, plural, =0{No streak yet} =1{1-day streak} other{{count}-day streak}}'**
  String progressCurrentStreak(int count);

  /// No description provided for @progressLongestStreak.
  ///
  /// In en, this message translates to:
  /// **'Best streak: {count} days'**
  String progressLongestStreak(int count);

  /// No description provided for @progressTotalXp.
  ///
  /// In en, this message translates to:
  /// **'{xp} XP total'**
  String progressTotalXp(int xp);

  /// No description provided for @progressDailyGoalTitle.
  ///
  /// In en, this message translates to:
  /// **'Daily goal'**
  String get progressDailyGoalTitle;

  /// No description provided for @progressTodayXp.
  ///
  /// In en, this message translates to:
  /// **'+{xp} XP today'**
  String progressTodayXp(int xp);

  /// No description provided for @progressActivitySummary.
  ///
  /// In en, this message translates to:
  /// **'{events} activities · {xp} XP'**
  String progressActivitySummary(int events, int xp);

  /// No description provided for @progressBreakdownTitle.
  ///
  /// In en, this message translates to:
  /// **'Activity breakdown'**
  String get progressBreakdownTitle;

  /// No description provided for @progressNoActivityYet.
  ///
  /// In en, this message translates to:
  /// **'Complete a quiz or chat with the tutor to see stats here.'**
  String get progressNoActivityYet;

  /// No description provided for @progressAnalyticsUnavailable.
  ///
  /// In en, this message translates to:
  /// **'Progress stats need the API running.'**
  String get progressAnalyticsUnavailable;

  /// No description provided for @coachDailyProgress.
  ///
  /// In en, this message translates to:
  /// **'{done}/{goal} today'**
  String coachDailyProgress(int done, int goal);

  /// No description provided for @coachSkipTour.
  ///
  /// In en, this message translates to:
  /// **'Skip tour'**
  String get coachSkipTour;

  /// No description provided for @coachCloseMessage.
  ///
  /// In en, this message translates to:
  /// **'Close'**
  String get coachCloseMessage;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>[
        'ar',
        'bn',
        'de',
        'en',
        'es',
        'fr',
        'hi',
        'id',
        'it',
        'ja',
        'ko',
        'mr',
        'nl',
        'pl',
        'pt',
        'ru',
        'si',
        'ta',
        'te',
        'th',
        'tr',
        'ur',
        'vi',
        'zh'
      ].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ar':
      return AppLocalizationsAr();
    case 'bn':
      return AppLocalizationsBn();
    case 'de':
      return AppLocalizationsDe();
    case 'en':
      return AppLocalizationsEn();
    case 'es':
      return AppLocalizationsEs();
    case 'fr':
      return AppLocalizationsFr();
    case 'hi':
      return AppLocalizationsHi();
    case 'id':
      return AppLocalizationsId();
    case 'it':
      return AppLocalizationsIt();
    case 'ja':
      return AppLocalizationsJa();
    case 'ko':
      return AppLocalizationsKo();
    case 'mr':
      return AppLocalizationsMr();
    case 'nl':
      return AppLocalizationsNl();
    case 'pl':
      return AppLocalizationsPl();
    case 'pt':
      return AppLocalizationsPt();
    case 'ru':
      return AppLocalizationsRu();
    case 'si':
      return AppLocalizationsSi();
    case 'ta':
      return AppLocalizationsTa();
    case 'te':
      return AppLocalizationsTe();
    case 'th':
      return AppLocalizationsTh();
    case 'tr':
      return AppLocalizationsTr();
    case 'ur':
      return AppLocalizationsUr();
    case 'vi':
      return AppLocalizationsVi();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
      'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
      'an issue with the localizations generation tool. Please file an issue '
      'on GitHub with a reproducible sample app and the gen-l10n configuration '
      'that was used.');
}
