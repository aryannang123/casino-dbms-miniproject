import './globals.css';
import { AuthProvider } from '../components/AuthProvider';
import Navbar from '../components/Navbar';

export const metadata = {
  title: 'Casino DBMS',
  description: 'Casino Database Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-casino-black min-h-screen">
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <footer className="border-t border-casino-border mt-16 py-8">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <p className="text-gray-600 text-sm">
                🎰 <span className="text-gold font-semibold">Casino DBMS</span> — Play responsibly. 18+ only.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
