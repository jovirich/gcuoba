import { LoginForm } from './login-form';

type LoginPageProps = {
  searchParams?: Promise<{ portal?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const portal = params?.portal === 'admin' ? 'admin' : 'member';

  return <LoginForm portal={portal} />;
}
