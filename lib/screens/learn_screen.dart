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
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _applyQueryTab();
  }

  void _applyQueryTab() {
    final tab = GoRouterState.of(context).uri.queryParameters['tab'];
    final index = tab == 'tools' ? 1 : 0;
    if (_tabController.index != index) {
      _tabController.index = index;
    }
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
    final tourKeys = CoachTourScope.maybeOf(context);

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
            tabs: [
              Tab(
                key: tourKeys?.learnLiveKey,
                text: l10n.liveTutor,
                icon: const Icon(Icons.videocam_outlined),
              ),
              Tab(
                key: tourKeys?.learnToolsKey,
                text: l10n.studyToolsTab,
                icon: const Icon(Icons.extension_outlined),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              LiveTutorPanel(openChatOnLoad: _openChatDrawer),
              const StudyToolsPanel(),
            ],
          ),
        ),
      ],
    );
  }
}
