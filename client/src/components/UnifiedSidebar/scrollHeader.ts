import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Content a host layout asks the conversations panel to draw at the top of its own scroll
 * viewport, so it scrolls with Projects, Pinned and Chats rather than sitting above them. The
 * combined sidebar (`interface.sidebarLayout: combined`) puts its navigation rows here. Empty by
 * default, which leaves the panel as shipped.
 */
export const SidebarScrollHeaderContext = createContext<ReactNode>(null);

export function useSidebarScrollHeader(): ReactNode {
  return useContext(SidebarScrollHeaderContext);
}
