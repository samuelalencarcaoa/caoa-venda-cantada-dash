import SalesIntentionForm from '@/components/SalesIntentionForm';
import { themedPageBackgroundClass } from '@/lib/theme-classes';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Registrar intenção de venda'
};

export default function SalesIntentionPage() {
  return (
    <main className={cn('min-h-[100dvh] px-3 py-3 sm:px-5 sm:py-4 lg:px-8', themedPageBackgroundClass)}>
      <div className="mx-auto w-full max-w-7xl">
        <SalesIntentionForm />
      </div>
    </main>
  );
}
