import React from 'react';
import { RecoilRoot } from 'recoil';
import { getDefaultStore } from 'jotai';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router-dom';
import { MessagesSquare, NotebookPen } from 'lucide-react';
import { render, fireEvent, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { NavLink } from '~/common';
import { ActivePanelProvider, DEFAULT_PANEL, activePanelAtom } from '~/Providers';

const mockNewConversation = jest.fn();
const mockClearMessagesCache = jest.fn();

jest.mock('~/store', () => {
  const { atom } = jest.requireActual('recoil');
  let counter = 0;
  const customShortcutsAtom = atom({
    key: 'mock-customShortcuts',
    default: {},
  });
  const shortcutsEnabledAtom = atom({
    key: 'mock-shortcutsEnabled',
    default: true,
  });
  return {
    __esModule: true,
    default: {
      conversationByIndex: () =>
        atom({ key: `mock-conversationByIndex-${counter++}`, default: null }),
      conversationIdByIndex: () =>
        atom({ key: `mock-conversationIdByIndex-${counter++}`, default: null }),
      customShortcuts: customShortcutsAtom,
      shortcutsEnabled: shortcutsEnabledAtom,
    },
  };
});

jest.mock('~/hooks', () => ({
  useLocalize: () => (key: string) => key,
  useNewConvo: () => ({ newConversation: mockNewConversation }),
  useShowMarketplace: () => false,
}));

/**
 * Stands in for the real hook, which reaches `useNewConvo` by deep path and so
 * escapes the `~/hooks` mock above. Mirrors its contract closely enough that
 * the panel-switch assertions still exercise the `onNewChat` wiring.
 */
jest.mock('~/hooks/Conversations/useNewChat', () => ({
  __esModule: true,
  default: ({ onNewChat }: { onNewChat?: () => void } = {}) => ({
    newConversation: mockNewConversation,
    startNewChat: () => {
      mockNewConversation();
      onNewChat?.();
    },
    handleNewChatClick: (event: React.MouseEvent<HTMLElement>) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      event.preventDefault();
      mockClearMessagesCache();
      mockNewConversation();
      onNewChat?.();
    },
  }),
}));

