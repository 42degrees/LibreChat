import { memo, useCallback, useMemo, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, SquarePen, X } from 'lucide-react';
import { Skeleton, Sidebar, Button, TooltipAnchor, pxToRem } from '@librechat/client';
import type { ReactNode } from 'react';
import type { NavLink } from '~/common';
import { useShortcutAriaKey, useShortcutHint } from '~/hooks/useKeyboardShortcuts';
import { useActivePanel, resolveActivePanel, DEFAULT_PANEL } from '~/Providers';
import { CLOSE_SIDEBAR_ID } from '~/components/Chat/Menus/OpenSidebar';
import useDirection, { inlineSide } from '~/hooks/Nav/useDirection';
import { SidebarScrollHeaderContext } from './scrollHeader';
import useNewChat from '~/hooks/Conversations/useNewChat';
import { useLocalize, useShowMarketplace } from '~/hooks';
import { lazyWithRecovery } from '~/lib/assets/lazy';

const AccountSettings = lazyWithRecovery(() => import('~/components/Nav/AccountSettings'));

/** Width and alignment only: the `compact` size owns the spacing and the icon-label gap. */
const ROW_CLASS = 'w-full justify-start';
const ICON_CLASS = 'h-4 w-4 shrink-0';
const LABEL_CLASS = 'min-w-0 truncate text-sm';

function NewChatRow({
  setActive,
  switchToHistory,
}: {
  setActive: (id: string) => void;
  switchToHistory: boolean;
}) {
  const localize = useLocalize();
  const ariaKey = useShortcutAriaKey('newChat');
  const handlePanelSwitch = useCallback(() => {
    if (switchToHistory) {
      setActive(DEFAULT_PANEL);
    }
  }, [switchToHistory, setActive]);
  const { handleNewChatClick } = useNewChat({ onNewChat: handlePanelSwitch });

  return (
    <Button asChild variant="nav" size="compact" className={ROW_CLASS}>
      <a
        href="/c/new"
        data-testid="new-chat-button"
        aria-keyshortcuts={ariaKey}
        onClick={handleNewChatClick}
      >
        <SquarePen className={ICON_CLASS} aria-hidden="true" />
        <span className={LABEL_CLASS}>{localize('com_ui_new_chat')}</span>
      </a>
    </Button>
  );
}

/** The Agent Marketplace entry, gated like the rail's (AgentMarketplaceButton). */
function MarketplaceRow() {
  const localize = useLocalize();
  const showMarketplace = useShowMarketplace();
  if (!showMarketplace) {
    return null;
  }
  return (
    <Button asChild variant="nav" size="compact" className={ROW_CLASS}>
      <Link to="/agents" data-testid="nav-agents-marketplace-button">
        <LayoutGrid className={ICON_CLASS} aria-hidden="true" />
        <span className={LABEL_CLASS}>{localize('com_agents_marketplace')}</span>
      </Link>
    </Button>
  );
}

/** A tool row: opens the tool beside the column; choosing the open tool again closes it. */
function NavRow({
  link,
  isActive,
  setActive,
  onLeaveInsights,
}: {
  link: NavLink;
  isActive: boolean;
  setActive: (id: string) => void;
  onLeaveInsights?: () => void;
}) {
  const localize = useLocalize();
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (link.onClick) {
        link.onClick(e);
        return;
      }
      setActive(isActive ? DEFAULT_PANEL : link.id);
      onLeaveInsights?.();
    },
    [link, isActive, setActive, onLeaveInsights],
  );

  return (
    <Button
      variant="nav"
      size="compact"
      aria-pressed={isActive}
      disabled={link.disabled}
      data-testid={`nav-panel-${link.id}`}
      className={ROW_CLASS}
      onClick={handleClick}
    >
      <link.icon className={ICON_CLASS} aria-hidden="true" />
      <span className={LABEL_CLASS}>{localize(link.title)}</span>
    </Button>
  );
}

/**
 * The open tool's name and a close button, above the tool in the panel container. Closing
 * returns to the chat list alone, and the panel container collapses to nothing.
 */
