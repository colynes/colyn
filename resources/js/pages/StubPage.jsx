import React from 'react';
import AppLayout from '@/layouts/AppLayout';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function StubPage({ auth, title, module }) {
  return (
    <AppLayout user={auth?.user}>
      <PageHeader 
        title={title} 
        description={`This is the ${module} > ${title} module placeholder.`}
      >
        <Button variant="primary">Add New {title}</Button>
      </PageHeader>

      <Card>
        <CardContent className="p-12 text-center">
          <h2 className="text-xl font-semibold mb-2 text-[var(--color-sys-text-primary)]">
            Phase 1 Placeholder
          </h2>
          <p className="text-[var(--color-sys-text-secondary)] max-w-md mx-auto">
            The {title} functionality will be thoroughly implemented in its respective phase. 
            The layout and routing are correctly mapped.
          </p>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
