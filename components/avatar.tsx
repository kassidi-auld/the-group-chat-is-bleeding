export const avatars = ["😎", "💅🏾", "🧑🏾‍🎤", "👩🏾‍💻", "🧑🏾‍🚀", "🥷🏾", "👑", "🫣"];
export function Avatar({
  index,
  small = false,
}: {
  index: number;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`avatar avatar-${index % 4} ${small ? "small" : ""}`}
    >
      {avatars[index]}
    </span>
  );
}
