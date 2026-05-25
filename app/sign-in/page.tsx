import { signIn } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl">
          <Logo />
        </h1>
        <p className="text-gray-600 mt-3 mb-10">
          Claim your verified sales record. Sign in with LinkedIn — we&apos;ll pre-fill your name, title, and company history.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("linkedin", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-3 bg-[#0A66C2] text-white font-semibold px-6 py-3.5 rounded-full hover:bg-[#084d92] transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M20.5 2h-17C2.7 2 2 2.7 2 3.5v17c0 .8.7 1.5 1.5 1.5h17c.8 0 1.5-.7 1.5-1.5v-17c0-.8-.7-1.5-1.5-1.5zM8 19H5V9h3v10zm-1.5-11.3c-1 0-1.7-.8-1.7-1.7s.7-1.7 1.7-1.7 1.7.8 1.7 1.7-.8 1.7-1.7 1.7zM19 19h-3v-5c0-1.2-.9-2-2-2s-2 .8-2 2v5h-3V9h3v1.4c.5-.8 1.5-1.4 2.7-1.4 2.1 0 3.3 1.4 3.3 3.6V19z"/>
            </svg>
            Sign in with LinkedIn
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-6">
          By signing in you agree to our terms. We only read public profile info — never your messages or connections.
        </p>

        <div className="mt-12 text-sm">
          <a href="https://salescard.ai" className="text-gray-500 hover:text-[#3478C0]">
            ← Back to salescard.ai
          </a>
        </div>
      </div>
    </main>
  );
}
