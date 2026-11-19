import { useAtomValue } from 'jotai';
import { DEFAULT_PANEL, activePanelAtom, resolveActivePanel } from '~/Providers/ActivePanelContext';
import { sidebarLayoutAtom } from '~/store/sidebarLayout';
import { useGetStartupConfig } from '~/data-provider';

export type SidebarLayout = 'rail' | 'combined';

/**
 * The desktop sidebar layout in effect: the person's own choice in Settings, or, when they left
 * it on Default, the deployment's `interface.sidebarLayout`. `rail` (the default) keeps the icon
 * rail beside the panel; `combined` puts labeled commands and the chat list in the first column
 * and opens tools beside it.
 */
export default function useSidebarLayout(): SidebarLayout {
  const preference = useAtomValue(sidebarLayoutAtom);
  const { data: startupConfig } = useGetStartupConfig();
  if (preference !== 'default') {
    return preference;
  }
  return startupConfig?.interface?.sidebarLayout === 'combined' ? 'combined' : 'rail';
}

/**
 * Whether the combined layout has a tool open beside its column. Always false in the rail
 * layout, where the panel container shows the active panel as shipped.
 */
export function useSidebarToolOpen(links: { id: string }[]): boolean {
  const layout = useSidebarLayout();
  const active = useAtomValue(activePanelAtom);
  return layout === 'combined' && resolveActivePanel(active, links) !== DEFAULT_PANEL;
}
