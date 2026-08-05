import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'app_languages.dart';

final sharedPreferencesProvider = Provider<SharedPreferences>((ref) => throw UnimplementedError());

enum AppThemeMode { system, light, dark }
enum AppCardTone { defaultTone, colorful, single }

class AppSettings {
  const AppSettings({
    this.themeMode = AppThemeMode.system,
    this.colorTheme = 0xFF059669,
    this.cardTone = AppCardTone.defaultTone,
    this.appLanguage = 'en',
  });

  final AppThemeMode themeMode;
  final int colorTheme;
  final AppCardTone cardTone;
  final String appLanguage;

  Locale get appLocale => Locale(normalizeAppLanguageCode(appLanguage));

  AppSettings copyWith({
    AppThemeMode? themeMode,
    int? colorTheme,
    AppCardTone? cardTone,
    String? appLanguage,
  }) {
    return AppSettings(
      themeMode: themeMode ?? this.themeMode,
      colorTheme: colorTheme ?? this.colorTheme,
      cardTone: cardTone ?? this.cardTone,
      appLanguage: appLanguage ?? this.appLanguage,
    );
  }
}

class SettingsNotifier extends Notifier<AppSettings> {
  static const _languageKey = 'appLanguage';

  @override
  AppSettings build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    return AppSettings(
      themeMode: AppThemeMode.values[prefs.getInt('themeMode') ?? 0],
      colorTheme: prefs.getInt('colorTheme') ?? 0xFF059669,
      cardTone: AppCardTone.values[prefs.getInt('cardTone') ?? 0],
      appLanguage: normalizeAppLanguageCode(prefs.getString(_languageKey)),
    );
  }

  Future<void> setThemeMode(AppThemeMode mode) async {
    state = state.copyWith(themeMode: mode);
    await ref.read(sharedPreferencesProvider).setInt('themeMode', mode.index);
  }

  Future<void> setColorTheme(int color) async {
    state = state.copyWith(colorTheme: color);
    await ref.read(sharedPreferencesProvider).setInt('colorTheme', color);
  }

  Future<void> setCardTone(AppCardTone tone) async {
    state = state.copyWith(cardTone: tone);
    await ref.read(sharedPreferencesProvider).setInt('cardTone', tone.index);
  }

  Future<void> setAppLanguage(String code) async {
    final normalized = normalizeAppLanguageCode(code);
    state = state.copyWith(appLanguage: normalized);
    await ref.read(sharedPreferencesProvider).setString(_languageKey, normalized);
  }

  void applyLanguageFromProfile(String? code) {
    if (code == null || code.trim().isEmpty) return;
    final normalized = normalizeAppLanguageCode(code);
    final prefs = ref.read(sharedPreferencesProvider);
    if (prefs.containsKey(_languageKey)) return;
    state = state.copyWith(appLanguage: normalized);
    prefs.setString(_languageKey, normalized);
  }
}

final settingsProvider = NotifierProvider<SettingsNotifier, AppSettings>(SettingsNotifier.new);
