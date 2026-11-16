'use client';

import React from 'react';
import { MobileStaffAuthGate } from '@/components/mobile/MobileStaffAuthGate';
import { MobileFieldOperationsHub } from '@/components/mobile/MobileFieldOperationsHub';

export default function MobileFieldPage() {
  return (
    <MobileStaffAuthGate>
      {({ user, onLogout }) => (
        <MobileFieldOperationsHub authenticatedUser={user} onLogout={onLogout} />
      )}
    </MobileStaffAuthGate>
  );
}
