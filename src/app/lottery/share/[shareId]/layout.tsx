import type { Metadata } from "next";
import { headers } from "next/headers";
import { getShare } from "@/app/api/lottery/share/store";

type Props = {
  params: Promise<{ shareId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  const headersList = await headers();
  const host = headersList.get("host") || "dynastylottery.com";
  const protocol = headersList.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;
  
  try {
    const shareData = await getShare(shareId);
    
    if (shareData) {
      const description = `Draft lottery results for ${shareData.leagueName} - ${shareData.season}. Top pick: ???`;
      const ogImageUrl = `${baseUrl}/api/lottery/share/${shareId}/og-image`;
      
      return {
        title: `Draft Lottery Results - ${shareData.leagueName}`,
        description: description,
        themeColor: "#10b981",
        openGraph: {
          title: `Draft Lottery Results - ${shareData.leagueName}`,
          description: description,
          type: "website",
          siteName: "Dynasty Lottery",
          url: `${baseUrl}/lottery/share/${shareId}`,
          images: [
            {
              url: ogImageUrl,
              width: 1200,
              height: 630,
              alt: `Draft Lottery Results for ${shareData.leagueName}`,
            },
          ],
        },
        twitter: {
          card: "summary_large_image",
          title: `Draft Lottery Results - ${shareData.leagueName}`,
          description: description,
          images: [ogImageUrl],
        },
      };
    }
  } catch (e) {
    // Fall through to default
  }
  
  // Default metadata if share not found
  return {
    title: "Draft Lottery Results",
    description: "View shared draft lottery results",
    themeColor: "#10b981",
    openGraph: {
      title: "Draft Lottery Results",
      description: "View shared draft lottery results",
      type: "website",
      siteName: "Dynasty Lottery",
    },
  };
}

export default function ShareLayout({ children }: Props) {
  return <>{children}</>;
}
