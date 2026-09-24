import "./globals.css";
import Nav from "../components/Nav";

export const metadata = {
  title: "Location Shortener",
  description: "URL shortener with location tracking",
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
