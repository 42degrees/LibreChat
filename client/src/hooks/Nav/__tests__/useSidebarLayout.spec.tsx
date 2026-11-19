import { getDefaultStore } from 'jotai';
import { renderHook, act } from '@testing-library/react';
import { activePanelAtom, DEFAULT_PANEL } from '~/Providers/ActivePanelContext';
import { sidebarLayoutAtom } from '~/store/sidebarLayout';

let mockConfigLayout: string | undefined;
jest.mock('~/data-provider', () => ({
  useGetStartupConfig: () => ({ data: { interface: { sidebarLayout: mockConfigLayout } } }),
}));

import useSidebarLayout, { useSidebarToolOpen } from '../useSidebarLayout';

const links = [{ id: DEFAULT_PANEL }, { id: 'prompts' }];

describe('useSidebarLayout', () => {
  beforeEach(() => {
    mockConfigLayout = undefined;
    act(() => {
      getDefaultStore().set(sidebarLayoutAtom, 'default');
      getDefaultStore().set(activePanelAtom, DEFAULT_PANEL);
    });
  });

  it('is the icon rail when neither the person nor the deployment chose', () => {
    expect(renderHook(() => useSidebarLayout()).result.current).toBe('rail');
  });

  it('follows the deployment default while the person is on Default', () => {
    mockConfigLayout = 'combined';
    expect(renderHook(() => useSidebarLayout()).result.current).toBe('combined');
  });

  it("lets the person's choice override the deployment default, either way", () => {
    mockConfigLayout = 'combined';
    const { result } = renderHook(() => useSidebarLayout());
    act(() => getDefaultStore().set(sidebarLayoutAtom, 'rail'));
    expect(result.current).toBe('rail');

    mockConfigLayout = 'rail';
    act(() => getDefaultStore().set(sidebarLayoutAtom, 'combined'));
    expect(result.current).toBe('combined');
  });

  it('reports a tool open only in the combined layout with a tool active', () => {
    const { result } = renderHook(() => useSidebarToolOpen(links));
    act(() => getDefaultStore().set(activePanelAtom, 'prompts'));
    expect(result.current).toBe(false);

    act(() => getDefaultStore().set(sidebarLayoutAtom, 'combined'));
    expect(result.current).toBe(true);

    act(() => getDefaultStore().set(activePanelAtom, DEFAULT_PANEL));
    expect(result.current).toBe(false);
  });
});
