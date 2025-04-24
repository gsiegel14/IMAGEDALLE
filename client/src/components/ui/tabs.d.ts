declare module '@/components/ui/tabs' {
  import React from 'react';
  import { VariantProps } from 'class-variance-authority';

  export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
  }

  export const Tabs: React.FC<TabsProps>;
  export const TabsList: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  export const TabsTrigger: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }>;
  export const TabsContent: React.FC<React.HTMLAttributes<HTMLDivElement> & { value: string }>;
  export const TabsItem: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}