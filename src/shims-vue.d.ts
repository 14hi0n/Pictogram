declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// Дополнение типов Chrome для Side Panel API (Chrome 114+)
declare namespace chrome.sidePanel {
  interface PanelBehavior {
    openPanelOnActionClick?: boolean;
  }
  function setPanelBehavior(behavior: PanelBehavior): Promise<void>;
  function open(options: { tabId?: number; windowId?: number }): Promise<void>;
}
