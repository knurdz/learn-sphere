import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:animations/animations.dart';

/// Palette sampled from the Beyond Blood mobile UI (Dribbble 26178341).
abstract final class LsColors {
  static const canvas = Color(0xFFEFF7FD);
  static const mist = Color(0xFFBBD2FA);
  static const periwinkle = Color(0xFF8A9BF8);
  static const royal = Color(0xFF213FD3);
  static const azure = Color(0xFF115DE8);
  static const ink = Color(0xFF1D2538);
  static const muted = Color(0xFF96A0AD);
  static const sky = Color(0xFF349BEF);
  static const canvasDark = Color(0xFF121826);
  static const cardDark = Color(0xFF1A2233);
}

Color themedCanvas(Color seed, Brightness brightness) {
  if (brightness == Brightness.dark) {
    return Color.lerp(const Color(0xFF10141C), seed, 0.24)!;
  }
  return Color.lerp(const Color(0xFFF7F9FC), seed, 0.16)!;
}

Color themedCanvasWash(Color seed, Brightness brightness) {
  if (brightness == Brightness.dark) {
    return Color.lerp(const Color(0xFF151A26), seed, 0.32)!;
  }
  return Color.lerp(const Color(0xFFEEF3FA), seed, 0.28)!;
}

Color themedCard(Color seed, Brightness brightness) {
  if (brightness == Brightness.dark) {
    return Color.lerp(const Color(0xFF1C2330), seed, 0.16)!;
  }
  return Color.lerp(Colors.white, seed, 0.04)!;
}

Color themedPrimary(Color seed, Brightness brightness) {
  if (brightness == Brightness.dark) {
    return Color.lerp(seed, Colors.white, 0.38)!;
  }
  return seed;
}

/// Feed stays a separate “world” from Learn/Library, in both brightnesses.
abstract final class FeedWorld {
  static Color canvasFor(Brightness brightness, Color seed) {
    if (brightness == Brightness.dark) {
      return Color.lerp(const Color(0xFF07070F), seed, 0.34)!;
    }
    return Color.lerp(const Color(0xFFF6F2EC), seed, 0.20)!;
  }
}

abstract final class LsRadii {
  static const card = 28.0;
  static const pill = 40.0;
  static const island = 36.0;
}

abstract final class LsLayout {
  static const islandNavHeight = 72.0;
  static const islandNavClearance = 88.0;
  static const coachMascotSize = 68.0;
  /// Gap between the island nav and Sphere / Learn so they don't sit on the tabs.
  static const aboveNavGap = 24.0;
}

double islandNavClearance(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width >= 720) return 16;
  return LsLayout.islandNavClearance + MediaQuery.paddingOf(context).bottom;
}

/// Bottom offset for Sphere / Learn, matching the coach overlay (view padding only —
/// Scaffold `padding.bottom` already includes the nav and would double-count).
double aboveIslandNav(BuildContext context) {
  final viewBottom = MediaQuery.viewPaddingOf(context).bottom;
  if (MediaQuery.sizeOf(context).width >= 720) return viewBottom + 16;
  return viewBottom + LsLayout.islandNavHeight + LsLayout.aboveNavGap;
}

