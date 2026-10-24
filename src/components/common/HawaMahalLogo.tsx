import React from 'react';
import { PuneCivicLogo } from './PuneCivicLogo';

// Re-export PuneCivicLogo as HawaMahalLogo for backward compatibility
export const HawaMahalLogo: React.FC<React.ComponentProps<typeof PuneCivicLogo>> = (props) => {
  return <PuneCivicLogo {...props} />;
};
