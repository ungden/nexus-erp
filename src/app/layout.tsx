import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AppProvider } from "@/context/AppContext";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
});

const outfit = Outfit({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexusERP | Quản trị Doanh nghiệp theo Dòng tiền",
  description: "Hệ thống quản trị doanh nghiệp toàn diện - Lấy Dòng tiền làm trung tâm. Tích hợp AI Roadmap, CRM, HRM và KPI.",
  openGraph: {
    title: "NexusERP | Quản trị Doanh nghiệp Thông minh",
    description: "Lấy dòng tiền làm trung tâm. Phân tích tự động chiến lược doanh nghiệp từ mục tiêu tổng thể đến từng công việc hàng ngày bằng AI.",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${inter.variable} ${outfit.variable} font-sans antialiased min-h-screen`}
      >
        <AuthProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
