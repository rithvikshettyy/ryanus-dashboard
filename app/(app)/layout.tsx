import { AppSidebar } from "@/components/layout/app-sidebar";

// Route group "(app)": shares this shell without adding "/app" to the URL.
// Layouts persist across navigation, so the sidebar does not re-mount when you change pages.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