/// Builds the LearnSphere theme: icy clinical surfaces, navy circular chrome,
/// Plus Jakarta Sans, and generous stadium corners.
ThemeData buildLearnSphereTheme({
  required Color seedColor,
  required Brightness brightness,
}) {
  final isDark = brightness == Brightness.dark;
  final surface = themedCanvas(seedColor, brightness);
  final ink = isDark ? const Color(0xFFF4F7FB) : LsColors.ink;
  final cardColor = themedCard(seedColor, brightness);
  final muted = isDark ? const Color(0xFFC2CAD6) : const Color(0xFF3E4856);
  final borderMuted = isDark
      ? Color.lerp(const Color(0xFF2A3448), seedColor, 0.2)!
      : Color.lerp(const Color(0xFFE4EAF3), seedColor, 0.28)!;

  final primary = themedPrimary(seedColor, brightness);
  final secondary = isDark ? Color.lerp(seedColor, LsColors.sky, 0.45)! : Color.lerp(seedColor, LsColors.ink, 0.35)!;

  final colorScheme = ColorScheme.fromSeed(
    seedColor: seedColor,
    brightness: brightness,
  ).copyWith(
    primary: primary,
    secondary: secondary,
    tertiary: Color.lerp(seedColor, LsColors.sky, 0.4)!,
    surface: surface,
    onSurface: ink,
    onSurfaceVariant: muted,
  );

  final base = ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: surface,
    brightness: brightness,
    cardTheme: CardThemeData(
      color: cardColor,
      elevation: 0,
      margin: EdgeInsets.zero,
      shadowColor: LsColors.ink.withValues(alpha: isDark ? 0.4 : 0.08),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(LsRadii.card),
      ),
    ),
  );

  final sans = GoogleFonts.plusJakartaSansTextTheme(base.textTheme).apply(
    bodyColor: ink,
    displayColor: ink,
  );

  final textTheme = sans.copyWith(
    headlineLarge: sans.headlineLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.8, height: 1.1),
    headlineMedium: sans.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.6, height: 1.15),
    headlineSmall: sans.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.4, height: 1.2),
    titleLarge: sans.titleLarge?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.3),
    titleMedium: sans.titleMedium?.copyWith(fontWeight: FontWeight.w700),
    titleSmall: sans.titleSmall?.copyWith(fontWeight: FontWeight.w700),
    labelLarge: sans.labelLarge?.copyWith(fontWeight: FontWeight.w700),
  );

  final inputDecoration = InputDecorationTheme(
    filled: true,
    fillColor: isDark ? Color.lerp(const Color(0xFF222C40), seedColor, 0.16)! : Colors.white,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide.none,
    ),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide.none,
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(20),
      borderSide: BorderSide(color: primary, width: 1.4),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
  );

  final navyCta = primary;

  final filledButtonStyle = FilledButton.styleFrom(
    backgroundColor: navyCta,
    foregroundColor: Colors.white,
    shape: const StadiumBorder(),
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
    textStyle: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.2),
  );

  final outlinedButtonStyle = OutlinedButton.styleFrom(
    foregroundColor: ink,
    shape: const StadiumBorder(),
    side: BorderSide(color: borderMuted),
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
  );

  final textButtonStyle = TextButton.styleFrom(
    foregroundColor: primary,
    shape: const StadiumBorder(),
    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
  );

  return base.copyWith(
    textTheme: textTheme,
    appBarTheme: AppBarTheme(
      backgroundColor: surface,
      foregroundColor: ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      titleTextStyle: GoogleFonts.plusJakartaSans(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        color: ink,
        letterSpacing: -0.4,
      ),
    ),
    inputDecorationTheme: inputDecoration,
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.transparent,
      elevation: 0,
      height: LsLayout.islandNavHeight,
      indicatorColor: navyCta,
      labelBehavior: NavigationDestinationLabelBehavior.alwaysHide,
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return IconThemeData(
          color: selected ? Colors.white : muted,
          size: 22,
        );
      }),
    ),
    navigationRailTheme: NavigationRailThemeData(
      backgroundColor: cardColor,
      indicatorColor: navyCta,
      elevation: 0,
      selectedIconTheme: const IconThemeData(color: Colors.white, size: 22),
      unselectedIconTheme: IconThemeData(color: muted, size: 22),
      selectedLabelTextStyle: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: ink),
      unselectedLabelTextStyle: TextStyle(fontWeight: FontWeight.w600, fontSize: 11, color: muted),
    ),
    filledButtonTheme: FilledButtonThemeData(style: filledButtonStyle),
    outlinedButtonTheme: OutlinedButtonThemeData(style: outlinedButtonStyle),
    textButtonTheme: TextButtonThemeData(style: textButtonStyle),
    dialogTheme: DialogThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
      backgroundColor: cardColor,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: navyCta,
      contentTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      behavior: SnackBarBehavior.floating,
    ),
    chipTheme: ChipThemeData(
      shape: const StadiumBorder(),
      side: BorderSide.none,
      backgroundColor: isDark ? Color.lerp(const Color(0xFF222C40), seedColor, 0.16)! : Color.lerp(Colors.white, seedColor, 0.06)!,
      selectedColor: isDark ? primary.withValues(alpha: 0.45) : Color.lerp(Colors.white, seedColor, 0.22)!,
      labelStyle: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ink),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: navyCta,
      foregroundColor: Colors.white,
      shape: const StadiumBorder(),
      elevation: 4,
    ),
    tabBarTheme: TabBarThemeData(
      indicatorSize: TabBarIndicatorSize.tab,
      dividerHeight: 0,
      labelColor: Colors.white,
      unselectedLabelColor: muted,
      labelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
      unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
      indicator: BoxDecoration(
        color: navyCta,
        borderRadius: BorderRadius.circular(22),
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: ButtonStyle(
        backgroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return navyCta;
          return cardColor;
        }),
        foregroundColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return Colors.white;
          return ink;
        }),
        shape: WidgetStateProperty.all(const StadiumBorder()),
        side: WidgetStateProperty.all(BorderSide.none),
      ),
    ),
    dividerTheme: DividerThemeData(color: borderMuted, thickness: 0.6),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeThroughPageTransitionsBuilder(),
        TargetPlatform.iOS: FadeThroughPageTransitionsBuilder(),
      },
    ),
  );
}
