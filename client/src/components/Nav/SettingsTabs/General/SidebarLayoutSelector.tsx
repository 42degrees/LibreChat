import { useAtom } from 'jotai';
import { Dropdown } from '@librechat/client';
import type { SidebarLayoutPreference } from '~/store/sidebarLayout';
import { sidebarLayoutAtom } from '~/store/sidebarLayout';
import { useLocalize } from '~/hooks';

/** Settings › General › Layout: the person's own sidebar layout, or the deployment's default. */
export default function SidebarLayoutSelector() {
  const localize = useLocalize();
  const [layout, setLayout] = useAtom(sidebarLayoutAtom);

  const options = [
    { value: 'default', label: localize('com_nav_sidebar_layout_default') },
    { value: 'rail', label: localize('com_nav_sidebar_layout_rail') },
    { value: 'combined', label: localize('com_nav_sidebar_layout_combined') },
  ];

  const labelId = 'sidebar-layout-selector-label';

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2">
      <div id={labelId}>{localize('com_nav_sidebar_layout')}</div>
      <Dropdown
        value={layout}
        options={options}
        onChange={(value) => setLayout(value as SidebarLayoutPreference)}
        testId="sidebar-layout-selector"
        sizeClasses="w-[180px]"
        className="z-50"
        aria-labelledby={labelId}
      />
    </div>
  );
}
