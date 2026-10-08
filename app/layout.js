import "./globals.css";
import Nav from "../components/Nav";

export const metadata = {
  title: "HEIMDELL",
  description: "Cyber link intelligence — verification-gated URL shortening",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}