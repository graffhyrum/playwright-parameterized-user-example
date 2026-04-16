import type { Locator, Page } from '@playwright/test'

export type PomFactory = (page: Page) => PageObject
export type ComponentFactory = (page: Page, ...args: any[]) => ComponentObject
export type LocatorConfigMap = Record<string, Locator>
export type FunctionTree = {
  [key: string]: Fn | FunctionTree
}

export type ComponentObject = {
  page: Page
  actions: FunctionTree
  assertions: FunctionTree
}

// kept explicit in case of later extension of ComponentObjects
export type PageObject = ComponentObject

/*
 * Generic function type, consolidated here to minimize biome escape hatches
 */
export type Fn<returns = unknown, args extends readonly any[] = readonly any[]> = (
  ...args: args
) => returns
