export const metadata = { title: "Hydration Doctor production fixture" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
