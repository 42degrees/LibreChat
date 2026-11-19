import { createStorageAtom } from './jotai-utils';

/** `default` follows the deployment's `interface.sidebarLayout`; the others override it. */
export type SidebarLayoutPreference = 'default' | 'rail' | 'combined';

export const sidebarLayoutAtom = createStorageAtom<SidebarLayoutPreference>(
  'sidebarLayout',
  'default',
);
