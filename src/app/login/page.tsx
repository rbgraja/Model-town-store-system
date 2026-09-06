import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900">
            Store Management System
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Sign in to manage store records
          </p>
        </div>
        <LoginForm next={next ?? "/"} />
      </div>
    </div>
  );
}
