import "./globals.css";

export const metadata = {
  title: "Void Crash | Base Mainnet",
  description: "3D Anti-stress Web3 game",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
