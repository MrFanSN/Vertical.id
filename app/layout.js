import './globals.css';

export const metadata = {
  title: 'Vertical.id — Operational Control Center',
  description: 'Pusat kendali order, pengiriman, dan surat jalan Vertical Karoseri.',
  icons: { icon: '/logo-vertical.png' },
};

export default function RootLayout({ children }) {
  return <html lang="id"><body>{children}</body></html>;
}
