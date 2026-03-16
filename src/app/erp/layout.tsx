import { AppLayout } from '@/components/erp-layout/AppLayout';

export default function ERPLayout({children}: {children: React.ReactNode}) {
  return (
    <AppLayout>{children}</AppLayout>
  );
}