jest.mock('~/utils', () => ({
  clearMessagesCache: (...args: unknown[]) => mockClearMessagesCache(...args),
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

jest.mock('~/components/Chat/Menus/OpenSidebar', () => ({
  CLOSE_SIDEBAR_ID: 'close-sidebar',
}));

jest.mock('~/components/Nav/AccountSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="account-settings" />,
}));

let mockLayout: 'rail' | 'combined' = 'rail';
jest.mock('~/hooks/Nav/useSidebarLayout', () => ({
  __esModule: true,
  default: () => mockLayout,
  useSidebarToolOpen: (links: { id: string }[]) => {
    // The real jotai hook, so the component re-renders when the active panel changes.
    const { useAtomValue: readAtom } = jest.requireActual('jotai');
    const panels = jest.requireActual('~/Providers/ActivePanelContext');
    const active = panels.resolveActivePanel(readAtom(panels.activePanelAtom), links);
    return mockLayout === 'combined' && active !== panels.DEFAULT_PANEL;
  },
}));

import { useSidebarScrollHeader } from '../scrollHeader';
import Sidebar from '../Sidebar';

/** City of Boise customization (boise/PATCHES.md): `interface.sidebarLayout: combined`. */
/** Like ConversationsSection, the chats panel draws the scroll header inside its own list. */
const ChatsPanel = () => <div data-testid="chats-panel">{useSidebarScrollHeader()}</div>;
const PromptsPanel = () => <div data-testid="prompts-panel" />;

const createLinks = (): NavLink[] => [
  {
    title: 'com_ui_chat_history' as const,
    icon: MessagesSquare,
    id: DEFAULT_PANEL,
    Component: ChatsPanel,
  },
  { title: 'com_ui_prompts' as const, icon: NotebookPen, id: 'prompts', Component: PromptsPanel },
];

function renderSidebar({ expanded = true, onCollapse = jest.fn() } = {}) {
  getDefaultStore().set(activePanelAtom, DEFAULT_PANEL);
  render(
    <MemoryRouter>
      <QueryClientProvider client={new QueryClient()}>
        <RecoilRoot>
          <ActivePanelProvider>
            <Sidebar
              links={createLinks()}
              expanded={expanded}
              width={360}
              minWidth={360}
              maxWidth={600}
              onCollapse={onCollapse}
              onExpand={jest.fn()}
              onLeaveInsights={jest.fn()}
              switchToHistory={true}
              onResizeStart={jest.fn()}
              onResizeKeyboard={jest.fn()}
            />
          </ActivePanelProvider>
        </RecoilRoot>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return { onCollapse };
}

describe('Sidebar layout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('keeps the icon rail beside the panel by default', () => {
    mockLayout = 'rail';
    renderSidebar();
    expect(screen.queryByTestId('combined-sidebar')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_prompts' })).toBeInTheDocument();
    expect(screen.getByTestId('chats-panel')).toBeInTheDocument();
  });

  it('puts labeled commands and the chat list in the first container when combined', async () => {
    mockLayout = 'combined';
    renderSidebar();
    const column = screen.getByTestId('combined-sidebar');
    const chats = screen.getByTestId('chats-panel');
    expect(column).toContainElement(chats);
    expect(column).toContainElement(await screen.findByTestId('account-settings'));
    // The commands scroll with the chat list: they are drawn inside its panel.
    expect(chats).toContainElement(screen.getByTestId('combined-sidebar-rows'));

    const prompts = screen.getByRole('button', { name: 'com_ui_prompts' });
    expect(prompts).toHaveTextContent('com_ui_prompts');
    expect(prompts).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('link', { name: 'com_ui_new_chat' })).toBeInTheDocument();
    // Chats is always shown, so it is not a row of its own.
    expect(screen.queryByRole('button', { name: 'com_ui_chat_history' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('open-sidebar-button')).not.toBeInTheDocument();
  });

  it('collapses the panel container to nothing while no tool is open', () => {
    mockLayout = 'combined';
    renderSidebar();
    expect(screen.queryByTestId('prompts-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('close-tool-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { hidden: true })).toHaveClass('hidden');
  });

  it('opens a tool beside the column and keeps the chat list', () => {
    mockLayout = 'combined';
    const { onCollapse } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompts' }));

    expect(getDefaultStore().get(activePanelAtom)).toBe('prompts');
    const tool = screen.getByTestId('prompts-panel');
    expect(screen.getByTestId('combined-sidebar')).not.toContainElement(tool);
    expect(screen.getByTestId('chats-panel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'com_ui_prompts' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('navigation')).not.toHaveClass('hidden');
    expect(onCollapse).not.toHaveBeenCalled();
  });

  it('closes the tool from its close button or by choosing its row again', () => {
    mockLayout = 'combined';
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompts' }));
    fireEvent.click(screen.getByTestId('close-tool-panel'));
    expect(getDefaultStore().get(activePanelAtom)).toBe(DEFAULT_PANEL);
    expect(screen.queryByTestId('prompts-panel')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompts' }));
    fireEvent.click(screen.getByRole('button', { name: 'com_ui_prompts' }));
    expect(getDefaultStore().get(activePanelAtom)).toBe(DEFAULT_PANEL);
  });

  it('collapses from the close-sidebar button', () => {
    mockLayout = 'combined';
    const { onCollapse } = renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: 'com_nav_close_sidebar' }));
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('falls back to the icon rail while collapsed', () => {
    mockLayout = 'combined';
    renderSidebar({ expanded: false });
    expect(screen.queryByTestId('combined-sidebar')).not.toBeInTheDocument();
    expect(screen.getByTestId('open-sidebar-button')).toBeInTheDocument();
  });
});
