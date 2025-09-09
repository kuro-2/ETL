# School Onboarding System

A React-based school onboarding application with user management and administrative controls.

## Installation

```bash
npm install @dumroo/school-onboarding
```

## Requirements

This package requires the following peer dependencies:

- React 18 or higher
- React DOM 18 or higher
- Supabase JS v2 or higher

## Usage

```tsx
import { App, AuthProvider } from '@dumroo/school-onboarding';

function MyApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}

export default MyApp;
```

### Configuration

The application requires Supabase configuration. Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Components

The package exports several components that can be used independently:

```tsx
import {
  SchoolOnboarding,
  AuthManagement,
  Login
} from '@dumroo/school-onboarding';
```

### Authentication

The package includes authentication components and context:

```tsx
import { AuthProvider, useAuth, Login } from '@dumroo/school-onboarding';
```

### Stores

State management utilities using Zustand:

```tsx
import { useAuthStore, useToastStore } from '@dumroo/school-onboarding';
```

## Features

- School Onboarding Workflow
- User Management (Students, Teachers, Administrators)
- Bulk User Creation
- Authentication
- Role-based Access Control
- District and School Setup
- Classroom Management
- Student Enrollment

## License

MIT