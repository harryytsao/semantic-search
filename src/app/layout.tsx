import { Providers } from "./providers";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-orange-50">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
