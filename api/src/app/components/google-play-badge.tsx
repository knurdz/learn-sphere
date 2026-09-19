import Image from "next/image";
import {
  GOOGLE_PLAY_BADGE_PATH,
  PLAY_TESTING_URL,
} from "@/lib/play-testing";

type GooglePlayBadgeProps = {
  className?: string;
  height?: number;
};

export function GooglePlayBadge({ className, height = 52 }: GooglePlayBadgeProps) {
  const width = Math.round((646 / 250) * height);

  return (
    <a
      className={`google-play-badge${className ? ` ${className}` : ""}`}
      href={PLAY_TESTING_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Get it on Google Play (closed testing)"
    >
      <Image
        src={GOOGLE_PLAY_BADGE_PATH}
        alt="Get it on Google Play"
        width={width}
        height={height}
        priority
      />
    </a>
  );
}
