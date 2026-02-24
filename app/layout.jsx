import { Raleway, Karla } from 'next/font/google';
import './globals.css';

const raleway = Raleway({
  subsets: ['latin'],
  variable: '--font-raleway',
  weight: ['400', '500', '600', '700', '800'],
});

const karla = Karla({
  subsets: ['latin'],
  variable: '--font-karla',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'Trade3 – Making Trade Finance Web3 Investable',
  description:
    '$2.5T in global trade goes unfunded each year. Trade3 brings blockchain-powered smart contracts and escrow to trade finance — eliminating delays, reducing costs, and opening access to capital.',
  openGraph: {
    title: 'Trade3 – Making Trade Finance Web3 Investable',
    description: 'Blockchain-powered escrow and smart contracts for global trade finance.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${raleway.variable} ${karla.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
