"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";

type FacebookWindow = Window & {
  fbq?: (...args: unknown[]) => void;
};

export default function FacebookPixel() {
  const pathname = usePathname();

  useEffect(() => {
    // This effect runs on route changes to track page views
    if (!pathname) return;
    if (typeof window === "undefined") return;
    const fbq = (window as FacebookWindow).fbq;
    if (fbq) {
      fbq("track", "PageView");
    }
  }, [pathname]);

  return (
    <Script
      id="fb-pixel"
      strategy="afterInteractive"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Required inline bootstrap snippet for Facebook Pixel.
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '4169949499921104');
          fbq('track', 'PageView');
        `,
      }}
    />
  );
}
