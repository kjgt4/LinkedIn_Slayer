import { SignIn, SignUp } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function AuthPage({ mode = "sign-in" }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            LinkedIn Authority Engine
          </h1>
          <p className="text-slate-400">
            Create high-quality, authority-building LinkedIn content
          </p>
        </div>

        {/* Clerk Auth Component */}
        <div className="flex justify-center" data-testid="auth-container">
          {mode === "sign-in" ? (
            <SignIn
              routing="path"
              path="/sign-in"
              signUpUrl="/sign-up"
              afterSignInUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-slate-900/50 border border-slate-700/50 shadow-xl",
                  headerTitle: "text-white",
                  headerSubtitle: "text-slate-400",
                  socialButtonsBlockButton: "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
                  socialButtonsBlockButtonText: "text-white",
                  dividerLine: "bg-slate-700",
                  dividerText: "text-slate-500",
                  formFieldLabel: "text-slate-300",
                  formFieldInput: "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                  footerActionLink: "text-blue-400 hover:text-blue-300",
                  identityPreviewText: "text-white",
                  identityPreviewEditButton: "text-blue-400",
                  formFieldInputShowPasswordButton: "text-slate-400",
                  alert: "bg-red-900/50 border-red-700 text-red-200",
                  alertText: "text-red-200",
                },
                variables: {
                  colorPrimary: "#3b82f6",
                  colorBackground: "#0f172a",
                  colorText: "#ffffff",
                  colorTextSecondary: "#94a3b8",
                  colorInputBackground: "#1e293b",
                  colorInputText: "#ffffff",
                },
              }}
            />
          ) : (
            <SignUp
              routing="path"
              path="/sign-up"
              signInUrl="/sign-in"
              afterSignUpUrl="/"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-slate-900/50 border border-slate-700/50 shadow-xl",
                  headerTitle: "text-white",
                  headerSubtitle: "text-slate-400",
                  socialButtonsBlockButton: "bg-slate-800 border-slate-700 text-white hover:bg-slate-700",
                  socialButtonsBlockButtonText: "text-white",
                  dividerLine: "bg-slate-700",
                  dividerText: "text-slate-500",
                  formFieldLabel: "text-slate-300",
                  formFieldInput: "bg-slate-800 border-slate-700 text-white placeholder:text-slate-500",
                  formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                  footerActionLink: "text-blue-400 hover:text-blue-300",
                  identityPreviewText: "text-white",
                  identityPreviewEditButton: "text-blue-400",
                  formFieldInputShowPasswordButton: "text-slate-400",
                  alert: "bg-red-900/50 border-red-700 text-red-200",
                  alertText: "text-red-200",
                },
                variables: {
                  colorPrimary: "#3b82f6",
                  colorBackground: "#0f172a",
                  colorText: "#ffffff",
                  colorTextSecondary: "#94a3b8",
                  colorInputBackground: "#1e293b",
                  colorInputText: "#ffffff",
                },
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
