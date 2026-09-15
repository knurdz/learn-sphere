import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../widgets/clinical_sections.dart';
import '../widgets/coach_tour_scope.dart';
import 'live_tutor_panel.dart';
import 'study_tools_panel.dart';

class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  String? _lastQueryTab;
  bool _seeded = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final tab = GoRouterState.of(context).uri.queryParameters['tab'];
    final normalized = tab == 'tools' || tab == 'live' ? tab : null;

    if (!_seeded) {
      _seeded = true;
      _lastQueryTab = normalized;
      final index = normalized == 'tools' ? 1 : 0;
      if (_tabController.index != index) {
        _tabController.index = index;
      }
      return;
    }

    if (normalized == null || normalized == _lastQueryTab) return;
    _lastQueryTab = normalized;
    final index = normalized == 'tools' ? 1 : 0;
    if (_tabController.index != index) {
      _tabController.index = index;
    }
  }

  void _onTabTapped(int index) {
    final desired = index == 1 ? 'tools' : 'live';
    if (_lastQueryTab == desired) return;
    _lastQueryTab = desired;
    final drawer = GoRouterState.of(context).uri.queryParameters['drawer'];
    final params = <String, String>{'tab': desired};
    if (drawer != null && drawer.isNotEmpty && desired == 'live') {
      params['drawer'] = drawer;
    }
    context.replace(Uri(path: '/learn', queryParameters: params).toString());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  bool get _openChatDrawer {
    return GoRouterState.of(context).uri.queryParameters['drawer'] == 'chat';
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return ClinicalSectionBackground(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 14, 20, 0),
            child: ClinicalSectionHeader(
              title: l10n.learnTitle,
              subtitle: l10n.learnSubtitleShort,
            ),
          ),
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: ClinicalSegmentedTabs(
              index: _tabController.index,
              onChanged: (index) {
                _tabController.index = index;
                _onTabTapped(index);
              },
              items: [
                (
                  label: l10n.liveTutor,
                  icon: Icons.videocam_rounded,
                  key: CoachTourScope.targetKey(context, 'learn_live'),
                ),
                (
                  label: l10n.studyToolsTab,
                  icon: Icons.auto_awesome_outlined,
                  key: CoachTourScope.targetKey(context, 'learn_tools'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),
          Expanded(
            child: AnimatedBuilder(
              animation: _tabController,
              builder: (context, _) {
                return IndexedStack(
                  index: _tabController.index,
                  children: [
                    LiveTutorPanel(openChatOnLoad: _openChatDrawer),
                    const StudyToolsPanel(),
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
