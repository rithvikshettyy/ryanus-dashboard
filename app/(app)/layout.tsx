import { SidebarContent } from "@/components/layout/sidebar-content";

// Route group "(app)": shares this shell without adding "/app" to the URL.
// Layouts persist across navigation, so the sidebar does not re-mount when you change pages.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r bg-card md:block">
        <SidebarContent />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
