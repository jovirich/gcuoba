export default function RegistrationPendingPage() {
  return (
    <main className="auth-shell app-shell px-4">
      <div className="auth-card max-w-lg space-y-4 text-center">
        <p className="text-sm uppercase tracking-wide text-red-700">Registration received</p>
        <h1 className="text-3xl font-semibold text-slate-900">Thanks for submitting your details</h1>
        <p className="text-sm text-slate-600">
          Our membership team has received your request. You will receive an email once your branch executives
          approve the membership and activate your account. Feel free to update your profile details after
          signing in.
        </p>
      </div>
    </main>
  );
}