export function ToolPanelHeader({ links }: { links: NavLink[] }) {
  const localize = useLocalize();
  const { active, setActive } = useActivePanel();
  const tool = links.find((link) => link.id === resolveActivePanel(active, links));
  if (!tool) {
    return null;
  }
  return (
    <div className="border-border-light flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
      <span className="text-text-primary min-w-0 truncate text-sm font-medium">
        {localize(tool.title)}
      </span>
      <Button
        size="icon"
        variant="nav"
        aria-label={localize('com_ui_close')}
        data-testid="close-tool-panel"
        onClick={() => setActive(DEFAULT_PANEL)}
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}

/**
 * The first sidebar container in the combined layout, in place of the icon rail: labeled
 * commands and tools on top, then the chat list (Projects, Pinned, Chats), then the account
 * menu. The commands sit inside the chat list's own scroll viewport (SidebarScrollHeaderContext),
 * so they scroll away with it. Tools open in the panel container beside this column.
 */
function CombinedColumn({
  links,
  width,
  onCollapse,
  onLeaveInsights,
  switchToHistory,
  children,
}: {
  links: NavLink[];
  width: number;
  onCollapse: () => void;
  onLeaveInsights: () => void;
  switchToHistory: boolean;
  children: ReactNode;
}) {
  const localize = useLocalize();
  const location = useLocation();
  const tooltipSide = inlineSide(useDirection(), 'end');
  const { active, setActive } = useActivePanel();
  const effectiveActive = resolveActivePanel(active, links);
  const isInsightsRoute = location.pathname.startsWith('/insights');
  const toggleSidebarHint = useShortcutHint('toggleSidebar', localize('com_nav_close_sidebar'));
  const toggleSidebarAriaKey = useShortcutAriaKey('toggleSidebar');

  const rows = useMemo(
    () => (
      <div className="flex flex-col gap-0.5 px-2 pb-2" data-testid="combined-sidebar-rows">
        <NewChatRow setActive={setActive} switchToHistory={switchToHistory} />
        <MarketplaceRow />
        {links
          .filter((link) => link.id !== DEFAULT_PANEL)
          .map((link) => (
            <NavRow
              key={link.id}
              link={link}
              isActive={
                link.id === 'insights'
                  ? isInsightsRoute
                  : !isInsightsRoute && link.id === effectiveActive
              }
              setActive={setActive}
              onLeaveInsights={isInsightsRoute ? onLeaveInsights : undefined}
            />
          ))}
        <div className="border-border-inset mx-1 mt-1.5 border-b" />
      </div>
    ),
    [links, effectiveActive, isInsightsRoute, setActive, switchToHistory, onLeaveInsights],
  );

  return (
    <div
      className="border-border-inset bg-surface-sidebar flex h-full min-h-0 shrink-0 flex-col border-e"
      style={{ width: pxToRem(width) }}
      data-testid="combined-sidebar"
    >
      <div className="px-2 py-1.5">
        <TooltipAnchor
          side={tooltipSide}
          description={toggleSidebarHint}
          render={
            <Button
              id={CLOSE_SIDEBAR_ID}
              data-testid="close-sidebar-button"
              size="icon"
              variant="nav"
              aria-label={localize('com_nav_close_sidebar')}
              aria-expanded={true}
              aria-keyshortcuts={toggleSidebarAriaKey}
              className="h-9 w-9"
              onClick={onCollapse}
            >
              <Sidebar aria-hidden="true" className="h-5 w-5 rtl:-scale-x-100" />
            </Button>
          }
        />
      </div>
      <SidebarScrollHeaderContext.Provider value={rows}>
        <div className="min-h-0 flex-1">{children}</div>
      </SidebarScrollHeaderContext.Provider>
      <div className="border-border-inset border-t px-2 py-2">
        <Suspense fallback={<Skeleton className="h-10 w-full rounded-lg" />}>
          <AccountSettings />
        </Suspense>
      </div>
    </div>
  );
}

export default memo(CombinedColumn);
