import type { Metadata } from "next";
import "./globals.css";
import { SolanaProvider } from "./providers/SolanaProvider";
import { ToastProvider } from "./providers/ToastProvider";
import NavBar from "./components/NavBar";

export const metadata: Metadata = {
  title: "DecentraVote",
  description: "Decentralized voting application",
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>
          <SolanaProvider>
            <NavBar />
            {children}
          </SolanaProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
