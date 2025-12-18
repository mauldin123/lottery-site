import type { Metadata } from "next";
import { getShare } from "@/app/api/lottery/share/store";

type Props = {
  params: Promise<{ shareId: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareId } = await params;
  
  try {
    const shareData = getShare(shareId);
    
    if (shareData) {
      const description = `Draft lottery results for ${shareData.leagueName} - ${shareData.season}. Top pick: ???`;
      
      return {
        title: `Draft Lottery Results - ${shareData.leagueName}`,
        description: description,
        openGraph: {
          title: `Draft Lottery Results - ${shareData.leagueName}`,
          description: description,
          type: "website",
          siteName: "Dynasty Lottery",
        },
        twitter: {
          card: "summary_large_image",
          title: `Draft Lottery Results - ${shareData.leagueName}`,
          description: description,
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
