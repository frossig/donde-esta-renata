import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { getRoleFromCookies } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Donde está Renata",
  description: "Siguiendo a Renata por Europa ✈️",
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getRoleFromCookies();
  const isAuthenticated = role !== null;
  const isAdmin = role === "admin";

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "#faf6f1" }}>
        {/* Main content — add bottom padding on mobile to avoid nav overlap */}
        <main className={`flex-1 flex flex-col${isAuthenticated ? " pb-16 md:pb-0 md:pt-14" : ""}`}>
          {children}
        </main>

        {/* Nav bar — only shown when authenticated */}
        {isAuthenticated && (
          <>
            {/* Mobile: fixed bottom bar */}
            <nav
              className="fixed bottom-0 inset-x-0 md:hidden flex items-center justify-around border-t py-2 z-50"
              style={{
                backgroundColor: "#faf6f1",
                borderColor: "#e8ddd2",
                color: "#5a4636",
              }}
            >
              <Link
                href="/"
                className="flex flex-col items-center gap-0.5 text-xs font-medium px-3 py-1 rounded-lg transition-colors hover:bg-amber-50"
                style={{ color: "#5a4636" }}
              >
                <span className="text-lg leading-none">🗺️</span>
                <span>Mapa</span>
              </Link>

              {isAdmin && (
                <Link
                  href="/upload"
                  className="flex flex-col items-center gap-0.5 text-xs font-medium px-3 py-1 rounded-lg transition-colors hover:bg-amber-50"
                  style={{ color: "#5a4636" }}
                >
                  <span className="text-lg leading-none">📸</span>
                  <span>Upload</span>
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex flex-col items-center gap-0.5 text-xs font-medium px-3 py-1 rounded-lg transition-colors hover:bg-amber-50"
                  style={{ color: "#5a4636" }}
                >
                  <span className="text-lg leading-none">⚙️</span>
                  <span>Admin</span>
                </Link>
              )}

              <Link
                href="/api/logout"
                className="flex flex-col items-center gap-0.5 text-xs font-medium px-3 py-1 rounded-lg transition-colors hover:bg-amber-50"
                style={{ color: "#8a6040" }}
              >
                <span className="text-lg leading-none">👋</span>
                <span>Salir</span>
              </Link>
            </nav>

            {/* Desktop: fixed top bar */}
            <nav
              className="hidden md:flex fixed top-0 inset-x-0 items-center justify-between px-6 h-14 border-b z-50"
              style={{
                backgroundColor: "#faf6f1",
                borderColor: "#e8ddd2",
              }}
            >
              <span
                className="font-serif font-semibold text-lg"
                style={{ color: "#5a4636" }}
              >
                Donde está Renata ✈️
              </span>

              <div className="flex items-center gap-1">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-50"
                  style={{ color: "#5a4636" }}
                >
                  🗺️ Mapa
                </Link>

                {isAdmin && (
                  <Link
                    href="/upload"
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-50"
                    style={{ color: "#5a4636" }}
                  >
                    📸 Upload
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-50"
                    style={{ color: "#5a4636" }}
                  >
                    ⚙️ Admin
                  </Link>
                )}

                <Link
                  href="/api/logout"
                  className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-amber-50"
                  style={{ color: "#8a6040" }}
                >
                  Cerrar sesión
                </Link>
              </div>
            </nav>
          </>
        )}

        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js')
  })
}
`,
          }}
        />
      </body>
    </html>
  );
}
