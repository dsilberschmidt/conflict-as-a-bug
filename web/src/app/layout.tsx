import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conflict as a Bug",
  description: "A minimal interface for capturing conflicts as cases to review.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
