import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../l10n/app_localizations.dart';
import '../widgets/app_header_actions.dart';
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

    // Only react when an external navigation actually changes ?tab=.
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
    final theme = Theme.of(context);
    final l10n = AppLocalizations.of(context)!;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(20, MediaQuery.paddingOf(context).top + 14, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    l10n.learnTitle,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const AppHeaderActions(),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                l10n.learnSubtitleShort,
                style: theme.textTheme.bodyMedium?.copyWith(color: Colors.blueGrey, height: 1.45),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: TabBar(
            controller: _tabController,
            onTap: _onTabTapped,
            tabs: [
              Tab(
                key: CoachTourScope.targetKey(context, 'learn_live'),
                text: l10n.liveTutor,
                icon: const Icon(Icons.videocam_outlined),
              ),
              Tab(
                key: CoachTourScope.targetKey(context, 'learn_tools'),
                text: l10n.studyToolsTab,
                icon: const Icon(Icons.extension_outlined),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
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
    );
  }
}
