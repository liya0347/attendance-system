declare module 'lucide-vue-next' {
  import type { Component } from 'vue';
  
  interface LucideIconProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number;
    class?: string;
  }
  
  export const Calendar: Component<LucideIconProps>;
  export const Users: Component<LucideIconProps>;
  export const Edit: Component<LucideIconProps>;
  export const Trash2: Component<LucideIconProps>;
  export const AlertTriangle: Component<LucideIconProps>;
}
