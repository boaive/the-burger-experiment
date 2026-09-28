import { Experience } from "@/components/experience/Experience";
import { MenuTeaser } from "@/components/home/MenuTeaser";
import { ReviewsTeaser } from "@/components/home/ReviewsTeaser";

export default function Home() {
  return (
    <main id="main">
      <Experience />
      <MenuTeaser />
      <ReviewsTeaser />
    </main>
  );
}
