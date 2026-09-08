import type { Metadata } from "next";
import "./globals.css";
import { PrivyClientProvider } from "@/lib/privy/PrivyClientProvider";

export const metadata: Metadata = {
  title: "Conflict as a Bug",
  description: "A minimal interface for capturing conflicts as cases to review.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <PrivyClientProvider>{children}</PrivyClientProvider>
      </body>
    </html>
  );
}
