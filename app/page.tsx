import { PublicPage } from "./public-page";

export default function Home() {
  // Keep "/" public and lightweight; authenticated workflows live under "/app".
  return <PublicPage />;
}
